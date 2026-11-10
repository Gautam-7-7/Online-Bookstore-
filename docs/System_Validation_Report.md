# System Validation Report
**Project:** Online Bookstore — Team 12  
**Lead QA / Tester:** D Sai Karthik (PES2UG24CS141)  
**Testing Cycle:** Sprint 2 Quality Assurance & Final Acceptance  
**Date:** 06 November 2026  
**Document Reference:** `Online_Bookstore_SRS_Team12_FINAL_FIXED.md` (Section 4)  
**Status:** **100% VALIDATED & ACCEPTED**  

---

## 1. Executive Summary

System Validation ensures that the built application satisfies all specified user needs, business requirements, and operational workflows as outlined in the Software Requirements Specification (SRS). 

This report provides complete functional acceptance verification for all **23 Functional Requirements (BOOK-F-001 through BOOK-F-023)** across all three system roles: **Buyer**, **Seller**, and **Administrator**.

### High-Level Validation Results
* **Total Functional Requirements (FRs) Evaluated:** **23 / 23**
* **Total Requirements Fully Validated:** **23 (100%)**
* **Failed / Incomplete Requirements:** **0**
* **System Acceptance Decision:** **ACCEPTED FOR RELEASE**

---

## 2. Functional Requirements Traceability & Validation Matrix

| Req ID | Requirement Description | User Persona | Validation Method | Acceptance Criteria Result | Final Status |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **BOOK-F-001** | Visitor registration with unique email and password complexity | Buyer / Seller | Jest + Vitest + Browser | Rejects duplicate emails; validates password complexity; stores salted hash | **VALIDATED** |
| **BOOK-F-002** | User authentication with email/password and JWT session | All Users | Jest + Vitest + Browser | Correct credentials issue token; wrong credentials denied; 5 failures lock account | **VALIDATED** |
| **BOOK-F-003** | Password reset via secure time-limited token | All Users | Jest + Vitest | Cryptographically random single-use token expires after 30 minutes | **VALIDATED** |
| **BOOK-F-004** | Profile editing and multiple shipping address management | Buyer / Seller | Jest + Vitest + Browser | User can view/edit profile and manage multiple saved shipping addresses | **VALIDATED** |
| **BOOK-F-005** | Guest catalogue browsing by category/genre | Guest / Buyer | Vitest + Browser | Category filter lists active books without requiring authentication | **VALIDATED** |
| **BOOK-F-006** | Keyword search across title, author, and ISBN with pagination | Guest / Buyer | Jest + Vitest + Browser | Search bar returns matching active listings with limit and page controls | **VALIDATED** |
| **BOOK-F-007** | Book detail page displaying price, condition, seller, stock | Guest / Buyer | Vitest + Browser | Detailed page renders all attributes, stock indicators, and seller details | **VALIDATED** |
| **BOOK-F-008** | Search and browse filtering and sorting (price, rating, availability)| Guest / Buyer | Jest + Vitest + Browser | Sorts ascending/descending and filters out-of-stock titles correctly | **VALIDATED** |
| **BOOK-F-009** | Verified seller listing creation with ISBN format validation | Seller | Jest + Vitest + Browser | Seller creates listing with ISBN-10/13 validation; listing appears immediately | **VALIDATED** |
| **BOOK-F-010** | Seller editing of existing listing details (price, stock, condition)| Seller | Jest + Vitest + Browser | Seller can modify own listing; unauthorized users rejected (HTTP 403) | **VALIDATED** |
| **BOOK-F-011** | Seller deactivation of listing & duplicate ISBN flagging | Seller / Admin | Jest + Vitest | Seller soft-deactivates listing; duplicate ISBN auto-flagged for moderation | **VALIDATED** |
| **BOOK-F-012** | Seller dashboard displaying active listings, orders, earnings | Seller | Vitest + Browser | Dashboard displays accurate aggregates reconciled with database | **VALIDATED** |
| **BOOK-F-013** | Persistent shopping cart surviving user sessions | Buyer | Jest + Vitest + Browser | Cart items and quantities persist across browser refreshes and login/logout | **VALIDATED** |
| **BOOK-F-014** | Coupon discount code validation and application at checkout | Buyer | Jest + Vitest + Browser | Valid codes (`SAVE10`) apply discounts; expired/below-minimum codes rejected | **VALIDATED** |
| **BOOK-F-015** | Shipping address selection or creation during checkout | Buyer | Vitest + Browser | User selects default address or enters new address dynamically during checkout | **VALIDATED** |
| **BOOK-F-016** | Integrated payment gateway checkout (Razorpay mock) | Buyer | Jest + Vitest + Browser | Valid payment confirms order, decrements stock, and clears persistent cart | **VALIDATED** |
| **BOOK-F-017** | Order confirmation and downloadable PDF invoice generation | Buyer | Jest + Supertest + Browser| Generated PDF invoice matches line items, discount, tax, and order totals | **VALIDATED** |
| **BOOK-F-018** | Order delivery lifecycle tracking with status progression | Buyer / Admin | Jest + Vitest + Webhook | Displays stages (`Placed` -> `Shipped` -> `Out for Delivery` -> `Delivered`) | **VALIDATED** |
| **BOOK-F-019** | Order cancellation and return requests within 7-day policy | Buyer | Jest + Vitest + Browser | Cancellation allowed when Placed; return accepted within 7-day window | **VALIDATED** |
| **BOOK-F-020** | Verified-purchaser rating and review submission | Buyer | Jest + Vitest + Browser | Only users with delivered order can review; non-purchasers rejected (403) | **VALIDATED** |
| **BOOK-F-021** | Automatic aggregate rating recalculation | All Users | Jest + Vitest | Weighted average rating recalculates immediately upon new review submission | **VALIDATED** |
| **BOOK-F-022** | Administrator listing and report moderation queue | Admin | Jest + Vitest + Browser | Admin approves/rejects flagged listings; records audit trail in `AuditLog` | **VALIDATED** |
| **BOOK-F-023** | Administrator account suspension and sales analytics | Admin | Jest + Vitest + Browser | Admin suspends malicious accounts; sales revenue analytics reconcile with orders | **VALIDATED** |

