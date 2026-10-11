# Temple Phone Deposit & Retrieval Web App
## Product Requirements Document (PRD)

**Version:** 1.2  
**Date:** 10 October 2026  
**Status:** Design specification — implementation code not included

---

## 1. Executive Summary

The Temple Phone Deposit & Retrieval Web App will digitally manage mobile phones deposited by temple visitors and returned against pre-printed physical token numbers. Staff will sign in with individual application user accounts. Deposit and Retrieval Operators will have separate permissions, while an Admin can manage users, monitor transactions, review audit history, and generate reports.

The user interface must be simple, attractive, clean, responsive, and optimized for fast counter operations. The initial implementation is planned with a frontend deployed on Vercel, Google Apps Script as the backend, and Google Sheets as the database.

**Core operating rule:** one token represents one deposit transaction that may contain multiple phones. The app records only the total phone count for that token; it does not assign a separate ID to each phone. Partial returns are not allowed. All phones recorded against a deposit must be returned together in one successful return operation.

## 2. Goals and Non-Goals

### 2.1 Goals
- Record visitor name, mobile number, pre-printed token number, and number of phones deposited.
- Generate a unique system Deposit ID/Serial Number automatically.
- Record server-side deposit and return timestamps.
- Attribute each deposit and return to the authenticated staff member.
- Prevent duplicate active use of a token and duplicate return operations.
- Allow staff to find an active deposit using the numeric token.
- Provide Admin dashboards, searchable history, reports, user management, and audit logs.
- Deploy the frontend to Vercel while using Apps Script and Sheets for the initial backend and data store.

### 2.2 Non-Goals for the MVP
- Individual tracking/serial numbers for each phone.
- Partial return of a deposit.
- Automatically generating the physical token number.
- Public visitor accounts or visitor-facing self-service.
- SMS/WhatsApp notifications.
- Payment processing.
- Native Android/iOS applications.

## 3. Users and Roles

### 3.1 Admin
Can view all transactions and reports; create, deactivate, and manage staff accounts; manage the token inventory; review audit logs; and perform controlled corrections with a mandatory reason and audit trail.

### 3.2 Deposit Operator
Can create deposits, look up records as needed for counter operations, view their own permitted activity, and access only the minimum visitor information required for the job. Cannot manage users, change roles, or record returns.

### 3.3 Retrieval Operator
Can search active deposits by token number, view the information needed to verify the handover, and complete a full return. Cannot create deposits or manage users.

### 3.4 Account identity
Each staff member must have an individual User ID/username and password. Shared accounts are not permitted. The Users table stores the employee's phone number so the Admin can contact staff if required. Staff phone numbers must not appear in public reports or ordinary transaction views.

## 4. UI/UX Requirements

- Minimal, clean, attractive interface with generous whitespace and readable typography.
- Neutral/light background, restrained accent color, clear labels, and large touch-friendly controls.
- Responsive on phones, tablets, and desktop browsers.
- Prioritize the next action: Deposit, Retrieve, or Admin Dashboard according to role.
- Keep deposit and retrieval forms short; avoid decorative charts or unnecessary fields at the counter.
- Show loading, success, validation, empty, permission-denied, and failure states.
- Disable repeat submission while a request is pending, but rely on server-side idempotency rather than UI state alone.
- Show clear confirmation before finalizing a return.
- Never show a successful operation until the server confirms that the write completed.

### 4.1 Required screens
1. Login
2. Deposit Phone
3. Retrieve Phone
4. Admin Dashboard
5. Transaction History and Search
6. User Management
7. Token Inventory Management
8. Audit Log (Admin only)
9. Reports and Shift Closing

## 5. Core Workflows

### 5.1 Deposit workflow
1. Deposit Operator signs in.
2. Operator enters visitor name, visitor mobile number, numeric token number, and phone count; storage location and notes may be optional.
3. Server validates the authenticated session, role, input fields, and token inventory.
4. Server checks that the token has no active deposit. This check and the write must be protected against concurrent submissions.
5. Server creates a unique Deposit ID, records the server timestamp and authenticated operator ID, and sets status to `DEPOSITED`.
6. App displays confirmation only after the server confirms success.

