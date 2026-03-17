# Keycloak Integration Implementation Plan (v2)
## Attendance Intelligence Platform

**Version:** 2.0  
**Date:** February 26, 2026  
**Status:** Corrected and Execution-Ready  
**Estimated Duration:** 8 weeks

---

## 1. Executive Summary

This plan replaces the current custom authentication/session-token stack with Keycloak while preserving your existing scoped authorization model (`tenant -> customer -> site -> unit`) and permission enforcement.

### Goals
- Replace custom login/refresh/logout/session token lifecycle with Keycloak OIDC.
- Preserve existing API authorization behavior and scope checks.
- Minimize risk via phased rollout and feature-flag fallback.

### Migration Principle
- **Authentication** moves to Keycloak.
- **Authorization and scope** remain app-driven from `frs_user_membership` in Phase 1.

---

## 2. Current System Baseline (from code)

### Current backend auth stack
- `backend/src/routes/authRoutes.js`
- `backend/src/services/authService.js`
- `backend/src/services/tokenService.js`
- `backend/src/repositories/authRepository.js`
- `backend/src/middleware/authz.js`

### Current frontend auth stack
- `src/app/contexts/AuthContext.tsx`
- `src/app/services/auth/apiAuthProvider.ts`
- `src/app/services/auth/tokenStorage.ts`
- `src/app/config/authConfig.ts` (`mock|api` modes)

### Current schema constraints that matter
- `frs_user` requires: `fk_user_type_id`, `role in ('admin','hr')`, `password_hash`, `created_at`
- `frs_user` does **not** currently have `updated_at`
- `frs_user_membership` remains authorization source in this plan

---

## 3. Target Architecture

### Identity and tokens
- Keycloak Realm: `attendance-intelligence`
- Clients:
  - `attendance-web` (public client, Authorization Code + PKCE)
  - `attendance-api` (resource server audience)
- Backend validates JWT access tokens via JWKS.

### Authorization model (preserved)
- Keep `frs_user_membership` + scope hierarchy checks in API.
- Keep `requirePermission(...)` semantics unchanged.
- Keep scope header behavior (`x-tenant-id`, `x-customer-id`, `x-site-id`, `x-unit-id`).

---

## 4. Phase Plan (Corrected Order)

## Phase 0: Prerequisites and Keycloak Setup (Week 1)

1. Deploy Keycloak (dev/stage/prod).
2. Create realm `attendance-intelligence`.
3. Create clients:
   - `attendance-web` (public, PKCE, redirect URIs)
   - `attendance-api` (audience/resource)
4. Create realm roles: `admin`, `hr`.
5. Configure security baseline:
   - brute-force protection
   - password policy
   - MFA for admin users

Deliverable: valid token issuance from Keycloak in each environment.

## Phase 1: Schema and Config Foundation (Week 2)

### 1.1 Database migration (must happen before backend changes)

Create migration `backend/src/db/migrations/00X_add_keycloak_identity.sql`:

```sql
ALTER TABLE frs_user
  ADD COLUMN IF NOT EXISTS keycloak_sub VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'internal'
    CHECK (auth_provider IN ('internal', 'keycloak', 'federated')),
  ADD COLUMN IF NOT EXISTS last_identity_sync_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_frs_user_keycloak_sub ON frs_user(keycloak_sub);
```

Notes:
- Do **not** reference `updated_at` unless separately added.
- Keep `password_hash` unchanged during dual-run.

### 1.2 Backend config extension

Update `backend/src/config/env.js` with:
- `authProvider` (`legacy|keycloak`)
- `keycloak.issuer`
- `keycloak.jwksUri`
- `keycloak.audience`
- `keycloak.clientId`
- optional `keycloak.clockToleranceSec`

### 1.3 Frontend config extension

Update `src/app/config/authConfig.ts` to support:
- `mode: "mock" | "api" | "keycloak"`
- `keycloak` section using `VITE_KEYCLOAK_*`

Deliverable: schema and config ready, no auth behavior changed yet.

## Phase 2: Backend JWT Auth Integration (Weeks 3-4)

### 2.1 Add JWT middleware

New file: `backend/src/middleware/keycloakJwtMiddleware.js`

Responsibilities:
1. Read bearer token.
2. Validate signature using JWKS cache.
3. Validate claims: `iss`, `aud`, `exp`, `nbf`.
4. Attach verified claims to `req.identity`.

### 2.2 Add identity mapping service

New file: `backend/src/services/identityMappingService.js`

Mapping flow:
1. Find by `frs_user.keycloak_sub = token.sub`.
2. If not found, link by email (controlled one-time link).
3. If email not found, reject by default (no auto-provision in phase 1).

Rationale:
- Avoid creating invalid users (current schema requires `fk_user_type_id` and strict role values).

### 2.3 Update `requireAuth` in authz middleware

Modify `backend/src/middleware/authz.js`:
- If `authProvider=keycloak`, use JWT middleware + identity mapping.
- Preserve existing functions and behavior:
  - scope resolution
  - `canAccessScope`
  - `requirePermission`

### 2.4 Keep legacy path for rollback

- Retain existing custom auth path behind flag (`authProvider=legacy`).
- No endpoint removals yet.

Deliverable: `/api/live/*` works with Keycloak tokens and same permission/scope outcomes.

## Phase 3: Frontend OIDC Integration (Week 5)

### 3.1 Add Keycloak provider

New files:
- `src/app/services/auth/keycloakClient.ts`
- `src/app/services/auth/keycloakAuthProvider.ts`

