/**
 * Unified_AllInOne_Code.gs
 * Complete Temple Phone Vault Backend in a Single File
 * Paste this entire file into Code.gs in Apps Script
 */


// ==========================================
// FILE: Validation.gs
// ==========================================

/**
 * Validation.gs
 * Strict input validation and sanitization for Temple Phone Deposit & Retrieval Web App.
 */

var Validation = {
  /**
   * Normalize and validate token number.
   * Tokens are numeric text preserving leading zeros (e.g., '001', '042').
   * PRD Section 7: Operator enters digits; store as text; normalize consistently.
   */
  normalizeToken: function(tokenInput) {
    if (tokenInput === undefined || tokenInput === null) {
      throw new Error("Token number is required");
    }
    var cleaned = String(tokenInput).trim();
    if (!/^\d+$/.test(cleaned)) {
      throw new Error("Token number must contain digits only");
    }
    // Pad to 3 digits minimum if less than 3 digits, or preserve if longer
    if (cleaned.length < 3) {
      while (cleaned.length < 3) {
        cleaned = "0" + cleaned;
      }
    }
    return cleaned;
  },

  /**
   * Validate total phones deposited.
   * PRD Section 1: Phone count must be an integer >= 1.
   */
  validatePhoneCount: function(countInput) {
    var count = Number(countInput);
    if (!Number.isInteger(count) || count < 1) {
      throw new Error("Phone count must be an integer greater than or equal to 1");
    }
    return count;
  },

  /**
   * Validate visitor mobile number.
   * 10 digits standard mobile format.
   */
  validateMobileNumber: function(mobileInput) {
    if (!mobileInput) {
      throw new Error("Visitor mobile number is required");
    }
    var cleaned = String(mobileInput).replace(/[\s\-\+]/g, "");
    // Check if 10 digits or with optional country code 91
    if (/^91\d{10}$/.test(cleaned)) {
      cleaned = cleaned.substring(2);
    }
    if (!/^\d{10}$/.test(cleaned)) {
      throw new Error("Visitor mobile number must be a valid 10-digit number");
    }
    return cleaned;
  },

  /**
   * Validate visitor name.
   */
  validateVisitorName: function(nameInput) {
    if (!nameInput || typeof nameInput !== "string") {
      throw new Error("Visitor name is required");
    }
    var cleaned = nameInput.trim();
    if (cleaned.length < 2 || cleaned.length > 80) {
      throw new Error("Visitor name must be between 2 and 80 characters");
    }
    return cleaned;
  },

  /**
   * Validate username format.
   */
  validateUsername: function(usernameInput) {
    if (!usernameInput || typeof usernameInput !== "string") {
      throw new Error("Username is required");
    }
    var cleaned = usernameInput.trim().toLowerCase();
    if (!/^[a-z0-9_\-\.]{3,30}$/.test(cleaned)) {
      throw new Error("Username must be 3-30 characters with alphanumeric, underscore, dot, or hyphen only");
    }
    return cleaned;
  },

  /**
   * Sanitize optional text fields (notes, storage location).
   */
  sanitizeOptionalText: function(textInput, maxLength) {
    if (!textInput) return "";
    var limit = maxLength || 200;
    var cleaned = String(textInput).trim();
    return cleaned.substring(0, limit);
  }
};


// ==========================================
// FILE: Repository.gs
// ==========================================

/**
 * Repository.gs
 * Google Sheets Data Access Layer with schema validation and safe cell formatting.
 */

var Repository = {
  SHEET_NAMES: {
    DEPOSITS: "Deposits",
    TOKENS: "Tokens",
    USERS: "Users",
    AUDIT_LOGS: "AuditLogs",
    APP_CONFIG: "AppConfig"
  },

  EXPECTED_HEADERS: {
    Deposits: [
      "deposit_id",
      "token_no",
      "visitor_name",
      "mobile_number",
      "phone_count",
      "storage_location",
      "deposited_at",
      "deposit_by",
      "status",
      "returned_at",
      "returned_by",
      "notes",
      "request_id"
    ],
    Tokens: [
      "token_no",
      "active",
      "created_at",
      "notes"
    ],
    Users: [
      "user_id",
      "username",
      "password_hash",
      "display_name",
      "phone_number",
      "role",
      "active",
      "created_at",
      "last_login_at",
      "failed_login_count",
      "password_changed_at"
    ],
    AuditLogs: [
      "audit_id",
      "timestamp",
      "user_id",
      "action",
      "entity_id",
      "result",
      "details",
      "request_id"
    ],
    AppConfig: [
      "config_key",
      "config_value",
      "updated_at",
      "updated_by"
    ]
  },

  getSpreadsheet: function() {
    var props = PropertiesService.getScriptProperties();
    var spreadsheetId = props.getProperty("SPREADSHEET_ID");
    if (spreadsheetId) {
      return SpreadsheetApp.openById(spreadsheetId);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  getSheet: function(sheetName) {
    var ss = this.getSpreadsheet();
    if (!ss) {
      throw new Error("Unable to access Google Spreadsheet. Configure SPREADSHEET_ID in Script Properties.");
    }
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("Required sheet '" + sheetName + "' was not found. Please run setupDatabase() first.");
    }
    this.validateHeaders(sheet, sheetName);
    return sheet;
  },

  /**
   * Fail safely if columns have changed or moved (PRD Section 14).
   */
  validateHeaders: function(sheet, sheetName) {
    var expected = this.EXPECTED_HEADERS[sheetName];
    if (!expected) return;

    var lastCol = sheet.getLastColumn();
    if (lastCol < expected.length) {
      throw new Error("Schema error: Sheet '" + sheetName + "' has fewer columns than required.");
    }

    var headers = sheet.getRange(1, 1, 1, expected.length).getValues()[0];
    for (var i = 0; i < expected.length; i++) {
      var headerVal = String(headers[i]).trim();
      if (headerVal.toLowerCase() !== expected[i].toLowerCase()) {
        throw new Error(
          "Schema mismatch in sheet '" + sheetName + "'. Expected column " + (i + 1) + 
          " to be '" + expected[i] + "', but found '" + headerVal + "'."
        );
      }
    }
  },

  /**
   * Get all rows as objects mapping column names to cell values.
   */
  getAll: function(sheetName) {
    var sheet = this.getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return [];

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h).trim();
    });

    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    var values = dataRange.getValues();

    return values.map(function(row, index) {
      var obj = { _rowIndex: index + 2 };
      for (var c = 0; c < headers.length; c++) {
        var h = headers[c];
        var val = row[c];
        // Ensure token_no is always string to keep leading zeros
        if (h === "token_no" || h === "mobile_number") {
          val = String(val !== null && val !== undefined ? val : "");
        }
        obj[h] = val;
      }
      return obj;
    });
  },

  /**
   * Append a new object record into the specified sheet.
   */
  appendRow: function(sheetName, record) {
    var sheet = this.getSheet(sheetName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
      return String(h).trim();
    });

    var rowValues = headers.map(function(header) {
      var val = record[header];
      if (val === undefined || val === null) return "";
      if (header === "token_no" || header === "mobile_number") {
        return "'" + String(val); // Leading apostrophe forces Google Sheets to treat as plain text!
      }
      return val;
    });

    sheet.appendRow(rowValues);
    var newRowIdx = sheet.getLastRow();

    // Format token column as text format
    var tokenColIdx = headers.indexOf("token_no");
    if (tokenColIdx !== -1) {
      sheet.getRange(newRowIdx, tokenColIdx + 1).setNumberFormat("@");
    }

    return newRowIdx;
  },

  /**
   * Update an existing row by row index with specified fields.
   */
  updateRow: function(sheetName, rowIndex, updateFields) {
    var sheet = this.getSheet(sheetName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
      return String(h).trim();
    });

    for (var key in updateFields) {
      if (updateFields.hasOwnProperty(key)) {
        var colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          var val = updateFields[key];
          if (key === "token_no" || key === "mobile_number") {
            sheet.getRange(rowIndex, colIdx + 1).setNumberFormat("@").setValue("'" + String(val));
          } else {
            sheet.getRange(rowIndex, colIdx + 1).setValue(val);
          }
        }
      }
    }
  }
};


