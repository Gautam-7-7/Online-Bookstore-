# Dhanush — Catalogue + Frontend (Sprint 1) Handoff

This is the finished implementation of your assigned part of the Online Bookstore
project, built on top of Gautam's existing backend. Everything here has been
syntax-checked, unit-tested, and the frontend build has been verified. What is
left for you is to put these files into your local clone, run them against your
MongoDB, verify the flow, commit on `feature/catalog`, and open the PR.

Read this top to bottom before running anything.

---

## 1. What was built

**Backend (`server/`)**
| File | Purpose |
|---|---|
| `src/models/Book.js` | Mongoose Book model (NEW) |
| `src/controllers/bookController.js` | create / list / get-by-id logic (NEW) |
| `src/routes/bookRoutes.js` | `/api/books` routes (NEW) |
| `src/app.js` | **MODIFIED** — 2 lines added to mount the book router |
| `src/scripts/seedBooks.js` | dev-only script to insert 6 sample books (NEW) |
| `tests/book.test.js` | model validation unit tests, no DB needed (NEW) |
| `tests/book.integration.test.js` | API integration tests against MongoDB (NEW) |

**Frontend (`client/`)** — a new Vite + React app (did not exist before):
catalogue page, reusable `BookCard` + `SearchBar`, book details page, routing,
and loading / empty / error states. It fetches real data from the backend.

### How it maps to your SRS requirements
| SRS | Requirement | Where it's covered |
|---|---|---|
| BOOK-F-005 | Guest browse by category/genre | `GET /api/books?category=` + category dropdown |
| BOOK-F-006 | Keyword search (title/author/ISBN) + pagination | `GET /api/books?search=&page=&limit=` + search bar + pager |
| BOOK-F-007 | Detail page: price, condition, seller, stock, description | `GET /api/books/:id` + `BookDetailsPage` |
| BOOK-F-008 | Filter & sort by price / rating / availability | `?sort=` & `?minPrice/maxPrice` + sort dropdown |

Your explicitly assigned items (Book model, add/get APIs, listing page, details
page, search, basic React UI, frontend↔backend integration) are **all done**.
Search, pagination, filter and sort were small and required by the SRS, so they
are included — see the scope note in section 8.

---

## 2. ⚠️ One decision to confirm with Gautam before you merge

The `POST /api/books` (add book) endpoint currently has **no authentication** and
`seller` is a plain text field — it is **not** linked to a User account. I did
this deliberately because:
- There is no Seller model yet (only `User`), and your task boundaries say not to
  invent one or add an auth dependency without coordinating.
- Sprint 1 only asks for add/get book APIs.

**Ask Gautam:** "For Sprint 1, should creating a book require a logged-in user
(JWT), and should `seller` reference a User id — or do we keep add-book open and
treat seller as a display name for now?"

If the team wants JWT on create-book, it's a small change: add an auth middleware
(Gautam likely already has the JWT verify logic) in front of the `POST` route in
`bookRoutes.js`. Leave this until Gautam answers.

---

## 3. Put these files into your local repo

You should already have the repo cloned. In your clone:

**Step 3.1 — make sure you're on an up-to-date `feature/catalog` branch:**
```bash
git checkout main
git pull origin main
git checkout -b feature/catalog        # or: git checkout feature/catalog if it exists
```

**Step 3.2 — copy the files from this package into your repo**, keeping the same
folder paths (`server/...` → your `server/...`, `client/` → your repo root).
The only file that *replaces* an existing one is `server/src/app.js`, and the
only change in it is these two added lines:
```js
const bookRoutes = require("./routes/bookRoutes");   // with the other requires
app.use("/api/books", bookRoutes);                   // with the other app.use routes
```
If you'd rather not overwrite `app.js`, just add those two lines by hand.

**Step 3.3 — confirm nothing else changed:**
```bash
git status
```
You should see the new `server/src/...`, `server/tests/...`, `client/` files and
the modified `server/src/app.js`. Nothing in Gautam's auth files should change.

---

## 4. Run the backend

**Step 4.1 —** `cd server` then install (safe to re-run; only adds nothing new
since you add no new backend dependencies):
```bash
npm install
```

**Step 4.2 —** make sure `server/.env` exists (it is gitignored — never commit it).
It needs at least:
```
MONGODB_URI=<your MongoDB connection string>
JWT_SECRET=<any secret string>
PORT=5000
```
Use the same `MONGODB_URI` the team already uses so you share data. If you don't
have one, create a free MongoDB Atlas cluster or run MongoDB locally
(`mongodb://127.0.0.1:27017/online-bookstore`).

