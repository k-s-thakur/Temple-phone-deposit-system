import { Deposit, TokenItem, User, AuditLog, AppConfig, DashboardStats, Role } from '../types';

const STORAGE_KEYS = {
  DEPOSITS: 'temple_phone_deposits',
  TOKENS: 'temple_phone_tokens',
  USERS: 'temple_phone_users',
  AUDIT_LOGS: 'temple_phone_audit_logs',
  CONFIG: 'temple_phone_config',
  BACKEND_CONFIG: 'temple_phone_backend_config'
};

// Seed initial default tokens (001 to 500)
function getInitialTokens(): TokenItem[] {
  const tokens: TokenItem[] = [];
  const now = new Date().toISOString();
  for (let i = 1; i <= 500; i++) {
    const numStr = String(i).padStart(3, '0');
    tokens.push({
      token_no: numStr,
      active: true,
      created_at: now,
      notes: `Batch 1 - Token ${numStr}`
    });
  }
  return tokens;
}

// Seed initial default staff accounts
function getInitialUsers(): User[] {
  const now = new Date().toISOString();
  return [
    {
      user_id: 'USR-ADMIN01',
      username: 'admin',
      password_hash: 'Admin@123', // In demo/mock mode, direct match or hash
      display_name: 'Temple Chief Admin',
      phone_number: '9876500000',
      role: 'ADMIN',
      active: true,
      created_at: now,
      failed_login_count: 0
    },
    {
      user_id: 'USR-DEPOP01',
      username: 'deposit_op',
      password_hash: 'Operator@123',
      display_name: 'Counter Deposit Staff',
      phone_number: '9876500001',
      role: 'DEPOSIT_OPERATOR',
      active: true,
      created_at: now,
      failed_login_count: 0
    },
    {
      user_id: 'USR-RETOP01',
      username: 'retrieval_op',
      password_hash: 'Operator@123',
      display_name: 'Counter Retrieval Staff',
      phone_number: '9876500002',
      role: 'RETRIEVAL_OPERATOR',
      active: true,
      created_at: now,
      failed_login_count: 0
    }
  ];
}

// Seed initial sample deposits for immediate realistic demonstration
function getInitialDeposits(): Deposit[] {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const t1 = new Date(Date.now() - 3600000 * 2).toISOString();
  const t2 = new Date(Date.now() - 3600000 * 1.5).toISOString();
  const t3 = new Date(Date.now() - 3600000 * 1).toISOString();
  const t4 = new Date(Date.now() - 1800000).toISOString();

  return [
    {
      deposit_id: `DEP-${todayStr}-1001`,
      token_no: '001',
      visitor_name: 'Ramesh Kumar',
      mobile_number: '9876543210',
      phone_count: 2,
      storage_location: 'Tray A-01',
      deposited_at: t1,
      deposit_by: 'USR-DEPOP01',
      status: 'DEPOSITED',
      notes: 'Family phones (Samsung + iPhone)',
      request_id: 'seed-req-001'
    },
    {
      deposit_id: `DEP-${todayStr}-1002`,
      token_no: '002',
      visitor_name: 'Priya Sharma',
      mobile_number: '9845012345',
      phone_count: 1,
      storage_location: 'Tray A-02',
      deposited_at: t2,
      deposit_by: 'USR-DEPOP01',
      status: 'DEPOSITED',
      notes: 'Black pouch',
      request_id: 'seed-req-002'
    },
    {
      deposit_id: `DEP-${todayStr}-1003`,
      token_no: '003',
      visitor_name: 'Anand Verma',
      mobile_number: '9711223344',
      phone_count: 3,
      storage_location: 'Tray A-03',
      deposited_at: t3,
      deposit_by: 'USR-ADMIN01',
      status: 'RETURNED',
      returned_at: t4,
      returned_by: 'USR-RETOP01',
      notes: 'Returned in full',
      request_id: 'seed-req-003'
    }
  ];
}

function getInitialAuditLogs(): AuditLog[] {
  return [
    {
      audit_id: 'AUD-INIT-001',
      timestamp: new Date().toISOString(),
      user_id: 'SYSTEM',
      action: 'LOGIN',
      entity_id: 'SYSTEM',
      result: 'SUCCESS',
      details: 'Mock Storage Initialized with Default Seed Data',
      request_id: 'req-init-seed'
    }
  ];
}

