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
