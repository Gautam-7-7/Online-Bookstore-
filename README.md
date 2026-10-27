# Online Bookstore — Team 12

A college Software Engineering mini-project with an Express/Mongoose API and a React/Vite client. The working frontend supports the public catalogue, search, filters, sorting, book details, registration, login, and authenticated book listing.

## Repository status (inspected 27 October 2026)

The authentication backend provides registration and login, bcrypt password hashing, JWT issuance, and failed-login tracking/temporary lockout. The book API provides a searchable, filterable, sortable, paginated public catalogue, book details, and book creation. Creating a book now requires a valid login token; the backend derives the displayed seller name from that token rather than accepting a client-provided seller.

The seller model is not implemented: there are no seller roles, seller-specific listing management, edit/deactivate flows, reviews, carts, or orders. Any authenticated user can currently create a listing. The repository has separate backend Jest and frontend Vitest/build scripts; it has no root-level package manifest.

### Sprint 1 progress (19–23 October 2026)

- **Implemented:** authentication, catalogue APIs, catalogue and book detail pages, and login-protected book creation.
- **Still outstanding:** seller roles and listing management, plus other later bookstore workflows such as reviews, cart, checkout, and orders.
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
    │   ├── controllers/             # authentication and book APIs
    │   ├── middleware/authenticate.js
    │   ├── models/                  # User and Book
    │   └── routes/                  # /api/auth and /api/books
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

## GitHub Actions and pull requests

`.github/workflows/ci.yml` runs on every push and pull request (and can also be started manually). It sets up Node.js 22, caches npm dependencies using `server/package-lock.json`, installs with `npm ci`, checks backend JavaScript syntax, and runs the Jest suite against an ephemeral MongoDB 7 service. The workflow uses only a test-only `JWT_SECRET`; it needs no repository secrets. Frontend tests/build are available locally but are not currently included in this workflow.

To review a check, open the pull request and select **Checks**, or open the repository’s **Actions** tab. A red check links to its logs; resolve the failure on the feature branch and push an update. A green check is evidence only for the configured backend checks.

Contributors should work on a feature branch, commit only their assigned scope, push the branch, and open a pull request against `main`. Do not push directly to `main`; wait for review and the applicable checks before merging. The PR should summarize changes, validation, and known limitations.