// ==========================================
// FILE: AuditService.gs
// ==========================================

/**
 * AuditService.gs
 * Append-only immutable audit logging for security and compliance (PRD Section 8.4).
 */

var AuditService = {
  log: function(userId, action, entityId, result, details, requestId) {
    try {
      var auditId = "AUD-" + Utilities.formatDate(new Date(), "GMT+5:30", "yyyyMMdd") + "-" + Utilities.getUuid().substring(0, 8);
      var record = {
        audit_id: auditId,
        timestamp: new Date().toISOString(),
        user_id: userId || "SYSTEM",
        action: action,
        entity_id: String(entityId || ""),
        result: result || "SUCCESS",
        details: typeof details === "object" ? JSON.stringify(details) : String(details || ""),
        request_id: requestId || Utilities.getUuid()
      };

      Repository.appendRow(Repository.SHEET_NAMES.AUDIT_LOGS, record);
      return auditId;
    } catch (err) {
      console.error("Failed to append audit log: " + err.message);
      // In production Apps Script, we log but never break critical user flows if audit logger has non-fatal error
      return null;
    }
  },

  getRecentLogs: function(limit) {
    var logs = Repository.getAll(Repository.SHEET_NAMES.AUDIT_LOGS);
    var max = limit || 100;
    // Sort newest first
    logs.sort(function(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return logs.slice(0, max);
  }
};


// ==========================================
// FILE: SessionService.gs
// ==========================================

/**
 * SessionService.gs
 * Fast, secure session token generation, verification, and revocation.
 */

var SessionService = {
  SESSION_DURATION_SECONDS: 21600, // 6 hours

  createSession: function(userRecord) {
    var token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    var sessionData = {
      userId: userRecord.user_id,
      username: userRecord.username,
      displayName: userRecord.display_name,
      role: userRecord.role,
      expiresAt: Date.now() + (this.SESSION_DURATION_SECONDS * 1000)
    };

    var cache = CacheService.getScriptCache();
    cache.put(token, JSON.stringify(sessionData), this.SESSION_DURATION_SECONDS);

    return {
      token: token,
      expiresAt: sessionData.expiresAt,
      sessionData: sessionData
    };
  },

  getSession: function(token) {
    if (!token) return null;
    var cache = CacheService.getScriptCache();
    var cached = cache.get(token);
    if (!cached) return null;
    try {
      var session = JSON.parse(cached);
      if (Date.now() > session.expiresAt) {
        cache.remove(token);
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  },

  /**
   * Validate session and check role permissions.
   * Throws descriptive authorization error if denied.
   */
  requireAuth: function(token, allowedRoles) {
    var session = this.getSession(token);
    if (!session) {
      throw new Error("Unauthorized: Session is invalid or has expired. Please log in again.");
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (allowedRoles.indexOf(session.role) === -1) {
        throw new Error("Forbidden: Role '" + session.role + "' is not permitted to perform this operation.");
      }
    }

    return session;
  },

  revokeSession: function(token) {
    if (!token) return;
    var cache = CacheService.getScriptCache();
    cache.remove(token);
  }
};


// ==========================================
// FILE: AuthService.gs
// ==========================================

/**
 * AuthService.gs
 * Secure authentication, salted multi-round password hashing, failed attempt tracking, and role verification.
 */

var AuthService = {
  PEPPER: "TEMPLE_PHONE_VAULT_SECURITY_PEPPER_2026",
  MAX_FAILED_ATTEMPTS: 5,
  ITERATIONS: 5000,

  /**
   * Hash password with unique random salt and multiple rounds.
   * Format: iterations:saltHex:hashHex
   */
  hashPassword: function(plainPassword, customSalt) {
    var salt = customSalt || Utilities.getUuid().replace(/-/g, "");
    var current = salt + plainPassword + this.PEPPER;

    for (var i = 0; i < this.ITERATIONS; i++) {
      var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, current);
      current = digest.map(function(byte) {
        var v = (byte < 0 ? byte + 256 : byte).toString(16);
        return v.length === 1 ? "0" + v : v;
      }).join("");
    }

    return this.ITERATIONS + ":" + salt + ":" + current;
  },

  /**
   * Verify entered password against stored hash.
   */
  verifyPassword: function(plainPassword, storedHash) {
    if (!storedHash || !plainPassword) return false;
    var parts = storedHash.split(":");
    if (parts.length !== 3) {
      // Legacy fallback check if needed
      return false;
    }
    var iterations = parseInt(parts[0], 10);
    var salt = parts[1];
    var expectedHash = parts[2];

    var current = salt + plainPassword + this.PEPPER;
    for (var i = 0; i < iterations; i++) {
      var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, current);
      current = digest.map(function(byte) {
        var v = (byte < 0 ? byte + 256 : byte).toString(16);
        return v.length === 1 ? "0" + v : v;
      }).join("");
    }

    return current === expectedHash;
  },

  /**
   * Authenticate user credentials.
   */
  login: function(username, password, requestId) {
    var cleanUsername = Validation.validateUsername(username);
    var users = Repository.getAll(Repository.SHEET_NAMES.USERS);

    var userRecord = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].username.toLowerCase() === cleanUsername) {
        userRecord = users[i];
        break;
      }
    }

    if (!userRecord) {
      AuditService.log(cleanUsername, "LOGIN", "", "FAILURE", "Unknown username", requestId);
      throw new Error("Invalid username or password");
    }

    if (userRecord.active !== true && userRecord.active !== "TRUE" && userRecord.active !== "true") {
      AuditService.log(userRecord.user_id, "LOGIN", userRecord.username, "FAILURE", "Account deactivated", requestId);
      throw new Error("Account has been deactivated. Please contact administrator.");
    }

    var failedCount = Number(userRecord.failed_login_count) || 0;
    if (failedCount >= this.MAX_FAILED_ATTEMPTS) {
      AuditService.log(userRecord.user_id, "LOGIN", userRecord.username, "FAILURE", "Account locked due to excessive failed attempts", requestId);
      throw new Error("Account locked due to too many failed login attempts. Contact administrator to unlock.");
    }

    var passwordValid = this.verifyPassword(password, userRecord.password_hash);
    if (!passwordValid) {
      failedCount++;
      Repository.updateRow(Repository.SHEET_NAMES.USERS, userRecord._rowIndex, {
        failed_login_count: failedCount
      });
      AuditService.log(userRecord.user_id, "FAILED_LOGIN", userRecord.username, "FAILURE", "Attempt " + failedCount + " of " + this.MAX_FAILED_ATTEMPTS, requestId);
      throw new Error("Invalid username or password");
    }

    // Reset failed login count and record last login timestamp
    var now = new Date().toISOString();
    Repository.updateRow(Repository.SHEET_NAMES.USERS, userRecord._rowIndex, {
      failed_login_count: 0,
      last_login_at: now
    });

    var session = SessionService.createSession(userRecord);
    AuditService.log(userRecord.user_id, "LOGIN", userRecord.username, "SUCCESS", "Role: " + userRecord.role, requestId);

    return {
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      user: {
        userId: userRecord.user_id,
        username: userRecord.username,
        displayName: userRecord.display_name,
        role: userRecord.role,
        phoneNumber: userRecord.phone_number
      }
    };
  }
};


