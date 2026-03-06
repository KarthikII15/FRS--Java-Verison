import express from "express";
import {
  bootstrapWithAccessToken,
  loginWithEmailPassword,
  logoutByRefreshToken,
  refreshAccess,
} from "../services/authService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
import {
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  validateBody,
} from "../validators/schemas.js";
import { env } from "../config/env.js";
import { verifyKeycloakToken } from "../middleware/keycloakVerifier.js";
import { findUserByKeycloakSub, getMembershipsByUserId, getCatalogForTenantIds } from "../repositories/authRepository.js";
import { provisionKeycloakUser } from "../services/provisionUser.js";

const router = express.Router();

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

function getClientContext(req) {
  let ip = req.ip || req.connection?.remoteAddress || "unknown";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return {
    ipAddress: ip,
    userAgent: req.headers["user-agent"] || "unknown",
  };
}

/* ── Legacy API routes (kept for backward compatibility) ── */
/* NOTE: These routes are disabled when AUTH_MODE=keycloak */

if (env.authMode !== "keycloak") {
  router.post(
    "/login",
    authRateLimiter,
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
      const { email, password } = req.validatedBody;

      const session = await loginWithEmailPassword(email, password, getClientContext(req));
      if (!session) {
        return res.status(401).json({ message: "invalid credentials" });
      }
      return res.json(session);
    })
  );

  router.post(
    "/refresh",
    authRateLimiter,
    validateBody(refreshTokenSchema),
    asyncHandler(async (req, res) => {
      const { refreshToken } = req.validatedBody;

      const refreshed = await refreshAccess(refreshToken, getClientContext(req));
      if (!refreshed) {
        return res.status(401).json({ message: "invalid refresh token" });
      }
      return res.json(refreshed);
    })
  );

  router.post(
    "/logout",
    validateBody(logoutSchema),
    asyncHandler(async (req, res) => {
      const { refreshToken } = req.validatedBody;
      await logoutByRefreshToken(refreshToken);
      return res.status(204).send();
    })
  );
}


/* ── Bootstrap endpoint — dual mode ── */

router.get("/bootstrap", asyncHandler(async (req, res) => {
  const accessToken = readBearerToken(req);
  if (!accessToken) {
    return res.status(401).json({ message: "authorization token is required" });
  }

  if (env.authMode === "keycloak") {
    // ── Keycloak mode: verify JWT, find/provision user, load memberships ──
    const jwtPayload = await verifyKeycloakToken(accessToken);

    let user = await findUserByKeycloakSub(jwtPayload.sub);
    if (!user) {
      user = await provisionKeycloakUser(jwtPayload);
    }

    const rawMemberships = await getMembershipsByUserId(user.pk_user_id);
    const memberships = rawMemberships.map((row) => ({
      id: String(row.pk_membership_id),
      userId: String(row.fk_user_id),
      role: row.role,
      scope: {
        tenantId: String(row.tenant_id),
        customerId: row.customer_id ? String(row.customer_id) : undefined,
        siteId: row.site_id ? String(row.site_id) : undefined,
        unitId: row.unit_id ? String(row.unit_id) : undefined,
      },
      permissions: row.permissions || [],
    }));

    const tenantIds = [...new Set(memberships.map((m) => m.scope.tenantId))];
    const catalog = await getCatalogForTenantIds(tenantIds);

    return res.json({
      user: {
        id: String(user.pk_user_id),
        email: user.email,
        name: user.username,
        role: user.role,
        department: user.department || undefined,
        password: "",
        createdAt: user.created_at,
      },
      memberships,
      activeScope: memberships[0]?.scope ?? null,
      tenants: catalog.tenants.map((t) => ({ id: String(t.pk_tenant_id), name: t.tenant_name })),
      customers: catalog.customers.map((c) => ({ id: String(c.pk_customer_id), name: c.customer_name, tenantId: String(c.fk_tenant_id) })),
      sites: catalog.sites.map((s) => ({ id: String(s.pk_site_id), name: s.site_name, customerId: String(s.fk_customer_id) })),
      units: catalog.units.map((u) => ({ id: String(u.pk_unit_id), name: u.unit_name, siteId: String(u.fk_site_id) })),
    });
  }

  // ── Legacy API mode: opaque token bootstrap ──
  const payload = await bootstrapWithAccessToken(accessToken, getClientContext(req));
  if (!payload) {
    return res.status(401).json({ message: "invalid or expired token" });
  }
  return res.json(payload);
}));

export { router as authRoutes };
