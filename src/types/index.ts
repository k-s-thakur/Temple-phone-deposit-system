export type Role = 'ADMIN' | 'DEPOSIT_OPERATOR' | 'RETRIEVAL_OPERATOR';

export type DepositStatus = 'DEPOSITED' | 'RETURNED';

export interface Deposit {
  deposit_id: string;
  token_no: string;
  visitor_name: string;
  mobile_number: string;
  phone_count: number;
  storage_location?: string;
  deposited_at: string;
  deposit_by: string;
  status: DepositStatus;
  returned_at?: string;
  returned_by?: string;
  notes?: string;
  request_id: string;
}

export interface TokenItem {
  token_no: string;
  active: boolean;
  created_at: string;
  notes?: string;
}

export interface User {
  user_id: string;
  username: string;
  password_hash?: string;
  display_name: string;
  phone_number: string;
  role: Role;
  active: boolean;
  created_at: string;
  last_login_at?: string;
  failed_login_count: number;
  password_changed_at?: string;
}

export interface AuditLog {
  audit_id: string;
  timestamp: string;
  user_id: string;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'FAILED_LOGIN'
    | 'DEPOSIT'
    | 'RETURN'
    | 'USER_CREATE'
    | 'USER_UPDATE'
    | 'TOKEN_CREATE'
    | 'TOKEN_UPDATE'
    | 'CORRECTION'
    | 'CONFIG_UPDATE';
  entity_id: string;
  result: 'SUCCESS' | 'FAILURE';
  details: string;
  request_id: string;
}

export interface AppConfig {
  config_key: string;
  config_value: string;
  updated_at: string;
  updated_by: string;
}

export interface AuthSession {
  token: string;
  user: {
    user_id: string;
    username: string;
    display_name: string;
    role: Role;
    phone_number?: string;
  };
  expires_at: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  request_id?: string;
}

export interface DashboardStats {
  totalPhonesDeposited: number;
  totalPhonesReturned: number;
  currentPendingPhones: number;
  activeTokensCount: number;
  totalTransactionsToday: number;
  depositsToday: number;
  returnsToday: number;
  operatorStats: {
    operatorId: string;
    displayName: string;
    role: Role;
    depositsCount: number;
    phonesDeposited: number;
    returnsCount: number;
    phonesReturned: number;
  }[];
}
