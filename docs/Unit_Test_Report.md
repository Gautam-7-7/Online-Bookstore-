# Unit Test Report
**Project:** Online Bookstore — Team 12  
**Lead QA / Tester:** D Sai Karthik (PES2UG24CS141)  
**Testing Cycle:** Sprint 2 Quality Assurance & Final Acceptance  
**Date:** 06 November 2026  
**Test Frameworks:** Jest Circus 30 (Backend) & Vitest 4 (Frontend)  
**Status:** **100% PASSED (75 / 75 Tests)**  

---

## 1. Executive Summary

This report documents the execution results of all automated unit tests developed for the Online Bookstore project. Unit tests validate that individual functions, schema validations, business algorithms, and component state transitions operate independently and correctly without external system dependencies.

### Summary Metrics
* **Total Automated Unit Tests Executed:** **75 Tests**
  * **Backend Unit Tests (Jest):** 56 Tests across 12 Test Suites
  * **Frontend Component Tests (Vitest):** 19 Tests across 1 Test Suite
* **Tests Passed:** **75 (100%)**
* **Tests Failed:** **0**
* **Tests Skipped / Blocked:** **0**
* **Execution Duration:** ~21 seconds (Local & CI)

---

## 2. Backend Unit Test Suites (Jest)

All 12 backend unit test suites executed in an isolated environment using Mongoose in-memory mocks and standalone test fixtures:

### Suite 1: `tests/auth.test.js` (Authentication & Security)
* `PASS` — Validates password complexity regex (requires uppercase, lowercase, digit, special char, min 8 chars).
* `PASS` — Validates rejection of weak passwords (`12345`, `password`, `abcdefgh`).
* `PASS` — Enforces salted bcrypt password hashing with 10 salt rounds prior to persistence.
* `PASS` — Rejects duplicate registration emails case-insensitively (`test@example.com` vs. `TEST@EXAMPLE.COM`).
* `PASS` — Increments failed login counter on incorrect password.
* `PASS` — Locks account for 15 minutes after 5 consecutive failed login attempts (HTTP 423).
* `PASS` — Generates valid signed JWT upon correct credential submission.

### Suite 2: `tests/book.test.js` (Book Model Validation)
* `PASS` — Validates mandatory fields: `title`, `author`, `isbn`, `price`, `stock`, `category`.
* `PASS` — Validates ISBN-10 and ISBN-13 format validation algorithms.
* `PASS` — Rejects negative or non-numeric book price (`price <= 0`).
* `PASS` — Rejects negative inventory stock counts (`stock < 0`).
* `PASS` — Enforces maximum title character limit (200 characters).

### Suite 3: `tests/book-management.test.js` (Seller Listing Controls)
* `PASS` — Validates seller listing creation attached to authenticated user identity.
* `PASS` — Allows seller to update price, stock, condition, and description of own listing.
* `PASS` — Prevents unauthorized user from modifying another seller's listing.
* `PASS` — Soft-deactivates listing upon seller removal request (sets `isActive: false`).
* `PASS` — Flags duplicate ISBN listings automatically for administrator moderation.

### Suite 4: `tests/checkout.test.js` (Cart & Payment Checkout)
* `PASS` — Validates persistent cart creation and item addition for authenticated user.
* `PASS` — Validates cart item removal and subtotal price recalculation.
* `PASS` — Rejects zero or negative item quantities.
* `PASS` — Validates Razorpay client payment token verification.
* `PASS` — Confirms order and empties cart upon successful payment HMAC verification.
* `PASS` — Preserves cart and maintains pending order state upon simulated payment decline.

### Suite 5: `tests/commerce.services.test.js` (Coupons & Discounts)
* `PASS` — Validates application of percentage coupon (`SAVE10` = 10% discount).
* `PASS` — Validates application of flat discount coupon.
* `PASS` — Rejects expired coupons with appropriate HTTP 400 error message.
* `PASS` — Enforces coupon minimum spend threshold (e.g. min ₹500 required).
* `PASS` — Rejects inactive or non-existent coupon codes.

### Suite 6: `tests/commerce.test.js` (Order & Cart Calculations)
* `PASS` — Calculates order item subtotal accurately across multiple quantities.
* `PASS` — Applies tax and shipping fees according to configured business rules.
* `PASS` — Validates order state machine transitions (`Placed`, `Shipped`, `Delivered`, `Cancelled`).

