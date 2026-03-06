import {
  mockCustomers,
  mockMembershipsByUserEmail,
  mockSites,
  mockTenants,
  mockUnits,
} from "../../data/authMockData";
import { mockUsers } from "../../utils/mockData";
import { AuthProvider } from "./types";
import { derivePermissionsForScope } from "./permissionUtils";

export const mockAuthProvider: AuthProvider = {
  async initialize() {
    return {
      session: null,
      catalog: {
        tenants: mockTenants,
        customers: mockCustomers,
        sites: mockSites,
        units: mockUnits,
      },
    };
  },

  async login(email, password) {
    const foundUser = mockUsers.find((user) => user.email === email && user.password === password);
    if (!foundUser) return null;

    const memberships = mockMembershipsByUserEmail[email] ?? [];
    return {
      user: foundUser,
      accessToken: `mock-access-${foundUser.id}-${Date.now()}`,
      refreshToken: `mock-refresh-${foundUser.id}-${Date.now()}`,
      memberships,
      activeScope: memberships[0]?.scope ?? null,
    };
  },

  async logout() {},

  derivePermissions: derivePermissionsForScope,
};

