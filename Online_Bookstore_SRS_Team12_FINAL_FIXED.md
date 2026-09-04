Software Requirements Specification (SRS)

Online Bookstore

Team: Team 12

Members: Dhanush V Biradar (PES2UG24CS141) | D Sai Karthik (PES2UG24CS155) | Gautam Krishna (PES2UG24CS169) | G Nikhil (PES2UG24CS165)

Version: 1.1

Date: 04-09-2026

Status: Draft for Review — Revised for template compliance

## Revision history

| Version | Date | Author | Change summary | Approval |
| --- | --- | --- | --- | --- |
| 1.0 | 04-09-2026 | Team 12 | Initial SRS draft with diagrams embedded | Pending |
| 1.1 | 04-09-2026 | Team 12 | Expanded BOOK-F-009..023 into individual requirement rows; corrected RTM with 3s target and full 33-row trace; renamed PRJ-SR-* to BOOK-SR-*; corrected UML relationship; standardized MERN stack | Pending |

## Approvals

| Role | Name | Signature / Email | Date |
| --- | --- | --- | --- |
| Course Coordinator |  |  |  |

## Table of Contents

1. Introduction

2. Overall description

3. External interfaces

4. System features (detailed)

5. Non-functional requirements (detailed)

6. Quality attributes & Acceptance tests

7. UML Use-Case Diagrams

8. Requirements Traceability Matrix (RTM)

# 1. Introduction

## 1.1 Purpose

This document is a Software Requirements Specification (SRS) for the Online Bookstore, an e-commerce platform for buying and selling books. It defines the functional and non-functional requirements, interfaces, and verification criteria for the system, intended as a reference for developers, testers, and evaluators.

## 1.2 Scope

Covers buyer-facing browsing, search, cart, checkout and order tracking; seller-facing listing creation and sales management; and administrator moderation, analytics, and platform monitoring. Excludes physical warehousing/logistics operations beyond the shipping-status API integration, and excludes core payment-gateway internal implementation beyond its public API.

## 1.3 Audience

Developers, QA Engineers, Project Mentors, and Assessment Evaluators.

## 1.4 Definitions

List of acronyms: ISBN, UI, API, JWT, OTP, TLS, MERN, RTO (Return-to-Origin), RTM, PCI-DSS, XSS.

# 2. Overall description

## 2.1 Product perspective

The Online Bookstore is a web-based marketplace connecting book buyers and sellers. It comprises a React frontend, a Node.js/Express backend, MongoDB persistence, and integration with a third-party payment gateway and an email/notification service.

## 2.2 Major product functions

Register, authenticate, and manage user profiles

Browse and search the book catalog

Create and manage book listings (seller)

Shopping cart, coupons, and checkout

Payment processing and invoicing

Order tracking, cancellation, and returns

Ratings and reviews

Administrative moderation and analytics

## 2.3 User roles and characteristics

Buyer: general public with basic web/e-commerce familiarity; expects fast search and a simple checkout.

Seller: individual or small vendor listing used/new books; needs a simple listing and sales-tracking flow.

Administrator: platform operator responsible for moderation, dispute handling, and analytics.

## 2.4 Operating environment

Modern web browsers (Chrome, Firefox, Edge, Safari) on desktop and mobile; React frontend; Node.js/Express backend; MongoDB for persistence; backend deployed on a cloud VM/container platform.

## 2.5 Constraints

PCI-DSS considerations for any payment data in transit, use of an approved third-party payment gateway (no raw card storage), and delivery timelines dependent on third-party shipping/courier APIs.

# 3. External interface requirements

## 3.1 User interfaces

Responsive web UI with a clear navigation structure (Home, Catalog, Cart, Orders, Seller Dashboard, Admin Panel). Accessible form labels and sufficient colour contrast for readability.

## 3.2 Hardware interfaces

None beyond standard client devices (desktop/laptop/mobile) with a web browser and internet connectivity.

## 3.3 Software interfaces

Payment Gateway API (Razorpay/Stripe-style, JSON over TLS) for checkout and refunds

Email/Notification service API for order confirmations, OTPs, and alerts

Shipping/Courier partner API for tracking updates (optional/simulated for the course project)

## 3.4 Communications

TLS 1.2+ enforced for all client-server and server-to-third-party traffic; JWT-based session tokens for authenticated API calls.

Requirement summary: 23 functional requirements across 7 feature areas, 5 non-functional requirements, 4 security objectives, and 5 security requirements.

# 4. System features (detailed)

