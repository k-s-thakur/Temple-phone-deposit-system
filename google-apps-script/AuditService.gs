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
