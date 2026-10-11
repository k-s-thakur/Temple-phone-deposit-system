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