Each requirement below is individually specified with type, priority, source, acceptance criteria, and a reference test case. IDs follow BOOK-F-###.

## 4.1 User Authentication & Account Management

Description: Allow visitors to register, authenticate securely, recover access, and manage their profile.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| BOOK-F-001 | The system shall allow a visitor to register an account with a unique email, name, and a password meeting complexity rules. | Functional | High | All Users | AC-001: Duplicate email is rejected; weak password rejected. Test: TC-Auth-01 | Email verification required |
| BOOK-F-002 | The system shall authenticate registered users via email and password, storing only salted-hashed passwords. | Functional | High | Security | AC-002: Correct credentials create a session; wrong password denied. Test: TC-Auth-02 | bcrypt/Argon2 hashing |
| BOOK-F-003 | The system shall allow a user to reset a forgotten password via a time-limited email link. | Functional | Medium | Support | AC-003: Link expires after 30 min; reused link rejected. Test: TC-Auth-03 | Link is single-use |
| BOOK-F-004 | The system shall let a user view and edit their profile and manage multiple shipping addresses. | Functional | Medium | Business | AC-004: Edited profile persists and default address is usable at checkout. Test: TC-Auth-04 | - |

## 4.2 Catalog & Search

Description: Allow buyers to discover books through browsing, search, and filtering.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| BOOK-F-005 | The system shall let any visitor browse the book catalog by category/genre without logging in. | Functional | High | Business | AC-005: Category page lists all active listings in that category. Test: TC-Cat-01 | Guest access allowed |
| BOOK-F-006 | The system shall provide keyword search across title, author, and ISBN with pagination. | Functional | High | Business | AC-006: Search for a known title returns it within top results in <2s. Test: TC-Cat-02 | Indexed search field |
| BOOK-F-007 | The system shall display a book detail page showing price, condition, seller, stock, and description. | Functional | High | Business | AC-007: Detail page renders all fields for any active listing. Test: TC-Cat-03 | - |
| BOOK-F-008 | The system shall allow filtering and sorting of search/browse results by price, rating, and availability. | Functional | Medium | UX | AC-008: Sorting by price ascending reorders results correctly. Test: TC-Cat-04 | - |

## 4.3 Book Listing & Selling

Description: Allow verified sellers to create and manage listings and monitor performance.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| BOOK-F-009 | The system shall allow a verified seller to create a book listing with title, author, ISBN, price, condition, cover image, and stock count. | Functional | High | Business | AC-009: Listing is created with all mandatory fields validated (ISBN format checked) and appears in the seller's active listings. Test: TC-List-01 | Requires ISBN format validation |
| BOOK-F-010 | The system shall allow a verified seller to edit an existing listing's details (price, condition, stock, description). | Functional | Medium | Business | AC-010: Edited fields persist and are reflected on the live listing immediately. Test: TC-List-02 | - |
| BOOK-F-011 | The system shall allow a verified seller to remove (deactivate) an existing listing, and shall automatically flag duplicate or suspicious listings for moderation. | Functional | High | Security / Business | AC-011: Removed listing no longer appears in the catalog; a duplicate ISBN or suspicious listing raises a moderation flag. Test: TC-List-03 | Feeds admin moderation queue (BOOK-F-022) |
| BOOK-F-012 | The system shall provide sellers with a dashboard summarising active listings, order status, and earnings. | Functional | Medium | Business | AC-012: Dashboard totals match the underlying listing/order/earnings records. Test: TC-List-04 | - |

## 4.4 Cart & Checkout

Description: Allow buyers to manage a cart, apply discounts, and complete payment.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| BOOK-F-013 | The system shall allow a buyer to add and remove books from a persistent shopping cart that survives across sessions. | Functional | High | Business | AC-013: Cart contents persist after logout/login; a removed item is no longer counted in the cart total. Test: TC-Cart-01 | Requires user-linked cart storage |
| BOOK-F-014 | The system shall allow a buyer to apply a valid coupon/discount code at checkout and shall reject expired or invalid codes. | Functional | Medium | Business | AC-014: A valid code reduces the order total correctly; an invalid/expired code is rejected with a message. Test: TC-Cart-02 | - |
| BOOK-F-015 | The system shall allow a buyer to select a saved shipping address or add a new one during checkout. | Functional | High | UX | AC-015: The selected or new address is attached to the order at checkout confirmation. Test: TC-Cart-03 | - |
| BOOK-F-016 | The system shall allow a buyer to complete payment through an integrated payment gateway (card / UPI / wallet) and shall confirm the transaction before finalising the order. | Functional | High | Business / Security | AC-016: Successful payment generates a confirmed order; failed payment leaves the cart intact and the order unconfirmed. Test: TC-Pay-01 | Depends on Payment Gateway API (3.3) |

