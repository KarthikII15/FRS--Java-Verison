/**
 * ivis.ts — TypeScript type definitions for IVIS Cloud API responses.
 *
 * All IVIS responses share the `IvisResponse<T>` wrapper.
 * Note: `errorCode: "200"` in the body is normal IVIS behaviour — not an error.
 *
 * Placeholder types using `[key: string]: unknown` should be replaced with
 * real field names after testing each endpoint in Postman (see Phase 0).
 */

// ── Shared response wrapper ────────────────────────────────────────────
export interface IvisResponse<T> {
    results: T[];
    errorMessage: string | null;
    /** Always "200" on success — this is normal IVIS API behaviour. */
    errorCode: string;
}

// ── visitor-stats-hourly ──────────────────────────────────────────────
/** One entry per hour of the day (eventDate is "0"–"23"). */
export interface HourlyVisitorEntry {
    eventDate: string;   // "0"–"23" (hour of day as string)
    count: number;
    total: number;
    entryCount: number;
    exitCount: number;
    response: string | null;
    ackCount: number;
}
export type VisitorStatsHourlyResponse = IvisResponse<HourlyVisitorEntry>;

// ── zone-wise-stats ───────────────────────────────────────────────────
export interface ZoneStatEntry {
    eventDate: string;
    count: number;
    total: number;
    entryCount: number;
    exitCount: number;
    response: string | null;
    ackCount: number;
}
export type ZoneWiseStatsResponse = IvisResponse<ZoneStatEntry>;

// ── frsemployee-stats ─────────────────────────────────────────────────
export interface FrsEmployeeEntry {
    eventDate: string;
    count: number;
    total: number;
    entryCount: number;
    exitCount: number;
    response: string | null;
    ackCount: number;
}
export type FrsEmployeeStatsResponse = IvisResponse<FrsEmployeeEntry>;

// ── dashboard-insights ────────────────────────────────────────────────
// TODO (Phase 0): Replace with real field names after Postman test
export interface DashboardInsightEntry {
    [key: string]: unknown;
}
export type DashboardInsightsResponse = IvisResponse<DashboardInsightEntry>;

// ── dashboard-inoffice-insights ───────────────────────────────────────
export interface InofficeInsightSummary {
    totalEntry: number;
    employeeEntry: number;
    visitorEntry: number;
    employeeInOffice: number;
    visitorInOffice: number;
    totalInOffice: number;
    registeredEmployee: number;
    registeredVisitor: number;
    registeredTotal: number;
}
export interface InofficeInsightsResponse {
    results: InofficeInsightSummary;
    errorMessage: string | null;
    errorCode: string;
}

// ── getCleanlinessPercentage ──────────────────────────────────────────
// TODO (Phase 0): Replace with real field names after Postman test
export interface CleanlinessEntry {
    [key: string]: unknown;
}
export type CleanlinessResponse = IvisResponse<CleanlinessEntry>;

// ── profilecount ──────────────────────────────────────────────────────
export interface ProfileCountEntry {
    state: string;
    stateCount: number;
}
export type ProfileCountResponse = IvisResponse<ProfileCountEntry>;

// ── site-details-dropdown ─────────────────────────────────────────────
export interface SiteDetail {
    siteId: string | number;
    siteName: string;
    [key: string]: unknown;
}
export type SiteDetailsResponse = IvisResponse<SiteDetail>;

// ── employees (syncVerifiedUsers) ─────────────────────────────────────────
export interface IvisEmployee {
    pkUserId: number;
    userName: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    accessCode?: string;
    profileStatus: string;
    state: string;
    imageUrl?: string;
    status: boolean;
    tenantId: number;
    customerId: number;
    siteId: number;
}
export type IvisEmployeesResponse = IvisResponse<IvisEmployee>;

// ── Shared filter parameters ──────────────────────────────────────────
/**
 * Query parameters accepted by IVIS endpoints.
 * Date format: "YYYY-MM-DD HH:mm:ss" for fromTime/toTime, "YYYY-MM-DD" for date.
 *
 * Helper:
 *   const fmt    = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);
 *   const today  = new Date().toISOString().slice(0, 10);
 */
export interface IvisFilterParams {
    fromTime?: string;  // "YYYY-MM-DD HH:mm:ss"
    toTime?: string;  // "YYYY-MM-DD HH:mm:ss"
    siteName?: string;
    cameraIds?: string;
    staffName?: string;
    date?: string;  // "YYYY-MM-DD" (for getCleanlinessPercentage)
    dayFilterType?: 'day' | 'week' | 'month';
}
