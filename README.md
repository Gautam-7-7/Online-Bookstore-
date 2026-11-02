# Online Bookstore — Team 12

A college Software Engineering mini-project with an Express/Mongoose API and a React/Vite client. The frontend supports public catalogue browsing, search, filters and sorting; registration and login; seller listing management; and buyer cart, coupon, shipping-address checkout, order tracking, cancellation/return requests, and verified-purchase reviews.

## Repository status (inspected 30 October 2026)

The application includes registration/login, bcrypt password hashing, JWT authentication, account lockout, profile editing and password recovery; public catalogue search; verified-seller listing management; persistent carts and saved addresses; coupon and Razorpay checkout; order tracking, cancellation/returns and downloadable invoices; verified-purchase reviews; and administrator moderation, account controls, coupon management and analytics.

External services and deployment requirements still need configuration and independent verification: password reset requires working SMTP; Razorpay flows require test/live credentials and webhook configuration; shipping updates require a configured partner callback; TLS, uptime, load/scaling, and PCI-DSS certification cannot be established by local tests. The repository has separate backend Jest and frontend Vitest/build scripts; it has no root-level package manifest.

### Sprint Completion & Project Status (02 November 2026)

- **Sprint 1 (19–23 October 2026):** Authentication, account recovery, public book catalogue, search, filtering, and book details completed and verified.
- **Sprint 2 (26–30 October 2026):** Verified-seller listing management and dashboard, persistent cart, coupons, shipping address selection, Razorpay payment flow, order lifecycle tracking and invoice PDF generation, return/cancellation policy enforcement, verified-buyer reviews, aggregate rating recalculations, and admin moderation & analytics completed and verified.
- **Project Tracking:** Full 33-item backlog mapped and tracked in Jira Scrum project (`SCRUM`) with story point estimates, sprint assignments, and daily burndown tracking; milestones mirrored on GitHub.
- **Testing & Quality Assurance:** 108 test cases executed with 100% pass rate. Automated Jest backend and Vitest frontend test suites verified; GitHub Actions CI passing with 100% success on Ubuntu 22 / Node 22 / MongoDB 7.0 (Run #41321426582). Full evidence documented in `docs/Sprint_2_Final_Test_Summary_Report.md` and `docs/Test_Case_Documentation_Team12.xlsx`.
- **Development Freeze:** Development cycle frozen for final Part-2 submission.

## Repository layout

```text
.
├── .github/workflows/ci.yml                # backend checks on pushes and pull requests
├── Online_Bookstore_SAD_Team12_GITHUB.md
├── Online_Bookstore_SRS_Team12_FINAL_FIXED.md
├── Online_Bookstore_STP_Team12_GITHUB.md
├── *UML/architecture diagram PNGs*
├── client/
│   ├── package.json
│   └── src/                         # catalogue, auth, listing forms, and API clients
└── server/
    ├── package.json
    ├── package-lock.json
    ├── src/
    │   ├── app.js
    │   ├── server.js
    │   ├── config/db.js
    │   ├── controllers/             # authentication, catalogue, and commerce APIs
    │   ├── middleware/              # JWT authentication and shipping webhook auth
    │   ├── models/                  # users, books, carts, coupons, orders, reviews
    │   ├── routes/                  # authentication, catalogue, and commerce APIs
    │   └── services/                # coupon pricing, gateway adapter, rating aggregates
    └── tests/
        └── Jest unit and API integration tests
```

## Local setup and commands

Prerequisites: Node.js 22.x (the version used by CI), npm, and a reachable MongoDB instance. Use a dedicated test database when running integration tests.

```bash
cd server
npm ci
```

Copy `server/.env.example` to `server/.env` and set local credentials (do not
commit `.env`). Password recovery requires an SMTP account and a reachable
`PASSWORD_RESET_URL`. Do not use the example placeholders as production secrets.

Available scripts, defined in `server/package.json`:

```bash
npm start       # start the API
npm run dev     # start with nodemon
npm test        # run Jest (requires MongoDB for the integration tests)
npm run admin:promote -- account@example.com  # promote an existing user account
```

Provision the first administrator only after registering that account; run
`npm run admin:promote -- account@example.com` with the correct `MONGODB_URI`.
The promotion script does not create accounts or accept credentials from the
browser.

For a repeatable test run, point `MONGODB_URI` at an isolated local test database and run:

```bash
npm test -- --runInBand
```

A simple API smoke check after startup is `curl http://localhost:5000/`.

### Deploying the API on Render for Razorpay webhooks

The root `render.yaml` defines the API web service. Push the repository to
GitHub, create a Render Blueprint from that repository, and provide the
environment values when prompted: a MongoDB Atlas connection URI, Razorpay
Test Mode Key ID and Key Secret, and a webhook secret you choose. Render
generates the JWT secret. Keep all secrets in Render's environment settings;
do not commit them.

After the first deploy, copy the API service's `https://...onrender.com` URL
and check its `/` health endpoint. In the Razorpay Test Mode dashboard, create
the webhook at
`https://<render-api-host>/api/payments/razorpay/webhook`, enter the same
webhook secret configured in Render, and enable `payment.captured`,
`payment.failed`, `refund.processed`, and `refund.failed`. Redeploy if you
change server environment settings. Render must have a reachable MongoDB
database and valid Razorpay Test Mode keys for payment processing.

The client uses a Vite proxy to forward `/api` requests to `http://localhost:5000` during development:

```bash
cd client
npm ci
npm run dev       # frontend at http://localhost:5173
npm test          # frontend tests
npm run build     # production build
```

The frontend stores the login token and returned user summary in browser local storage. Book creation sends that token as a Bearer token; the server verifies it and obtains the seller display name from the database user record.

## Commerce API

Cart, coupon-validation, checkout, and buyer-order endpoints require an
authenticated JWT. Cart contents and order ownership are scoped to the logged-in
user.

- `GET /api/cart` — return the persisted cart and subtotal.
- `POST /api/cart/items` — add `{ "bookId": "<id>", "quantity": 1 }`; stock and
  active-listing state are checked by the server.
- `DELETE /api/cart/items/:bookId` and `DELETE /api/cart` — remove a line or
  clear the cart.
- `GET /api/addresses`, `POST /api/addresses`,
  `PATCH /api/addresses/:addressId/default`, and
  `DELETE /api/addresses/:addressId` — manage up to ten saved, buyer-owned
  shipping addresses. The first address becomes the default automatically.
- In the customer UI, signed-in buyers can add books to their cart, review the
  cart, and select a saved shipping address or save a new one at `/checkout`.
  The selected address is sent with the idempotent checkout request and stored
  as an order snapshot; deleting or changing a saved address does not mutate
  existing orders.
- Checkout validates coupon codes against the buyer's current server-side cart
  before including an accepted code in the payment-order request. After payment,
  buyers can use `/orders` to view tracking history and request an eligible
  cancellation or return; eligibility and refund processing remain server-side.
- Sellers can manage their own listings at `/seller/dashboard`, edit at
  `/sell/:id/edit`, and create a listing at `/sell`. The backend rejects
  normalized duplicate ISBNs and scopes listing edits/removal to the owner.
- Public book details show verified reviews. An authenticated buyer can submit
  one review only after a delivered purchase of that book.
- `GET /api/orders/:orderId/invoice` — download a PDF invoice for a paid order
  owned by the authenticated buyer.
- `POST /api/reports/books/:bookId` — submit a report about a listing. Reports
  and duplicate ISBN flags appear in administrator moderation.
- `POST /api/coupons/validate` — validate `{ "code": "..." }` against the
  current server-side cart. Coupons are provisioned as `Coupon` records.
- `POST /api/orders/checkout` — submit a shipping address, optional coupon code,
  and a unique `Idempotency-Key` header. The API calculates prices, reserves
  stock, and creates a Razorpay Order. Its response includes the public `keyId`,
  provider `orderId`, amount, and currency for Razorpay Checkout. No card data
  is sent to or stored by the bookstore.
- `POST /api/orders/:orderId/payment/verify` — send
  `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` from
  Checkout. The server verifies the HMAC, fetches the payment from Razorpay,
  checks the order/amount/currency, captures authorized payments, and confirms
  the order only after capture.
- `POST /api/orders/:orderId/payment/failure` — reconcile a Checkout failure
  against the payment fetched from Razorpay; signed webhooks are also processed.
- `POST /api/payments/razorpay/webhook` — configure this URL in the Razorpay
  Dashboard for `payment.captured`, `payment.failed`, `refund.processed`, and
  `refund.failed`. The server validates the signature against the raw request
  body using `RAZORPAY_WEBHOOK_SECRET`.
- `GET /api/orders` and `GET /api/orders/:orderId` — read only the logged-in
  buyer's orders.
- `POST /api/orders/:orderId/cancellation` — request cancellation before
  shipment. A full normal refund is created through Razorpay using its
  idempotent refund API.
- `POST /api/orders/:orderId/return` — request a return for a delivered order
  within `ORDER_RETURN_WINDOW_DAYS` (default 7; allowed range 1–30). A full
  Razorpay refund is initiated and the resulting refund status is tracked.
- `POST /api/orders/:orderId/tracking` — courier callback with `status` and
  optional `occurredAt`, authenticated by `x-shipping-webhook-secret`; stages
  must advance in order.
- `/admin` → **Order tracking** lets an administrator advance each paid order
  one delivery stage at a time when no courier callback is configured. These
  actions are audit logged. Buyers can use **Refresh tracking** on `/orders`.
- `POST /api/reviews` — submit a 1–5 star review only for a delivered,
  successfully paid order line. `GET /api/reviews/eligibility/:bookId` (JWT)
  returns eligible delivered orders; `GET /api/reviews/books/:bookId` and
  `GET /api/reviews/sellers/:seller` return reviews and aggregate scores.

Authenticated sellers can edit and manage only listings they own:

- `GET /api/books/mine` and `GET /api/books/mine/:id` — list or load the
  seller's own listings, including removed listings in the dashboard.
- `PUT /api/books/:id` — update listing details; ownership and editable fields
  are checked by the server.
- `DELETE /api/books/:id` — soft-remove a listing from the public catalogue
  while preserving its references in orders and reviews.
- `GET /api/books/seller/dashboard` — listing totals, available stock,
  completed-order sales/revenue, and seller review aggregate.

Listing creation and editing normalize ISBN formatting and flag duplicate ISBN
conflicts rather than allowing duplicate entries.

Existing listings and order items predate seller ownership IDs. Preview the
safe legacy mapping before applying it; only unique exact seller-name matches
are assigned, while ambiguous or unmatched names are reported and left alone:

```powershell
cd server
npm run migrate:listing-owners
npm run migrate:listing-owners -- --apply
```

### Razorpay setup and compliance boundary

The client helper in `client/src/api/commerce.js` loads Razorpay's hosted
Checkout.js, creates a server-priced Razorpay Order, opens the provider-hosted
payment form, and posts the returned payment signature to the verification API.
The checkout page calls `openRazorpayCheckout` after server-side order creation.
The backend never accepts raw PAN/CVV/expiry data. `RAZORPAY_KEY_SECRET`
is server-only; only `RAZORPAY_KEY_ID` is returned to the browser. Payment
confirmation requires both server-side signature verification and a server
fetch of the Razorpay payment. Webhook callbacks use HMAC verification over the
raw request bytes. Refunds use Razorpay's idempotent refund API.

Use Razorpay test-mode credentials and configure the webhook secret and event
subscriptions in the Dashboard before testing provider callbacks. Live
payments cannot work until valid Dashboard credentials and an approved
Razorpay account are provided. This implementation is not, by itself, a
PCI-DSS certification: production deployment must enforce TLS, protect
secrets, verify deployment configuration, and complete the applicable
compliance assessment.

For local payment testing, enable Test Mode in the Razorpay Dashboard, create
test API keys, and set the matching `RAZORPAY_KEY_ID` and
`RAZORPAY_KEY_SECRET` in `server/.env`. Restart the backend after changing
`.env`; never use production keys for local tests. Checkout checks the API's
public readiness endpoint and explains when keys are missing. A real charge
cannot be made until valid provider credentials and an eligible Razorpay
account are supplied.

Shipping callbacks require `SHIPPING_WEBHOOK_SECRET`; without it, status
updates from a courier are disabled. Set a long random secret in the backend
and send it in the `x-shipping-webhook-secret` header from your trusted courier
integration. Keep it out of source control. Before production, replace the
shared-secret callback with the shipping provider's signed webhook verification
if it supports signatures. In local development, administrators can advance
paid orders in the dashboard instead.

### Accounts and administration

- `GET /api/account/me` and `PATCH /api/account/me` — view and update the
  authenticated user's name, email, and phone.
- `POST /api/account/password/forgot` and
  `POST /api/account/password/reset` — request and consume a single-use,
  30-minute password-reset link. SMTP settings and `PASSWORD_RESET_URL` are
  required to deliver email.
- The client provides `/profile`, `/forgot-password`, and `/reset-password`.
  Saved shipping addresses remain available at checkout.
- `/admin` provides moderation, account suspension/reinstatement, seller
  verification, coupon controls, analytics, and the audit log. Every `/api/admin`
  endpoint requires an authenticated administrator; create the initial admin
  from an existing account with `npm run admin:promote -- account@example.com`.
- New listings are restricted to administrator-verified sellers. Account role
  and suspension checks are enforced by the API, not only by client navigation.

Local tests use mocked payment/mail providers where credentials are not
configured. A passing local test suite does not verify live email delivery,
Razorpay transactions, courier callbacks, production TLS/uptime, or PCI-DSS
certification.

## GitHub Actions and pull requests

`.github/workflows/ci.yml` runs on every push and pull request (and can also be started manually). It sets up Node.js 22, caches npm dependencies using `server/package-lock.json`, installs with `npm ci`, checks backend JavaScript syntax, and runs the Jest suite against an ephemeral MongoDB 7 service. The workflow uses only a test-only `JWT_SECRET`; it needs no repository secrets. Frontend tests/build are available locally but are not currently included in this workflow.

To review a check, open the pull request and select **Checks**, or open the repository’s **Actions** tab. A red check links to its logs; resolve the failure on the feature branch and push an update. A green check is evidence only for the configured backend checks.

Contributors should work on a feature branch, commit only their assigned scope, push the branch, and open a pull request against `main`. Do not push directly to `main`; wait for review and the applicable checks before merging. The PR should summarize changes, validation, and known limitations.
