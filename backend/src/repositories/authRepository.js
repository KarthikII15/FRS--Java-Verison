import { query } from "../db/pool.js";

export async function findUserByEmail(email) {
  const result = await query(
    `select
      pk_user_id,
      email,
      username,
      role,
      department,
      created_at,
      password_hash
     from frs_user
     where email = $1
     limit 1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserByKeycloakSub(keycloakSub) {
  const result = await query(
    `select
      pk_user_id,
      email,
      username,
      role,
      department,
      created_at
     from frs_user
     where keycloak_sub = $1
     limit 1`,
    [keycloakSub]
  );
  return result.rows[0] ?? null;
}

export async function findUserByAccessToken(accessToken) {
  const result = await query(
    `select
      t.user_agent,
      t.ip_address,
      u.pk_user_id,
      u.email,
      u.username,
      u.role,
      u.department,
      u.created_at
     from auth_session_token t
     join frs_user u on u.pk_user_id = t.fk_user_id
     where t.access_token = $1
       and t.revoked = false
       and t.access_expires_at > now()
     limit 1`,
    [accessToken]
  );
  return result.rows[0] ?? null;
}

export async function findSessionByRefreshToken(refreshToken) {
  const result = await query(
    `select token_id, fk_user_id, refresh_expires_at, revoked, user_agent, ip_address
     from auth_session_token
     where refresh_token = $1
     limit 1`,
    [refreshToken]
  );
  return result.rows[0] ?? null;
}

export async function revokeSessionByRefreshToken(refreshToken) {
  await query(
    `update auth_session_token
     set revoked = true
     where refresh_token = $1`,
    [refreshToken]
  );
}

export async function saveSessionToken({
  userId,
  accessToken,
  refreshToken,
  accessExpiresAt,
  refreshExpiresAt,
  userAgent,
  ipAddress,
}) {
  const result = await query(
    `insert into auth_session_token(
      fk_user_id,
      access_token,
      refresh_token,
      access_expires_at,
      refresh_expires_at,
      user_agent,
      ip_address,
      revoked
    ) values ($1, $2, $3, $4, $5, $6, $7, false)
    returning token_id`,
    [userId, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, userAgent, ipAddress]
  );
  return result.rows[0];
}

export async function rotateSessionToken({
  refreshToken,
  newAccessToken,
  newRefreshToken,
  accessExpiresAt,
  refreshExpiresAt,
  userAgent,
  ipAddress,
}) {
  const result = await query(
    `update auth_session_token
     set access_token = $2,
         refresh_token = $3,
         access_expires_at = $4,
         refresh_expires_at = $5,
         user_agent = $6,
         ip_address = $7,
         revoked = false
     where refresh_token = $1
     returning token_id`,
    [refreshToken, newAccessToken, newRefreshToken, accessExpiresAt, refreshExpiresAt, userAgent, ipAddress]
  );
  return result.rows[0] ?? null;
}

export async function getMembershipsByUserId(userId) {
  const result = await query(
    `select
      pk_membership_id,
      fk_user_id,
      role,
      tenant_id,
      customer_id,
      site_id,
      unit_id,
      permissions
     from frs_user_membership
     where fk_user_id = $1
     order by pk_membership_id`,
    [userId]
  );
  return result.rows;
}

export async function getCatalogForTenantIds(tenantIds) {
  if (!tenantIds.length) {
    return { tenants: [], customers: [], sites: [], units: [] };
  }

  const tenants = await query(
    `select pk_tenant_id, tenant_name
     from frs_tenant
     where pk_tenant_id = any($1::bigint[])`,
    [tenantIds]
  );

  const customers = await query(
    `select pk_customer_id, customer_name, fk_tenant_id
     from frs_customer
     where fk_tenant_id = any($1::bigint[])`,
    [tenantIds]
  );

  const customerIds = customers.rows.map((row) => row.pk_customer_id);
  const sites = customerIds.length
    ? await query(
      `select pk_site_id, site_name, fk_customer_id
         from frs_site
         where fk_customer_id = any($1::bigint[])`,
      [customerIds]
    )
    : { rows: [] };

  const siteIds = sites.rows.map((row) => row.pk_site_id);
  const units = siteIds.length
    ? await query(
      `select pk_unit_id, unit_name, fk_site_id
         from frs_unit
         where fk_site_id = any($1::bigint[])`,
      [siteIds]
    )
    : { rows: [] };

  return {
    tenants: tenants.rows,
    customers: customers.rows,
    sites: sites.rows,
    units: units.rows,
  };
}