### 5.2 Full return workflow
1. Retrieval Operator signs in and enters the numeric token number.
2. Server finds the current active deposit.
3. Screen shows the visitor name, limited mobile-number information where appropriate, Deposit ID, phone count, deposit time, and optional storage location.
4. Operator verifies the token and the handover, then confirms the return of the entire deposit.
5. There is no returned-quantity input and no partial-return action.
6. Server atomically validates that the deposit is still `DEPOSITED`, writes the return timestamp and authenticated Retrieval Operator ID, and changes status to `RETURNED`.
7. The token becomes available for reuse only after the return write succeeds.

### 5.3 Lost token or count mismatch
A lost token, disputed identity, or physical count mismatch must not be handled by bypassing normal validation. The operator stops the ordinary return and escalates to an authorized Admin. Any exception or correction must record the reason, the responsible staff member, and an audit event. A return must not be marked successful if the actual handover is unresolved.

### 5.4 Token reuse
Pre-printed token numbers are maintained in a token inventory. A token may be reused only after its previous deposit has been fully returned. The historical deposit record remains intact. The system must identify the current active deposit rather than overwrite old records.

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Individual login using app User ID/username and password | P0 |
| FR-02 | Server-side role checks for every protected operation | P0 |
| FR-03 | Deposit visitor name, mobile, numeric token, and phone count | P0 |
| FR-04 | Generate a unique Deposit ID/Serial Number on the server | P0 |
| FR-05 | Validate token against inventory and prevent duplicate active deposits | P0 |
| FR-06 | Search active deposit by token number | P0 |
| FR-07 | Full return only; no partial return fields or workflow | P0 |
| FR-08 | Record server timestamps and authenticated operator IDs | P0 |
| FR-09 | Audit significant actions and controlled corrections | P0 |
| FR-10 | Admin can create/deactivate users and assign roles | P0 |
| FR-11 | Admin dashboard showing deposits, returns, and pending phones | P0 |
| FR-12 | Search and filter by token, date, status, and operator | P1 |
| FR-13 | Daily and operator-wise reports with CSV/Excel export | P1 |
| FR-14 | Shift closing and pending-phone reconciliation | P1 |
| FR-15 | Print deposit receipt | P2 |
| FR-16 | QR/barcode scanning of pre-printed tokens, if practical | P2 |

**Priority definitions:** P0 = required for initial release; P1 = next phase; P2 = optional later enhancement.

## 7. Token Number Rules

- Physical tokens are pre-printed; the application does not generate the physical token number.
- The operator enters only the digits shown on the token. The UI must not require a `T-` prefix.
- Store token numbers as text, not numeric values, to preserve leading zeros such as `001`.
- Token normalization must be defined consistently. If tokens are three digits, `001` should remain distinct in representation from an accidentally entered `1`; the app should validate the expected format and length.
- Token numbers must be unique in the `Tokens` inventory.
- Only inventory tokens marked active can be used.
- A token cannot have more than one active deposit.
- A token is reusable only after the prior deposit has been successfully marked `RETURNED`.

## 8. Data Model and Google Sheets Schema

Use five sheets initially: `Deposits`, `Tokens`, `Users`, `AuditLogs`, and `AppConfig`. Protect the spreadsheet so operators cannot directly access or edit the underlying data.

### 8.1 `Deposits`
One row represents one deposit transaction, not one individual phone.

| Field | Type / Rule | Purpose |
|---|---|---|
| `deposit_id` | Unique server-generated text ID | Transaction/serial number |
| `token_no` | Text, inventory token | Pre-printed token |
| `visitor_name` | Required text | Visitor name |
| `mobile_number` | Text; validate format | Visitor contact |
| `phone_count` | Integer >= 1 | Total phones deposited |
| `storage_location` | Optional text | Rack/tray/slot |
| `deposited_at` | Server timestamp | Deposit time |
| `deposit_by` | Authenticated user ID | Deposit operator |
| `status` | `DEPOSITED` or `RETURNED` only | Current transaction state |
| `returned_at` | Empty until full return | Return timestamp |
| `returned_by` | Empty until full return | Retrieval operator ID |
| `notes` | Optional text | Non-sensitive notes |
| `request_id` | Unique request/idempotency key | Prevent duplicate submission |