**Step 4.3 — seed some sample books** (optional but handy so the catalogue isn't empty):
```bash
node src/scripts/seedBooks.js
```
Expected: `Seeded 6 books successfully.`

**Step 4.4 — start the backend:**
```bash
npm run dev
```
Expected: `MongoDB connected successfully` and
`Online Bookstore API running on http://localhost:5000`.

**Step 4.5 — quick API check** (new terminal):
```bash
curl http://localhost:5000/api/books
```
Expected: JSON with a `books` array, `page`, `totalPages`, `totalBooks`.

---

## 5. Run the frontend

In a **separate terminal**, from the repo root:
```bash
cd client
npm install
npm run dev
```
Open the URL it prints (default **http://localhost:5173**).

The frontend talks to the backend through a dev proxy (configured in
`client/vite.config.js`), so as long as the backend is on port 5000, it just works
— no CORS setup, no `.env` needed. Keep **both** terminals running.

---

## 6. Verify the full flow (Stage 6 of your plan)

Click through and confirm each:
- [ ] Catalogue page loads and shows the seeded books.
- [ ] Search "Clean Code" → only matching books appear.
- [ ] Search by author (e.g. "Harari") and by ISBN → works.
- [ ] Search gibberish → "No books found" (empty state, not a crash).
- [ ] Category dropdown filters; Sort dropdown reorders by price / rating.
- [ ] Click a book → details page shows price, condition, seller, stock, description.
- [ ] Stop the backend, reload the catalogue → red error state appears (not a blank page).
- [ ] Visit `http://localhost:5173/books/bad-id` → shows the not-found/error message.

---

## 7. Run the tests

From `server/`:
```bash
# Model unit tests (no database needed):
npx jest tests/book.test.js

# Full suite incl. integration (needs MONGODB_URI reachable):
npm test
```
Unit tests (`tests/book.test.js`) have been verified to pass (6 tests). The
integration tests need your MongoDB connection to be live. Hand these to Sai so
the formal test suite matches the real API — see section 9.

---

## 8. Scope notes (mandatory vs extra)

- **Mandatory, done:** Book model, add/get book APIs, listing page, details page,
  search, basic React UI, frontend↔backend integration.
- **SRS-required, included because small:** pagination, category filter, price
  filter, sort. These satisfy BOOK-F-006 and BOOK-F-008.
- **Deliberately NOT in this sprint** (coordinate before adding): seller listing
  management / edit / deactivate (BOOK-F-009..011), reviews & ratings
  (rating is just a field defaulting to 0 for now), cart, checkout, orders, admin.

---

## 9. Hand-offs to teammates

- **Gautam:** answer the auth/seller question in section 2.
- **Sai (testing):** the API contract is —
  `POST /api/books` (body: title, author, isbn, category, price, [condition,
  seller, coverImage, stock, description]) → 201 `{message, book}`; 400 missing/
  invalid; 409 duplicate ISBN. `GET /api/books` → 200 `{books, page, totalPages,
  totalBooks}`, query params search/category/minPrice/maxPrice/sort/page/limit.
  `GET /api/books/:id` → 200 `{book}`; 400 bad id; 404 not found. My
  `tests/book.integration.test.js` is a starting point he can extend.
- **Nikhil (CI/CD):** there are now **two** installable projects — `server/` and
  `client/`. CI should `npm install` and build/test each. The backend integration
  tests need a MongoDB service (or they should be configured to skip without one);
  `client` just needs `npm install && npm run build`.

---

## 10. Commit, push, open the PR (Stage 8)

**Step 10.1 — review before committing:**
```bash
git status
git diff
```
Confirm no `.env` and no `node_modules/` are staged (both are gitignored).

**Step 10.2 — commit in meaningful chunks**, e.g.:
```bash
git add server/src/models/Book.js
git commit -m "feat(catalog): add Book model"

git add server/src/controllers/bookController.js server/src/routes/bookRoutes.js server/src/app.js
git commit -m "feat(catalog): add book APIs and mount router"

git add server/src/scripts/seedBooks.js server/tests/book.test.js server/tests/book.integration.test.js
git commit -m "test(catalog): seed script and book tests"

git add client
git commit -m "feat(catalog): React frontend for the catalogue"
```

**Step 10.3 — push your branch:**
```bash
git push -u origin feature/catalog
```

**Step 10.4 — open a Pull Request** against `main` on GitHub. In the PR
description, summarise the functionality (section 1), paste the SRS mapping
table, note the Gautam question from section 2, and list the manual checks from
section 6 that passed. Do **not** merge until review per the team's process.

---

Done. If a step's output doesn't match what's written here, stop at that step and
check that line — usually it's the `.env`/`MONGODB_URI` (backend) or the backend
not running on 5000 (frontend).