## 4.5 Order Management

Description: Confirm, track, and manage the lifecycle of a placed order.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| BOOK-F-017 | The system shall generate an order confirmation and a downloadable invoice immediately upon successful payment. | Functional | High | Business | AC-017: The invoice PDF is downloadable and matches the order line items and totals. Test: TC-Ord-01 | - |
| BOOK-F-018 | The system shall allow a buyer to track order status through defined stages (Placed / Shipped / Out for Delivery / Delivered). | Functional | High | Business | AC-018: The status shown to the buyer matches the latest shipping-partner update. Test: TC-Ord-02 | Depends on shipping/courier partner API |
| BOOK-F-019 | The system shall allow a buyer to request cancellation or return within a configurable policy window (e.g., 7 days of delivery). | Functional | Medium | Business | AC-019: A request submitted within the window is accepted; a request after the window is rejected with a message. Test: TC-Ord-03 | Policy window configurable by admin |

## 4.6 Reviews & Ratings

Description: Allow verified purchasers to rate and review books and sellers.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| BOOK-F-020 | The system shall allow a buyer who has completed a purchase to rate and review the book and the seller (1-5 stars plus free text). | Functional | Medium | Business | AC-020: A review is accepted only from buyers with a completed order for that item and appears on the book/seller page. Test: TC-Rev-01 | Purchase verification required |
| BOOK-F-021 | The system shall compute and display an aggregate rating for each book and seller, recalculated whenever a new review is submitted. | Functional | Low | UX | AC-021: The displayed average matches recalculation from all stored ratings after a new submission. Test: TC-Rev-02 | - |

## 4.7 Administration & Moderation

Description: Allow administrators to moderate content and manage accounts.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| BOOK-F-022 | The system shall allow an administrator to moderate flagged listings and user-submitted reports, with the ability to approve, reject, or remove them. | Functional | High | Security / Business | AC-022: A moderation action updates the listing/report status and is recorded in the audit log. Test: TC-Admin-01 | Consumes flags raised by BOOK-F-011 |
| BOOK-F-023 | The system shall allow an administrator to suspend or verify seller/buyer accounts and shall provide a sales analytics dashboard (revenue, top titles, active sellers). | Functional | Medium | Business / Security | AC-023: A suspended account cannot log in; analytics dashboard totals reconcile with order records. Test: TC-Admin-02 | - |

# 5. Non-functional requirements (detailed)

NFRs below are measurable and tied to test plans. IDs follow BOOK-NF-###.

| Req ID | Requirement | Category | Priority | Acceptance Criteria / Measurement |
| --- | --- | --- | --- | --- |
| BOOK-NF-001 | Page load and search response shall complete within 3 seconds for 90% of requests under normal load (up to 500 concurrent users). | Performance | High | 90th percentile ≤ 3s in load test. Test: TC-Perf-01 |
| BOOK-NF-002 | The platform shall provide 99.5% monthly uptime, excluding scheduled maintenance windows. | Reliability | High | Uptime monitoring reports ≥99.5%/month. Test: Ops reports |
| BOOK-NF-003 | All cardholder and payment data shall be handled per PCI-DSS guidelines; raw card numbers shall never be stored in application databases. | Security/Compliance | High | PCI-DSS checklist pass; payment tokenisation verified. Test: TC-Sec-01 |
| BOOK-NF-004 | The UI shall be responsive and usable on mobile, tablet, and desktop viewports (WCAG 2.1 AA where practical). | Usability/Accessibility | Medium | Responsive layout audit + accessibility scan pass. Test: TC-UX-01 |
| BOOK-NF-005 | The system architecture shall support horizontal scaling of the catalog and order services to handle seasonal traffic spikes (e.g., exam-season book sales). | Scalability | Medium | Load test shows linear throughput gain when an instance is added. Test: TC-Scale-01 |

## 5.1 Security

### 5.1.1 Security Objectives

Protect user personal and payment data confidentiality, aligned with PCI-DSS principles.

Ensure secure authentication and prevent unauthorised access to buyer, seller, and admin accounts.

Maintain the integrity of catalog, order, and transaction data against tampering.

Preserve platform availability against common web attacks (e.g., brute-force login, injection attempts).

### 5.1.2 Security Requirements

