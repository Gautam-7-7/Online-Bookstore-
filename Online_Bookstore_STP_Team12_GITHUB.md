Software Test Plan (STP)

Online Bookstore

  -----------------------------------------------------------------------
  Field                               Value
  ----------------------------------- -----------------------------------
  Project                             Online Bookstore

  Team                                Team 12

  Members                             Dhanush V Biradar (PES2UG24CS141);
                                      D Sai Karthik (PES2UG24CS155);
                                      Gautam Krishna (PES2UG24CS169); G
                                      Nikhil (PES2UG24CS165)

  Version                             1.0

  Date                                14-09-2026

  Status                              Final
  -----------------------------------------------------------------------

# 1. Introduction

Purpose: Define objectives, scope, strategy, resources, schedule,
responsibilities and traceability for testing the Online Bookstore.

Scope: Authentication, catalog/search, seller listings, cart/checkout,
payment integration, orders, reviews, administration, performance,
security and accessibility. Internal third-party service logic and
physical logistics are excluded.

References: Online Bookstore SRS Team 12 Version 1.1; SAD Team 12; SRS
Section 8 RTM.

# 2. Test Items

-   Authentication & Account module

-   Catalog & Search

-   Listing & Selling

-   Cart & Checkout

-   Payment Gateway integration

-   Order Management & Shipping status

-   Reviews & Ratings

-   Administration & Moderation

-   Web UI, REST API and MongoDB

# 3. Features to be Tested

  -----------------------------------------------------------------------
  SRS IDs                 Feature                 Test Focus
  ----------------------- ----------------------- -----------------------
  BOOK-F-001..004         Authentication          Registration, login,
                                                  reset, profile/address

  BOOK-F-005..008         Catalog/Search          Browse, search,
                                                  details,
                                                  filtering/sorting

  BOOK-F-009..012         Listing                 Create/edit/remove,
                                                  flagging, seller
                                                  dashboard

  BOOK-F-013..016         Cart/Checkout           Persistence, coupons,
                                                  address, payment

  BOOK-F-017..019         Orders                  Invoice, tracking,
                                                  cancellation/return

  BOOK-F-020..021         Reviews                 Verified reviews and
                                                  aggregate ratings

  BOOK-F-022..023         Administration          Moderation, reports,
                                                  account controls,
                                                  analytics

  BOOK-NF-001..005        NFRs                    Performance, uptime,
                                                  compliance,
                                                  accessibility, scaling

  BOOK-SR-001..005        Security                TLS, hashing,
                                                  tokenisation, lockout,
                                                  validation
  -----------------------------------------------------------------------

# 4. Features Not to be Tested

-   Internal implementation of third-party payment gateway.

-   Internal implementation of notification/shipping providers.

-   Physical warehousing, courier operations and uncontrolled hardware.

-   Production-scale infrastructure beyond defined course
    load/scalability tests.

# 5. Test Approach / Strategy

## 5.1 Levels

-   Unit testing of UI components, backend modules and validation logic.

-   Integration testing for frontend/API, API/database and external
    services.

-   System testing for complete buyer, seller and admin workflows.

-   Acceptance/UAT against SRS acceptance criteria.

## 5.2 Types

-   Functional

-   Regression

-   API

-   Integration

-   Performance/load

-   Security

-   Usability/accessibility

Entry Criteria: Stable build, test data, configured environment and
reviewed test cases.

Exit Criteria: 100% planned cases executed, 0 open Critical defects,
High-priority acceptance criteria satisfied or formally waived, and RTM
updated.

## 5.3 Security Validation

-   Verify TLS 1.2+ (BOOK-SR-001).

-   Verify salted bcrypt/Argon2 password hashes (BOOK-SR-002).

-   Verify tokenisation and no raw PAN/CVV storage (BOOK-SR-003 /
    BOOK-NF-003).

-   Verify lockout after 5 failures for 15 minutes and audit event
    (BOOK-SR-004).

-   Perform injection/XSS testing and OWASP ZAP scanning (BOOK-SR-005).

# 6. Test Environment

  -----------------------------------------------------------------------
  Area                                Environment
  ----------------------------------- -----------------------------------
  Client                              Chrome/Firefox/Edge/Safari; desktop
                                      and mobile viewports

  Frontend                            React staging/development build

  Backend                             Node.js + Express

  Database                            MongoDB isolated test database

  External services                   Payment sandbox; notification
                                      sandbox; shipping
                                      sandbox/simulation

  Tools                               Postman, Selenium/Playwright,
                                      JMeter, OWASP ZAP, GitHub
                                      Issues/Jira

  Test Data                           Dummy users, books, listings,
                                      coupons, orders and transactions
  -----------------------------------------------------------------------