export class MockStorageEngine {
  private memoryStore: Record<string, string> = {};

  clearAll(): void {
    this.memoryStore = {};
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
    }
  }

  private getStorage<T>(key: string, defaultVal: T): T {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(key);
        if (!item) {
          localStorage.setItem(key, JSON.stringify(defaultVal));
          return defaultVal;
        }
        return JSON.parse(item);
      } else {
        const item = this.memoryStore[key];
        if (!item) {
          this.memoryStore[key] = JSON.stringify(defaultVal);
          return defaultVal;
        }
        return JSON.parse(item);
      }
    } catch {
      return defaultVal;
    }
  }

  private setStorage<T>(key: string, val: T): void {
    try {
      const serialized = JSON.stringify(val);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, serialized);
      } else {
        this.memoryStore[key] = serialized;
      }
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  // Token Normalization (PRD Section 7)
  normalizeToken(tokenInput: string | number): string {
    const cleaned = String(tokenInput).trim();
    if (!/^\d+$/.test(cleaned)) {
      throw new Error('Token number must contain digits only');
    }
    return cleaned.padStart(3, '0');
  }

  // Audit Logger
  logAudit(
    userId: string,
    action: AuditLog['action'],
    entityId: string,
    result: 'SUCCESS' | 'FAILURE',
    details: any,
    requestId?: string
  ): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      audit_id: `AUD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      user_id: userId,
      action,
      entity_id: String(entityId),
      result,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      request_id: requestId || `req-${Date.now()}`
    };
    logs.unshift(newLog);
    this.setStorage(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 300));
  }

  getAuditLogs(): AuditLog[] {
    return this.getStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, getInitialAuditLogs());
  }

  // Tokens
  getTokens(): TokenItem[] {
    const tokens = this.getStorage<TokenItem[]>(STORAGE_KEYS.TOKENS, getInitialTokens());
    if (tokens.length < 500) {
      const existing = new Set(tokens.map((t) => t.token_no));
      let modified = false;
      const now = new Date().toISOString();
      for (let i = 1; i <= 500; i++) {
        const numStr = String(i).padStart(3, '0');
        if (!existing.has(numStr)) {
          tokens.push({
            token_no: numStr,
            active: true,
            created_at: now,
            notes: `Batch 1 - Token ${numStr}`
          });
          modified = true;
        }
      }
      if (modified) {
        tokens.sort((a, b) => parseInt(a.token_no, 10) - parseInt(b.token_no, 10));
        this.setStorage(STORAGE_KEYS.TOKENS, tokens);
      }
    }
    return tokens;
  }

  addToken(tokenNo: string, notes: string = ''): TokenItem {
    const normToken = this.normalizeToken(tokenNo);
    const tokens = this.getTokens();
    if (tokens.some((t) => t.token_no === normToken)) {
      throw new Error(`Token '${normToken}' already exists in inventory.`);
    }
    const newToken: TokenItem = {
      token_no: normToken,
      active: true,
      created_at: new Date().toISOString(),
      notes
    };
    tokens.push(newToken);
    tokens.sort((a, b) => parseInt(a.token_no, 10) - parseInt(b.token_no, 10));
    this.setStorage(STORAGE_KEYS.TOKENS, tokens);
    this.logAudit('ADMIN', 'TOKEN_CREATE', normToken, 'SUCCESS', { notes });
    return newToken;
  }

  addTokenBatch(startNum: number, endNum: number): TokenItem[] {
    const tokens = this.getTokens();
    const existing = new Set(tokens.map((t) => t.token_no));
    const added: TokenItem[] = [];
    const now = new Date().toISOString();

    for (let i = startNum; i <= endNum; i++) {
      const norm = this.normalizeToken(i);
      if (!existing.has(norm)) {
        const item: TokenItem = {
          token_no: norm,
          active: true,
          created_at: now,
          notes: `Batch range ${startNum}-${endNum}`
        };
        tokens.push(item);
        added.push(item);
      }
    }
    tokens.sort((a, b) => parseInt(a.token_no, 10) - parseInt(b.token_no, 10));
    this.setStorage(STORAGE_KEYS.TOKENS, tokens);
    this.logAudit('ADMIN', 'TOKEN_CREATE', `${startNum}-${endNum}`, 'SUCCESS', { count: added.length });
    return added;
  }

  toggleTokenActive(tokenNo: string, active: boolean): TokenItem {
    const norm = this.normalizeToken(tokenNo);
    const tokens = this.getTokens();
    const target = tokens.find((t) => t.token_no === norm);
    if (!target) {
      throw new Error(`Token '${norm}' was not found in inventory.`);
    }
    target.active = active;
    this.setStorage(STORAGE_KEYS.TOKENS, tokens);
    this.logAudit('ADMIN', 'TOKEN_UPDATE', norm, 'SUCCESS', { active });
    return target;
  }

  // Users
  getUsers(): User[] {
    return this.getStorage<User[]>(STORAGE_KEYS.USERS, getInitialUsers());
  }

  createUser(payload: {
    username: string;
    display_name: string;
    phone_number: string;
    role: Role;
    password: string;
  }): User {
    const username = payload.username.trim().toLowerCase();
    const users = this.getUsers();
    if (users.some((u) => u.username === username)) {
      throw new Error(`Username '${username}' is already in use.`);
    }

    const newUser: User = {
      user_id: `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      username,
      password_hash: payload.password,
      display_name: payload.display_name.trim(),
      phone_number: payload.phone_number.trim(),
      role: payload.role,
      active: true,
      created_at: new Date().toISOString(),
      failed_login_count: 0
    };

    users.push(newUser);
    this.setStorage(STORAGE_KEYS.USERS, users);
    this.logAudit('ADMIN', 'USER_CREATE', newUser.user_id, 'SUCCESS', { username, role: payload.role });
    return newUser;
  }

  updateUserStatus(userId: string, active: boolean, currentAdminId: string): void {
    const users = this.getUsers();
    const target = users.find((u) => u.user_id === userId);
    if (!target) {
      throw new Error(`User '${userId}' not found.`);
    }
    if (target.role === 'ADMIN' && !active && target.user_id === currentAdminId) {
      throw new Error('You cannot deactivate your own active admin account.');
    }
    target.active = active;
    this.setStorage(STORAGE_KEYS.USERS, users);
    this.logAudit(currentAdminId, 'USER_UPDATE', userId, 'SUCCESS', { active });
  }

  resetPassword(userId: string, newPass: string, currentAdminId: string): void {
    const users = this.getUsers();
    const target = users.find((u) => u.user_id === userId);
    if (!target) {
      throw new Error(`User '${userId}' not found.`);
    }
    target.password_hash = newPass;
    target.failed_login_count = 0;
    target.password_changed_at = new Date().toISOString();
    this.setStorage(STORAGE_KEYS.USERS, users);
    this.logAudit(currentAdminId, 'USER_UPDATE', userId, 'SUCCESS', { action: 'password_reset' });
  }

  setUsers(users: User[]): void {
    this.setStorage(STORAGE_KEYS.USERS, users);
  }

  unlockUser(userId: string, currentAdminId: string = 'ADMIN'): void {
    const users = this.getUsers();
    const target = users.find((u) => u.user_id === userId);
    if (!target) {
      throw new Error(`User '${userId}' not found.`);
    }
    target.failed_login_count = 0;
    this.setStorage(STORAGE_KEYS.USERS, users);
    this.logAudit(currentAdminId, 'USER_UPDATE', userId, 'SUCCESS', { action: 'unlock_account' });
  }

  // Deposits
  getDeposits(): Deposit[] {
    return this.getStorage<Deposit[]>(STORAGE_KEYS.DEPOSITS, getInitialDeposits());
  }

  setDeposits(deposits: Deposit[]): void {
    this.setStorage(STORAGE_KEYS.DEPOSITS, deposits);
  }

  createDeposit(
    actor: { user_id: string; role: Role },
    payload: {
      token_no: string;
      visitor_name: string;
      mobile_number: string;
      phone_count: number;
      storage_location?: string;
      notes?: string;
      request_id?: string;
    }
  ): Deposit {
    if (actor.role !== 'ADMIN' && actor.role !== 'DEPOSIT_OPERATOR') {
      throw new Error(`Role '${actor.role}' is not authorized to create deposits.`);
    }

    const normToken = this.normalizeToken(payload.token_no);
    const count = Number(payload.phone_count);
    if (!Number.isInteger(count) || count < 1) {
      throw new Error('Phone count must be an integer greater than or equal to 1.');
    }

    const cleanMobile = String(payload.mobile_number).replace(/[\s\-\+]/g, '');
    if (!/^\d{10}$/.test(cleanMobile)) {
      throw new Error('Visitor mobile number must be a valid 10-digit phone number.');
    }

    const cleanName = payload.visitor_name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new Error('Visitor name must be at least 2 characters.');
    }

    const requestId = payload.request_id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const deposits = this.getDeposits();

    // Idempotency check (PRD Section 11 & 14)
    const existing = deposits.find((d) => d.request_id === requestId);
    if (existing) {
      this.logAudit(actor.user_id, 'DEPOSIT', existing.deposit_id, 'SUCCESS', 'Idempotent duplicate deposit returned', requestId);
      return existing;
    }

    // Token inventory check (PRD Section 7 & 8.2)
    const tokens = this.getTokens();
    const tokenRecord = tokens.find((t) => t.token_no === normToken);
    if (!tokenRecord) {
      throw new Error(`Token '${normToken}' is not registered in the token inventory.`);
    }
    if (!tokenRecord.active) {
      throw new Error(`Token '${normToken}' is marked inactive in inventory.`);
    }

    // Active deposit check (PRD Section 1, 5.1, 7)
    const activeDep = deposits.find((d) => d.token_no === normToken && d.status === 'DEPOSITED');
    if (activeDep) {
      throw new Error(
        `Token '${normToken}' already has an active deposit (ID: ${activeDep.deposit_id}). Tokens cannot be reused until fully returned.`
      );
    }

    // Generate unique Deposit ID
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const depositId = `DEP-${todayStr}-${randNum}`;

    const newDeposit: Deposit = {
      deposit_id: depositId,
      token_no: normToken,
      visitor_name: cleanName,
      mobile_number: cleanMobile,
      phone_count: count,
      storage_location: payload.storage_location?.trim() || '',
      deposited_at: new Date().toISOString(),
      deposit_by: actor.user_id,
      status: 'DEPOSITED',
      notes: payload.notes?.trim() || '',
      request_id: requestId
    };

    deposits.unshift(newDeposit);
    this.setStorage(STORAGE_KEYS.DEPOSITS, deposits);
    this.logAudit(
      actor.user_id,
      'DEPOSIT',
      depositId,
      'SUCCESS',
      { token_no: normToken, phones: count, visitor: cleanName },
      requestId
    );

    return newDeposit;
  }

  getActiveDepositByToken(
    actor: { role: Role },
    tokenNoInput: string
  ): Deposit {
    const norm = this.normalizeToken(tokenNoInput);
    const deposits = this.getDeposits();
    const active = deposits.find((d) => d.token_no === norm && d.status === 'DEPOSITED');
    if (!active) {
      throw new Error(
        `No active deposit found for token '${norm}'. The token is either not in use or was already returned.`
      );
    }

    // Clone and mask mobile for non-admin
    const copy = { ...active };
    if (actor.role !== 'ADMIN' && copy.mobile_number.length >= 4) {
      copy.mobile_number = `******${copy.mobile_number.slice(-4)}`;
    }
    return copy;
  }

  completeReturn(
    actor: { user_id: string; role: Role },
    tokenNoInput: string,
    requestId?: string
  ): Deposit {
    if (actor.role !== 'ADMIN' && actor.role !== 'RETRIEVAL_OPERATOR') {
      throw new Error(`Role '${actor.role}' is not authorized to process returns.`);
    }

    const norm = this.normalizeToken(tokenNoInput);
    const deposits = this.getDeposits();
    const reqId = requestId || `req-ret-${Date.now()}`;

    // Idempotency
    const returnedWithReq = deposits.find((d) => d.request_id === reqId && d.status === 'RETURNED');
    if (returnedWithReq) {
      return returnedWithReq;
    }

    const target = deposits.find((d) => d.token_no === norm && d.status === 'DEPOSITED');
    if (!target) {
      throw new Error(`Active deposit for token '${norm}' not found or already returned.`);
    }

    const returnTime = new Date().toISOString();
    target.status = 'RETURNED';
    target.returned_at = returnTime;
    target.returned_by = actor.user_id;

    this.setStorage(STORAGE_KEYS.DEPOSITS, deposits);
    this.logAudit(
      actor.user_id,
      'RETURN',
      target.deposit_id,
      'SUCCESS',
      { token_no: norm, phones: target.phone_count, visitor: target.visitor_name },
      reqId
    );

    return target;
  }

  correctDeposit(
    actor: { user_id: string; role: Role },
    depositId: string,
    updates: { status?: Deposit['status']; notes?: string; storage_location?: string },
    reason: string
  ): Deposit {
    if (actor.role !== 'ADMIN') {
      throw new Error('Only administrators can perform controlled record corrections.');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('A mandatory reason is required for administrative corrections.');
    }

    const deposits = this.getDeposits();
    const target = deposits.find((d) => d.deposit_id === depositId);
    if (!target) {
      throw new Error(`Deposit '${depositId}' not found.`);
    }

    const oldValues = {
      status: target.status,
      phone_count: target.phone_count,
      storage_location: target.storage_location,
      notes: target.notes
    };

    if (updates.notes !== undefined) target.notes = updates.notes;
    if (updates.storage_location !== undefined) target.storage_location = updates.storage_location;
    if (updates.status && (updates.status === 'DEPOSITED' || updates.status === 'RETURNED')) {
      target.status = updates.status;
      if (updates.status === 'RETURNED' && !target.returned_at) {
        target.returned_at = new Date().toISOString();
        target.returned_by = actor.user_id;
      }
    }

    this.setStorage(STORAGE_KEYS.DEPOSITS, deposits);
    this.logAudit(actor.user_id, 'CORRECTION', depositId, 'SUCCESS', { reason, oldValues, updates });
    return target;
  }

  getDashboardStats(): DashboardStats {
    const deposits = this.getDeposits();
    const users = this.getUsers();

    let totalPhonesDeposited = 0;
    let totalPhonesReturned = 0;
    let currentPendingPhones = 0;
    let activeTokensCount = 0;
    let depositsToday = 0;
    let returnsToday = 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    const opMap: Record<string, DashboardStats['operatorStats'][0]> = {};

    users.forEach((u) => {
      opMap[u.user_id] = {
        operatorId: u.user_id,
        displayName: u.display_name,
        role: u.role,
        depositsCount: 0,
        phonesDeposited: 0,
        returnsCount: 0,
        phonesReturned: 0
      };
    });

    deposits.forEach((d) => {
      const pCount = Number(d.phone_count) || 0;
      totalPhonesDeposited += pCount;

      if (d.deposited_at?.startsWith(todayStr)) {
        depositsToday++;
      }

      if (d.deposit_by && opMap[d.deposit_by]) {
        opMap[d.deposit_by].depositsCount++;
        opMap[d.deposit_by].phonesDeposited += pCount;
      }

      if (d.status === 'DEPOSITED') {
        currentPendingPhones += pCount;
        activeTokensCount++;
      } else if (d.status === 'RETURNED') {
        totalPhonesReturned += pCount;
        if (d.returned_at?.startsWith(todayStr)) {
          returnsToday++;
        }
        if (d.returned_by && opMap[d.returned_by]) {
          opMap[d.returned_by].returnsCount++;
          opMap[d.returned_by].phonesReturned += pCount;
        }
      }
    });

    return {
      totalPhonesDeposited,
      totalPhonesReturned,
      currentPendingPhones,
      activeTokensCount,
      totalTransactionsToday: depositsToday + returnsToday,
      depositsToday,
      returnsToday,
      operatorStats: Object.values(opMap)
    };
  }
}

export const mockStorage = new MockStorageEngine();
