# Online Bookstore — Team 12

A college Software Engineering mini-project with an Express/Mongoose API and a React/Vite client. The frontend supports public catalogue browsing, search, filters and sorting; registration and login; seller listing management; and buyer cart, coupon, shipping-address checkout, order tracking, cancellation/return requests, and verified-purchase reviews.

## Repository status (inspected 29 October 2026)

The authentication backend provides registration and login, bcrypt password hashing, JWT issuance, and failed-login tracking/temporary lockout. Sellers can manage their own listings and view sales/rating summaries. Buyers can persist carts, apply server-validated coupons, select saved shipping addresses, check out through Razorpay, track orders, request cancellation/returns, and review books after a delivered purchase.

The project does not currently include password reset/profile management, administrator moderation/coupon-management screens, or downloadable invoice PDFs. Live Razorpay payments require test/live credentials and webhook configuration. The repository has separate backend Jest and frontend Vitest/build scripts; it has no root-level package manifest.

### Sprint 1 progress (19–23 October 2026)

- **Implemented:** authentication, catalogue, seller listing create/edit/deactivate and dashboard, cart, coupon validation, shipping-address selection, payment checkout UI, buyer order tracking/cancellation/returns, and verified-buyer book reviews.
- **Still outstanding:** password reset/profile management, administration workflows, and invoice generation.
- **Project tracking:** no GitHub Issues or GitHub Projects board were visible during inspection. The submitted Part-2 deliverables call for a linked project, SRS-based backlog, estimates, owners, and two sprint plans; those items still need team tracking.
- **Sprint 2:** scheduled for 26–30 October 2026 in the submitted deliverables.

This status is a snapshot, not a claim that the remaining work is cancelled or unassigned. Refer to the team’s role assignments and submitted documents for ownership and requirements.

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

Create `server/.env` for local development (do not commit it):

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/online_bookstore
JWT_SECRET=replace-with-a-local-development-secret
PORT=5000
# Use Razorpay Dashboard test credentials for local testing; never commit real keys.
RAZORPAY_KEY_ID=rzp_test_replace_me
RAZORPAY_KEY_SECRET=replace-with-your-razorpay-test-secret
RAZORPAY_CURRENCY=INR
RAZORPAY_WEBHOOK_SECRET=replace-with-the-webhook-secret-configured-in-razorpay
# Defaults to seven; accepted configuration range is 1-30 days.
ORDER_RETURN_WINDOW_DAYS=7
# Configure the courier webhook before accepting tracking updates.
SHIPPING_WEBHOOK_SECRET=replace-with-a-long-random-secret
```

Available scripts, defined in `server/package.json`:

```bash
npm start       # start the API
npm run dev     # start with nodemon
npm test        # run Jest (requires MongoDB for the integration tests)
```

For a repeatable test run, point `MONGODB_URI` at an isolated local test database and run:

```bash
npm test -- --runInBand
```

A simple API smoke check after startup is `curl http://localhost:5000/`.

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
The actual cart/shipping UI can call `openRazorpayCheckout` once that screen is
ready. The backend never accepts raw PAN/CVV/expiry data. `RAZORPAY_KEY_SECRET`
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

Shipping callbacks require `SHIPPING_WEBHOOK_SECRET`; without it, status
updates are disabled. Keep this secret out of source control. The shipping
integration should additionally verify provider signatures before production
use.

## GitHub Actions and pull requests

`.github/workflows/ci.yml` runs on every push and pull request (and can also be started manually). It sets up Node.js 22, caches npm dependencies using `server/package-lock.json`, installs with `npm ci`, checks backend JavaScript syntax, and runs the Jest suite against an ephemeral MongoDB 7 service. The workflow uses only a test-only `JWT_SECRET`; it needs no repository secrets. Frontend tests/build are available locally but are not currently included in this workflow.

To review a check, open the pull request and select **Checks**, or open the repository’s **Actions** tab. A red check links to its logs; resolve the failure on the feature branch and push an update. A green check is evidence only for the configured backend checks.

Contributors should work on a feature branch, commit only their assigned scope, push the branch, and open a pull request against `main`. Do not push directly to `main`; wait for review and the applicable checks before merging. The PR should summarize changes, validation, and known limitations.
