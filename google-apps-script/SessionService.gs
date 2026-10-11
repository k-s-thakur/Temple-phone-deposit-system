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
