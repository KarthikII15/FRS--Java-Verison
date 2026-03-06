/**
 * Scope Extractor Middleware
 * 
 * Extracts scope headers from incoming requests and attaches them to req.scope.
 * These headers are used to filter data according to the user's access scope.
 * 
 * Headers expected:
 * - x-tenant-id (required): The tenant ID
 * - x-customer-id (optional): The customer ID within the tenant
 * - x-site-id (optional): The site ID within the customer
 * - x-unit-id (optional): The unit ID within the site
 */

/**
 * Extracts scope from request headers
 * This middleware should run BEFORE requireAuth
 */
export function extractScope(req, res, next) {
  const tenantId = req.headers['x-tenant-id'];
  const customerId = req.headers['x-customer-id'];
  const siteId = req.headers['x-site-id'];
  const unitId = req.headers['x-unit-id'];

  // Build scope object from headers (only include if tenantId is present)
  if (tenantId) {
    req.scope = {
      tenantId: String(tenantId),
      customerId: customerId ? String(customerId) : undefined,
      siteId: siteId ? String(siteId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
    };

    // Validate scope hierarchy (if child is provided, parent must be provided)
    if (req.scope.unitId && !req.scope.siteId) {
      return res.status(400).json({
        message: 'Cannot specify unit without site',
        error: 'INVALID_SCOPE_HIERARCHY'
      });
    }

    if (req.scope.siteId && !req.scope.customerId) {
      return res.status(400).json({
        message: 'Cannot specify site without customer',
        error: 'INVALID_SCOPE_HIERARCHY'
      });
    }
  } else {
    // No scope headers provided - will use default from auth token
    req.scope = null;
  }

  next();
}

/**
 * Validates that the user has access to the requested scope
 * This middleware should run AFTER requireAuth (so req.auth is available)
 */
export function validateScopeAccess(req, res, next) {
  // If no scope headers were provided, auth middleware will use default from token
  // Nothing to validate here
  if (!req.scope) {
    return next();
  }

  // Ensure user is authenticated
  if (!req.auth?.memberships) {
    return res.status(401).json({ message: 'authentication required' });
  }

  const requestedScope = req.scope;
  const memberships = req.auth.memberships;

  // Check if user has a membership that matches the requested scope
  const hasAccess = memberships.some((membership) => {
    // Must match tenant
    if (membership.scope.tenantId !== requestedScope.tenantId) {
      return false;
    }

    // If customer specified in request, user must have access to that customer
    if (requestedScope.customerId) {
      // User has explicit customer scope that matches
      if (membership.scope.customerId === requestedScope.customerId) {
        // Check site if specified
        if (requestedScope.siteId) {
          if (membership.scope.siteId === requestedScope.siteId) {
            // Check unit if specified
            if (requestedScope.unitId) {
              return membership.scope.unitId === requestedScope.unitId;
            }
            return true; // Site matches, no unit specified
          }
          return false; // Site specified but doesn't match
        }
        return true; // Customer matches, no site specified
      }
      
      // User has tenant-level access (no customer restriction)
      if (!membership.scope.customerId) {
        return true;
      }
      
      return false;
    }

    // Only tenant specified - user must have access to this tenant
    return true;
  });

  if (!hasAccess) {
    console.log('[scope] access denied - user does not have membership for requested scope:', requestedScope);
    return res.status(403).json({
      message: 'access denied for requested scope',
      error: 'SCOPE_ACCESS_DENIED',
      scope: requestedScope
    });
  }

  console.log('[scope] access granted for scope:', requestedScope);
  next();
}

/**
 * Middleware to ensure scope is properly resolved
 * Combines extractScope and validateScopeAccess in the correct order
 * Usage: router.use(ensureScope);
 */
export function ensureScope(req, res, next) {
  // This is a placeholder - actual implementation requires running
  // extractScope before auth and validateScopeAccess after auth
  // See server.js for proper middleware ordering
  next();
}