---

## 3. End-to-End User Journey Validation

System acceptance was confirmed through manual browser walkthroughs covering complete lifecycle workflows:

```
[Guest Browse & Search] ➔ [Registration & Login] ➔ [Cart & Coupon] ➔ [Payment Checkout] ➔ [Order Tracking & PDF Invoice]
```

### 3.1 Buyer Experience
1. **Catalog Exploration:** Browsed catalogue at `http://localhost:5173/`, selected category "Computer Science", and searched for "Design Patterns".
2. **Account Onboarding:** Successfully registered a buyer profile; received automatic session login.
3. **Cart Management:** Added 2 copies of a selected book; entered coupon `SAVE10` and verified a 10% reduction in cart total.
4. **Checkout:** Selected saved address, initiated simulated payment, confirmed order, and verified that cart was emptied.
5. **Post-Purchase:** Navigated to Orders page, verified "Placed" status, downloaded generated PDF invoice, and confirmed order line items matched checkout totals.

### 3.2 Seller Experience
1. **Listing Management:** Authenticated seller navigated to `/seller/create`, filled in title, author, price (₹499), stock (15), and valid ISBN-13.
2. **Dashboard Review:** Verified that the newly created listing appeared on the Seller Dashboard (`/seller/dashboard`) and in public catalogue search.
3. **Inventory Update:** Updated stock count from 15 to 20; verified immediate reflection on book detail view.

### 3.3 Administrator Experience
1. **Moderation Queue:** Logged in with admin account, navigated to `/admin`, and inspected flagged duplicate listing report.
2. **Action Execution:** Approved resolution action, confirming that the duplicate listing was removed from public browse and recorded in `AuditLog`.
3. **Analytics Dashboard:** Verified aggregate metrics for total platform revenue, active seller count, and daily order volume.

---

## 4. System Validation Sign-Off

The Online Bookstore application (Team 12) complies with all requirements stipulated in the Software Requirements Specification (SRS) and passes all functional acceptance criteria.

**Signed Off By:**  
D Sai Karthik (PES2UG24CS141) — Lead QA Tester  
Gautam — Development Lead  
Team 12, Online Bookstore Project
