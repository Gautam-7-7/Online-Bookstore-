# Project Structure

This document describes the layout of the Online Bookstore repository. The project
contains a React/Vite client, an Express/Mongoose server, automated tests, and
project documentation.

## Repository Root

```text
Online-Bookstore-/
|-- client/                         # React/Vite frontend
|-- server/                         # Express/Mongoose backend
|-- docs/                           # Test reports and project documentation
|-- .github/                        # GitHub workflows and repository configuration
|-- HANDOFF.md                      # Development handoff notes
|-- README.md                       # Project overview and setup information
|-- render.yaml                     # Render deployment configuration
|-- jira_backlog_import.csv         # Jira backlog import data
|-- Online_Bookstore_SAD_*.md       # Software architecture documentation
|-- Online_Bookstore_SRS_*.md       # Software requirements documentation
|-- Online_Bookstore_STP_*.md       # Software test plan documentation
`-- *.png                           # UML and architecture diagrams
```

The root `README.md` provides the main project overview, while the Markdown
specification and planning files contain the system requirements, architecture,
and testing information. `render.yaml` configures the backend deployment on
Render.

## Client

The `client/` directory is the browser application built with React and Vite.

```text
client/
|-- index.html             # HTML entry point
|-- package.json           # Frontend dependencies and scripts
|-- package-lock.json      # Locked frontend dependency versions
|-- vite.config.js         # Vite configuration
|-- vitest.config.js       # Vitest configuration
`-- src/
    |-- App.jsx            # Application routes and top-level UI
    |-- App.test.jsx       # Frontend application tests
    |-- main.jsx           # React bootstrap
    |-- styles.css         # Global styles
    |-- api/               # Backend API request modules
    |-- auth/              # Authentication state and context
    |-- components/        # Reusable UI components
    |-- pages/             # Route-level page components
    `-- test/              # Frontend test setup
```

### `client/src/api`

This directory groups the frontend API clients by feature:

- `account.js` handles profile and account operations.
- `admin.js` handles administrative requests.
- `auth.js` handles registration, login, password reset, and authentication
  requests.
- `books.js` handles catalogue and book listing requests.
- `commerce.js` handles cart, checkout, orders, payments, reviews, and related
  commerce operations.

### `client/src/auth`

`AuthContext.jsx` provides shared authentication state and actions to React
components, including the currently signed-in user and login/logout behavior.

### `client/src/components`

Reusable interface elements live here, including `BookCard.jsx`,
`BookListingForm.jsx`, and `SearchBar.jsx`.

### `client/src/pages`

Page components represent application routes and user workflows. They cover
catalogue and book details, login and registration, password recovery, profiles,
cart and checkout, orders, selling books, seller dashboards, listing edits, and
admin dashboards.

### `client/src/test`

`setup.js` contains shared Vitest and DOM test setup used by frontend tests.

## Server

The `server/` directory contains the Node.js backend API.

```text
server/
|-- package.json             # Backend dependencies and scripts
|-- package-lock.json        # Locked backend dependency versions
|-- .env.example             # Example backend environment variables
|-- scripts/                 # Standalone maintenance scripts
|-- src/
|   |-- app.js               # Express application and middleware setup
|   |-- server.js            # Server startup and listener
|   |-- config/              # Runtime configuration
|   |-- controllers/         # Request handlers and business orchestration
|   |-- middleware/          # Authentication, authorization, and validation middleware
|   |-- models/              # Mongoose data models
|   |-- routes/              # HTTP route definitions
|   |-- scripts/              # Application data and seeding scripts
|   `-- services/             # Reusable domain and integration services
`-- tests/                   # Backend unit, route, and integration tests
```

### `server/src/config`

`db.js` contains database connection configuration and setup for MongoDB.

### `server/src/controllers`

Controllers translate HTTP requests into application operations. They cover
accounts, authentication, books, commerce, administration, invoices, reports,
shipping addresses, and related feature workflows.

### `server/src/middleware`

Middleware runs between the request and controller layers. The directory
contains authentication, administrator authorization, and shipping webhook
verification middleware.

### `server/src/models`

Mongoose models define the persisted entities and relationships used by the
application, including users, books, carts, orders, reviews, coupons, seller
ratings, shipping addresses, audit logs, and moderation reports.

### `server/src/routes`

Route modules expose the HTTP API by feature. They define endpoints for
accounts, authentication, books, carts, coupons, invoices, orders, payments,
reports, reviews, shipping addresses, and administration.

### `server/src/scripts`

`seedBooks.js` provides an application-level script for populating book data.

### `server/src/services`

Services contain reusable domain and integration logic for coupons, email,
order tracking, payment gateway integration, and ratings.

### `server/tests`

Backend tests cover authentication, books, commerce, checkout, orders, order
tracking, ratings, reviews, shipping addresses, listing-owner migration, and
platform integration. Test files use the `.test.js` naming convention.

## Documentation

The `docs/` directory contains project evidence and supporting documentation:

```text
docs/
|-- Project_Structure.md                    # This repository structure guide
|-- Sprint_2_Final_Test_Summary_Report.md   # Sprint 2 test evidence and summary
`-- Test_Case_Documentation_Team12.xlsx     # Detailed test case documentation
```

## Configuration and Package Files

- `client/package.json` defines frontend scripts and dependencies.
- `client/package-lock.json` records the exact frontend dependency tree.
- `server/package.json` defines backend scripts and dependencies.
- `server/package-lock.json` records the exact backend dependency tree.
- `client/.env.example` documents environment values expected by the frontend.
- `server/.env.example` documents environment values expected by the backend,
  such as database, JWT, payment, and email configuration.
- `render.yaml` describes the backend Render service, build and start commands,
  health check, and deployment environment variables.

The example environment files are templates only. Secrets and machine-specific
values should be supplied through local environment configuration or the
deployment platform rather than committed to the repository.
