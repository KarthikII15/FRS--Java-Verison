## Database Setup & Architecture

This project is already designed and implemented to use **PostgreSQL** as its primary database. No changes have been made to your existing logic or structure; this document only explains how to configure and run what is already there.

### Why PostgreSQL

- **Relational domain model**: The schema uses multiple related tables (`frs_user`, `frs_tenant`, `frs_customer`, `frs_site`, `frs_unit`, `attendance_record`, `facility_device`, etc.) with foreign keys, which fits a relational database.
- **Advanced SQL features**: The migrations enable extensions such as `pgcrypto` and `pgvector`, which are first‑class in PostgreSQL and useful for analytics/AI‑driven use cases.
- **Strong consistency & constraints**: The design relies on unique constraints, `CHECK` constraints, and transactional seeding, which are well supported in PostgreSQL.
- **Scalability & maturity**: PostgreSQL scales well for analytical and transactional workloads and is widely supported in cloud environments.

Given the existing migrations, seed scripts, and driver usage (`pg`), PostgreSQL is the natural and already‑implemented choice.

### Backend Database Integration (Overview)

- **Driver**: [`pg`](https://www.npmjs.com/package/pg)
- **Connection pooling**: Implemented via `Pool` in `backend/src/db/pool.js`
- **Configuration source**: Environment variables loaded by `dotenv` and wrapped in `backend/src/config/env.js`
- **Migrations**: SQL files under `backend/src/db/migrations`
- **Seeding**: `backend/scripts/seed.js` populates demo data

No code changes are required to integrate PostgreSQL; you only need to provide the correct environment variables and run the migration/seed scripts.

---

## Configuration

### Environment Variables (Backend)

Create a `.env` file in `backend/` based on `backend/.env.example`. The key database‑related variables are:

- **`DB_HOST`**: PostgreSQL host (default: `localhost`)
- **`DB_PORT`**: PostgreSQL port (default: `5432`)
- **`DB_NAME`**: Database name (default: `attendance_intelligence`)
- **`DB_USER`**: Database user (default: `postgres`)
- **`DB_PASSWORD`**: Database password
- **`DB_SSL`**: `true` or `false` (use `true` for managed cloud databases that require SSL)
- **`DB_POOL_MAX`**: Maximum size of the connection pool (default: `20`)
- **`DB_IDLE_TIMEOUT_MS`**: Idle timeout in milliseconds (default: `30000`)
- **`DB_CONNECTION_TIMEOUT_MS`**: Connection timeout in milliseconds (default: `5000`)

Other required backend variables (non‑DB, but needed for execution) are documented in `backend/.env.example` and include:

- `PORT`
- `CLIENT_ORIGIN`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
- `AUTH_MODE`
- Keycloak‑related settings when using Keycloak.

### Connection Setup

The connection pool is configured in `backend/src/db/pool.js` and uses the `env.db` configuration from `backend/src/config/env.js`. It:

- Creates a shared `Pool` instance from `pg`.
- Exposes a `query(text, params?)` helper for repositories/services.
- Provides a `checkDbConnection()` helper that runs `select now()` as a health check.
- Shuts down the pool gracefully when the server process exits.

You do **not** need to modify this file for normal usage—only ensure the environment variables are correct.

---

## Initialization & Migration Steps

1. **Install PostgreSQL**
   - Install PostgreSQL (version 14 or later recommended).
   - Ensure the `psql` CLI is available on your PATH.

2. **Create the Database User and Database**
   - Create a user and database that match your `.env` values. For example:

     ```sql
     CREATE USER postgres WITH PASSWORD 'postgres';
     CREATE DATABASE attendance_intelligence OWNER postgres;
     ```

   - If you choose different names, reflect them in `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.

3. **Enable Required Extensions**
   - Some migrations expect extensions like `pgcrypto` (and optionally `pgvector`) to be available.
   - In `psql`, run:

     ```sql
     CREATE EXTENSION IF NOT EXISTS pgcrypto;
     -- If you plan to use vector features:
     -- CREATE EXTENSION IF NOT EXISTS vector;
     ```

4. **Configure Backend Environment**
   - Copy `backend/.env.example` to `backend/.env`.
   - Adjust `DB_*` variables as needed for your local or cloud PostgreSQL instance.

5. **Run Migrations**
   - From the `backend` directory:

     ```bash
     npm run migrate
     ```

   - This executes all SQL files under `backend/src/db/migrations` in order.

6. **Run Seed Script (Optional but Recommended)**
   - From the `backend` directory:

     ```bash
     npm run seed
     ```

   - This will:
     - Create or update sample tenants, customers, sites, and units.
     - Create admin/HR users with demo credentials.
     - Populate departments, shifts, employees, devices, attendance records, alerts, and audit logs.

---

## Assumptions

- **PostgreSQL availability**: A PostgreSQL instance is available and reachable at the host/port you configure.
- **Permissions**: The configured database user can create tables, indexes, and extensions (`pgcrypto`; optionally `pgvector`).
- **Migrations are authoritative**: The SQL files in `backend/src/db/migrations` represent the current expected schema.
- **Environment management**: You manage secrets (e.g., `DB_PASSWORD`) securely in your deployment environment; the `.env` files are for local development convenience only.

If your deployment environment already provides a PostgreSQL database, you only need to:

1. Point `DB_*` variables at that database.
2. Run the migration and (optionally) seed scripts once.