Do not include `PARTIALLY_RETURNED` or a returned-quantity field.

### 8.2 `Tokens`

| Field | Type / Rule | Purpose |
|---|---|---|
| `token_no` | Unique text; preserves leading zeros | Printed token number |
| `active` | Boolean | Whether token is valid inventory |
| `created_at` | Timestamp | Inventory creation |
| `notes` | Optional text | Inventory note |

`active` means that the token belongs to the valid inventory, not that it is currently available. Current availability is derived from whether a `DEPOSITED` record exists for that token.

### 8.3 `Users`

| Field | Type / Rule | Purpose |
|---|---|---|
| `user_id` | Unique stable ID | Internal identity |
| `username` | Unique normalized username | Login name |
| `password_hash` | Secure password-hashing output; never plaintext | Password verification |
| `display_name` | Required text | Staff name |
| `phone_number` | Text | Staff contact number for Admin |
| `role` | `ADMIN`, `DEPOSIT_OPERATOR`, `RETRIEVAL_OPERATOR` | Authorization |
| `active` | Boolean | Account enabled/disabled |
| `created_at` | Server timestamp | Account creation |
| `last_login_at` | Timestamp | Last successful login |
| `failed_login_count` | Integer | Failed login tracking |
| `password_changed_at` | Timestamp | Password lifecycle |

The exact password hashing, session, and rate-limiting implementation must be security-reviewed before production. Plaintext passwords must never be stored in Sheets, logs, source code, or browser storage.

### 8.4 `AuditLogs`

| Field | Purpose |
|---|---|
| `audit_id` | Unique audit event ID |
| `timestamp` | Server timestamp |
| `user_id` | Actor |
| `action` | Action name, e.g. `LOGIN`, `DEPOSIT`, `RETURN`, `USER_UPDATE` |
| `entity_id` | Related deposit/user/token ID |
| `result` | Success/failure |
| `details` | Non-sensitive details and correction reason |
| `request_id` | Request correlation/idempotency key |

Never log passwords, session tokens, or other authentication secrets. Audit history should be append-only to ordinary users. Corrections must preserve the old value, new value, reason, and actor in a controlled audit event.

### 8.5 `AppConfig`

| Field | Purpose |
|---|---|
| `config_key` | Configuration setting key |
| `config_value` | Non-secret setting value |
| `updated_at` | Last update time |
| `updated_by` | Admin user ID |

Do not store passwords or secrets in this sheet.

## 9. Role-Permission Matrix

Legend: ✓ allowed; — not allowed; Limited = restricted to necessary data or audited exception flow.

| Capability | Admin | Deposit Operator | Retrieval Operator |
|---|---:|---:|---:|
| Login | ✓ | ✓ | ✓ |
| Create deposit | ✓ | ✓ | — |
| Search deposit | ✓ | Limited | ✓ |
| Complete full return | ✓ | — | ✓ |
| View all visitor mobile numbers | ✓ | Limited | Limited |
| View all staff transactions | ✓ | — | — |
| View own permitted history | ✓ | ✓ | ✓ |
| View all reports | ✓ | — | — |
| View own shift summary | ✓ | ✓ | ✓ |
| Create/deactivate users | ✓ | — | — |
| Change roles | ✓ | — | — |
| Manage token inventory | ✓ | — | — |
| Correct historical record | Audited exception only | — | — |
| View audit logs | ✓ | — | — |
| View all staff phone numbers | ✓ | — | — |

Admin permissions must also be enforced server-side. Hiding buttons in the UI is not authorization.

## 10. Apps Script and Vercel Architecture

### 10.1 Proposed stack
- **Frontend:** HTML/CSS/JavaScript or a suitable Vercel-supported frontend framework.
- **Frontend hosting:** Vercel.
- **Backend:** Google Apps Script Web App.
- **Database:** Google Sheets.
- **Concurrency control:** `LockService` for critical token checks and writes.
- **Configuration:** Apps Script Properties for appropriate server-side secrets/configuration; access must be restricted.

