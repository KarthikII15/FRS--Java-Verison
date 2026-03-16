import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  AccessScope,
  Customer,
  Permission,
  Site,
  Tenant,
  Unit,
  User,
  UserMembership,
} from '../types';
import { authProvider } from '../services/auth';
import { tokenStorage } from '../services/auth/tokenStorage';
import { authConfig } from '../config/authConfig';
import { realtimeEngine } from '../engine/RealTimeEngine';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  memberships: UserMembership[];
  permissions: Permission[];
  activeScope: AccessScope | null;
  tenants: Tenant[];
  customers: Customer[];
  sites: Site[];
  units: Unit[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setActiveScope: (scope: AccessScope) => void;
  can: (permission: Permission) => boolean;
  hasAnyPermission: (requiredPermissions: Permission[]) => boolean;
  isAuthLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [activeScope, setActiveScope] = useState<AccessScope | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearSession = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setMemberships([]);
    setPermissions([]);
    setActiveScope(null);
    tokenStorage.clearTokens();
  };

  const applySession = (
    session: {
      user: User;
      accessToken: string | null;
      refreshToken: string | null;
      memberships: UserMembership[];
      activeScope: AccessScope | null;
    } | null
  ) => {
    if (!session) {
      clearSession();
      return;
    }

    const derivedPermissions = authProvider.derivePermissions(
      session.memberships,
      session.activeScope
    );

    setUser(session.user);
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    setMemberships(session.memberships);
    setPermissions(derivedPermissions);
    setActiveScope(session.activeScope);
    tokenStorage.setTokens(session.accessToken, session.refreshToken);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setIsAuthLoading(true);
      setAuthError(null);

      try {
        const bootstrap = await authProvider.initialize(tokenStorage.getTokens());
        if (!isMounted) return;
        setTenants(bootstrap.catalog.tenants);
        setCustomers(bootstrap.catalog.customers);
        setSites(bootstrap.catalog.sites);
        setUnits(bootstrap.catalog.units);
        applySession(bootstrap.session);
        // Restore WebSocket connection for persisted sessions
        if (bootstrap.session?.accessToken) {
          realtimeEngine.connectSocket(
            bootstrap.session.accessToken,
            bootstrap.session.activeScope?.tenantId
          );
        }
      } catch {
        if (!isMounted) return;
        clearSession();
        setAuthError("Unable to restore session. Please sign in again.");
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const session = await authProvider.login(email, password);
      if (!session) {
        if (authConfig.mode !== "keycloak") {
          setAuthError("Invalid email or password");
        }
        return false;
      }
      applySession(session);
      // Connect WebSocket now that we have a token
      if (session.accessToken) {
        realtimeEngine.connectSocket(
          session.accessToken,
          session.activeScope?.tenantId
        );
      }
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authProvider.logout(refreshToken);
    } finally {
      realtimeEngine.disconnectSocket();
      clearSession();
      setAuthError(null);
    }
  };

  const can = (permission: Permission) => permissions.includes(permission);

  const hasAnyPermission = (requiredPermissions: Permission[]) =>
    requiredPermissions.some((permission) => can(permission));

  const setScope = (scope: AccessScope) => {
    setActiveScope(scope);
    setPermissions(authProvider.derivePermissions(memberships, scope));
  };

  const availableTenants = useMemo(
    () => tenants.filter((tenant) => memberships.some((membership) => membership.scope.tenantId === tenant.id)),
    [memberships, tenants]
  );

  const availableCustomers = useMemo(() => {
    const customerIds = new Set(
      memberships
        .filter((membership) => (activeScope ? membership.scope.tenantId === activeScope.tenantId : true))
        .map((membership) => membership.scope.customerId)
        .filter(Boolean)
    );
    return customers.filter((customer) => customerIds.has(customer.id));
  }, [memberships, activeScope, customers]);

  const availableSites = useMemo(() => {
    const siteIds = new Set(
      memberships
        .filter((membership) => (activeScope ? membership.scope.tenantId === activeScope.tenantId : true))
        .map((membership) => membership.scope.siteId)
        .filter(Boolean)
    );
    return sites.filter((site) => siteIds.has(site.id));
  }, [memberships, activeScope, sites]);

  const availableUnits = useMemo(() => {
    const unitIds = new Set(memberships.map((membership) => membership.scope.unitId).filter(Boolean));
    return units.filter((unit) => unitIds.has(unit.id));
  }, [memberships, units]);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        accessToken,
        refreshToken,
        memberships,
        permissions,
        activeScope,
        tenants: availableTenants,
        customers: availableCustomers,
        sites: availableSites,
        units: availableUnits,
        login,
        logout,
        setActiveScope: setScope,
        can,
        hasAnyPermission,
        isAuthLoading,
        authError,
        clearAuthError: () => setAuthError(null),
        isAuthenticated: !!user 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
