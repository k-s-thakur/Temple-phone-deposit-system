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
