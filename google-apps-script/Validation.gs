/**
 * Validation.gs
 * Strict input validation and sanitization for Temple Phone Deposit & Retrieval Web App.
 */

var Validation = {
  /**
   * Normalize and validate token number.
   * Tokens are numeric text preserving leading zeros (e.g., '001', '042').
   * PRD Section 7: Operator enters digits; store as text; normalize consistently.
   */
  normalizeToken: function(tokenInput) {
    if (tokenInput === undefined || tokenInput === null) {
      throw new Error("Token number is required");
    }
    var cleaned = String(tokenInput).trim();
    if (!/^\d+$/.test(cleaned)) {
      throw new Error("Token number must contain digits only");
    }
    // Pad to 3 digits minimum if less than 3 digits, or preserve if longer
    if (cleaned.length < 3) {
      while (cleaned.length < 3) {
        cleaned = "0" + cleaned;
      }
    }
    return cleaned;
  },

  /**
   * Validate total phones deposited.
   * PRD Section 1: Phone count must be an integer >= 1.
   */
  validatePhoneCount: function(countInput) {
    var count = Number(countInput);
    if (!Number.isInteger(count) || count < 1) {
      throw new Error("Phone count must be an integer greater than or equal to 1");
    }
    return count;
  },

  /**
   * Validate visitor mobile number.
   * 10 digits standard mobile format.
   */
  validateMobileNumber: function(mobileInput) {
    if (!mobileInput) {
      throw new Error("Visitor mobile number is required");
    }
    var cleaned = String(mobileInput).replace(/[\s\-\+]/g, "");
    // Check if 10 digits or with optional country code 91
    if (/^91\d{10}$/.test(cleaned)) {
      cleaned = cleaned.substring(2);
    }
    if (!/^\d{10}$/.test(cleaned)) {
      throw new Error("Visitor mobile number must be a valid 10-digit number");
    }
    return cleaned;
  },

  /**
   * Validate visitor name.
   */
  validateVisitorName: function(nameInput) {
    if (!nameInput || typeof nameInput !== "string") {
      throw new Error("Visitor name is required");
    }
    var cleaned = nameInput.trim();
    if (cleaned.length < 2 || cleaned.length > 80) {
      throw new Error("Visitor name must be between 2 and 80 characters");
    }
    return cleaned;
  },

  /**
   * Validate username format.
   */
  validateUsername: function(usernameInput) {
    if (!usernameInput || typeof usernameInput !== "string") {
      throw new Error("Username is required");
    }
    var cleaned = usernameInput.trim().toLowerCase();
    if (!/^[a-z0-9_\-\.]{3,30}$/.test(cleaned)) {
      throw new Error("Username must be 3-30 characters with alphanumeric, underscore, dot, or hyphen only");
    }
    return cleaned;
  },

  /**
   * Sanitize optional text fields (notes, storage location).
   */
  sanitizeOptionalText: function(textInput, maxLength) {
    if (!textInput) return "";
    var limit = maxLength || 200;
    var cleaned = String(textInput).trim();
    return cleaned.substring(0, limit);
  }
};
