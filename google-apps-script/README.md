# Google Apps Script Backend Setup Guide

This directory contains the Google Apps Script backend code for the **Temple Phone Deposit & Retrieval Web App**.

## Files Included

1. `appsscript.json`: Manifest configuration
2. `Code.gs`: API routing for `doGet` and `doPost`
3. `AuthService.gs`: Salted multi-round password hashing, authentication, brute-force lockout
4. `SessionService.gs`: Session caching, expiry, and role verification
5. `DepositService.gs`: Atomic deposit creation with `LockService` concurrency control
6. `RetrievalService.gs`: Full return verification, atomic state update, token release
7. `UserService.gs`: Admin user management (creation, role assignment, deactivation, password reset)
8. `ReportService.gs`: Metrics, shift closing, count reconciliation, and audited corrections
9. `Validation.gs`: Input validation and token normalization
10. `Repository.gs`: Google Sheets data access with schema protection and text formatting
11. `AuditService.gs`: Append-only audit logger
12. `Setup.gs`: 1-Click database and seed data initializer

---

## 🚀 Setup Steps (5 Minutes)

### Step 1: Create a Google Spreadsheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it: **Temple Phone Vault Database**.

### Step 2: Open Apps Script Editor
1. In your new Google Sheet, click **Extensions** > **Apps Script**.
2. Rename the project to **Temple Phone System Backend**.

### Step 3: Copy Code Files
1. Copy the contents of each `.gs` file in this directory into corresponding files in the Apps Script editor:
   - `Code.gs`
   - `AuthService.gs`
   - `SessionService.gs`
   - `DepositService.gs`
   - `RetrievalService.gs`
   - `UserService.gs`
   - `ReportService.gs`
   - `Validation.gs`
   - `Repository.gs`
   - `AuditService.gs`
   - `Setup.gs`
2. Under Project Settings (gear icon), enable "Show appsscript.json manifest file in editor" and replace `appsscript.json` with the one from this folder.

### Step 4: Run Initial Setup
1. In the Apps Script toolbar, select the function `setupDatabase` from the dropdown.
2. Click **Run**.
3. Review and grant permissions when prompted.
4. Check your Google Sheet: All 5 sheets (`Deposits`, `Tokens`, `Users`, `AuditLogs`, `AppConfig`) are created with pre-seeded tokens (`001` to `100`) and default accounts:
   - **Admin:** `admin` / `Admin@123`
   - **Deposit Operator:** `deposit_op` / `Operator@123`
   - **Retrieval Operator:** `retrieval_op` / `Operator@123`

### Step 5: Deploy as Web App
1. Click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set the following settings:
   - **Description:** `Production v1`
   - **Execute as:** `Me (your Google email)`
   - **Who has access:** `Anyone` (Required for Vercel/frontend API calls)
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 6: Connect to the Frontend
1. Open the Temple Phone Deposit & Retrieval Web App frontend.
2. In the top bar or settings modal, choose **Google Apps Script Live Backend** and paste your Web App URL.
3. Test connection! You can now log in with the default accounts or create custom operators.

---

## 🔓 How to Unlock Locked Accounts (खाता अनलॉक कैसे करें)

यदि गलत पासवर्ड के 5 प्रयासों के कारण खाता लॉक हो गया है (`Account locked due to too many failed login attempts`), तो इसे 3 आसान तरीकों से अनलॉक किया जा सकता है:

### तरीका 1: Google Sheet में सीधे (Fastest)
1. अपनी Google Sheet खोलें।
2. नीचे **Users** शीट टैब पर क्लिक करें।
3. **admin** (या संबंधित स्टाफ) वाली पंक्ति में कॉलम **J** (`failed_login_count`) को **0** कर दें।

### तरीका 2: Apps Script Editor में 1-क्लिक
1. Apps Script Editor खोलें।
2. ऊपर टूलबार ड्रॉपडाउन में **`unlockAllUsers`** चुनें।
3. **Run** बटन दबाएं। सभी खाते तुरंत अनलॉक हो जाएंगे!

### तरीका 3: वेब लॉगिन स्क्रीन से
- लॉगिन स्क्रीन पर सही पासवर्ड दर्ज करें। अद्यतन बैकएंड सही पासवर्ड दर्ज करने पर व्यवस्थापक खाते को स्वतः अनलॉक कर देता है।
- या लॉगिन स्क्रीन पर "मॉक/लोकल मोड में स्विच करें" बटन दबाकर तुरंत टेस्ट मोड में लॉगिन करें।