# 7. Test Schedule

  Milestone                   Planned Date
  --------------------------- -----------------------
  Test case design & review   16-Sep-2026
  Environment setup           17-Sep-2026
  Smoke/integration testing   18-Sep-2026
  System testing              19-Sep to 23-Sep-2026
  Performance/security        24-Sep-2026
  UAT                         25-Sep to 26-Sep-2026
  Final test summary          27-Sep-2026

# 8. Test Deliverables

-   Test Plan

-   Test cases and data

-   Test scripts

-   Execution logs/screenshots

-   Defect reports

-   RTM updates

-   Final Test Summary Report

# 9. Roles and Responsibilities

  -----------------------------------------------------------------------
  Role                    Name                    Responsibility
  ----------------------- ----------------------- -----------------------
  QA Lead                 Team 12                 Coordinate planning,
                                                  execution and reporting

  Test Engineer           Team 12                 Design/execute tests
                                                  and log defects

  Developer               Team 12                 Fix defects and support
                                                  triage

  Product Owner /         Course team             Review acceptance
  Evaluator                                       evidence and sign off
  -----------------------------------------------------------------------

# 10. Risks and Mitigation

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Stable build delayed                Request early smoke builds

  Payment/shipping sandbox            Use mocks/stubs and failure-path
  unavailable                         tests

  Environment downtime                Maintain reproducible local/staging
                                      environment

  Insufficient test data              Prepare controlled dummy data early

  Late defects                        Run regression after major fixes
  -----------------------------------------------------------------------

# 11. Assumptions & Dependencies

-   Development build exposes testable SRS flows/APIs.

-   Payment sandbox credentials are available.

-   Shipping sandbox or simulated API is available.

-   All test data is dummy data with no real cardholder information.

-   Team has access to the test environment and repository.

# 12. Suspension & Resumption Criteria

Suspend if the environment is unavailable for more than four hours, a
build blocks more than 30% of planned cases, or a Critical defect
prevents meaningful execution. Resume after blocking defects are
resolved, a stable build is deployed and smoke testing passes.

# 13. Test Case Management & Traceability

The SRS RTM maps all 23 functional, 5 non-functional and 5 security
requirements to test cases. Primary planned cases:

  Test Case     SRS Requirement
  ------------- --------------------------
  TC-Auth-01    BOOK-F-001
  TC-Auth-02    BOOK-F-002 / BOOK-SR-002
  TC-Auth-03    BOOK-F-003
  TC-Auth-04    BOOK-F-004
  TC-Cat-01     BOOK-F-005
  TC-Cat-02     BOOK-F-006
  TC-Cat-03     BOOK-F-007
  TC-Cat-04     BOOK-F-008
  TC-List-01    BOOK-F-009
  TC-List-02    BOOK-F-010
  TC-List-03    BOOK-F-011
  TC-List-04    BOOK-F-012
  TC-Cart-01    BOOK-F-013
  TC-Cart-02    BOOK-F-014
  TC-Cart-03    BOOK-F-015
  TC-Pay-01     BOOK-F-016
  TC-Ord-01     BOOK-F-017
  TC-Ord-02     BOOK-F-018
  TC-Ord-03     BOOK-F-019
  TC-Rev-01     BOOK-F-020
  TC-Rev-02     BOOK-F-021
  TC-Admin-01   BOOK-F-022
  TC-Admin-02   BOOK-F-023
  TC-Perf-01    BOOK-NF-001
  TC-Ops-01     BOOK-NF-002
  TC-Sec-01     BOOK-NF-003
  TC-UX-01      BOOK-NF-004
  TC-Scale-01   BOOK-NF-005
  TC-Sec-02     BOOK-SR-001
  TC-Sec-03     BOOK-SR-002
  TC-Sec-04     BOOK-SR-003
  TC-Sec-05     BOOK-SR-004
  TC-Sec-06     BOOK-SR-005

# 14. Test Metrics & Reporting

-   \% test cases executed and passed/failed.

-   Requirement coverage.

-   Defect density, severity and aging.

-   Performance response time and throughput.

-   Security findings and closure status.

Reports: execution status, defect summary, requirement coverage,
performance/security results and Final Test Summary Report.

# 15. Approvals

  Role                                 Name   Signature / Date
  ------------------------------------ ------ ------------------
  QA Lead                                     
  Dev Lead                                    
  Product Owner / Course Coordinator          

# Appendix A --- Detailed Test Case Matrix

