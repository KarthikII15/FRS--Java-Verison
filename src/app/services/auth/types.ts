import {
  AccessScope,
  Customer,
  Permission,
  Site,
  Tenant,
  Unit,
  User,
  UserMembership,
} from "../../types";

export interface AuthSession {
  user: User;
  accessToken: string | null;
  refreshToken: string | null;
  memberships: UserMembership[];
  activeScope: AccessScope | null;
}

export interface AuthCatalog {
  tenants: Tenant[];
  customers: Customer[];
  sites: Site[];
  units: Unit[];
}

export interface AuthBootstrap {
  session: AuthSession | null;
  catalog: AuthCatalog;
}

export interface AuthProvider {
  initialize: (tokens: {
    accessToken: string | null;
    refreshToken: string | null;
  }) => Promise<AuthBootstrap>;
  login: (email: string, password: string) => Promise<AuthSession | null>;
  logout: (refreshToken?: string | null) => Promise<void>;
  derivePermissions: (memberships: UserMembership[], scope: AccessScope | null) => Permission[];
}