| Req ID | Requirement (shall...) | Type | Priority | Acceptance Criteria / Test |
| --- | --- | --- | --- | --- |
| BOOK-SR-001 | TLS 1.2+ shall be mandatory for all client-server and server-to-payment-gateway connections. | Security | High | TLS scan confirms no plaintext endpoints. Test: TC-Sec-02 |
| BOOK-SR-002 | User passwords shall be stored only as salted cryptographic hashes (bcrypt/Argon2), never in plaintext or reversible form. | Security | High | DB inspection shows hashed values only. Test: TC-Sec-03 |
| BOOK-SR-003 | Payment details shall be tokenised by the payment gateway; the application shall never persist full card numbers or CVV. | Security | High | Code/DB review confirms no raw PAN storage. Test: TC-Sec-04 |
| BOOK-SR-004 | The system shall lock an account for 15 minutes after 5 consecutive failed login attempts and log the event. | Security | Medium | Automated attempt triggers lockout and audit entry. Test: TC-Sec-05 |
| BOOK-SR-005 | All user-supplied input shall be validated and sanitised on both client and server to prevent SQL injection and XSS. | Security | High | OWASP ZAP scan shows no high-severity injection findings. Test: TC-Sec-06 |

# 6. Quality attributes & Acceptance tests

Exit criteria for acceptance: all High-priority functional requirements implemented and verified, no critical NFR failures, and the RTM shows all mapped test cases passed.

Acceptance test suites: Authentication, Catalog & Search, Listing Management, Cart & Checkout, Order Management, Reviews, Performance, Security, and Accessibility.

The requirement-level acceptance criteria in Section 4 and the NFR/security criteria in Section 5 provide the pass/fail conditions for the referenced test cases.

| Test suite | Primary test cases | Acceptance focus |
| --- | --- | --- |
| Authentication | TC-Auth-01 to TC-Auth-04 | Registration, login, password reset, profile/address persistence |
| Catalog & Search | TC-Cat-01 to TC-Cat-04 | Browsing, search, detail page, filtering/sorting |
| Listing Management | TC-List-01 to TC-List-04 | Create/edit/remove listings, duplicate/suspicious flagging, seller dashboard |
| Cart & Checkout | TC-Cart-01 to TC-Cart-03, TC-Pay-01 | Cart persistence, coupon validation, shipping address, successful/failed payment |
| Order Management | TC-Ord-01 to TC-Ord-03 | Invoice, tracking stages, cancellation/return policy window |
| Reviews | TC-Rev-01 to TC-Rev-02 | Verified purchase review and aggregate ratings |
| Performance / Scale | TC-Perf-01, TC-Scale-01 | ≤3s 90th percentile target and horizontal scaling behavior |
| Security | TC-Sec-01 to TC-Sec-06 | PCI-DSS handling, TLS, password hashing, tokenisation, lockout, input validation |
| Accessibility | TC-UX-01 | Responsive UI and accessibility scan |

# 7. UML Use-Case Diagrams

## 7.1 Use-Case Diagram 1 — Book Buyer

The incorrect Add to Cart <<include>> Checkout relationship has been removed. Applying a coupon remains an optional <<extend>> behavior of checkout.

## 7.2 Use-Case Diagram 2 — Seller & Administrator

# 8. Requirements Traceability Matrix (RTM)

The RTM maps every functional, non-functional, and security requirement to its section/design specification, implementation module, and verification test case. Status uses N/P/A as shown in the template.

