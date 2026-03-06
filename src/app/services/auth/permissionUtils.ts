import { AccessScope, Permission, UserMembership } from "../../types";

export function derivePermissionsForScope(
  memberships: UserMembership[],
  scope: AccessScope | null
): Permission[] {
  if (!scope) return [];

  const scopedPermissions = memberships
    .filter((membership) => membership.scope.tenantId === scope.tenantId)
    .flatMap((membership) => membership.permissions);

  return Array.from(new Set(scopedPermissions));
}

