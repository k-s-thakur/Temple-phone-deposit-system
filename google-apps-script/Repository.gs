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