// ==========================================
// FILE: DepositService.gs
// ==========================================

/**
 * DepositService.gs
 * Atomic deposit processing with LockService concurrency control and idempotency.
 */

var DepositService = {
  createDeposit: function(sessionToken, payload) {
    // 1. Authorization check: Admin or Deposit Operator only
    var session = SessionService.requireAuth(sessionToken, ["ADMIN", "DEPOSIT_OPERATOR"]);

    // 2. Validate input fields
    var tokenNo = Validation.normalizeToken(payload.token_no);
    var visitorName = Validation.validateVisitorName(payload.visitor_name);
    var mobileNumber = Validation.validateMobileNumber(payload.mobile_number);
    var phoneCount = Validation.validatePhoneCount(payload.phone_count);
    var storageLocation = Validation.sanitizeOptionalText(payload.storage_location, 50);
    var notes = Validation.sanitizeOptionalText(payload.notes, 200);
    var requestId = String(payload.request_id || Utilities.getUuid());

    // 3. Acquire ScriptLock to prevent concurrent duplicate deposits on the same token
    var lock = LockService.getScriptLock();
    var acquired = lock.tryLock(10000);
    if (!acquired) {
      throw new Error("System is busy handling counter traffic. Please retry in a few seconds.");
    }

    try {
      var allDeposits = Repository.getAll(Repository.SHEET_NAMES.DEPOSITS);

      // 4. Idempotency check: If this request_id already exists, return previous record safely
      for (var i = 0; i < allDeposits.length; i++) {
        if (allDeposits[i].request_id === requestId) {
          AuditService.log(session.userId, "DEPOSIT", allDeposits[i].deposit_id, "SUCCESS", "Idempotent duplicate request returned", requestId);
          return allDeposits[i];
        }
      }

      // 5. Validate against Tokens inventory
      var allTokens = Repository.getAll(Repository.SHEET_NAMES.TOKENS);
      var tokenFound = null;
      for (var t = 0; t < allTokens.length; t++) {
        if (String(allTokens[t].token_no) === tokenNo) {
          tokenFound = allTokens[t];
          break;
        }
      }

      if (!tokenFound) {
        throw new Error("Token '" + tokenNo + "' is not registered in the token inventory.");
      }

      var isTokenActive = tokenFound.active === true || tokenFound.active === "TRUE" || tokenFound.active === "true";
      if (!isTokenActive) {
        throw new Error("Token '" + tokenNo + "' is deactivated in inventory and cannot be used.");
      }

      // 6. Check that token does NOT currently have an active deposit (status === 'DEPOSITED')
      for (var d = 0; d < allDeposits.length; d++) {
        if (String(allDeposits[d].token_no) === tokenNo && allDeposits[d].status === "DEPOSITED") {
          throw new Error("Token '" + tokenNo + "' already has an active deposit (ID: " + allDeposits[d].deposit_id + "). A token cannot be reused until all phones are returned.");
        }
      }

      // 7. Generate unique system Deposit ID: DEP-YYYYMMDD-XXXX
      var dateStr = Utilities.formatDate(new Date(), "GMT+5:30", "yyyyMMdd");
      var randSuffix = ("0000" + Math.floor(Math.random() * 10000)).slice(-4);
      var depositId = "DEP-" + dateStr + "-" + randSuffix;

      var newRecord = {
        deposit_id: depositId,
        token_no: tokenNo,
        visitor_name: visitorName,
        mobile_number: mobileNumber,
        phone_count: phoneCount,
        storage_location: storageLocation,
        deposited_at: new Date().toISOString(),
        deposit_by: session.userId,
        status: "DEPOSITED",
        returned_at: "",
        returned_by: "",
        notes: notes,
        request_id: requestId
      };

      // 8. Persist atomically
      Repository.appendRow(Repository.SHEET_NAMES.DEPOSITS, newRecord);

      AuditService.log(
        session.userId,
        "DEPOSIT",
        depositId,
        "SUCCESS",
        { token_no: tokenNo, phones: phoneCount, visitor: visitorName, storage: storageLocation },
        requestId
      );

      return newRecord;
    } finally {
      lock.releaseLock();
    }
  }
};


