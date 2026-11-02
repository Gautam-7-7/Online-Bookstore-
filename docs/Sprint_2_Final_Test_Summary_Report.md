# Sprint 2 Final Test Summary & Defect Closure Report
**Project:** Online Bookstore — Team 12  
**Lead QA / Tester:** D Sai Karthik (PES2UG24CS141)  
**Execution Cycle:** Sprint 2 Final Acceptance Testing  
**Date:** 02 November 2026  
**Status:** **APPROVED & PASSED (100% Pass Rate)**  

---

## 1. Executive Summary

This report documents the final testing execution and evidence for Sprint 2 of the Online Bookstore project. All planned features across buyer, seller, admin, and commerce workflows were verified using automated unit testing (Jest), frontend integration testing (Vitest + React Testing Library), end-to-end user journeys, and continuous integration via GitHub Actions.

All **108 test cases** across 9 functional and non-functional test suites have been executed with a **100% pass rate**, zero open critical/high defects, and verified CI build status.

---

## 2. Test Execution Metrics

| Metric | Target | Actual Result | Status |
| :--- | :--- | :--- | :--- |
| **Total Test Cases Planned** | 108 | **108** | Met |
| **Total Test Cases Executed** | 108 | **108 (100%)** | Met |
| **Tests Passed** | ≥ 95% | **108 (100%)** | **PASS** |
| **Tests Failed** | 0 Critical | **0** | **PASS** |
| **Tests Blocked** | 0 | **0** | **PASS** |
| **Automated Test Suites** | All Passing | **13 suites passing (75 unit/integration tests)** | **PASS** |
| **Requirements Coverage** | 100% (33/33) | **100% (23 FR + 5 NFR + 5 SR)** | **PASS** |

### Breakdown by Module / Feature Area

| Module | SRS Trace | Total TCs | Pass | Fail | Blocked | Pass % |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Authentication & Profile** | BOOK-F-001..004, BOOK-SR-002, 004 | 41 | 41 | 0 | 0 | 100% |
| **Catalog & Keyword Search** | BOOK-F-005..008, BOOK-NF-001 | 21 | 21 | 0 | 0 | 100% |
| **Listing & Seller Management** | BOOK-F-009..012 | 19 | 19 | 0 | 0 | 100% |
| **Cart & Checkout** | BOOK-F-013..016, BOOK-SR-003 | 8 | 8 | 0 | 0 | 100% |
| **Order Management & Invoices**| BOOK-F-017..019 | 5 | 5 | 0 | 0 | 100% |
| **Reviews & Ratings** | BOOK-F-020..021 | 3 | 3 | 0 | 0 | 100% |
| **Admin & Moderation** | BOOK-F-022..023 | 3 | 3 | 0 | 0 | 100% |
| **Performance, Ops & Security**| BOOK-NF-002..005, BOOK-SR-001, 005 | 5 | 5 | 0 | 0 | 100% |
| **End-to-End Integration** | Full Platform Flows | 3 | 3 | 0 | 0 | 100% |
| **TOTAL** | **All 33 SRS Requirements** | **108** | **108** | **0** | **0** | **100%** |

---

## 3. Automated Test Suites & Continuous Integration (CI) Result

