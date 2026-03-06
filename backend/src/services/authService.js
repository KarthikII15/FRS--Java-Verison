import bcrypt from "bcryptjs";
import {
  findSessionByRefreshToken,
  findUserByAccessToken,
  findUserByEmail,
  getCatalogForTenantIds,
  getMembershipsByUserId,
  revokeSessionByRefreshToken,
  rotateSessionToken,
  saveSessionToken,
} from "../repositories/authRepository.js";
import { generateSessionTokens, hashToken } from "./tokenService.js";

function normalizeUser(userRow) {
  return {
    id: String(userRow.pk_user_id),
    email: userRow.email,
    role: userRow.role,
    name: userRow.username,
    department: userRow.department || undefined,
    createdAt: userRow.created_at,
  };
}

function normalizeMembership(membershipRow) {
  return {
    id: String(membershipRow.pk_membership_id),
    userId: String(membershipRow.fk_user_id),
    role: membershipRow.role,
    permissions: membershipRow.permissions || [],
    scope: {
      tenantId: String(membershipRow.tenant_id),
      customerId: membershipRow.customer_id ? String(membershipRow.customer_id) : undefined,
      siteId: membershipRow.site_id ? String(membershipRow.site_id) : undefined,
      unitId: membershipRow.unit_id ? String(membershipRow.unit_id) : undefined,
    },
  };
}

function normalizeCatalog(catalogRows) {
  return {
    tenants: catalogRows.tenants.map((row) => ({
      id: String(row.pk_tenant_id),
      name: row.tenant_name,
    })),
    customers: catalogRows.customers.map((row) => ({
      id: String(row.pk_customer_id),
      tenantId: String(row.fk_tenant_id),
      name: row.customer_name,
    })),
    sites: catalogRows.sites.map((row) => ({
      id: String(row.pk_site_id),
      customerId: String(row.fk_customer_id),
      name: row.site_name,
    })),
    units: catalogRows.units.map((row) => ({
      id: String(row.pk_unit_id),
      siteId: String(row.fk_site_id),
      name: row.unit_name,
    })),
  };
}

async function buildBootstrapForUser(userId) {
  const membershipsRaw = await getMembershipsByUserId(userId);
  const memberships = membershipsRaw.map(normalizeMembership);
  const tenantIds = [...new Set(membershipsRaw.map((row) => row.tenant_id))];
  const catalogRaw = await getCatalogForTenantIds(tenantIds);
  const catalog = normalizeCatalog(catalogRaw);
  return {
    memberships,
    activeScope: memberships[0]?.scope ?? null,
    ...catalog,
  };
}

export async function loginWithEmailPassword(email, password, context) {
  const userRow = await findUserByEmail(email);
  if (!userRow) return null;

  const isMatch = await bcrypt.compare(password, userRow.password_hash);
  if (!isMatch) return null;

  const tokens = generateSessionTokens();
  await saveSessionToken({
    userId: userRow.pk_user_id,
    accessToken: hashToken(tokens.accessToken),
    refreshToken: hashToken(tokens.refreshToken),
    accessExpiresAt: tokens.accessExpiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
  });

  const bootstrap = await buildBootstrapForUser(userRow.pk_user_id);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: normalizeUser(userRow),
    memberships: bootstrap.memberships,
    activeScope: bootstrap.activeScope,
  };
}

export async function bootstrapWithAccessToken(accessToken, context) {
  console.log('[authService] bootstrap start');
  const hashed = hashToken(accessToken);
  const userRow = await findUserByAccessToken(hashed);
  if (!userRow) {
    console.log('[authService] token not found or expired');
    return null;
  }

  if (!context) {
    console.warn('[authService] context missing!');
    return null;
  }

  // Only check User-Agent for bootstrap. IPs can legitimately change (proxies, mobile networks)
  // so we only bind on UA to avoid false positives that break legitimate sessions.
  const uaMatch = userRow.user_agent === context.userAgent;

  if (!uaMatch) {
    console.warn(`[anomaly] bootstrap intercepted: User-Agent mismatch. user=${userRow.pk_user_id}`);
    console.warn(`Record UA=[${userRow.user_agent}]`);
    console.warn(`Incoming UA=[${context.userAgent}]`);
    return null;
  }
  console.log('[authService] bootstrap context valid');

  const bootstrap = await buildBootstrapForUser(userRow.pk_user_id);
  return {
    user: normalizeUser(userRow),
    memberships: bootstrap.memberships,
    activeScope: bootstrap.activeScope,
    tenants: bootstrap.tenants,
    customers: bootstrap.customers,
    sites: bootstrap.sites,
    units: bootstrap.units,
  };
}

export async function refreshAccess(refreshToken, context) {
  const hashedRefreshToken = hashToken(refreshToken);
  const session = await findSessionByRefreshToken(hashedRefreshToken);

  if (!session || session.revoked || new Date(session.refresh_expires_at) <= new Date()) {
    return null;
  }

  if (session.user_agent !== context.userAgent || session.ip_address !== context.ipAddress) {
    console.warn(`[anomaly] refresh intercepted: session hijacked. token=${session.token_id}`);
    console.warn(`Record: IP=${session.ip_address}, UA=${session.user_agent}`);
    console.warn(`Incoming: IP=${context.ipAddress}, UA=${context.userAgent}`);
    await revokeSessionByRefreshToken(hashedRefreshToken);
    return null;
  }

  const tokens = generateSessionTokens();
  await rotateSessionToken({
    refreshToken: hashedRefreshToken,
    newAccessToken: hashToken(tokens.accessToken),
    newRefreshToken: hashToken(tokens.refreshToken),
    accessExpiresAt: tokens.accessExpiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function logoutByRefreshToken(refreshToken) {
  if (!refreshToken) return;
  await revokeSessionByRefreshToken(hashToken(refreshToken));
}