// ==========================================
// FILE: RetrievalService.gs
// ==========================================

/**
 * RetrievalService.gs
 * Full return verification and atomic status transition with concurrency protection.
 */

var RetrievalService = {
  /**
   * Search active deposit by token number.
   * Allowed for Admin and Retrieval Operator (and limited lookup for Deposit Operator).
   */
  getActiveDepositByToken: function(sessionToken, rawTokenNo) {
    var session = SessionService.requireAuth(sessionToken, ["ADMIN", "RETRIEVAL_OPERATOR", "DEPOSIT_OPERATOR"]);
    var tokenNo = Validation.normalizeToken(rawTokenNo);

    var deposits = Repository.getAll(Repository.SHEET_NAMES.DEPOSITS);
    var activeDeposit = null;

    for (var i = deposits.length - 1; i >= 0; i--) {
      if (String(deposits[i].token_no) === tokenNo && deposits[i].status === "DEPOSITED") {
        activeDeposit = deposits[i];
        break;
      }
    }

    if (!activeDeposit) {
      throw new Error("No active deposit found for token '" + tokenNo + "'. The token is either already returned or has not been deposited.");
    }

    // Role privacy: Mask visitor mobile number except last 4 digits for operators (PRD Section 3.2, 3.3, 11)
    var maskedMobile = activeDeposit.mobile_number;
    if (session.role !== "ADMIN" && maskedMobile && maskedMobile.length >= 4) {
      maskedMobile = "******" + maskedMobile.slice(-4);
    }

    return {
      deposit_id: activeDeposit.deposit_id,
      token_no: activeDeposit.token_no,
      visitor_name: activeDeposit.visitor_name,
      mobile_number: maskedMobile,
      phone_count: activeDeposit.phone_count,
      storage_location: activeDeposit.storage_location || "",
      deposited_at: activeDeposit.deposited_at,
      deposit_by: activeDeposit.deposit_by,
      status: activeDeposit.status,
      notes: activeDeposit.notes || ""
    };
  },

  /**
   * Complete full return of all phones for a deposit.
   * PRD: No partial returns allowed. All phones returned together.
   * Allowed for Admin and Retrieval Operator only.
   */
  completeFullReturn: function(sessionToken, payload) {
    // 1. Authorization check: Admin or Retrieval Operator only
    var session = SessionService.requireAuth(sessionToken, ["ADMIN", "RETRIEVAL_OPERATOR"]);

    var tokenNo = Validation.normalizeToken(payload.token_no);
    var requestId = String(payload.request_id || Utilities.getUuid());

    // 2. Concurrency lock
    var lock = LockService.getScriptLock();
    var acquired = lock.tryLock(10000);
    if (!acquired) {
      throw new Error("Counter system is busy. Please retry return operation in a few seconds.");
    }

    try {
      var deposits = Repository.getAll(Repository.SHEET_NAMES.DEPOSITS);

      // 3. Idempotency check: Has this request_id already completed a return?
      for (var k = 0; k < deposits.length; k++) {
        if (deposits[k].request_id === requestId && deposits[k].status === "RETURNED") {
          AuditService.log(session.userId, "RETURN", deposits[k].deposit_id, "SUCCESS", "Idempotent duplicate return request", requestId);
          return deposits[k];
        }
      }

      // 4. Find the active deposit record for this token
      var targetDeposit = null;
      for (var i = deposits.length - 1; i >= 0; i--) {
        if (String(deposits[i].token_no) === tokenNo && deposits[i].status === "DEPOSITED") {
          targetDeposit = deposits[i];
          break;
        }
      }

      if (!targetDeposit) {
        throw new Error("Active deposit for token '" + tokenNo + "' was not found or was already returned by another counter operator.");
      }

      // 5. Atomic state update
      var returnTime = new Date().toISOString();
      Repository.updateRow(Repository.SHEET_NAMES.DEPOSITS, targetDeposit._rowIndex, {
        status: "RETURNED",
        returned_at: returnTime,
        returned_by: session.userId
      });

      targetDeposit.status = "RETURNED";
      targetDeposit.returned_at = returnTime;
      targetDeposit.returned_by = session.userId;

      // 6. Audit log
      AuditService.log(
        session.userId,
        "RETURN",
        targetDeposit.deposit_id,
        "SUCCESS",
        {
          token_no: tokenNo,
          phones_returned: targetDeposit.phone_count,
          visitor_name: targetDeposit.visitor_name
        },
        requestId
      );

      return targetDeposit;
    } finally {
      lock.releaseLock();
    }
  }
};


// ==========================================
// FILE: UserService.gs
// ==========================================

/**
 * UserService.gs
 * Admin user management: user creation, role assignment, deactivation, and password resets.
 */

