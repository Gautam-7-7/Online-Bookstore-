# Sprint 2 Verification Report

**Project:** Online Bookstore — Team 12
**Execution date:** 02 November 2026
**Status:** **Partially verified; two environment-dependent checks remain not run**

## 1. Evidence summary

| Measure | Result |
|---|---:|
| Workbook cases | 108 planned |
| Passed | 106 |
| Failed | 0 |
| Blocked | 0 |
| Not run | 2 |
| Workbook pass rate | 98.15% of planned cases |
| Backend tests | 17 suites, 110 passed |
| Frontend tests | 1 suite, 19 passed |
| Frontend production build | Passed |
| CI | Passed: run [#41445263666](https://github.com/Gautam-7-7/Online-Bookstore-/actions/runs/41445263666) |

`TC-Perf-01.1` (500-concurrent-user performance) and `TC-Sec-02.1` (TLS 1.2+ scan) remain **Not Run** because no reproducible benchmark artifact or deployed TLS scan environment is committed. No manual browser acceptance test was executed.

## 2. Functional verification

Automated backend and frontend evidence covers authentication, password reset, profile and addresses, catalogue/search/filtering, seller verification and listing management, cart persistence, coupons, Razorpay sandbox checkout, invoices, order ownership, tracking transitions, cancellation/returns, reviews/ratings, administration, moderation, and analytics.

The backend suite passed with MongoDB 7.0 running locally. The frontend suite passed under the repository’s Node 22 CI environment; Node 26 required `NODE_OPTIONS=--localstorage-file=/tmp/online-bookstore-localstorage` for the local jsdom run. The production build completed successfully.

## 3. Payment gateway verification

Razorpay integration is test/sandbox-oriented and does not store raw card numbers or CVV. Automated coverage verifies:

- provider order creation from the database-derived total;
- idempotent checkout retries without double stock reservation;
- cleanup after provider-order creation failure;
- checkout signature validation and payment/order/amount/currency matching;
- authorized-payment capture before settlement;
- failed-payment reconciliation while preserving the cart;
- webhook signature verification and fail-closed invalid requests;
- payment status and confirmed-order settlement.

No live payment or production credential was used.

## 4. Order-tracking verification

Automated coverage verifies buyer-scoped order retrieval, confirmation/invoice flows, the `Placed → Shipped → Out for Delivery → Delivered` progression, rejection of skipped transitions, timestamp validation, authenticated shipping webhook updates, tracking history, cancellation policy handling, and return/refund handling. Courier updates are simulated through the HMAC-protected webhook; no real courier integration or fabricated shipment event was used.

## 5. Security, performance, and operations

| Area | Finding |
|---|---|
| Dependency audit | Backend: no reported vulnerabilities. Frontend: two moderate `react-router` advisories remain; the available fix is a major-version upgrade and was not applied blindly. |
| Input/payment security | Automated code and route tests passed for validation, sanitisation, password hashing, account lockout, payment tokenisation boundaries, and webhook signatures. |
| Performance | Not verified against the SRS 500-concurrent-user/90th-percentile target; no committed load-test evidence. |
| TLS | Not verified with an environment-backed TLS scan; no deployed HTTPS endpoint was available. |
| Uptime/scalability | Not verified with production monitoring or multi-instance load evidence. |
| Accessibility | Automated frontend accessibility test passed for the covered catalogue view; full WCAG 2.1 AA and viewport audit were not run. |

## 6. Release and repository controls

- Working branch: `final/sprint-2-deliverables`.
- Base commit: `cabe67fdb0656cf56af9058924a7db2ab2b19cca`.
- No release tag or GitHub release was created or moved; release remains pending explicit approval.
- The demo-video issue remains out of scope.
- Protected submitted documents were compared byte-for-byte with `origin/main` and are unchanged.

## 7. Remaining blockers

The implementation and automated regression suite are passing, but Sprint 2 cannot honestly be reported as fully verified until the performance benchmark and TLS scan are executed and recorded. Manual browser acceptance, production uptime, horizontal scalability, and a full deployment security review also remain unverified.
