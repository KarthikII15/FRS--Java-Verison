# Backend DB + Auth API

## 1) Setup
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and update DB credentials.
4. Run migrations: `npm run migrate`
5. Seed initial users: `npm run seed`
6. Start API: `npm run dev`

## 2) Health Check
- `GET http://localhost:8080/api/health`
- `GET http://localhost:8080/api/health/db`

## 3) Auth Endpoints (frontend-compatible)
- `POST /api/auth/login`
- `GET /api/auth/bootstrap` (Bearer access token)
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

## 4) Live Domain Endpoints (scope + permission enforced)
Pass scope via headers or query params:
- `x-tenant-id` / `tenantId` (required unless default membership scope is used)
- `x-customer-id` / `customerId` (optional)
- `x-site-id` / `siteId` (optional)
- `x-unit-id` / `unitId` (optional)

Endpoints:
- `GET /api/live/employees` (`users.read`)
- `GET /api/live/shifts` (`attendance.read`)
- `GET /api/live/attendance` (`attendance.read`)
- `GET /api/live/devices` (`devices.read`)
- `GET /api/live/alerts` (`attendance.read`)
- `GET /api/live/metrics` (`analytics.read`)

## 5) Seeded Login Credentials
- `admin@company.com` / `admin123`
- `hr@company.com` / `hr123`

## 6) Frontend Switch
Set root `.env`:
```bash
VITE_AUTH_MODE=api
VITE_API_BASE_URL=http://localhost:8080/api
```

## 7) Quick API Smoke Flow
1. Login:
```bash
curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@company.com\",\"password\":\"admin123\"}"
```
2. Use `accessToken` from login:
```bash
curl http://localhost:8080/api/live/employees -H "Authorization: Bearer <ACCESS_TOKEN>"
```