| Req ID | Requirement (short) | Section ref / Design Spec | Module | Test case(s) | Status (N/P/A) |
| --- | --- | --- | --- | --- | --- |
| BOOK-F-001 | User registration | 4.1 / DS-Auth-01 | AuthModule | TC-Auth-01 | N |
| BOOK-F-002 | User login | 4.1 / DS-Auth-01 | AuthModule | TC-Auth-02 | N |
| BOOK-F-003 | Password reset | 4.1 / DS-Auth-02 | AuthModule | TC-Auth-03 | N |
| BOOK-F-004 | Profile & address mgmt | 4.1 / DS-Auth-03 | AuthModule | TC-Auth-04 | N |
| BOOK-F-005 | Browse catalog | 4.2 / DS-Cat-01 | CatalogModule | TC-Cat-01 | N |
| BOOK-F-006 | Keyword search | 4.2 / DS-Cat-01 | CatalogModule | TC-Cat-02 | N |
| BOOK-F-007 | Book detail page | 4.2 / DS-Cat-02 | CatalogModule | TC-Cat-03 | N |
| BOOK-F-008 | Filter/sort results | 4.2 / DS-Cat-02 | CatalogModule | TC-Cat-04 | N |
| BOOK-F-009 | Create listing | 4.3 / DS-List-01 | ListingModule | TC-List-01 | N |
| BOOK-F-010 | Edit listing | 4.3 / DS-List-01 | ListingModule | TC-List-02 | N |
| BOOK-F-011 | Remove/flag listing | 4.3 / DS-List-02 | ListingModule | TC-List-03 | N |
| BOOK-F-012 | Seller dashboard | 4.3 / DS-List-03 | ListingModule | TC-List-04 | N |
| BOOK-F-013 | Cart add/remove | 4.4 / DS-Cart-01 | CartModule | TC-Cart-01 | N |
| BOOK-F-014 | Apply coupon | 4.4 / DS-Cart-02 | CartModule | TC-Cart-02 | N |
| BOOK-F-015 | Select shipping address | 4.4 / DS-Cart-03 | CheckoutModule | TC-Cart-03 | N |
| BOOK-F-016 | Payment processing | 4.4 / DS-Pay-01 | CheckoutModule | TC-Pay-01 | N |
| BOOK-F-017 | Order confirmation/invoice | 4.5 / DS-Ord-01 | OrderModule | TC-Ord-01 | N |
| BOOK-F-018 | Order tracking | 4.5 / DS-Ord-02 | OrderModule | TC-Ord-02 | N |
| BOOK-F-019 | Cancel/return | 4.5 / DS-Ord-03 | OrderModule | TC-Ord-03 | N |
| BOOK-F-020 | Rate & review | 4.6 / DS-Rev-01 | ReviewModule | TC-Rev-01 | N |
| BOOK-F-021 | Aggregate rating | 4.6 / DS-Rev-02 | ReviewModule | TC-Rev-02 | N |
| BOOK-F-022 | Moderate listings/reports | 4.7 / DS-Admin-01 | AdminModule | TC-Admin-01 | N |
| BOOK-F-023 | Suspend/verify + analytics | 4.7 / DS-Admin-02 | AdminModule | TC-Admin-02 | N |
| BOOK-NF-001 | Response time target (3s) | 5 / DS-Perf-01 | WebUI / API | TC-Perf-01 | N |
| BOOK-NF-002 | Uptime 99.5% | 5 / DS-Ops-01 | Infra / Monitoring | Ops reports | N |
| BOOK-NF-003 | PCI-DSS compliance | 5 / DS-Sec-01 | Payment / Security | TC-Sec-01 | N |
| BOOK-NF-004 | Responsive/accessible UI | 5 / DS-UX-01 | WebUI | TC-UX-01 | N |
| BOOK-NF-005 | Horizontal scalability | 5 / DS-Scale-01 | Catalog / Order services | TC-Scale-01 | N |
| BOOK-SR-001 | TLS 1.2+ | 5.1.2 / DS-Sec-02 | Infra / Network | TC-Sec-02 | N |
| BOOK-SR-002 | Password hashing | 5.1.2 / DS-Sec-03 | AuthModule | TC-Sec-03 | N |
| BOOK-SR-003 | Payment tokenisation | 5.1.2 / DS-Sec-04 | CheckoutModule | TC-Sec-04 | N |
| BOOK-SR-004 | Account lockout | 5.1.2 / DS-Sec-05 | AuthModule | TC-Sec-05 | N |
| BOOK-SR-005 | Input validation/sanitisation | 5.1.2 / DS-Sec-06 | All modules | TC-Sec-06 | N |

## Document consistency checks completed

23 functional requirements are individually specified from BOOK-F-001 through BOOK-F-023.

5 non-functional requirements are individually specified from BOOK-NF-001 through BOOK-NF-005.

5 security requirements are consistently named BOOK-SR-001 through BOOK-SR-005.

BOOK-NF-001 uses a 3-second response target consistently in both the requirement and RTM.

The RTM contains all 33 requirements (23 FR + 5 NFR + 5 SR).

The Buyer UML diagram no longer shows Add to Cart as <<include>> Checkout.

## UML Diagram Images

### 7.1 Use-Case Diagram 1 — Buyer
![UML Diagram 1 — Buyer](UML_Diagrams/UML_Diagram_1.png)

### 7.2 Use-Case Diagram 2 — Seller & Administrator
![UML Diagram 2 — Seller & Administrator](UML_Diagrams/UML_Diagram_2.png)

