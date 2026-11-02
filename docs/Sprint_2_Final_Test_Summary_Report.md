# Sprint 2 Final Test Summary & Defect Closure Report

**Project:** Online Bookstore — Team 12  
**Execution cycle:** Sprint 2 final evidence reconciliation
**Date:** 02 November 2026  
**Status:** **VERIFIED WITH LIMITATIONS**

## 1. Executive Summary

The repository contains 108 unique workbook cases. After evidence review, 106 are supported by automated execution evidence, while two remain **Not Run** because the claimed performance and TLS reports are not present. Manual browser acceptance testing, production deployment checks, load testing, uptime monitoring, and TLS infrastructure verification were not performed in this environment.

## 2. Test Execution Metrics

| Metric | Result | Status |
|---|---:|---|
| Workbook test cases | 108 | Verified |
| Executed with reproducible evidence | 106 | Partial |
| Passed | 106 | Pass |
| Failed | 0 | Pass |
| Blocked | 0 | Pass |
| Not Run | 2 | Pending evidence |
| Backend automated tests | 110 passed across 17 Jest suites | Pass |
| Frontend automated tests | 19 passed | Pass |
| Frontend production build | Passed | Pass |

The two unexecuted workbook cases are `TC-Perf-01.1` (`BOOK-NF-001`) and `TC-Sec-02.1` (`BOOK-SR-001`). Their previously referenced `benchmark-results.json` and `tls-audit-log.txt` files are not committed.

## 3. CI and Automated Test Evidence

* **Backend:** `cd server && MONGODB_URI=mongodb://127.0.0.1:27017/online_bookstore_test JWT_SECRET=ci-only-not-for-production NODE_OPTIONS=--experimental-vm-modules npm test -- --runInBand --testTimeout=60000` — 17 suites and 110 tests passed.
* **Frontend:** `cd client && npm test` — 19 tests passed.
* **Build:** `cd client && npm run build` — passed.
* **CI:** [GitHub Actions run #41445263666](https://github.com/Gautam-7-7/Online-Bookstore-/actions/runs/41445263666) passed both backend and frontend jobs on Node.js 22 with MongoDB 7.0.
* **Commit:** `cabe67fdb0656cf56af9058924a7db2ab2b19cca`.

The frontend test setup was made compatible with the current local Node.js/jsdom environment by providing a test-only `localStorage` fallback. It does not change production behavior.

## 4. Manual Acceptance Status

No manual browser session was executed. Automated coverage exists for catalogue, authentication, seller listings, carts, checkout validation, orders, reviews, and administration. The following remain pending manual acceptance and deployment evidence:

* Buyer, seller, and administrator browser journeys.
* Live or sandbox Razorpay transaction and callback handling.
* External SMTP delivery.
* Production courier integration.
* Deployment TLS, uptime, load/scalability, PCI-DSS assessment, and OWASP ZAP scan.

## 5. Defect Closure

The four defects recorded in the source report are covered by the existing automated regression suites:

| Defect | Area | Verification |
|---|---|---|
| DEF-01 | Seller ownership on listing creation | `book-management.test.js` |
| DEF-02 | Coupon minimum-spend validation | `checkout.test.js` |
| DEF-03 | Return-window enforcement | `order-cancellation.test.js` |
| DEF-04 | Verified-purchase review eligibility | `review-eligibility.test.js` |

No new application defect was reproduced during this audit. The unresolved items are evidence and release-management gaps, not claims of successful production integration.

## 6. Evidence Matrix

| Area | Verification performed | Result | Evidence |
|---|---|---|---|
| Backend tests | Complete Jest command above | 17 suites, 110 passed | Local output; CI run #41445263666 |
| Frontend tests | `cd client && npm test` | 19 passed | Local output; CI run #41445263666 |
| Frontend build | `cd client && npm run build` | Passed | Local output; CI run #41445263666 |
| Manual acceptance tests | Browser flows | Not run | Pending |
| Security tests | Source review and automated checks | Partial | Workbook; no TLS deployment or ZAP report |
| Performance tests | Searched repository for reproducible load report | Not run | Workbook `TC-Perf-01.1` |
| Release | Inspected local/remote tags and releases | No tag found | `cabe67f...`; issue #21 |

## 7. Known Limitations and Release Status

Payment and email tests use mocks or local fallbacks; no live payment, SMTP, or courier transaction was performed. The source implementation includes payment signature and shipping webhook checks, but this is not evidence of production readiness or PCI-DSS compliance.

The tag `v2.0-sprint2-final` is absent locally and remotely, and no GitHub release exists. The intended freeze commit and explicit approval therefore remain unresolved in issue #21. This branch does not create or move a release tag.

## 8. Sign-Off

| Role | Status |
|---|---|
| QA evidence review | Completed with the limitations above |
| Development review | Automated implementation checks pass |
| Course coordinator | Pending |
