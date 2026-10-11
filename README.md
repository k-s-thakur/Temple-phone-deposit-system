# Temple Phone Deposit & Retrieval Web App

A production-grade, counter-optimized web application to digitally manage mobile phones deposited by temple visitors against pre-printed physical token numbers, built according to the **Product Requirements Document (PRD v1.2)**.

---

## 🌟 Key Features & PRD Compliance

1. **Pre-Printed Token Management & Normalization (PRD Section 7):**
   - Numeric token entry with automatic padding and 3-digit normalization (e.g., `001`, `042`, `105`).
   - Leading zeros are strictly preserved across both storage and display.
   - Live inventory status feedback (Available, In Vault, Deactivated, Unregistered).
   - Prevents duplicate active deposits on the same token.

2. **Deposit Counter Workflow (PRD Section 5.1):**
   - High-throughput counter intake form with rapid phone quantity counters (`+` / `-` / quick presets).
   - Multiple phones supported per transaction (`phone_count >= 1`).
   - Server-side unique Deposit ID generation (`DEP-YYYYMMDD-XXXX`).
   - Live Printable Deposit Receipt modal with high-visibility token callout, visitor details, and receipt layout (`window.print()`).

3. **Full Return Workflow (PRD Section 1 & 5.2):**
   - **Core rule enforced:** Full return only. Partial returns are strictly prohibited.
   - Large display of phone count to hand over ("Return X phones to visitor").
   - Atomic status transition to `RETURNED`, recording server timestamps and operator IDs.
   - Immediate token release for reuse in inventory while preserving complete transaction history.
   - **Discrepancy / Lost Token Escalation Flow (PRD Section 5.3):** Halts ordinary return and logs an audited exception for Chief Admin review.

4. **Role-Based Access Control (PRD Section 3 & 9):**
   - **Admin:** Full access to all transactions, metrics, staff accounts, token inventory, and audit logs.
   - **Deposit Operator:** Fast intake counter access and permitted history. Cannot return phones or manage users.
   - **Retrieval Operator:** Fast return counter access and verification. Cannot deposit phones or manage users.
   - Individual staff credentials (no shared logins).

5. **Shift Closing & Physical Count Reconciliation (PRD Section 13 & 14):**
   - Real-time comparison of physical handsets in vault storage trays vs. active digital deposit records.
   - Instant discrepancy detection (`Physical Count - System Active Count`).
   - Supervisor sign-off and printable shift closing summary report.

6. **Admin Controlled Corrections & Audit Logs (PRD Section 3.1, 8.4, 14):**
   - Corrections require a mandatory detailed reason and automatically record old and new values.
   - Append-only immutable security audit log capturing logins, failed attempts, deposits, returns, corrections, and user updates.

7. **Dual-Engine Architecture (PRD Section 10):**
   - **Local / Mock Engine:** Runs immediately out of the box in browser storage with pre-seeded tokens (`001` - `100`), demo accounts, and sample transactions.
   - **Google Apps Script Live Backend:** Complete Apps Script codebase provided in `google-apps-script/` with `LockService` concurrency locks, salted password hashing, and Google Sheets database.
   - Instant backend switching and live connection health check in the UI Settings modal.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+ or v20+)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suite
```bash
npm test
```
All 15 automated business rules tests will run and verify token normalization, duplicate prevention, role permissions, and full return mechanics.

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🔑 Demo Staff Logins (Pre-Configured)

You can use the 1-click login buttons on the login screen, or sign in manually:

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Chief Admin** | `admin` | `Admin@123` | Full Access: Dashboard, Deposit, Return, History, Staff Users, Tokens, Audit, Shift Closing |
| **Deposit Operator** | `deposit_op` | `Operator@123` | Counter Intake: Deposit Phone, Permitted History |
| **Retrieval Operator** | `retrieval_op` | `Operator@123` | Counter Return: Retrieve Phone, Permitted History |

---

## ☁️ Deployment

### 1. Deploy Frontend to Vercel
The repository includes `vercel.json` configured for zero-config Vite deployments:
```bash
# Using Vercel CLI
npx vercel
```
Or connect this repository directly in the [Vercel Dashboard](https://vercel.com).

### 2. Deploy Google Apps Script Backend (Google Sheets)
Full step-by-step instructions and code are in [`google-apps-script/README.md`](file:///home/thekingofbirds/Projects/Temple%20Phone%20Deposit%20and%20Retrival%20system/google-apps-script/README.md):
1. Create a blank Google Sheet named **Temple Phone Vault Database**.
2. Open **Extensions** > **Apps Script**.
3. Copy files from `google-apps-script/` into the script editor (`Code.gs`, `AuthService.gs`, `SessionService.gs`, `DepositService.gs`, `RetrievalService.gs`, `UserService.gs`, `ReportService.gs`, `Validation.gs`, `Repository.gs`, `AuditService.gs`, `Setup.gs`, `appsscript.json`).
4. Run `setupDatabase()` to auto-generate all 5 sheets (`Deposits`, `Tokens`, `Users`, `AuditLogs`, `AppConfig`) with formatted headers and default seed data.
5. Deploy as Web App (Execute as **Me**, Access: **Anyone**).
6. In the app frontend Settings modal, switch to **Google Apps Script Live Backend** and paste your Web App URL.

---

## 📁 Project Structure

```text
├── google-apps-script/              # Google Apps Script & Google Sheets Backend
│   ├── appsscript.json              # Manifest
│   ├── Code.gs                      # API router (doGet & doPost)
│   ├── AuthService.gs               # Salted multi-round password hashing & lockout
│   ├── SessionService.gs            # Fast cache session management
│   ├── DepositService.gs            # Atomic deposit with LockService concurrency
│   ├── RetrievalService.gs          # Full return validation & token release
│   ├── UserService.gs               # Staff user management & role control
│   ├── ReportService.gs             # Dashboard metrics & shift reports
│   ├── Validation.gs                # Input validation & token normalization
│   ├── Repository.gs                # Google Sheets DAL & text formatting
│   ├── AuditService.gs              # Immutable audit logging
│   ├── Setup.gs                     # 1-Click database initializer
│   └── README.md                    # Backend setup instructions
├── src/
│   ├── components/
│   │   ├── Navbar.tsx               # Role-aware navigation header
│   │   ├── LoginView.tsx            # Login card with 1-click demo accounts
│   │   ├── DepositView.tsx          # Fast counter intake & printable receipt
│   │   ├── RetrievalView.tsx        # Token return & discrepancy escalation
│   │   ├── DashboardView.tsx        # Metrics cards & operator throughput
│   │   ├── HistoryView.tsx          # Filterable records & CSV export
│   │   ├── ShiftClosingView.tsx     # Physical count reconciliation sheet
│   │   ├── UserManagementView.tsx   # Staff user administration
│   │   ├── TokenInventoryView.tsx   # Token inventory & batch addition
│   │   ├── AuditLogView.tsx         # Security audit log inspection
│   │   └── SettingsModal.tsx        # Live backend URL switch & health check
│   ├── services/
│   │   ├── api.ts                   # Unified API client (Mock & Apps Script)
│   │   └── mockStorage.ts           # Local engine enforcing all PRD rules
│   ├── test/
│   │   └── business-rules.test.ts   # 15 Vitest automated test cases
│   ├── types/
│   │   └── index.ts                 # Core TypeScript data schemas
│   ├── App.tsx                      # Root component & role routing
│   ├── index.css                    # Tailwind CSS & print receipt styles
│   └── main.tsx                     # React application entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json                      # Vercel deployment configuration
└── README.md
```