Behavior:
- Login/logout via Keycloak JS.
- Use Authorization Code + PKCE.
- Refresh via Keycloak SDK lifecycle.

### 3.2 Keep `AuthContext` public contract stable

Modify `src/app/contexts/AuthContext.tsx` internals only.
Preserve:
- `user`
- `permissions`
- `activeScope`
- `can(...)`
- `hasAnyPermission(...)`

### 3.3 Bootstrap app authorization data from API

Add endpoint (recommended): `GET /api/me/bootstrap`
- Auth: Keycloak bearer token
- Returns: `user`, `memberships`, `activeScope`, `tenants/customers/sites/units`

Frontend uses this endpoint after Keycloak session init.

Deliverable: user can sign in via Keycloak and app behavior remains unchanged.

## Phase 4: Dual-Run Pilot and Parity Validation (Week 6)

1. Enable keycloak mode for pilot cohort.
2. Compare legacy vs keycloak path for:
   - login success rate
   - 401/403 rates
   - permission-denied mismatches
3. Fix parity gaps.

Exit criteria:
- 7 consecutive days with no critical auth regression for pilot cohort.

## Phase 5: Production Cutover (Week 7)

1. Set backend `AUTH_PROVIDER=keycloak`.
2. Set frontend mode to `keycloak`.
3. Run cutover smoke tests:
   - login
   - `/api/me/bootstrap`
   - 3 protected `/api/live/*` endpoints
4. Monitor auth metrics and logs.

Exit criteria:
- stable production auth behavior within baseline thresholds.

## Phase 6: Decommission Legacy Auth (Week 8)

After rollback window:
1. Remove legacy routes:
   - `POST /api/auth/login`
   - `POST /api/auth/refresh`
   - `POST /api/auth/logout`
   - `GET /api/auth/bootstrap` (if superseded)
2. Remove `tokenService.js` and session-token DB writes.
3. Deprecate/drop `auth_session_token` in separate cleanup migration.

---

## 5. Required File Changes (Implementation Checklist)

## Backend

### Add
- `backend/src/middleware/keycloakJwtMiddleware.js`
- `backend/src/services/identityMappingService.js`
- `backend/src/routes/meRoutes.js` (or equivalent bootstrap route)
- `backend/src/db/migrations/00X_add_keycloak_identity.sql`

### Modify
- `backend/src/config/env.js`
- `backend/src/middleware/authz.js`
- `backend/src/server.js`

### Keep during dual-run
- `backend/src/routes/authRoutes.js`
- `backend/src/services/authService.js`
- `backend/src/services/tokenService.js`

## Frontend

### Add
- `src/app/services/auth/keycloakClient.ts`
- `src/app/services/auth/keycloakAuthProvider.ts`

### Modify
- `src/app/config/authConfig.ts`
- `src/app/services/auth/index.ts`
- `src/app/contexts/AuthContext.tsx`
- `src/app/services/auth/tokenStorage.ts`

---

## 6. API Contract Plan

### New endpoint
`GET /api/me/bootstrap`

Response:
```json
{
  "user": { "id": "...", "email": "...", "role": "admin" },
  "memberships": [],
  "activeScope": { "tenantId": "..." },
  "tenants": [],
  "customers": [],
  "sites": [],
  "units": []
}
```

### Existing protected endpoints
No response contract changes expected for `/api/live/*`.

---

## 7. Security Requirements

1. Enforce HTTPS outside local dev.
2. Strict JWT validation (`iss`, `aud`, `exp`, `nbf`, alg allow-list).
3. Key rotation-safe JWKS caching.
4. MFA for admin users.
5. Restrictive CORS allow-list.
6. Structured auth decision logging (no raw tokens in logs).

---

## 8. Testing Plan

## Unit
- JWT middleware validation matrix.
- Identity mapping scenarios (`sub` hit, email link, reject).
- Scope and permission checks unchanged.

## Integration
- End-to-end login via Keycloak + access to `/api/live/*`.
- Scope header positive/negative tests.

## Regression
- Compare authorization decisions between legacy and keycloak paths for seeded users.

## Non-functional
- Measure auth middleware latency.
- Validate behavior during Keycloak unavailability.

---

## 9. Rollback Plan

1. Maintain feature toggle (`legacy|keycloak`) through stabilization period.
2. Keep legacy auth code and `auth_session_token` until rollback window closes.
3. Rollback steps:
   - switch flag to `legacy`
   - redeploy
   - run login + protected endpoint smoke tests

---

## 10. Risks and Mitigations

1. **Schema mismatch risk**
- Mitigation: apply migration first, block backend rollout until migration success.

2. **User linking conflicts**
- Mitigation: pre-run reconciliation report on duplicate/invalid emails.

3. **Permission parity drift**
- Mitigation: automated diff tests between legacy and keycloak authorization results.

4. **Operational dependency on Keycloak**
- Mitigation: HA deployment, health checks, alerting, rollback toggle.

---

## 11. Success Criteria

1. 100% authentication traffic handled by Keycloak in production.
2. Permission/scope behavior parity for `admin` and `hr` roles.
3. Stable 401/403 and error rates vs pre-cutover baseline.
4. Legacy auth decommission completed after rollback window.

---

## 12. Final Notes

- This version intentionally avoids invalid assumptions present in v1 (e.g., `updated_at`, unrestricted auto-provisioning, unsupported roles).
- If you want full user auto-provisioning later, add explicit rules for `fk_user_type_id` assignment and role normalization before enabling it.
