import { AccessScope, User, UserMembership } from "../../types";
import { apiRequest } from "../http/apiClient";
import { AuthBootstrap, AuthProvider, AuthSession } from "./types";
import { derivePermissionsForScope } from "./permissionUtils";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User | ApiUser;
  memberships: UserMembership[];
  activeScope?: AccessScope | null;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

interface ApiUser {
  id: string;
  email: string;
  role: "admin" | "hr";
  name: string;
  department?: string;
  createdAt: string | Date;
}

interface BootstrapResponse {
  user: User | ApiUser;
  memberships: UserMembership[];
  activeScope?: AccessScope | null;
  tenants: AuthBootstrap["catalog"]["tenants"];
  customers: AuthBootstrap["catalog"]["customers"];
  sites: AuthBootstrap["catalog"]["sites"];
  units: AuthBootstrap["catalog"]["units"];
}

function normalizeUser(user: User | ApiUser): User {
  return {
    ...user,
    password: (user as User).password ?? "",
    createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
  };
}

async function fetchBootstrap(accessToken: string): Promise<BootstrapResponse> {
  return apiRequest<BootstrapResponse>("/auth/bootstrap", {
    method: "GET",
    accessToken,
  });
}

async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse | null> {
  try {
    return await apiRequest<RefreshResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return null;
  }
}

export const apiAuthProvider: AuthProvider = {
  async initialize(tokens) {
    const { accessToken, refreshToken } = tokens;

    if (!accessToken && !refreshToken) {
      return { session: null, catalog: { tenants: [], customers: [], sites: [], units: [] } };
    }

    let nextAccessToken = accessToken;
    let nextRefreshToken = refreshToken;

    if (!nextAccessToken && nextRefreshToken) {
      const refreshed = await refreshAccessToken(nextRefreshToken);
      if (!refreshed) {
        return { session: null, catalog: { tenants: [], customers: [], sites: [], units: [] } };
      }
      nextAccessToken = refreshed.accessToken;
      nextRefreshToken = refreshed.refreshToken ?? nextRefreshToken;
    }

    try {
      const bootstrap = await fetchBootstrap(nextAccessToken!);
      return {
        session: {
          user: normalizeUser(bootstrap.user),
          accessToken: nextAccessToken ?? null,
          refreshToken: nextRefreshToken ?? null,
          memberships: bootstrap.memberships,
          activeScope: bootstrap.activeScope ?? bootstrap.memberships[0]?.scope ?? null,
        },
        catalog: {
          tenants: bootstrap.tenants,
          customers: bootstrap.customers,
          sites: bootstrap.sites,
          units: bootstrap.units,
        },
      };
    } catch {
      if (!nextRefreshToken) {
        return { session: null, catalog: { tenants: [], customers: [], sites: [], units: [] } };
      }
      const refreshed = await refreshAccessToken(nextRefreshToken);
      if (!refreshed) {
        return { session: null, catalog: { tenants: [], customers: [], sites: [], units: [] } };
      }
      const bootstrap = await fetchBootstrap(refreshed.accessToken);
      return {
        session: {
          user: normalizeUser(bootstrap.user),
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? nextRefreshToken,
          memberships: bootstrap.memberships,
          activeScope: bootstrap.activeScope ?? bootstrap.memberships[0]?.scope ?? null,
        },
        catalog: {
          tenants: bootstrap.tenants,
          customers: bootstrap.customers,
          sites: bootstrap.sites,
          units: bootstrap.units,
        },
      };
    }
  },

  async login(email, password) {
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    return {
      user: normalizeUser(response.user),
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      memberships: response.memberships,
      activeScope: response.activeScope ?? response.memberships[0]?.scope ?? null,
    } as AuthSession;
  },

  async logout(refreshToken) {
    if (!refreshToken) return;
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Logout should clear local state regardless of API response.
    }
  },

  derivePermissions: derivePermissionsForScope,
};

