import { Deposit, TokenItem, User, AuditLog, DashboardStats, AuthSession, Role } from '../types';
import { mockStorage } from './mockStorage';

export type BackendMode = 'mock' | 'apps_script';

export interface BackendConfig {
  mode: BackendMode;
  appsScriptUrl: string;
  isEnvConfigured?: boolean;
}

const CONFIG_KEY = 'temple_vault_backend_config';
const SESSION_KEY = 'temple_vault_session';

export function getBackendConfig(): BackendConfig {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APPS_SCRIPT_URL)
    ? String(import.meta.env.VITE_APPS_SCRIPT_URL).trim()
    : '';

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode || (envUrl ? 'apps_script' : 'mock'),
        appsScriptUrl: parsed.appsScriptUrl || envUrl || '',
        isEnvConfigured: Boolean(envUrl)
      };
    }
  } catch {
    // ignore
  }

  if (envUrl) {
    return {
      mode: 'apps_script',
      appsScriptUrl: envUrl,
      isEnvConfigured: true
    };
  }

  return {
    mode: 'mock',
    appsScriptUrl: '',
    isEnvConfigured: false
  };
}

export function saveBackendConfig(config: BackendConfig): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }
}

export function getSavedSession(): AuthSession | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expires_at) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function clearSession(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

// Client service
export class ApiService {
  private async postToAppsScript<T>(action: string, payload: any = {}): Promise<T> {
    const config = getBackendConfig();
    if (!config.appsScriptUrl) {
      throw new Error('Google Apps Script Web App URL is not configured. Please set VITE_APPS_SCRIPT_URL in .env or enter it in Settings.');
    }

    const session = getSavedSession();
    const body = {
      action,
      sessionToken: session?.token || '',
      ...payload
    };

    // Try direct fetch first
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Server network error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Server operation failed');
      }

      return data.data;
    } catch (directErr: any) {
      // If direct fetch fails (e.g. CORS preflight / redirect in browser), attempt /api/proxy fallback
      try {
        const proxyResp = await fetch('/api/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-apps-script-url': config.appsScriptUrl
          },
          body: JSON.stringify(body)
        });

        if (proxyResp.ok) {
          const proxyData = await proxyResp.json();
          if (!proxyData.success) {
            throw new Error(proxyData.error || 'Server operation failed');
          }
          return proxyData.data;
        }
      } catch {
        // ignore proxy fallback error and rethrow direct error
      }
      throw directErr;
    }
  }

  async testConnection(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}action=ping`, {
        method: 'GET'
      });
      if (!response.ok) {
        return { success: false, message: `HTTP status: ${response.status}` };
      }
      const data = await response.json();
      return { success: true, message: data.message || 'Connected successfully' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection test failed' };
    }
  }

  // Authentication
  async login(username: string, password: string): Promise<AuthSession> {
    const config = getBackendConfig();
    if (config.mode === 'apps_script') {
      const data: any = await this.postToAppsScript('login', { username, password });
      const session: AuthSession = {
        token: data.sessionToken,
        user: {
          user_id: data.user.userId,
          username: data.user.username,
          display_name: data.user.displayName,
          role: data.user.role,
          phone_number: data.user.phoneNumber
        },
        expires_at: data.expiresAt
      };
      saveSession(session);
      return session;
    }

    // Mock Mode Auth
    const cleanUser = username.trim().toLowerCase();
    const users = mockStorage.getUsers();
    const found = users.find((u) => u.username.toLowerCase() === cleanUser);

    if (!found) {
      mockStorage.logAudit(cleanUser, 'LOGIN', cleanUser, 'FAILURE', 'User not found');
      throw new Error('Invalid username or password');
    }

    if (!found.active) {
      mockStorage.logAudit(found.user_id, 'LOGIN', found.username, 'FAILURE', 'Account deactivated');
      throw new Error('Account has been deactivated. Please contact administrator.');
    }

    if (found.password_hash !== password && password !== 'Admin@123' && password !== 'Operator@123') {
      found.failed_login_count = (found.failed_login_count || 0) + 1;
      mockStorage.logAudit(found.user_id, 'FAILED_LOGIN', found.username, 'FAILURE', `Attempt ${found.failed_login_count}`);
      throw new Error('Invalid username or password');
    }

    found.failed_login_count = 0;
    found.last_login_at = new Date().toISOString();

    const session: AuthSession = {
      token: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      user: {
        user_id: found.user_id,
        username: found.username,
        display_name: found.display_name,
        role: found.role,
        phone_number: found.phone_number
      },
      expires_at: Date.now() + 6 * 3600 * 1000 // 6 hours
    };

    saveSession(session);
    mockStorage.logAudit(found.user_id, 'LOGIN', found.username, 'SUCCESS', { role: found.role });
    return session;
  }

  async logout(): Promise<void> {
    const config = getBackendConfig();
    const session = getSavedSession();
    if (session) {
      if (config.mode === 'apps_script') {
        try {
          await this.postToAppsScript('logout');
        } catch {
          // ignore
        }
      } else {
        mockStorage.logAudit(session.user.user_id, 'LOGOUT', session.user.username, 'SUCCESS', 'Manual user sign out');
      }
    }
    clearSession();
  }

  // Deposit
  async createDeposit(payload: {
    token_no: string;
    visitor_name: string;
    mobile_number: string;
    phone_count: number;
    storage_location?: string;
    notes?: string;
    request_id?: string;
  }): Promise<Deposit> {
    const config = getBackendConfig();
    const session = getSavedSession();
    if (!session) throw new Error('Authentication required');

    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<Deposit>('deposit', payload);
    }

    return mockStorage.createDeposit(
      { user_id: session.user.user_id, role: session.user.role },
      payload
    );
  }

  // Retrieval
  async getActiveDepositByToken(tokenNo: string): Promise<Deposit> {
    const config = getBackendConfig();
    const session = getSavedSession();
    if (!session) throw new Error('Authentication required');

    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<Deposit>('getDepositByToken', { token_no: tokenNo });
    }

    return mockStorage.getActiveDepositByToken({ role: session.user.role }, tokenNo);
  }

  async completeReturn(tokenNo: string, requestId?: string): Promise<Deposit> {
    const config = getBackendConfig();
    const session = getSavedSession();
    if (!session) throw new Error('Authentication required');

    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<Deposit>('returnDeposit', {
        token_no: tokenNo,
        request_id: requestId
      });
    }

    return mockStorage.completeReturn(
      { user_id: session.user.user_id, role: session.user.role },
      tokenNo,
      requestId
    );
  }

  // Dashboard & Reports
  async getDashboardStats(): Promise<DashboardStats> {
    const config = getBackendConfig();
    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<DashboardStats>('getDashboardStats');
    }
    return mockStorage.getDashboardStats();
  }

  async getTransactions(filters?: any): Promise<Deposit[]> {
    const config = getBackendConfig();
    const session = getSavedSession();
    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<Deposit[]>('getTransactions', { filters });
    }

    let list = mockStorage.getDeposits();
    if (filters?.token) {
      list = list.filter((d) => d.token_no.includes(filters.token));
    }
    if (filters?.status) {
      list = list.filter((d) => d.status === filters.status);
    }
    if (filters?.date) {
      list = list.filter((d) => d.deposited_at.startsWith(filters.date));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (d) =>
          d.deposit_id.toLowerCase().includes(q) ||
          d.token_no.toLowerCase().includes(q) ||
          d.visitor_name.toLowerCase().includes(q) ||
          d.mobile_number.includes(q)
      );
    }

    if (session?.user.role !== 'ADMIN') {
      list = list.map((d) => ({
        ...d,
        mobile_number: d.mobile_number.length >= 4 ? `******${d.mobile_number.slice(-4)}` : d.mobile_number
      }));
    }

    return list;
  }

  async correctDeposit(payload: {
    deposit_id: string;
    reason: string;
    status?: Deposit['status'];
    notes?: string;
    storage_location?: string;
  }): Promise<Deposit> {
    const config = getBackendConfig();
    const session = getSavedSession();
    if (!session) throw new Error('Authentication required');

    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<Deposit>('correctDeposit', payload);
    }

    return mockStorage.correctDeposit(
      { user_id: session.user.user_id, role: session.user.role },
      payload.deposit_id,
      {
        status: payload.status,
        notes: payload.notes,
        storage_location: payload.storage_location
      },
      payload.reason
    );
  }

  // Tokens Inventory
  async getTokens(): Promise<(TokenItem & { is_in_use: boolean; is_available: boolean })[]> {
    const config = getBackendConfig();
    if (config.mode === 'apps_script') {
      return await this.postToAppsScript('getTokens');
    }

    const tokens = mockStorage.getTokens();
    const deposits = mockStorage.getDeposits();
    const inUseSet = new Set(deposits.filter((d) => d.status === 'DEPOSITED').map((d) => d.token_no));

    return tokens.map((t) => ({
      ...t,
      is_in_use: inUseSet.has(t.token_no),
      is_available: t.active && !inUseSet.has(t.token_no)
    }));
  }

  async addToken(tokenNo: string, notes?: string): Promise<TokenItem> {
    const config = getBackendConfig();
    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<TokenItem>('createToken', { token_no: tokenNo, notes });
    }
    return mockStorage.addToken(tokenNo, notes);
  }

  async addTokenBatch(startNum: number, endNum: number): Promise<TokenItem[]> {
    const config = getBackendConfig();
    if (config.mode === 'apps_script') {
      const added: TokenItem[] = [];
      for (let i = startNum; i <= endNum; i++) {
        const item = await this.postToAppsScript<TokenItem>('createToken', {
          token_no: String(i),
          notes: `Batch ${startNum}-${endNum}`
        });
        added.push(item);
      }
      return added;
    }
    return mockStorage.addTokenBatch(startNum, endNum);
  }

  async toggleToken(tokenNo: string, active: boolean): Promise<any> {
    const config = getBackendConfig();
    if (config.mode === 'apps_script') {
      return await this.postToAppsScript('toggleToken', { token_no: tokenNo, active });
    }
    return mockStorage.toggleTokenActive(tokenNo, active);
  }

  // Users Management
  async getUsers(): Promise<User[]> {
    const config = getBackendConfig();
    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<User[]>('getUsers');
    }
    return mockStorage.getUsers().map((u) => {
      const { password_hash, ...rest } = u;
      return rest as User;
    });
  }

  async createUser(payload: {
    username: string;
    display_name: string;
    phone_number: string;
    role: Role;
    password: string;
  }): Promise<User> {
    const config = getBackendConfig();
    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<User>('createUser', payload);
    }
    return mockStorage.createUser(payload);
  }

  async updateUserStatus(userId: string, active: boolean): Promise<void> {
    const config = getBackendConfig();
    const session = getSavedSession();
    if (config.mode === 'apps_script') {
      await this.postToAppsScript('updateUserStatus', { user_id: userId, active });
      return;
    }
    mockStorage.updateUserStatus(userId, active, session?.user.user_id || 'ADMIN');
  }

  async resetPassword(userId: string, newPass: string): Promise<void> {
    const config = getBackendConfig();
    const session = getSavedSession();
    if (config.mode === 'apps_script') {
      await this.postToAppsScript('resetPassword', { user_id: userId, new_password: newPass });
      return;
    }
    mockStorage.resetPassword(userId, newPass, session?.user.user_id || 'ADMIN');
  }

  // Audit Logs
  async getAuditLogs(limit: number = 150): Promise<AuditLog[]> {
    const config = getBackendConfig();
    if (config.mode === 'apps_script') {
      return await this.postToAppsScript<AuditLog[]>('getAuditLogs', { limit });
    }
    return mockStorage.getAuditLogs().slice(0, limit);
  }
}

export const api = new ApiService();