var UserService = {
  getUsers: function(sessionToken) {
    SessionService.requireAuth(sessionToken, ["ADMIN"]);
    var users = Repository.getAll(Repository.SHEET_NAMES.USERS);

    return users.map(function(u) {
      return {
        user_id: u.user_id,
        username: u.username,
        display_name: u.display_name,
        phone_number: u.phone_number,
        role: u.role,
        active: u.active === true || u.active === "TRUE" || u.active === "true",
        created_at: u.created_at,
        last_login_at: u.last_login_at || "",
        failed_login_count: Number(u.failed_login_count) || 0
      };
    });
  },

  createUser: function(sessionToken, payload) {
    var adminSession = SessionService.requireAuth(sessionToken, ["ADMIN"]);

    var username = Validation.validateUsername(payload.username);
    var displayName = Validation.validateVisitorName(payload.display_name);
    var phoneNumber = payload.phone_number ? String(payload.phone_number).trim() : "";
    var role = String(payload.role || "DEPOSIT_OPERATOR").toUpperCase();
    var plainPassword = payload.password;

    if (["ADMIN", "DEPOSIT_OPERATOR", "RETRIEVAL_OPERATOR"].indexOf(role) === -1) {
      throw new Error("Invalid role specified. Must be ADMIN, DEPOSIT_OPERATOR, or RETRIEVAL_OPERATOR.");
    }

    if (!plainPassword || plainPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    // Check duplicate username
    var existingUsers = Repository.getAll(Repository.SHEET_NAMES.USERS);
    for (var i = 0; i < existingUsers.length; i++) {
      if (existingUsers[i].username.toLowerCase() === username.toLowerCase()) {
        throw new Error("Username '" + username + "' is already taken.");
      }
    }

    var userId = "USR-" + Utilities.getUuid().substring(0, 8);
    var passwordHash = AuthService.hashPassword(plainPassword);
    var now = new Date().toISOString();

    var newUser = {
      user_id: userId,
      username: username,
      password_hash: passwordHash,
      display_name: displayName,
      phone_number: phoneNumber,
      role: role,
      active: true,
      created_at: now,
      last_login_at: "",
      failed_login_count: 0,
      password_changed_at: now
    };

    Repository.appendRow(Repository.SHEET_NAMES.USERS, newUser);

    AuditService.log(
      adminSession.userId,
      "USER_CREATE",
      userId,
      "SUCCESS",
      { username: username, role: role, display_name: displayName }
    );

    return {
      user_id: userId,
      username: username,
      display_name: displayName,
      phone_number: phoneNumber,
      role: role,
      active: true
    };
  },

  updateUserStatus: function(sessionToken, targetUserId, newActiveState) {
    var adminSession = SessionService.requireAuth(sessionToken, ["ADMIN"]);
    var users = Repository.getAll(Repository.SHEET_NAMES.USERS);

    var target = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].user_id === targetUserId) {
        target = users[i];
        break;
      }
    }

    if (!target) {
      throw new Error("User '" + targetUserId + "' not found.");
    }

    // Protect last active admin from deactivating themselves
    if (target.role === "ADMIN" && !newActiveState && target.user_id === adminSession.userId) {
      throw new Error("You cannot deactivate your own active admin account.");
    }

    Repository.updateRow(Repository.SHEET_NAMES.USERS, target._rowIndex, {
      active: newActiveState
    });

    AuditService.log(
      adminSession.userId,
      "USER_UPDATE",
      targetUserId,
      "SUCCESS",
      { field: "active", new_value: newActiveState }
    );

    return { success: true, user_id: targetUserId, active: newActiveState };
  },

  resetPassword: function(sessionToken, targetUserId, newPassword) {
    var adminSession = SessionService.requireAuth(sessionToken, ["ADMIN"]);
    if (!newPassword || newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long.");
    }

    var users = Repository.getAll(Repository.SHEET_NAMES.USERS);
    var target = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].user_id === targetUserId) {
        target = users[i];
        break;
      }
    }

    if (!target) {
      throw new Error("User '" + targetUserId + "' not found.");
    }

    var newHash = AuthService.hashPassword(newPassword);
    Repository.updateRow(Repository.SHEET_NAMES.USERS, target._rowIndex, {
      password_hash: newHash,
      failed_login_count: 0,
      password_changed_at: new Date().toISOString()
    });

    AuditService.log(
      adminSession.userId,
      "USER_UPDATE",
      targetUserId,
      "SUCCESS",
      { action: "password_reset" }
    );

    return { success: true, message: "Password updated successfully" };
  }
};


// ==========================================
// FILE: ReportService.gs
// ==========================================

/**
 * ReportService.gs
 * Admin metrics, transaction search, shift closing, and audited controlled corrections.
 */