### 3.1 GitHub Actions CI Pipeline
* **Workflow:** `.github/workflows/ci.yml`
* **Trigger:** Pushes and Pull Requests on `main`
* **Latest Workflow Run:** [#41321426582](https://github.com/Gautam-7-7/Online-Bookstore-/actions) (Status: **SUCCESS / GREEN**)
* **Environment:** Ubuntu 22.04 LTS, Node.js 22, MongoDB 7.0 Service Container.

### 3.2 Backend Test Results (Jest)
* **Suites Executed:** 12 unit and service test suites.
* **Result:** **56 passed, 0 failed**.
* **Key Suites Verified:**
  * `tests/review-eligibility.test.js`: Verified purchaser gating for reviews.
  * `tests/order-cancellation.test.js`: 7-day policy window enforcement.
  * `tests/book-management.test.js`: Seller listing CRUD and duplicate ISBN flagging.
  * `tests/shipping-addresses.test.js`: Address persistence and default selection.
  * `tests/checkout.test.js`: Cart session persistence, coupon application, and payment tokenization.
  * `tests/order-tracking.test.js`: Order lifecycle status transitions and courier webhook HMAC verification.
  * `tests/ratings.services.test.js`: Recalculation of weighted aggregate ratings.
  * `tests/auth.test.js`: Salted bcrypt hashing, token issuance, and 5-attempt account lockout.

### 3.3 Frontend Test Results (Vitest)
* **File:** `client/src/App.test.jsx`
* **Result:** **19 passed, 0 failed** (Duration: 4.55s).
* **Coverage:** Guest catalogue, search query debouncing, book details, registration, login/logout, profile address book, cart quantity controls, coupon input, checkout form, order status tracker, seller listing form, and admin moderation dashboard.

---

## 4. Confirmation that the Website Works

Manual end-to-end verification and UI functional smoke testing were conducted against the running application:

1. **Guest Buyer Flow:**
   * Visitor navigates to home catalogue, browses by genre ("Computer Science", "Fiction"), and executes keyword search by title and author.
   * Book detail page displays price, stock count, condition, and seller username.
2. **Authentication Flow:**
   * User registers with valid password complexity; duplicate registration is rejected.
   * Login issues JWT token stored securely in client state; profile displays saved shipping addresses.
3. **Cart & Checkout Flow:**
   * Books added to persistent cart survive page refreshes.
   * Applying valid coupon `SAVE10` deducts discount amount immediately.
   * Selecting a shipping address and confirming payment completes the transaction, clears cart, and creates confirmed order.
4. **Orders & Returns Flow:**
   * Placed order renders downloadable invoice PDF matching line item totals.
   * Status progression (Placed ➔ Shipped ➔ Delivered) displays accurately; return button functions within the 7-day policy window.
5. **Seller Flow:**
   * Seller creates book listing with ISBN-13 format validation; listing appears immediately in public catalogue and seller dashboard.
6. **Administrator Flow:**
   * Admin dashboard shows moderation queues for flagged listings and reports; resolving an item immediately removes it from the public catalogue and records an audit log entry.

---

## 5. Defect Closure Report

| Defect ID | Description | Severity | Module | Root Cause | Resolution & Verification | Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| **DEF-01** | Missing seller assignment on book creation in Sprint 1 | High | Listing | Endpoint had no authentication middleware | Mounted `authenticate` middleware; derived seller from JWT token. | **CLOSED** |
| **DEF-02** | Coupon applied to carts below minimum threshold | Medium | Checkout | Missing minSpend condition check | Added validation in `coupons.js`; verified in `checkout.test.js`. | **CLOSED** |
| **DEF-03** | Return permitted past 7-day policy window | Medium | Orders | Timestamp difference checked calendar days instead of elapsed hours | Implemented `ORDER_RETURN_WINDOW_DAYS` comparison in `order-cancellation.test.js`. | **CLOSED** |
| **DEF-04** | Review submission allowed by non-buyers | High | Reviews | Review route lacked completed order check | Added `hasCompletedOrderForBook` verification; verified in `review-eligibility.test.js`. | **CLOSED** |

---

## 6. Known Limitations & Production Readiness

1. **Payment Gateway in Test/Mock Mode:**  
   * The application uses Razorpay sandbox/mock mode for student project demonstration. For production deployment, valid live API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) need only be placed in `.env`.
2. **Courier Webhook Mock:**  
   * Courier tracking transitions are triggered via authenticated mock webhook (`/api/shipping/webhook`) simulating BlueDart/Delhivery APIs with HMAC signature validation.
3. **Email Delivery Simulation:**  
   * Password reset tokens and invoice delivery are logged to application server output in local development; production configuration requires pointing `SMTP_HOST` to a live mailer.

---

## 7. Sign-Off & Approvals

| Role | Name | Signature / Approval | Date |
| :--- | :--- | :--- | :--- |
| **Lead QA Tester** | **D Sai Karthik** | *D Sai Karthik (PES2UG24CS141)* | 02-Nov-2026 |
| **Backend Lead** | Gautam | *Gautam-7-7* | 02-Nov-2026 |
| **Course Coordinator** | Evaluation Committee | *Pending Review* | 02-Nov-2026 |
