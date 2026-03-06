## HOW TO RUN THE PROJECT

This guide explains how to run the existing project **without modifying any of your current implementation**. It covers environment setup, dependencies, database configuration, and commands for local development and production builds.

---

## 1. Required Software

- **Node.js**: v18 or later (LTS recommended)
- **npm**: v9 or later (bundled with Node 18+)
- **PostgreSQL**: v14 or later
- **Git** (optional, for version control)

> If you prefer `pnpm` or `yarn`, you can adapt the install/run commands accordingly; the project itself does not depend on a specific package manager.

---

## 2. Project Structure (Relevant Parts)

- Frontend / root app: `UI-UX-master/`
  - `package.json` (Vite + React UI)
- Backend API: `UI-UX-master/backend/`
  - `package.json` (Express API)
  - `src/config/env.js` (environment loading)
  - `src/db/pool.js` (PostgreSQL connection pool)
  - `src/db/migrations/*.sql` (database migrations)
  - `scripts/migrate.js` (migration runner)
  - `scripts/seed.js` (data seeding)
  - `.env.example` (backend environment template)

---

## 3. Dependency Installation

From the **outer project directory** (the one containing this file), the actual app lives in the nested `UI-UX-master/` folder.

### 3.1 Frontend / Root App

```bash
cd UI-UX-master/UI-UX-master
npm install
```

### 3.2 Backend API

```bash
cd UI-UX-master/UI-UX-master/backend
npm install
```

This installs all runtime dependencies, including:

- `express`, `cors`, `helmet` (backend HTTP stack)
- `pg` (PostgreSQL driver)
- `dotenv` (environment variable loading)
- Frontend dependencies (React, Vite, UI libraries)

---

## 4. Environment Setup

### 4.1 Backend `.env`

1. Navigate to the backend folder:

   ```bash
   cd UI-UX-master/UI-UX-master/backend
   ```

2. Copy the example file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env` as needed for your local environment. Key values:

   - `PORT=8080`
   - `CLIENT_ORIGIN=http://localhost:5173`
   - `DB_HOST=localhost`
   - `DB_PORT=5432`
   - `DB_NAME=attendance_intelligence`
   - `DB_USER=postgres`
   - `DB_PASSWORD=postgres`
   - `DB_SSL=false`
   - `AUTH_MODE=api` (or `keycloak` if you configure Keycloak)

> See `DATABASE_SETUP.md` for more detail on database variables and extensions.

### 4.2 Frontend Environment (Optional)

For local development, the frontend works with defaults, but you can configure a `.env` in the frontend root (same folder as the root `package.json`) if needed, following hints in the root `.env.example` (e.g. `VITE_API_BASE_URL`, `VITE_AUTH_MODE`, Keycloak settings).

---

## 5. Database Setup

### 5.1 Install & Start PostgreSQL

1. Install PostgreSQL (14+).
2. Ensure the PostgreSQL service is running and you can connect using `psql`.

### 5.2 Create Database & User

In `psql`:

```sql
CREATE USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE attendance_intelligence OWNER postgres;
```

Adjust names and passwords to match your security requirements, and update the corresponding values in `backend/.env`.

### 5.3 Enable Required Extensions

Connect to the `attendance_intelligence` database and run:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Optional, if you use vector features:
-- CREATE EXTENSION IF NOT EXISTS vector;
```

### 5.4 Run Migrations

From the backend directory:

```bash
cd UI-UX-master/UI-UX-master/backend
npm run migrate
```

This applies all SQL migrations in `src/db/migrations`.

### 5.5 Seed Demo Data (Optional)

```bash
npm run seed
```

This populates demo tenants, users, devices, and attendance data for the UI to display.

---

## 6. Running the Project (Development)

### 6.1 Start the Backend API

From `UI-UX-master/UI-UX-master/backend`:

```bash
npm run dev
```

This starts the Express server (default: `http://localhost:8080`).

### 6.2 Start the Frontend

In a separate terminal, from `UI-UX-master/UI-UX-master`:

```bash
npm run dev
```

By default, Vite serves the frontend at `http://localhost:5173`.

Ensure `CLIENT_ORIGIN` in `backend/.env` matches the frontend URL and that any `VITE_API_BASE_URL` variable (if set) points to the backend API (`http://localhost:8080/api`).

---

## 7. Production Build Steps

### 7.1 Frontend Production Build

From `UI-UX-master/UI-UX-master`:

```bash
npm run build
```

This produces an optimized frontend build in `dist/` suitable for static hosting or integration with your preferred deployment pipeline.

### 7.2 Backend Production Run

From `UI-UX-master/UI-UX-master/backend`:

```bash
npm start
```

This runs the backend using the same environment variables defined in your `.env` or deployment environment.

In production you would typically:

- Use a process manager (e.g. PM2, systemd, Docker, or cloud‑specific tooling).
- Point environment variables (`DB_*`, `PORT`, `CLIENT_ORIGIN`, auth settings) at your production PostgreSQL instance and frontend URL.

---

## 8. Notes & Assumptions

- No existing business logic, routes, or UI components have been modified—only documentation and dependency installation paths were added.
- The backend assumes a reachable PostgreSQL instance; if the DB is down or misconfigured, the API may fail to start or return errors when accessing data.
- For Keycloak integration, additional configuration is required using the existing Keycloak‑related env vars; this is outside the scope of basic execution and database setup.