var ReportService = {
  getDashboardStats: function(sessionToken) {
    SessionService.requireAuth(sessionToken, ["ADMIN", "DEPOSIT_OPERATOR", "RETRIEVAL_OPERATOR"]);

    var deposits = Repository.getAll(Repository.SHEET_NAMES.DEPOSITS);
    var users = Repository.getAll(Repository.SHEET_NAMES.USERS);

    var totalPhonesDeposited = 0;
    var totalPhonesReturned = 0;
    var currentPendingPhones = 0;
    var activeTokensCount = 0;
    var depositsToday = 0;
    var returnsToday = 0;

    var todayStr = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd");

    var operatorMap = {};
    for (var u = 0; u < users.length; u++) {
      operatorMap[users[u].user_id] = {
        operatorId: users[u].user_id,
        displayName: users[u].display_name,
        role: users[u].role,
        depositsCount: 0,
        phonesDeposited: 0,
        returnsCount: 0,
        phonesReturned: 0
      };
    }

    for (var i = 0; i < deposits.length; i++) {
      var d = deposits[i];
      var pCount = Number(d.phone_count) || 0;
      totalPhonesDeposited += pCount;

      var depDateStr = d.deposited_at ? d.deposited_at.substring(0, 10) : "";
      if (depDateStr === todayStr) {
        depositsToday++;
      }

      if (d.deposit_by && operatorMap[d.deposit_by]) {
        operatorMap[d.deposit_by].depositsCount++;
        operatorMap[d.deposit_by].phonesDeposited += pCount;
      }

      if (d.status === "DEPOSITED") {
        currentPendingPhones += pCount;
        activeTokensCount++;
      } else if (d.status === "RETURNED") {
        totalPhonesReturned += pCount;
        var retDateStr = d.returned_at ? d.returned_at.substring(0, 10) : "";
        if (retDateStr === todayStr) {
          returnsToday++;
        }
        if (d.returned_by && operatorMap[d.returned_by]) {
          operatorMap[d.returned_by].returnsCount++;
          operatorMap[d.returned_by].phonesReturned += pCount;
        }
      }
    }

    var operatorStats = [];
    for (var opId in operatorMap) {
      if (operatorMap.hasOwnProperty(opId)) {
        operatorStats.push(operatorMap[opId]);
      }
    }

    return {
      totalPhonesDeposited: totalPhonesDeposited,
      totalPhonesReturned: totalPhonesReturned,
      currentPendingPhones: currentPendingPhones,
      activeTokensCount: activeTokensCount,
      totalTransactionsToday: depositsToday + returnsToday,
      depositsToday: depositsToday,
      returnsToday: returnsToday,
      operatorStats: operatorStats
    };
  },

  getTransactions: function(sessionToken, filters) {
    var session = SessionService.requireAuth(sessionToken, ["ADMIN", "DEPOSIT_OPERATOR", "RETRIEVAL_OPERATOR"]);
    var deposits = Repository.getAll(Repository.SHEET_NAMES.DEPOSITS);

    filters = filters || {};
    var tokenQuery = filters.token ? String(filters.token).trim() : "";
    var statusQuery = filters.status ? String(filters.status).trim() : "";
    var dateQuery = filters.date ? String(filters.date).trim() : "";
    var searchQuery = filters.search ? String(filters.search).toLowerCase().trim() : "";

    var filtered = deposits.filter(function(d) {
      // Role scoping: if not admin, can view deposits or returns
      if (tokenQuery && d.token_no.indexOf(tokenQuery) === -1) {
        return false;
      }
      if (statusQuery && d.status !== statusQuery) {
        return false;
      }
      if (dateQuery) {
        var dDate = d.deposited_at ? d.deposited_at.substring(0, 10) : "";
        if (dDate !== dateQuery) return false;
      }
      if (searchQuery) {
        var match =
          (d.deposit_id && d.deposit_id.toLowerCase().indexOf(searchQuery) !== -1) ||
          (d.token_no && d.token_no.toLowerCase().indexOf(searchQuery) !== -1) ||
          (d.visitor_name && d.visitor_name.toLowerCase().indexOf(searchQuery) !== -1) ||
          (d.mobile_number && d.mobile_number.indexOf(searchQuery) !== -1);
        if (!match) return false;
      }
      return true;
    });

    // Privacy mask for non-admin
    if (session.role !== "ADMIN") {
      filtered = filtered.map(function(d) {
        var copy = Object.assign({}, d);
        if (copy.mobile_number && copy.mobile_number.length >= 4) {
          copy.mobile_number = "******" + copy.mobile_number.slice(-4);
        }
        return copy;
      });
    }

    // Newest first
    filtered.sort(function(a, b) {
      return new Date(b.deposited_at).getTime() - new Date(a.deposited_at).getTime();
    });

    return filtered;
  },

  /**
   * Controlled correction by Admin with mandatory reason and audit trail (PRD Section 3.1 & 14).
   */
  correctDeposit: function(sessionToken, payload) {
    var adminSession = SessionService.requireAuth(sessionToken, ["ADMIN"]);

    var depositId = payload.deposit_id;
    var reason = payload.reason;
    if (!reason || reason.trim().length < 5) {
      throw new Error("A mandatory detailed reason is required for administrative corrections.");
    }

    var deposits = Repository.getAll(Repository.SHEET_NAMES.DEPOSITS);
    var target = null;
    for (var i = 0; i < deposits.length; i++) {
      if (deposits[i].deposit_id === depositId) {
        target = deposits[i];
        break;
      }
    }

    if (!target) {
      throw new Error("Deposit ID '" + depositId + "' not found.");
    }

    var oldValues = {
      status: target.status,
      phone_count: target.phone_count,
      storage_location: target.storage_location,
      notes: target.notes
    };

    var updateFields = {};
    if (payload.notes !== undefined) updateFields.notes = Validation.sanitizeOptionalText(payload.notes, 200);
    if (payload.storage_location !== undefined) updateFields.storage_location = Validation.sanitizeOptionalText(payload.storage_location, 50);
    if (payload.status && (payload.status === "DEPOSITED" || payload.status === "RETURNED")) {
      updateFields.status = payload.status;
      if (payload.status === "RETURNED" && !target.returned_at) {
        updateFields.returned_at = new Date().toISOString();
        updateFields.returned_by = adminSession.userId;
      }
    }

    Repository.updateRow(Repository.SHEET_NAMES.DEPOSITS, target._rowIndex, updateFields);

    AuditService.log(
      adminSession.userId,
      "CORRECTION",
      depositId,
      "SUCCESS",
      {
        reason: reason,
        old_values: oldValues,
        new_values: updateFields
      }
    );

    return { success: true, deposit_id: depositId, updated: updateFields };
  }
};


// ==========================================
// FILE: Setup.gs
// ==========================================

/**
 * Setup.gs
 * Automated 1-Click Database Setup & Initial Seeding Script for Temple Phone Vault.
 * Run `setupDatabase()` in Apps Script Editor to initialize sheets and default data.
 */

