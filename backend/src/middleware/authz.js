import { bootstrapWithAccessToken } from "../services/authService.js";
import { env } from "../config/env.js";
import { verifyKeycloakToken } from "./keycloakVerifier.js";
import { findUserByKeycloakSub, getMembershipsByUserId, getCatalogForTenantIds } from "../repositories/authRepository.js";
import { provisionKeycloakUser } from "../services/provisionUser.js";

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

function resolveRequestedScope(req, memberships) {
  const tenantId = String(req.headers["x-tenant-id"] || req.query.tenantId || "");
  const customerId = String(req.headers["x-customer-id"] || req.query.customerId || "");
  const siteId = String(req.headers["x-site-id"] || req.query.siteId || "");
  const unitId = String(req.headers["x-unit-id"] || req.query.unitId || "");

  if (!tenantId) {
    return memberships[0]?.scope ?? null;
  }

  return {
    tenantId,
    customerId: customerId || undefined,
    siteId: siteId || undefined,
    unitId: unitId || undefined,
  };
}

function canAccessScope(membership, scope) {
  if (!scope) return false;
  if (membership.scope.tenantId !== scope.tenantId) return false;
  if (scope.customerId && membership.scope.customerId && membership.scope.customerId !== scope.customerId) return false;
  if (scope.siteId && membership.scope.siteId && membership.scope.siteId !== scope.siteId) return false;
  if (scope.unitId && membership.scope.unitId && membership.scope.unitId !== scope.unitId) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Keycloak mode: JWT verification via jose/JWKS                      */
/* ------------------------------------------------------------------ */

async function authenticateWithKeycloak(accessToken) {
  // 1. Verify JWT signature, issuer, audience, expiration
  const jwtPayload = await verifyKeycloakToken(accessToken);

  // 2. Find user by keycloak_sub — auto-provision if not found
  let user = await findUserByKeycloakSub(jwtPayload.sub);
  if (!user) {
    user = await provisionKeycloakUser(jwtPayload);
  }

  // 3. Load memberships from our DB
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

  return {
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
  };
}

/* ------------------------------------------------------------------ */
/*  requireAuth middleware — dual mode                                 */
/* ------------------------------------------------------------------ */

export async function requireAuth(req, res, next) {
  console.log(`[auth] verifying token for path: ${req.path} (mode: ${env.authMode})`);
  const accessToken = readBearerToken(req);
  if (!accessToken) {
    console.log('[auth] no token found');
    return res.status(401).json({ message: "authorization token is required" });
  }

  try {
    let authPayload;

    if (env.authMode === "keycloak") {
      // ── Keycloak mode: verify JWT via JWKS ──
      authPayload = await authenticateWithKeycloak(accessToken);
    } else {
      // ── Legacy API mode: opaque token lookup ──
      let ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "unknown";
      if (ip.startsWith("::ffff:")) ip = ip.slice(7);
      const context = {
        ipAddress: ip,
        userAgent: req.headers["user-agent"] || "unknown",
      };
      authPayload = await bootstrapWithAccessToken(accessToken, context);
    }

    if (!authPayload) {
      console.log('[auth] authentication failed');
      return res.status(401).json({ message: "invalid or expired token" });
    }
    console.log('[auth] authentication success');

    const scope = resolveRequestedScope(req, authPayload.memberships);
    const matchingMemberships = authPayload.memberships.filter((m) => canAccessScope(m, scope));
    if (!matchingMemberships.length) {
      console.log('[auth] scope access denied');
      return res.status(403).json({ message: "scope access denied" });
    }

    req.auth = {
      user: authPayload.user,
      memberships: matchingMemberships,
      scope,
    };
    return next();
  } catch (err) {
    console.error('[auth] CRASH in requireAuth:', err);
    return res.status(500).json({ message: "internal server error during authentication" });
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const memberships = req.auth?.memberships || [];
    const allowed = memberships.some((membership) => membership.permissions.includes(permission));
    if (!allowed) {
      return res.status(403).json({ message: `permission denied: ${permission}` });
    }
    return next();
  };
}

