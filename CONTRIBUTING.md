# Contributing Guidelines — Online Bookstore

Thank you for contributing to the Online Bookstore project (Team 12). To maintain software quality and consistency across all team members, please adhere to the following conventions.

---

## 1. Branch Strategy

- `main`: Production-ready, stable codebase. Direct commits to `main` should only be made for approved hotfixes or maintenance syncs.
- Feature branches: Created from `main` using descriptive naming:
  - `feat/<feature-name>` (e.g., `feat/coupon-engine`)
  - `fix/<bug-description>` (e.g., `fix/cart-quantity-overflow`)
  - `docs/<doc-update>` (e.g., `docs/update-architecture`)
  - `ci/<pipeline-change>` (e.g., `ci/docker-support`)

---

## 2. Commit Message Conventions

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>
```

### Common Types:
- `feat`: A new user-facing or API feature.
- `fix`: A bug fix.
- `docs`: Documentation updates or additions.
- `test`: Adding or updating test cases.
- `ci`: Changes to CI/CD workflows, Docker configs, or automation.
- `chore`: Maintenance tasks, dependency updates, root workspace scripts.

---

## 3. Pre-Commit Verification Checklist

Before pushing commits or opening a pull request, ensure:

1. **Syntax Check**: All JavaScript files pass node syntax verification:
   ```bash
   node --check <file-path>
   ```
2. **Backend Tests**: Run Jest test suites:
   ```bash
   cd server && npm test
   ```
3. **Frontend Tests**: Run Vitest test suites:
   ```bash
   cd client && npm test
   ```
4. **Build Verification**: Ensure client builds cleanly:
   ```bash
   cd client && npm run build
   ```
5. **No Secrets**: Ensure `.env` and sensitive credentials are never committed.

---

## 4. Code Standards & Style

- Use modern ES6+ syntax.
- Write modular, readable functions with clear error handling.
- Always include automated unit/integration tests for new API routes or UI components.