function setupDatabase(optionalSpreadsheetId) {
  var ss = null;
  if (optionalSpreadsheetId) {
    ss = SpreadsheetApp.openById(optionalSpreadsheetId);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      var savedId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
      if (savedId) {
        ss = SpreadsheetApp.openById(savedId);
      }
    }
  }

  if (!ss) {
    throw new Error("Please open Apps Script directly from your Google Sheet (Extensions > Apps Script), or provide your Google Sheet ID.");
  }

  // Automatically save spreadsheet ID for external Web App requests
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());

  // 1. Setup Deposits Sheet
  var depSheet = getOrCreateSheet(ss, "Deposits");
  var depHeaders = [
    "deposit_id",
    "token_no",
    "visitor_name",
    "mobile_number",
    "phone_count",
    "storage_location",
    "deposited_at",
    "deposit_by",
    "status",
    "returned_at",
    "returned_by",
    "notes",
    "request_id"
  ];
  setupSheetHeaders(depSheet, depHeaders, "#1e293b", "#ffffff");
  depSheet.getRange("B:B").setNumberFormat("@"); // token_no text format
  depSheet.getRange("D:D").setNumberFormat("@"); // mobile_number text format

  // 2. Setup Tokens Sheet
  var tokSheet = getOrCreateSheet(ss, "Tokens");
  var tokHeaders = ["token_no", "active", "created_at", "notes"];
  setupSheetHeaders(tokSheet, tokHeaders, "#1e293b", "#ffffff");
  tokSheet.getRange("A:A").setNumberFormat("@");

  // Seed sample tokens 001 to 500 if empty
  if (tokSheet.getLastRow() <= 1) {
    var sampleTokens = [];
    var nowIso = new Date().toISOString();
    for (var i = 1; i <= 500; i++) {
      var tokStr = ("000" + i).slice(-3);
      sampleTokens.push(["'" + tokStr, true, nowIso, "Initial Batch Token " + tokStr]);
    }
    tokSheet.getRange(2, 1, sampleTokens.length, 4).setValues(sampleTokens);
  }

  // 3. Setup Users Sheet
  var userSheet = getOrCreateSheet(ss, "Users");
  var userHeaders = [
    "user_id",
    "username",
    "password_hash",
    "display_name",
    "phone_number",
    "role",
    "active",
    "created_at",
    "last_login_at",
    "failed_login_count",
    "password_changed_at"
  ];
  setupSheetHeaders(userSheet, userHeaders, "#1e293b", "#ffffff");

  // Seed default admin and operator users if empty
  if (userSheet.getLastRow() <= 1) {
    var adminHash = AuthService.hashPassword("Admin@123");
    var depOpHash = AuthService.hashPassword("Operator@123");
    var retOpHash = AuthService.hashPassword("Operator@123");
    var userCreated = new Date().toISOString();

    var initialUsers = [
      [
        "USR-ADMIN01",
        "admin",
        adminHash,
        "Chief Temple Admin",
        "9876500000",
        "ADMIN",
        true,
        userCreated,
        "",
        0,
        userCreated
      ],
      [
        "USR-DEPOP01",
        "deposit_op",
        depOpHash,
        "Counter Deposit Staff",
        "9876500001",
        "DEPOSIT_OPERATOR",
        true,
        userCreated,
        "",
        0,
        userCreated
      ],
      [
        "USR-RETOP01",
        "retrieval_op",
        retOpHash,
        "Counter Retrieval Staff",
        "9876500002",
        "RETRIEVAL_OPERATOR",
        true,
        userCreated,
        "",
        0,
        userCreated
      ]
    ];
    userSheet.getRange(2, 1, initialUsers.length, userHeaders.length).setValues(initialUsers);
  }

  // 4. Setup AuditLogs Sheet
  var auditSheet = getOrCreateSheet(ss, "AuditLogs");
  var auditHeaders = [
    "audit_id",
    "timestamp",
    "user_id",
    "action",
    "entity_id",
    "result",
    "details",
    "request_id"
  ];
  setupSheetHeaders(auditSheet, auditHeaders, "#1e293b", "#ffffff");

  // Initial setup audit
  if (auditSheet.getLastRow() <= 1) {
    auditSheet.appendRow([
      "AUD-INIT-001",
      new Date().toISOString(),
      "SYSTEM",
      "SETUP",
      "DATABASE",
      "SUCCESS",
      "Database initialized with standard schema and default accounts",
      "REQ-SETUP"
    ]);
  }

  // 5. Setup AppConfig Sheet
  var configSheet = getOrCreateSheet(ss, "AppConfig");
  var configHeaders = ["config_key", "config_value", "updated_at", "updated_by"];
  setupSheetHeaders(configSheet, configHeaders, "#1e293b", "#ffffff");

  if (configSheet.getLastRow() <= 1) {
    var nowConfig = new Date().toISOString();
    var configs = [
      ["ORG_NAME", "Sri Temple Mobile Vault", nowConfig, "SYSTEM"],
      ["TOKEN_LENGTH", "3", nowConfig, "SYSTEM"],
      ["COUNTER_NAME", "North Gate Counter 1", nowConfig, "SYSTEM"],
      ["STORAGE_LOCATION_ENABLED", "true", nowConfig, "SYSTEM"]
    ];
    configSheet.getRange(2, 1, configs.length, 4).setValues(configs);
  }

  SpreadsheetApp.flush();
  Logger.log("✅ Temple Phone Vault database successfully initialized with all 5 sheets and default seed data!");
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function setupSheetHeaders(sheet, headers, bgColor, fontColor) {
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground(bgColor);
  headerRange.setFontColor(fontColor);
  sheet.setFrozenRows(1);
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
}


// ==========================================
// FILE: Code.gs
// ==========================================