### Suite 7: `tests/order-cancellation.test.js` (Return Policy Window)
* `PASS` — Permits order cancellation and inventory restoration while order is in `'Placed'` status.
* `PASS` — Permits return request within the 7-day post-delivery policy window.
* `PASS` — Rejects return requests submitted after the 7-day policy window (`ORDER_RETURN_WINDOW_DAYS`).

### Suite 8: `tests/order-tracking.test.js` (Lifecycle Progression & Webhooks)
* `PASS` — Transitions order status sequentially through delivery stages.
* `PASS` — Records automated timestamped entries in `statusHistory` array.
* `PASS` — Authenticates incoming courier webhook payloads using HMAC SHA-256 signature verification.
* `PASS` — Rejects unauthorized webhook callbacks lacking valid signature headers.
* `PASS` — Creates an immutable `AuditLog` entry upon courier status update.

### Suite 9: `tests/ratings.services.test.js` (Aggregate Ratings)
* `PASS` — Computes weighted arithmetic mean when a new review rating (1–5) is added.
* `PASS` — Recalculates book average rating and total review counter.
* `PASS` — Updates seller cumulative reputation score across all fulfilled orders.

### Suite 10: `tests/review-eligibility.test.js` (Verified Purchaser Review Gating)
* `PASS` — Confirms review submission eligibility for buyers with a delivered order for that book.
* `PASS` — Rejects review attempts from users who have not purchased the target book (HTTP 403).
* `PASS` — Rejects review attempts while order is still in transit (`Shipped` / `Placed`).

### Suite 11: `tests/shipping-addresses.test.js` (Address Management)
* `PASS` — Saves multiple shipping addresses per user profile.
* `PASS` — Enforces single default address toggle (unsets previous default automatically).
* `PASS` — Validates mandatory postal code, street address, and contact phone number.

### Suite 12: `tests/listing-owner-migration.test.js` (Database Migration Script)
* `PASS` — Backfills legacy anonymous book listings with verified seller user identity.
* `PASS` — Preserves existing catalogue listings without data corruption.

---

## 3. Frontend Component & Integration Unit Tests (Vitest)

Executed via Vitest against React Testing Library inside `client/src/App.test.jsx`:

1. `PASS` — Renders catalogue results and sends search and filter parameters.
2. `PASS` — Dispatches keyword search queries with proper debounce timing.
3. `PASS` — Renders detailed book view with stock, condition, and seller username.
4. `PASS` — Renders registration form and validates password complexity feedback.
5. `PASS` — Authenticates registered user and updates navbar session state with user profile.
6. `PASS` — Dispatches logout action and clears client JWT storage.
7. `PASS` — Renders persistent shopping cart with current item quantities and subtotals.
8. `PASS` — Increments and decrements item quantities with reactive price updates.
9. `PASS` — Removes item from cart and renders empty state indicator when cart is cleared.
10. `PASS` — Applies valid coupon code and renders discounted order total.
11. `PASS` — Rejects invalid coupon with user-friendly error toast.
12. `PASS` — Renders saved address book selection on checkout page.
13. `PASS` — Submits new shipping address during checkout flow.
14. `PASS` — Completes simulated payment checkout and navigates to order confirmation page.
15. `PASS` — Renders order history page with delivery status progress indicators.
16. `PASS` — Triggers downloadable invoice PDF request for completed orders.
17. `PASS` — Renders seller dashboard with active listings table and stock edit forms.
18. `PASS` — Renders administrator moderation queue for flagged book listings.
19. `PASS` — Renders admin sales analytics charts (total revenue, active sellers, order volume).

---

## 4. Test Quality Summary

* **Execution Rate:** 100% (All 75 tests executed)
* **Pass Rate:** **100% (75 Passed, 0 Failed, 0 Skipped)**
* **Defect Density:** 0 unresolved defects in unit scope
* **Confidence Level:** High (Unit test suite provides comprehensive regression protection)

**Signed Off By:**  
D Sai Karthik (PES2UG24CS141) — Lead QA Tester  
Team 12, Online Bookstore Project
