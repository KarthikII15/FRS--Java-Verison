import {
  Customer,
  Permission,
  Site,
  Tenant,
  Unit,
  UserMembership,
} from "../types";

export const mockTenants: Tenant[] = [
  { id: "tenant-1", name: "Motivity Global" },
  { id: "tenant-2", name: "Motivity APAC" },
];

export const mockCustomers: Customer[] = [
  { id: "customer-1", tenantId: "tenant-1", name: "North America Ops" },
  { id: "customer-2", tenantId: "tenant-1", name: "Europe Ops" },
  { id: "customer-3", tenantId: "tenant-2", name: "India Ops" },
];

export const mockSites: Site[] = [
  { id: "site-1", customerId: "customer-1", name: "Dallas Campus" },
  { id: "site-2", customerId: "customer-1", name: "Austin Hub" },
  { id: "site-3", customerId: "customer-3", name: "Hyderabad Tower" },
];

export const mockUnits: Unit[] = [
  { id: "unit-1", siteId: "site-1", name: "Engineering Block A" },
  { id: "unit-2", siteId: "site-1", name: "HR Operations" },
  { id: "unit-3", siteId: "site-3", name: "Delivery Unit" },
];

const adminPermissions: Permission[] = [
  "users.read",
  "users.manage",
  "devices.read",
  "devices.manage",
  "attendance.read",
  "attendance.manage",
  "analytics.read",
  "audit.read",
  "facility.read",
  "facility.manage",
  "aiinsights.read",
];

const hrPermissions: Permission[] = [
  "users.read",
  "attendance.read",
  "attendance.manage",
  "analytics.read",
  "facility.read",
  "aiinsights.read",
];

export const mockMembershipsByUserEmail: Record<string, UserMembership[]> = {
  "admin@company.com": [
    {
      id: "membership-admin-1",
      userId: "user-admin-1",
      role: "admin",
      permissions: adminPermissions,
      scope: { tenantId: "tenant-1", customerId: "customer-1", siteId: "site-1" },
    },
    {
      id: "membership-admin-2",
      userId: "user-admin-1",
      role: "admin",
      permissions: adminPermissions,
      scope: { tenantId: "tenant-2", customerId: "customer-3", siteId: "site-3" },
    },
  ],
  "hr@company.com": [
    {
      id: "membership-hr-1",
      userId: "user-hr-1",
      role: "hr",
      permissions: hrPermissions,
      scope: { tenantId: "tenant-1", customerId: "customer-1", siteId: "site-1", unitId: "unit-2" },
    },
  ],
};
