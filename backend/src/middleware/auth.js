import { requireAuth, requirePermission } from './authz.js';

/**
 * Authenticate the current request using the existing auth pipeline.
 * Attaches `req.auth` with user + memberships + scope.
 */
export const authenticate = requireAuth;

/**
 * Authorize request based on roles or permissions.
 * - If strings look like roles (e.g. "admin", "hr"), check `req.auth.user.role`.
 * - Otherwise treat them as permission codes and use `requirePermission`.
 *
 * @param {string[]} rolesOrPermissions
 */
export function authorize(rolesOrPermissions = []) {
  return (req, res, next) => {
    const user = req.auth?.user;
    if (!user) {
      return res.status(401).json({ message: 'authentication required' });
    }

    const roles = Array.isArray(rolesOrPermissions)
      ? rolesOrPermissions
      : [rolesOrPermissions];

    // Role-based shortcut
    if (user.role && roles.some((r) => r === user.role)) {
      return next();
    }

    // Fall back to permission-based check using first role as permission name
    if (roles.length > 0) {
      const permissionMiddleware = requirePermission(roles[0]);
      return permissionMiddleware(req, res, next);
    }

    return next();
  };
}