/**
 * Code.gs
 * Main entry point for Google Apps Script Web App API endpoints (doGet & doPost).
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";

  if (action === "ping") {
    return createJsonResponse({
      success: true,
      message: "Temple Phone Deposit & Retrieval Backend is online",
      version: "1.2",
      timestamp: new Date().toISOString()
    });
  }

  return createJsonResponse({
    success: false,
    error: "Invalid GET request. Use POST with an action name."
  });
}

function doPost(e) {
  var requestId = Utilities.getUuid();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing POST request payload");
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var sessionToken = payload.sessionToken;

    if (!action) {
      throw new Error("Missing 'action' parameter in request");
    }

    var resultData = null;

    switch (action) {
      case "ping":
        resultData = { message: "pong", timestamp: new Date().toISOString() };
        break;

      case "login":
        resultData = AuthService.login(payload.username, payload.password, payload.request_id || requestId);
        break;

      case "logout":
        SessionService.revokeSession(sessionToken);
        resultData = { success: true };
        break;

      case "verifySession":
        var sess = SessionService.getSession(sessionToken);
        if (!sess) throw new Error("Session expired or invalid");
        resultData = sess;
        break;

      case "deposit":
        resultData = DepositService.createDeposit(sessionToken, payload);
        break;

      case "getDepositByToken":
        resultData = RetrievalService.getActiveDepositByToken(sessionToken, payload.token_no);
        break;

      case "returnDeposit":
        resultData = RetrievalService.completeFullReturn(sessionToken, payload);
        break;

      case "getDashboardStats":
        resultData = ReportService.getDashboardStats(sessionToken);
        break;

      case "getTransactions":
        resultData = ReportService.getTransactions(sessionToken, payload.filters);
        break;

      case "correctDeposit":
        resultData = ReportService.correctDeposit(sessionToken, payload);
        break;

      case "getUsers":
        resultData = UserService.getUsers(sessionToken);
        break;

      case "createUser":
        resultData = UserService.createUser(sessionToken, payload);
        break;

      case "updateUserStatus":
        resultData = UserService.updateUserStatus(sessionToken, payload.user_id, payload.active);
        break;

      case "resetPassword":
        resultData = UserService.resetPassword(sessionToken, payload.user_id, payload.new_password);
        break;

      case "getTokens":
        SessionService.requireAuth(sessionToken, ["ADMIN", "DEPOSIT_OPERATOR", "RETRIEVAL_OPERATOR"]);
        var tokens = Repository.getAll(Repository.SHEET_NAMES.TOKENS);
        var activeDeposits = Repository.getAll(Repository.SHEET_NAMES.DEPOSITS).filter(function(d) {
          return d.status === "DEPOSITED";
        });
        var activeTokenSet = {};
        for (var ad = 0; ad < activeDeposits.length; ad++) {
          activeTokenSet[String(activeDeposits[ad].token_no)] = true;
        }
        resultData = tokens.map(function(t) {
          var tNo = String(t.token_no);
          var isInventoryActive = t.active === true || t.active === "TRUE" || t.active === "true";
          var isCurrentlyDeposited = !!activeTokenSet[tNo];
          return {
            token_no: tNo,
            active: isInventoryActive,
            is_in_use: isCurrentlyDeposited,
            is_available: isInventoryActive && !isCurrentlyDeposited,
            notes: t.notes || "",
            created_at: t.created_at
          };
        });
        break;

      case "createToken":
        SessionService.requireAuth(sessionToken, ["ADMIN"]);
        var rawNo = payload.token_no;
        var normNo = Validation.normalizeToken(rawNo);
        var allT = Repository.getAll(Repository.SHEET_NAMES.TOKENS);
        for (var ti = 0; ti < allT.length; ti++) {
          if (String(allT[ti].token_no) === normNo) {
            throw new Error("Token '" + normNo + "' already exists in inventory.");
          }
        }
        var newTok = {
          token_no: normNo,
          active: true,
          created_at: new Date().toISOString(),
          notes: Validation.sanitizeOptionalText(payload.notes, 100)
        };
        Repository.appendRow(Repository.SHEET_NAMES.TOKENS, newTok);
        AuditService.log(payload.adminUserId || "ADMIN", "TOKEN_CREATE", normNo, "SUCCESS", { notes: newTok.notes });
        resultData = newTok;
        break;

      case "toggleToken":
        SessionService.requireAuth(sessionToken, ["ADMIN"]);
        var targetToken = Validation.normalizeToken(payload.token_no);
        var tokRows = Repository.getAll(Repository.SHEET_NAMES.TOKENS);
        var targetRow = null;
        for (var tr = 0; tr < tokRows.length; tr++) {
          if (String(tokRows[tr].token_no) === targetToken) {
            targetRow = tokRows[tr];
            break;
          }
        }
        if (!targetRow) {
          throw new Error("Token '" + targetToken + "' not found in inventory.");
        }
        var newActive = !!payload.active;
        Repository.updateRow(Repository.SHEET_NAMES.TOKENS, targetRow._rowIndex, { active: newActive });
        AuditService.log(payload.adminUserId || "ADMIN", "TOKEN_UPDATE", targetToken, "SUCCESS", { active: newActive });
        resultData = { token_no: targetToken, active: newActive };
        break;

      case "getAuditLogs":
        SessionService.requireAuth(sessionToken, ["ADMIN"]);
        resultData = AuditService.getRecentLogs(payload.limit || 150);
        break;

      default:
        throw new Error("Unrecognized API action: '" + action + "'");
    }

    return createJsonResponse({
      success: true,
      data: resultData,
      timestamp: new Date().toISOString(),
      request_id: requestId
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || "An unexpected server error occurred",
      timestamp: new Date().toISOString(),
      request_id: requestId
    });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 🚀 Run this function in Google Apps Script editor to instantly populate tokens 101 to 500 in the Google Sheet!
 */
function addTokensUpTo500() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Tokens");
  if (!sheet) {
    throw new Error("Tokens sheet not found. Run setupDatabase() first.");
  }

  var data = sheet.getDataRange().getValues();
  var existingSet = {};
  for (var r = 1; r < data.length; r++) {
    var raw = String(data[r][0]).replace(/^'/, '').trim();
    if (raw) existingSet[raw] = true;
  }

  var newRows = [];
  var nowIso = new Date().toISOString();
  for (var i = 1; i <= 500; i++) {
    var tokStr = ("000" + i).slice(-3);
    if (!existingSet[tokStr]) {
      newRows.push(["'" + tokStr, true, nowIso, "Initial Batch Token " + tokStr]);
    }
  }

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 4).setValues(newRows);
    SpreadsheetApp.flush();
    Logger.log("✅ Successfully added " + newRows.length + " new tokens! Total tokens now 500.");
  } else {
    Logger.log("ℹ️ All tokens up to 500 already exist.");
  }
}

