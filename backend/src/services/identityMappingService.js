import {
  findUserByEmail,
  findUserByKeycloakSub,
  getCatalogForTenantIds,
  getMembershipsByUserId,
  linkUserToKeycloakSub,
} from "../repositories/authRepository.js";

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

async function buildBootstrapForUser(userRow) {
  const membershipsRaw = await getMembershipsByUserId(userRow.pk_user_id);
  const memberships = membershipsRaw.map(normalizeMembership);
  const tenantIds = [...new Set(membershipsRaw.map((row) => row.tenant_id))];
  const catalogRaw = await getCatalogForTenantIds(tenantIds);
  const catalog = normalizeCatalog(catalogRaw);

  return {
    user: normalizeUser(userRow),
    memberships,
    activeScope: memberships[0]?.scope ?? null,
    ...catalog,
  };
}

export async function resolveBootstrapByKeycloakClaims(claims) {
  let userRow = await findUserByKeycloakSub(claims.sub);

  if (!userRow) {
    const emailMatch = await findUserByEmail(claims.email);
    if (!emailMatch) return null;

    const linked = await linkUserToKeycloakSub(emailMatch.pk_user_id, claims.sub);
    if (!linked) return null;
    userRow = linked;
  } else if (userRow.email !== claims.email) {
    // Reject token when mapped subject email does not match the internal user email.
    return null;
  }

  return buildBootstrapForUser(userRow);
}