### 10.2 Logical flow
1. Frontend submits an action to the backend.
2. Backend validates session, active account, role, input, and request ID.
3. Service layer applies business rules.
4. Repository layer reads/writes Sheets.
5. Audit service records the action.
6. Backend returns a structured success/error response.
7. UI updates only after receiving a confirmed result.

### 10.3 Suggested logical files
```text
TemplePhoneSystem/
├── appsscript.json
├── Code.gs
├── AuthService.gs
├── SessionService.gs
├── DepositService.gs
├── RetrievalService.gs
├── UserService.gs
├── ReportService.gs
├── Validation.gs
├── Repository.gs
├── AuditService.gs
├── Index.html
├── Login.html
├── Deposit.html
├── Retrieval.html
├── Dashboard.html
├── Styles.html
└── Client.js.html
```

These are logical modules; separating files does not itself create security boundaries.

### 10.4 Vercel-to-Apps-Script integration
Vercel hosts the frontend; Apps Script remains the backend. Cross-origin browser calls, Apps Script redirects, session handling, and CORS behavior must be tested. A Vercel Function proxy may be used if needed, but it must be designed for secure server-to-server communication and must not expose credentials or secrets to the browser. Authorization must still be enforced by the backend.

No separate Node.js backend is required for the initial design, but the integration must pass a technical proof-of-concept before the UI is treated as production-ready.

## 11. Security Requirements

1. **Authentication:** individual accounts; no shared staff login.
2. **Password storage:** never plaintext; use a vetted password-hashing method suitable for passwords, with unique salts. A plain SHA-256 hash is not an acceptable password-storage design.
3. **Session security:** cryptographically secure, time-limited sessions; logout and account deactivation revoke access; rotate sessions after login/password changes as appropriate.
4. **Server-side authorization:** verify session, account status, and role on every protected backend call. Never trust a client-supplied user ID as proof of identity.
5. **Brute-force controls:** rate limits or temporary lockouts, safe error messages, and failed-login auditing.
6. **Secrets:** never place secrets in frontend source, URLs, Sheets, or logs. Apps Script Properties are not a substitute for proper access control.
7. **Spreadsheet access:** do not publicly share the database sheet; only authorized administrators should have direct spreadsheet access.
8. **Input validation:** validate token format, phone count, names, phone numbers, notes, request IDs, and expected values server-side.
9. **Concurrency:** use a consistent lock strategy for token validation and write operations. Re-check token state while holding the lock.
10. **Idempotency:** retries with the same request ID must not create duplicate deposits or returns.
11. **Auditability:** record important actions and controlled corrections; ordinary operators cannot alter audit history.
12. **Privacy:** minimize visitor data displayed to each role; restrict staff phone numbers to Admin.
13. **Recovery:** maintain backups and a documented restore process.
14. **Error handling:** fail closed if authentication, validation, or persistence cannot be confirmed.

## 12. Data Integrity and State Rules

- Only `DEPOSITED` and `RETURNED` are valid deposit states.
- A deposit begins as `DEPOSITED`.
- A successful full return changes it to `RETURNED` and records `returned_at` and `returned_by`.
- A return can only be completed if the current state is `DEPOSITED`.
- There is no partial return quantity, partial-return state, or partial-return button.
- A token is available only when it is valid inventory and has no active `DEPOSITED` record.
- Token availability must be rechecked on the server during the write, not only when the form loads.
- If a write succeeds but the response is lost, a retry must use the same request ID and return the original result rather than creating a second operation.
- Google Sheets is not a relational database and does not provide full database transactions or unique constraints. Locking, validation, idempotency, failure handling, and reconciliation are required, but they do not remove every platform limitation.

## 13. Dashboard and Reports

Admin dashboard should include:
- Total phones deposited during the selected period.
- Total phones returned during the selected period.
- Current pending phones, calculated from active `DEPOSITED` records.
- Number of active deposit transactions/tokens.
- Daily transaction volume.
- Operator-wise deposits and returns.
- Long-pending deposits.
- Shift closing and physical count reconciliation.
- Search/filter by token, date, status, and operator.
- CSV/Excel export.

Distinguish **phone count** from **transaction count**. One transaction can contain multiple phones. Current pending phone count is the sum of `phone_count` for active deposits; active-token count is the number of active deposit records.

