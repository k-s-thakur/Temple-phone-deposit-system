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
