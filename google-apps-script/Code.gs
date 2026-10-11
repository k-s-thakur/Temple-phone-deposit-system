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
