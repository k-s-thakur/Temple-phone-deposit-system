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

  // Seed sample tokens 001 to 100 if empty
  if (tokSheet.getLastRow() <= 1) {
    var sampleTokens = [];
    var nowIso = new Date().toISOString();
    for (var i = 1; i <= 100; i++) {
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
