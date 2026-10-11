import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorageEngine } from '../services/mockStorage';
import { getBackendConfig } from '../services/api';

describe('Temple Phone Deposit & Retrieval PRD Business Rules', () => {
  let engine: MockStorageEngine;

  beforeEach(() => {
    engine = new MockStorageEngine();
    engine.clearAll();
  });

  describe('Token Normalization (PRD Section 7)', () => {
    it('normalizes single and double digits to 3-digit padded format', () => {
      expect(engine.normalizeToken('1')).toBe('001');
      expect(engine.normalizeToken('42')).toBe('042');
      expect(engine.normalizeToken('105')).toBe('105');
      expect(engine.normalizeToken(7)).toBe('007');
    });

    it('rejects non-numeric tokens and prefixes', () => {
      expect(() => engine.normalizeToken('T-01')).toThrow('Token number must contain digits only');
      expect(() => engine.normalizeToken('abc')).toThrow('Token number must contain digits only');
    });
  });

  describe('Deposit Workflow & Validation (PRD Section 5.1 & 6)', () => {
    it('creates deposit with valid inputs and sets status to DEPOSITED', () => {
      const deposit = engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        {
          token_no: '010',
          visitor_name: 'Harish Chandra',
          mobile_number: '9876543210',
          phone_count: 2,
          storage_location: 'Tray B-01',
          request_id: 'req-test-1'
        }
      );

      expect(deposit.deposit_id).toMatch(/^DEP-\d{8}-\d{4}$/);
      expect(deposit.token_no).toBe('010');
      expect(deposit.phone_count).toBe(2);
      expect(deposit.status).toBe('DEPOSITED');
      expect(deposit.deposit_by).toBe('USR-DEPOP01');
      expect(deposit.deposited_at).toBeDefined();
    });

    it('rejects phone count less than 1 or non-integer', () => {
      expect(() =>
        engine.createDeposit(
          { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
          {
            token_no: '011',
            visitor_name: 'Sita Ram',
            mobile_number: '9876543210',
            phone_count: 0
          }
        )
      ).toThrow('Phone count must be an integer greater than or equal to 1');
    });

    it('rejects invalid mobile numbers', () => {
      expect(() =>
        engine.createDeposit(
          { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
          {
            token_no: '012',
            visitor_name: 'Sita Ram',
            mobile_number: '12345',
            phone_count: 1
          }
        )
      ).toThrow('Visitor mobile number must be a valid 10-digit phone number');
    });

    it('prevents duplicate active deposit on the same token (PRD Section 2.1 & 5.1)', () => {
      engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        {
          token_no: '020',
          visitor_name: 'Visitor One',
          mobile_number: '9876543210',
          phone_count: 1
        }
      );

      expect(() =>
        engine.createDeposit(
          { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
          {
            token_no: '020',
            visitor_name: 'Visitor Two',
            mobile_number: '9123456789',
            phone_count: 2
          }
        )
      ).toThrow(/already has an active deposit/);
    });

    it('rejects tokens not present in inventory (PRD Section 7)', () => {
      expect(() =>
        engine.createDeposit(
          { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
          {
            token_no: '999', // out of initial 100 tokens
            visitor_name: 'Visitor Out',
            mobile_number: '9876543210',
            phone_count: 1
          }
        )
      ).toThrow(/is not registered in the token inventory/);
    });
  });

  describe('Full Return Workflow & Token Reuse (PRD Section 5.2 & 5.4)', () => {
    it('completes full return atomically and releases token for reuse', () => {
      // 1. Deposit token 030
      const dep1 = engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        {
          token_no: '030',
          visitor_name: 'Kavita Patel',
          mobile_number: '9876543210',
          phone_count: 3
        }
      );

      // 2. Lookup active deposit
      const active = engine.getActiveDepositByToken({ role: 'RETRIEVAL_OPERATOR' }, '030');
      expect(active.deposit_id).toBe(dep1.deposit_id);
      expect(active.phone_count).toBe(3);

      // 3. Return full deposit
      const ret = engine.completeReturn(
        { user_id: 'USR-RETOP01', role: 'RETRIEVAL_OPERATOR' },
        '030'
      );
      expect(ret.status).toBe('RETURNED');
      expect(ret.returned_by).toBe('USR-RETOP01');
      expect(ret.returned_at).toBeDefined();

      // 4. Token 030 should now be reusable for a new deposit!
      const dep2 = engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        {
          token_no: '030',
          visitor_name: 'Next Visitor',
          mobile_number: '9811223344',
          phone_count: 1
        }
      );

      expect(dep2.deposit_id).not.toBe(dep1.deposit_id);
      expect(dep2.status).toBe('DEPOSITED');

      // Both historical records must exist in history
      const all = engine.getDeposits().filter((d) => d.token_no === '030');
      expect(all.length).toBe(2);
    });

    it('throws error when attempting to return an already returned token', () => {
      engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        {
          token_no: '031',
          visitor_name: 'Test Return',
          mobile_number: '9876543210',
          phone_count: 1
        }
      );

      engine.completeReturn({ user_id: 'USR-RETOP01', role: 'RETRIEVAL_OPERATOR' }, '031');

      expect(() =>
        engine.completeReturn({ user_id: 'USR-RETOP01', role: 'RETRIEVAL_OPERATOR' }, '031')
      ).toThrow(/Active deposit for token '031' not found or already returned/);
    });
  });

  describe('Role-Based Access Control (PRD Section 9)', () => {
    it('Deposit Operator cannot complete returns', () => {
      engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        {
          token_no: '040',
          visitor_name: 'Test RBAC',
          mobile_number: '9876543210',
          phone_count: 1
        }
      );

      expect(() =>
        engine.completeReturn({ user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' }, '040')
      ).toThrow(/is not authorized to process returns/);
    });

    it('Retrieval Operator cannot create deposits', () => {
      expect(() =>
        engine.createDeposit(
          { user_id: 'USR-RETOP01', role: 'RETRIEVAL_OPERATOR' },
          {
            token_no: '041',
            visitor_name: 'Test RBAC',
            mobile_number: '9876543210',
            phone_count: 1
          }
        )
      ).toThrow(/is not authorized to create deposits/);
    });

    it('Admin can perform both deposits and returns', () => {
      const dep = engine.createDeposit(
        { user_id: 'USR-ADMIN01', role: 'ADMIN' },
        {
          token_no: '042',
          visitor_name: 'Admin Test',
          mobile_number: '9876543210',
          phone_count: 2
        }
      );
      expect(dep.status).toBe('DEPOSITED');

      const ret = engine.completeReturn(
        { user_id: 'USR-ADMIN01', role: 'ADMIN' },
        '042'
      );
      expect(ret.status).toBe('RETURNED');
    });
  });

  describe('Idempotency (PRD Section 11 & 14)', () => {
    it('returns existing deposit if request_id is repeated', () => {
      const reqId = 'unique-client-req-999';
      const dep1 = engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        {
          token_no: '050',
          visitor_name: 'Retry Visitor',
          mobile_number: '9876543210',
          phone_count: 2,
          request_id: reqId
        }
      );

      const dep2 = engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        {
          token_no: '050',
          visitor_name: 'Retry Visitor',
          mobile_number: '9876543210',
          phone_count: 2,
          request_id: reqId
        }
      );

      expect(dep2.deposit_id).toBe(dep1.deposit_id);
      const allForToken = engine.getDeposits().filter((d) => d.token_no === '050');
      expect(allForToken.length).toBe(1);
    });
  });

  describe('Controlled Corrections & Audit Trail (PRD Section 3.1 & 14)', () => {
    it('requires mandatory reason and records old and new values in audit log', () => {
      const dep = engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        {
          token_no: '060',
          visitor_name: 'Correction Test',
          mobile_number: '9876543210',
          phone_count: 1
        }
      );

      expect(() =>
        engine.correctDeposit(
          { user_id: 'USR-ADMIN01', role: 'ADMIN' },
          dep.deposit_id,
          { notes: 'Updated slot' },
          ' ' // Empty reason
        )
      ).toThrow(/mandatory reason is required/);

      const corrected = engine.correctDeposit(
        { user_id: 'USR-ADMIN01', role: 'ADMIN' },
        dep.deposit_id,
        { storage_location: 'Tray C-09', notes: 'Moved to higher rack' },
        'Counter rack reorganization verified by shift head'
      );

      expect(corrected.storage_location).toBe('Tray C-09');

      const logs = engine.getAuditLogs();
      const correctionLog = logs.find((l) => l.action === 'CORRECTION' && l.entity_id === dep.deposit_id);
      expect(correctionLog).toBeDefined();
      expect(correctionLog?.details).toContain('reorganization');
    });
  });

  describe('Dashboard Pending Phones & Shift Reconciliation (PRD Section 13)', () => {
    it('calculates pending phones as sum of phone_count for active deposits only', () => {
      // Clear initial sample deposits to test exact counts
      engine.setDeposits([]);

      engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        { token_no: '071', visitor_name: 'V1', mobile_number: '9876543210', phone_count: 2 }
      );
      engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        { token_no: '072', visitor_name: 'V2', mobile_number: '9876543210', phone_count: 3 }
      );
      engine.createDeposit(
        { user_id: 'USR-DEPOP01', role: 'DEPOSIT_OPERATOR' },
        { token_no: '073', visitor_name: 'V3', mobile_number: '9876543210', phone_count: 1 }
      );

      let stats = engine.getDashboardStats();
      expect(stats.currentPendingPhones).toBe(6);
      expect(stats.activeTokensCount).toBe(3);

      // Return token 072 (which had 3 phones)
      engine.completeReturn({ user_id: 'USR-RETOP01', role: 'RETRIEVAL_OPERATOR' }, '072');

      stats = engine.getDashboardStats();
      expect(stats.currentPendingPhones).toBe(3); // 2 + 1 = 3
      expect(stats.activeTokensCount).toBe(2);
      expect(stats.totalPhonesReturned).toBe(3);
    });
  });

  describe('Backend Configuration & Environment Variable Handling', () => {
    let mockStore: Record<string, string> = {};

    beforeEach(() => {
      mockStore = {};
      globalThis.localStorage = {
        getItem: (k: string) => mockStore[k] || null,
        setItem: (k: string, v: string) => {
          mockStore[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStore[k];
        },
        clear: () => {
          mockStore = {};
        },
        key: () => null,
        length: 0
      } as Storage;
    });

    it('returns valid config object with mode and url', () => {
      const config = getBackendConfig();
      expect(config).toBeDefined();
      expect(['mock', 'apps_script']).toContain(config.mode);
      expect(typeof config.appsScriptUrl).toBe('string');
      expect(typeof config.isEnvConfigured).toBe('boolean');
    });

    it('reads configuration when stored in localStorage', () => {
      localStorage.setItem(
        'temple_vault_backend_config',
        JSON.stringify({ mode: 'apps_script', appsScriptUrl: 'https://script.google.com/macros/s/test/exec' })
      );
      const config = getBackendConfig();
      expect(config.appsScriptUrl).toBe('https://script.google.com/macros/s/test/exec');
      expect(config.mode).toBe('apps_script');
    });
  });
});

