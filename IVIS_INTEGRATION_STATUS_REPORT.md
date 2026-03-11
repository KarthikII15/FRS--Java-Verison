# IVIS Integration Status Report

**Date:** 2026-03-11  
**Repo:** `FRS--Java-Verison`  
**Goal:** Live IVIS data in FaceAttend UI via backend proxy (no DB sync)

---

## Executive Summary

- ✅ IVIS login now succeeds (RSA PKCS#1 v1.5).
- ✅ IVIS access token is stored in PostgreSQL (`ivis_service_token`).
- ❌ IVIS data endpoints still return **403**.
- **Root cause** appears to be **header mismatch** or **customer context mismatch** for IVIS data calls (customer/tenant/login values).

---

## What We Built (Backend)

- **IVIS Auth (5‑step login)**
  - `backend/src/services/ivisAuth.js`
  - Steps: public key → customer check → trust check → theme → `clogin`
  - RSA encryption fallbacks added (OAEP SHA‑256 → OAEP SHA‑1 → PKCS1v1_5)
  - PKCS1v1_5 succeeds

- **Proxy Fetcher + Cache**
  - `backend/src/services/ivisFetcher.js`
  - Cache in PostgreSQL (`ivis_cache`)
  - Standard headers + Origin/Referer

- **Routes**
  - `backend/src/routes/ivis.js`
  - `/api/ivis/*` proxy routes
  - Temporary auth bypass via `IVIS_BYPASS_AUTH=true` (local testing)
  - `/api/ivis/employees` added for `/api/userprofile/syncVerifiedUsers`

- **Supporting Changes**
  - `backend/.dockerignore` to prevent Windows `node_modules` issues
  - TLS bypass env var `IVIS_TLS_REJECT_UNAUTHORIZED=false`
  - `ca-certificates` installed in Docker image

---

## What We Tried (Detailed)

### 1. RSA Login Variants
- ❌ RSA‑OAEP + SHA‑256 → **Unable to decrypt password**
- ❌ RSA‑OAEP + SHA‑1 → **Unable to decrypt password**
- ✅ RSA‑PKCS1v1_5 → **Login succeeds**

### 2. IVIS Login Response Parsing
The response is:
```
{
  "results": {
    "accessToken": "...",
    "refreshToken": "...",
    "tenantId": 1,
    "username": "PMSTEST",
    "mappedCustomers": [{ "pkCustomerId": 445, "customerCode": "PMSTEST", "fkTenantId": 1 }],
    ...
  },
  "errorCode": "200"
}
```

### 3. Header Variations for Data Calls
We tried combinations of:
- `customer-id`, `customer-name`, `login-id`, `tenant-id`
- `Customer-Id`, `Customer-Name`, `Login-Id`, `Tenant-Id`
- `customerCode` / `Customer-Code`
- camelCase: `customerId`, `tenantId`, `loginId`
- Added `Origin`, `Referer`, `Accept`, `Content-Type`
- Removed `site-id` and `sitegroup-id` (caused 403)

**Results:**
- Minimal headers → `Customer Id Not Found`
- Full headers → `403` (often empty response)

### 4. Auth Bypass
- Enabled `IVIS_BYPASS_AUTH=true` to test without FaceAttend token
- Confirmed proxy routes are reachable
- Still blocked by IVIS 403

---

## What Worked

- ✅ Login flow is correct (RSA-PKCS1v1_5 works)
- ✅ Token stored in `ivis_service_token`
- ✅ Backend proxy routes are active
- ✅ IVIS login response shape is parsed and logged

---

## What Failed

- ❌ All data endpoints return 403 even with valid token
- ❌ IVIS rejects current header combinations

---

## Exact Issue (Root Cause)

IVIS **accepts login**, but **rejects data calls** with `403`.

The error indicates **customer context mismatch**:
- “Customer Id Not Found” with minimal headers
- Silent `403` with full headers

This suggests the data endpoints require a **very specific header set** and values **exactly matching the login response**.

---

## Current State

- Token exists in DB (valid ~1 hour).
- **Working endpoints (verified):**
  - `/api/ivis/profilecount` (root API) ✅
  - `/api/ivis/presence-mgmnt/visitor-stats-hourly` ✅
  - `/api/ivis/presence-mgmnt/frsemployee-stats` ✅ (empty array is valid)
  - `/api/ivis/presence-mgmnt/dashboard-inoffice-insights` ✅ (summary object)
  - `/api/ivis/site-details-dropdown` ✅
  - `/api/ivis/employees` ✅
- Remaining endpoints to verify as needed.

---

## Next Plan (Recommended Fix)

### Step 1 — Use login response values for headers
Use **mapped values** from login response dynamically:
- `customer-id` = `mappedCustomers[0].pkCustomerId`
- `customer-name` = `mappedCustomers[0].customerName`
- `customerCode` = `mappedCustomers[0].customerCode`
- `tenant-id` = `mappedCustomers[0].fkTenantId`
- `login-id` = `results.username`

### Step 2 — Override env values in memory after login
When login succeeds, update `env.ivis.*` with actual response values.

### Step 3 — Retest with the exact same headers the IVIS portal uses
If still failing:
1. Capture browser network request headers from IVIS portal.
2. Copy them 1:1 into the proxy call.

---

## Can We Achieve This?

**Yes.**  
We already have a working login token. The remaining blocker is **header accuracy** for data endpoints.  
Once we match the portal’s exact header set (and use values from login response), the data calls should succeed.

This is a solvable integration issue, not a fundamental limitation.
