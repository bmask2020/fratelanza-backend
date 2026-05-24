# FRATELANZA Backend

NestJS backend foundation for the FRATELANZA official website. This bootstrap focuses on the core integration layer for the second phase of the project: authentication, admin APIs, dashboard APIs, contact handling, uploads, environment validation, and Prisma-based database readiness.

## Current Scope

- JWT-based authentication with a seeded admin account stored in PostgreSQL through Prisma
- Protected admin and dashboard endpoints
- Admin-managed users CRUD APIs
- Public contact submission endpoint with validation and database persistence
- Contact handling workflow with status updates, assignment, and filtered listing
- Authenticated file upload endpoint with database persistence
- Refresh sessions with persisted rotation and logout invalidation
- Health endpoints and request/audit logging foundations
- Prisma schema for users, contacts, and uploaded files
- Offline-generated initial Prisma migration committed to the repository
- Follow-up index migration for admin search, dashboard counts, and workflow filters
- Swagger documentation at `/api/docs`
- Unit and e2e tests for the initial flows

## Architecture

```text
src/
  common/      shared auth helpers and types
  database/    Prisma module and service
  modules/
    auth/      login and current-user endpoints
    admin/     protected admin overview
    contacts/  public contact intake + protected listing
    dashboard/ protected dashboard summary
    uploads/   protected file upload endpoint
```

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Update the secrets before production deployment.
3. Provide a valid PostgreSQL connection string in `DATABASE_URL`.
4. Restrict `CORS_ORIGINS` to trusted frontend origins.
5. Set `UPLOAD_DESTINATION` and `MAX_UPLOAD_SIZE_MB` based on your deployment storage limits.
6. Restrict `ALLOWED_UPLOAD_MIME_TYPES` to the document and image types your business actually needs.
7. Keep `ALLOWED_UPLOAD_EXTENSIONS` aligned with the allowed MIME types to reject mismatched filenames.
8. Choose an `UPLOAD_SCAN_MODE` for the environment. `basic` enforces extension and MIME checks before persistence.
9. Set `MONITORING_ENABLED`, `MONITORING_PROVIDER`, and `MONITORING_DSN` when wiring external error reporting in shared or production environments.

Default seeded admin for local bootstrap:

- Email: `admin@fratelanza.com`
- Password: `Fratelanza@2026`

For production, replace the seeded admin hash through `ADMIN_PASSWORD_HASH`.

A ready-to-fill production template is available in `.env.production.example`.

## Installation

```bash
npm install
npm run prisma:generate
```

If you have a local PostgreSQL instance ready:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

For local schema iteration during development:

```bash
npm run prisma:migrate:dev
```

## Run The Project

```bash
npm run start:dev
```

API base URL:

```text
http://localhost:3000/api/v1
```

Swagger UI:

```text
http://localhost:3000/api/docs
```

## Main Endpoints

```text
GET    /api/v1
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /api/v1/health/live
GET    /api/v1/health/ready
GET    /api/v1/dashboard/summary
GET    /api/v1/admin/overview
GET    /api/v1/admin/users
POST   /api/v1/admin/users
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id
POST   /api/v1/contacts
GET    /api/v1/contacts
PATCH  /api/v1/contacts/:id/workflow
POST   /api/v1/uploads
```

## Admin Workflow

- `dashboard/summary` returns real counts from Prisma for users, contacts, and uploads.
- `admin/users` lets admins create, inspect, and update managed users.
- `contacts` supports filtering by `status`, `search`, and `handledById`.
- `contacts/:id/workflow` updates contact status and assigns the responsible admin user.
- `auth/refresh` rotates refresh sessions persisted in PostgreSQL.
- `auth/logout` revokes the current refresh session.

## Seed Data

- `npm run prisma:seed` is idempotent and safe to run multiple times.
- It seeds one super admin, one admin user, one editor user, sample contact submissions, and sample uploaded file records.
- Default seeded credentials:

```text
admin@fratelanza.com      / Fratelanza@2026
operations@fratelanza.com / Operations@2026
editor@fratelanza.com     / Editor@2026
```

## Production Checklist

- Use explicit `CORS_ORIGINS` values in production instead of development localhost origins.
- Set `ENABLE_SWAGGER=false` unless production API docs are intentionally public.
- Replace all default secrets and the seeded admin hash before go-live.
- Use a persistent writable `UPLOAD_DESTINATION` and review `MAX_UPLOAD_SIZE_MB`.
- Keep `ALLOWED_UPLOAD_MIME_TYPES` minimal and aligned with your real upload use cases.
- Keep `ALLOWED_UPLOAD_EXTENSIONS` aligned with your MIME allowlist and keep `UPLOAD_SCAN_MODE=basic` unless a stronger external scanner replaces it.
- Review the detailed checklist in `docs/production-checklist.md`.

## Test Commands

```bash
npm run test
npm run test:e2e
npm run test:cov
npm run prisma:generate
npm run smoke:live
npm run build
```

Coverage gates enforced in Jest:

- Statements: `70%`
- Lines: `70%`
- Branches: `60%`
- Functions: `59%`

## Pagination

- `admin/users` and protected `contacts` now return `{ items, meta }`.
- Query parameters: `page`, `limit`, plus the existing feature-specific filters.

## Observability And Health

- `GET /api/v1/health/live` checks process liveness.
- `GET /api/v1/health/ready` verifies database readiness.
- Request logs are emitted with `x-request-id`, method, path, status code, and duration.
- Audit logs are persisted for login/logout/refresh, user changes, and contact workflow updates.
- A centralized monitoring abstraction captures HTTP exceptions and process-level failures and is ready for a future provider such as Sentry.

## CI

- GitHub Actions workflow is defined in `.github/workflows/ci.yml`.
- CI runs Prisma generate, migrations, seed, unit tests, e2e tests, build, and the live smoke test against PostgreSQL.

## Notes

- Authentication, contacts, and uploads are now wired to Prisma repositories.
- Uploads are filtered at the Multer boundary by allowed MIME types before metadata is persisted.
- Uploads also pass through a dedicated inspection hook before metadata persistence, which is ready to be replaced later by a stronger antivirus or external scanning provider.
- The seeded admin user is inserted into PostgreSQL on the first successful login attempt if it does not already exist.
- User management and dashboard metrics are now Prisma-backed as well.
- Contact workflow APIs are designed for admin panel usage and are indexed at the database level for common filters.
- Route-level e2e tests override repositories to keep HTTP verification fast and deterministic without requiring a live database in CI.
- Swagger decorators were added to the exposed endpoints and DTOs to keep the API self-documented from day one.