The following cases expand the test references defined in the SRS and
provide the execution objective, condition, expected result and evidence
to record.

  ---------------------------------------------------------------------------------------------------------------
  Test Case     SRS ID        Objective         Condition               Expected Result      Evidence
  ------------- ------------- ----------------- ----------------------- -------------------- --------------------
  TC-Auth-01    BOOK-F-001    Registration      Duplicate/weak input    Invalid rejected;    Screenshot/log
                                                                        valid accepted       

  TC-Auth-02    BOOK-F-002    Login             Wrong/correct password  Wrong denied;        Log
                                                                        correct session      

  TC-Auth-03    BOOK-F-003    Password reset    Expired/reused link     Expiry and           Screenshot
                                                                        single-use enforced  

  TC-Auth-04    BOOK-F-004    Profile/address   Edit and save           Changes persist      Screenshot

  TC-Cat-01     BOOK-F-005    Browse            Guest category access   Active listings      Screenshot
                                                                        shown                

  TC-Cat-02     BOOK-F-006    Search            Known title/author/ISBN Relevant result;     Screenshot/timing
                                                                        target response      

  TC-Cat-03     BOOK-F-007    Details           Open active listing     All required fields  Screenshot
                                                                        shown                

  TC-Cat-04     BOOK-F-008    Filter/sort       Price ascending         Correct ordering     Screenshot

  TC-List-01    BOOK-F-009    Create listing    Valid/invalid ISBN      Valid saved; invalid Screenshot
                                                                        rejected             

  TC-List-02    BOOK-F-010    Edit listing      Change listing fields   Changes persist      Screenshot

  TC-List-03    BOOK-F-011    Remove/flag       Deactivate + duplicate  Hidden + moderation  Screenshot/log
                                                                        flag                 

  TC-List-04    BOOK-F-012    Seller dashboard  Compare totals          Totals reconcile     Screenshot/data

  TC-Cart-01    BOOK-F-013    Cart              Logout/login            Cart persists        Screenshot

  TC-Cart-02    BOOK-F-014    Coupon            Valid/expired/invalid   Correct              Screenshot
                                                                        discount/rejection   

  TC-Cart-03    BOOK-F-015    Address           Saved/new address       Address attached to  Screenshot
                                                                        order                

  TC-Pay-01     BOOK-F-016    Payment           Success/failure sandbox Success confirms;    Gateway log
                                                                        failure preserves    
                                                                        cart                 

  TC-Ord-01     BOOK-F-017    Invoice           Successful payment      Invoice matches      PDF/screenshot
                                                                        order                

  TC-Ord-02     BOOK-F-018    Tracking          Status progression      Latest status        Screenshot
                                                                        displayed            

  TC-Ord-03     BOOK-F-019    Cancel/return     Inside/outside window   Correct              Screenshot
                                                                        accept/reject        

  TC-Rev-01     BOOK-F-020    Review            Verified/unverified     Only purchaser       Screenshot
                                                buyer                   accepted             

  TC-Rev-02     BOOK-F-021    Rating            New review              Average recalculates Screenshot

  TC-Admin-01   BOOK-F-022    Moderation        Flagged listing/report  Status + audit event Log

  TC-Admin-02   BOOK-F-023    Admin controls    Suspend/analytics       Login blocked;       Screenshot
                                                                        totals reconcile     

  TC-Perf-01    BOOK-NF-001   Performance       500 concurrent users    90th percentile ≤3s  JMeter report

  TC-Ops-01     BOOK-NF-002   Uptime            Availability monitoring ≥99.5% monthly       Ops report

  TC-Sec-01     BOOK-NF-003   PCI-DSS           Inspect payment storage No raw card data     Review report

  TC-UX-01      BOOK-NF-004   Accessibility     Responsive + scan       Checks pass          Screenshots/report

  TC-Scale-01   BOOK-NF-005   Scaling           Add service instance    Throughput improves  Load report

  TC-Sec-02     BOOK-SR-001   TLS               Scan endpoints          TLS 1.2+ only        TLS scan

  TC-Sec-03     BOOK-SR-002   Password hashing  Inspect DB              Salted hashes only   DB/code review

  TC-Sec-04     BOOK-SR-003   Tokenisation      Inspect payment flow    No PAN/CVV stored    DB/code review

  TC-Sec-05     BOOK-SR-004   Lockout           5 failed logins         15-min lock + audit  Execution log

  TC-Sec-06     BOOK-SR-005   Input security    Injection/XSS payloads  No high-severity     ZAP report
                                                                        findings             
  ---------------------------------------------------------------------------------------------------------------
