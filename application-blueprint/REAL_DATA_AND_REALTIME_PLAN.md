# Real Data And Realtime Integration Plan

## Goal
Replace mock-driven authentication and scoped authorization with DB-backed APIs first, then layer realtime updates without changing core auth/session contracts.

## Phase 1: Auth Foundation (Completed in UI)
1. Added provider architecture with `mock` and `api` auth modes.
2. Added env-driven switching:
   - `VITE_AUTH_MODE=mock|api`
   - `VITE_API_BASE_URL`
   - `VITE_API_TIMEOUT_MS`
3. Refactored `AuthContext` to:
   - initialize session from stored tokens,
   - support async login/logout,
   - maintain scoped memberships and permissions,
   - expose loading/error states.
4. Added token storage utility and API client wrapper.
5. Updated login UI for async auth state.

## Phase 2: Backend Contract Finalization
Implement or confirm these endpoints.

### 1) `POST /auth/login`
Request:
```json
{ "email": "hr@company.com", "password": "******" }
```
Response:
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "user-1",
    "email": "hr@company.com",
    "role": "hr",
    "name": "HR Manager",
    "department": "Human Resources",
    "createdAt": "2026-02-26T00:00:00.000Z"
  },
  "memberships": [
    {
      "id": "membership-1",
      "userId": "user-1",
      "role": "hr",
      "permissions": ["attendance.read", "analytics.read"],
      "scope": {
        "tenantId": "tenant-1",
        "customerId": "customer-1",
        "siteId": "site-1",
        "unitId": "unit-1"
      }
    }
  ],
  "activeScope": {
    "tenantId": "tenant-1",
    "customerId": "customer-1",
    "siteId": "site-1",
    "unitId": "unit-1"
  }
}
```

### 2) `POST /auth/refresh`
Request:
```json
{ "refreshToken": "jwt" }
```
Response:
```json
{ "accessToken": "jwt", "refreshToken": "jwt" }
```

### 3) `POST /auth/logout`
Request:
```json
{ "refreshToken": "jwt" }
```
Response: `204` or success payload.

### 4) `GET /auth/bootstrap`
Headers: `Authorization: Bearer <accessToken>`
Response:
```json
{
  "user": { "...": "same shape as login" },
  "memberships": [],
  "activeScope": { "tenantId": "tenant-1" },
  "tenants": [{ "id": "tenant-1", "name": "Tenant A" }],
  "customers": [{ "id": "customer-1", "tenantId": "tenant-1", "name": "Customer A" }],
  "sites": [{ "id": "site-1", "customerId": "customer-1", "name": "Site A" }],
  "units": [{ "id": "unit-1", "siteId": "site-1", "name": "Unit A" }]
}
```

## Phase 3: Real Data Migration
1. Replace mock reads in dashboards with API repositories:
   - employees,
   - attendance,
   - devices,
   - alerts,
   - audit logs.
2. Every query must include active scope:
   - tenant required,
   - customer/site/unit optional.
3. Maintain REST polling for all views first.

## Phase 4: Realtime Integration
1. Add a websocket/SSE client using existing access token.
2. Subscribe by active scope:
   - `attendance.updated`,
   - `device.status.changed`,
   - `alerts.created`,
   - `audit.logged`.
3. When `activeScope` changes:
   - unsubscribe old channels,
   - subscribe new channels.
4. Keep REST as source of truth and use realtime as incremental updates.

## Phase 5: Hardening
1. Token refresh retry logic on `401`.
2. Route-level auth guards with permission checks.
3. Backend-enforced permission checks for every scoped endpoint.
4. Observability:
   - auth failures,
   - refresh failures,
   - websocket disconnect/reconnect metrics.

## Rollout Strategy
1. Dev: `VITE_AUTH_MODE=mock` for isolated UI work.
2. Integration/QA: `VITE_AUTH_MODE=api`.
3. Production: `VITE_AUTH_MODE=api`, realtime behind feature flag until stable.

