# Online Bookstore — Team 12

A college Software Engineering mini-project. The submitted SAD/SRS/STP describe a MERN online bookstore, but the repository currently contains only the authentication portion of the backend; the catalogue, frontend, and remaining workflows are not present yet.

## Repository status (inspected 21 October 2026)

The default branch is `main`. The authentication backend from merged PR [#1](https://github.com/Gautam-7-7/Online-Bookstore-/pull/1) is present: user registration and login routes, a Mongoose user model, bcrypt password hashing, JWT issuance, failed-login tracking/temporary lockout, and Jest unit/API integration tests.

The repository also contains the SAD, SRS, STP, and UML diagrams. It does **not** currently contain a React app, book/catalogue model or API, root-level package manifest, or frontend/backend build script. The current test suite covers authentication only; the broader test cases in the STP are planned coverage, not evidence that those features or tests exist.

### Sprint 1 progress (19–23 October 2026)

- **Present on `main`:** authentication backend and initial auth tests (merged PR #1).
- **Added by this CI/documentation change:** backend CI configuration and this repository guide; the PR’s hosted check result should be verified in GitHub before considering it complete.
- **Not present in the repository at inspection:** catalogue APIs and React UI; tests beyond authentication and a maintained standalone test-case record; the Sprint 1 outcome video.
- **Project tracking:** no GitHub Issues or GitHub Projects board were visible during inspection. The submitted Part-2 deliverables call for a linked project, SRS-based backlog, estimates, owners, and two sprint plans; those items still need team tracking.
- **Sprint 2:** scheduled for 26–30 October 2026 in the submitted deliverables.

This status is a snapshot, not a claim that the pending work is cancelled or unassigned. Refer to the team’s role assignments and submitted documents for ownership and requirements.

## Repository layout

```text
.
├── .github/workflows/ci.yml                # backend checks on pushes and pull requests
├── Online_Bookstore_SAD_Team12_GITHUB.md
├── Online_Bookstore_SRS_Team12_FINAL_FIXED.md
├── Online_Bookstore_STP_Team12_GITHUB.md
├── *UML/architecture diagram PNGs*
└── server/
    ├── package.json
    ├── package-lock.json
    ├── src/
    │   ├── app.js
    │   ├── server.js
    │   ├── config/db.js
    │   ├── controllers/authController.js
    │   ├── models/User.js
    │   └── routes/authRoutes.js
    └── tests/
        ├── auth.test.js
        └── auth.integration.test.js
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

A simple API smoke check after startup is `curl http://localhost:5000/`. There is no frontend to start and no build command is currently defined; do not run or document `npm run build` until application build scripts are added.

## GitHub Actions and pull requests

`.github/workflows/ci.yml` runs on every push and pull request (and can also be started manually). It sets up Node.js 22, caches npm dependencies using `server/package-lock.json`, installs with `npm ci`, checks backend JavaScript syntax, and runs the existing Jest suite against an ephemeral MongoDB 7 service. The workflow uses only a test-only `JWT_SECRET`; it needs no repository secrets. There is currently no frontend test/build job because no frontend source or scripts exist.

To review a check, open the pull request and select **Checks**, or open the repository’s **Actions** tab. A red check links to its logs; resolve the failure on the feature branch and push an update. A green check is evidence only for the configured backend checks, not for the unimplemented bookstore flows.

Contributors should work on a feature branch, commit only their assigned scope, push the branch, and open a pull request against `main`. Do not push directly to `main`; wait for review and the applicable checks before merging. The PR should summarize changes, validation, and known limitations.
