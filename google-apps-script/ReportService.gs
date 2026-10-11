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
