import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Generates scope headers for API requests based on the active scope
 * These headers are used by the backend to filter data according to the user's access scope
 */
export function useScopeHeaders(): Record<string, string> {
  const { activeScope } = useAuth();

  return useMemo(() => {
    if (!activeScope) {
      return {};
    }

    const headers: Record<string, string> = {
      'x-tenant-id': activeScope.tenantId,
    };

    if (activeScope.customerId) {
      headers['x-customer-id'] = activeScope.customerId;
    }

    if (activeScope.siteId) {
      headers['x-site-id'] = activeScope.siteId;
    }

    if (activeScope.unitId) {
      headers['x-unit-id'] = activeScope.unitId;
    }

    return headers;
  }, [activeScope]);
}

/**
 * Helper function to build scope headers from an AccessScope object
 * Useful when you need to build headers outside of a React component
 */
export function buildScopeHeaders(activeScope: {
  tenantId: string;
  customerId?: string;
  siteId?: string;
  unitId?: string;
} | null): Record<string, string> {
  if (!activeScope) {
    return {};
  }

  const headers: Record<string, string> = {
    'x-tenant-id': activeScope.tenantId,
  };

  if (activeScope.customerId) {
    headers['x-customer-id'] = activeScope.customerId;
  }

  if (activeScope.siteId) {
    headers['x-site-id'] = activeScope.siteId;
  }

  if (activeScope.unitId) {
    headers['x-unit-id'] = activeScope.unitId;
  }

  return headers;
}