## 14. Edge Cases and Expected Behavior

| Scenario | Expected behavior |
|---|---|
| Token not in inventory | Reject operation |
| Token already has an active deposit | Reject new deposit |
| Token has been fully returned | Allow reuse if inventory token remains active |
| Phone count is zero, negative, or non-integer | Reject |
| Concurrent attempts to deposit same token | At most one succeeds |
| Token is unknown during retrieval | No write; clear error |
| Return is submitted twice | Idempotent response; no duplicate return |
| Staff account is disabled | Protected operations rejected |
| Network fails after submission | Check/retry using same request ID |
| Physical count mismatch | Stop ordinary return and escalate |
| Admin corrects a record | Require reason and audit old/new values |
| Sheet headers/schema change | Fail safely; do not write to incorrect columns |

## 15. Non-Functional Requirements

- **Usability:** simple, responsive counter-first UI.
- **Performance:** define measurable latency targets after testing on the actual deployment and expected usage.
- **Reliability:** no duplicate active token use or duplicate return due to concurrent/retried requests.
- **Integrity:** only show success after confirmed persistence.
- **Privacy:** only necessary data is visible to each role.
- **Maintainability:** separate logical services, data access, validation, and audit functions.
- **Recovery:** regular backup and restore verification.
- **Scalability:** monitor Apps Script quotas, execution limits, and Sheets performance.

Google Sheets and Apps Script are suitable for a controlled MVP, not unlimited scale. If transaction volume or concurrency grows significantly, plan a migration to a transactional database such as PostgreSQL/Supabase and a backend better suited to the workload.

## 16. Testing and Acceptance Criteria

Before launch, verify:
- Correct login, incorrect login, disabled accounts, and role restrictions.
- Valid deposit creation and unique Deposit ID generation.
- Duplicate active token prevention.
- Concurrent deposit attempts on the same token.
- Successful full return and token release.
- No partial-return control or returned-quantity input exists.
- Duplicate return prevention and idempotent retries.
- Reuse of a token after full return while preserving history.
- Session expiration and logout behavior.
- Admin correction audit trail.
- Report totals match underlying transaction records.
- Spreadsheet direct access is restricted.
- Failure cases do not show false success.
- Backup and restore procedures work.

## 17. Delivery Plan

### Phase 1 — Design freeze
Confirm token format/length, staff roles, exception procedure, authentication approach, and API contract.

### Phase 2 — Authentication and authorization
Implement and security-review login, session lifecycle, account status, role enforcement, and rate limiting.

### Phase 3 — Deposit module
Implement token validation, unique Deposit ID, phone count, timestamps, operator attribution, and idempotency.

### Phase 4 — Retrieval module
Implement token lookup, full-return confirmation, state validation, token release, and duplicate prevention.

### Phase 5 — Admin and reporting
Implement dashboard, user management, token inventory, audit logs, filters, exports, and shift closing.

### Phase 6 — Testing and deployment
Test Vercel-to-Apps-Script integration, security, concurrency, retry behavior, reports, backups, and staff workflows before production use.

## 18. Open Decisions Before Implementation

These must be finalized before code is written:
1. Exact printed token length and allowed numeric format (for example, exactly three digits).
2. Whether the app needs an optional rack/tray/slot field.
3. The approved lost-token and physical-count-mismatch procedure.
4. Session lifetime and password reset policy.
5. Whether a Vercel Function proxy is required after integration proof-of-concept.
6. Expected daily transaction volume and number of simultaneous counter operators.

## 19. Final Recommendation

Build the MVP around the simplest safe workflow: individual staff login, numeric pre-printed tokens, one deposit record per token transaction, phone-count-only tracking, full return only, server-generated timestamps, strict role permissions, audit logging, and an Admin dashboard.

Keep the interface minimal. Spend more engineering effort on authentication, duplicate prevention, retry safety, and accurate transaction records than on decorative UI. Do not deploy to production until the authentication/session design and Vercel-to-Apps-Script integration have been tested.

**Document status:** This PRD defines requirements and architecture. It intentionally does not include implementation code or claim that the system has already been built or security-tested.
