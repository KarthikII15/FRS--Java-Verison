/**
 * ivisApi.ts — IVIS Cloud API client service.
 *
 * Calls your Express proxy at /api/ivis/* (never the IVIS server directly).
 * Uses native fetch with `credentials: 'include'` so your existing session
 * cookie is forwarded automatically — no separate auth needed.
 *
 * Usage:
 *   import { ivisApi } from '../services/ivisApi';
 *   const data = await ivisApi.visitorStatsHourly({ toTime: '2026-03-10 23:59:59' });
 */

import type {
    IvisFilterParams,
    VisitorStatsHourlyResponse,
    ZoneWiseStatsResponse,
    FrsEmployeeStatsResponse,
    DashboardInsightsResponse,
    InofficeInsightsResponse,
    CleanlinessResponse,
    ProfileCountResponse,
    SiteDetailsResponse,
    IvisEmployeesResponse,
} from '../types/ivis';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const BASE = API_BASE ? `${API_BASE}/ivis` : '/api/ivis';

// ── Internal GET helper ───────────────────────────────────────────────
async function get<T>(path: string, params?: IvisFilterParams): Promise<T> {
    const qs = params
        ? '?' +
        new URLSearchParams(
            Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
            ) as Record<string, string>
        ).toString()
        : '';

    const res = await fetch(`${BASE}/${path}${qs}`, {
        credentials: 'include', // forwards existing session cookie
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
            (error as { error?: string })?.error ?? `IVIS request failed: ${res.status}`
        );
    }

    return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────
export const ivisApi = {
    /**
     * Hourly visitor entry/exit stats.
     * Returns a 24-element array (index = hour of day).
     */
    visitorStatsHourly: (params: IvisFilterParams): Promise<VisitorStatsHourlyResponse> =>
        get('presence-mgmnt/visitor-stats-hourly', params),

    /** Zone-level entry/exit breakdown. */
    zoneWiseStats: (params: IvisFilterParams): Promise<ZoneWiseStatsResponse> =>
        get('presence-mgmnt/zone-wise-stats', params),

    /** FRS (Facial Recognition System) recognised employee stats. */
    frsEmployeeStats: (params: IvisFilterParams): Promise<FrsEmployeeStatsResponse> =>
        get('presence-mgmnt/frsemployee-stats', params),

    /** Aggregated daily dashboard insights. */
    dashboardInsights: (params: IvisFilterParams): Promise<DashboardInsightsResponse> =>
        get('presence-mgmnt/dashboard-insights', params),

    /** Live in-office occupancy insights. */
    dashboardInofficeInsights: (params: IvisFilterParams): Promise<InofficeInsightsResponse> =>
        get('presence-mgmnt/dashboard-inoffice-insights', params),

    /** Facility cleanliness percentage for a given date. */
    cleanlinessPercentage: (params: IvisFilterParams): Promise<CleanlinessResponse> =>
        get('presence-mgmnt/getCleanlinessPercentage', params),

    /** Total number of registered face profiles (no params required). */
    profileCount: (): Promise<ProfileCountResponse> =>
        get('profilecount'),

    /** Site list for filter dropdowns (fetch-once on mount). */
    siteDetailsDropdown: (): Promise<SiteDetailsResponse> =>
        get('site-details-dropdown'),

    /** Employee list from IVIS (syncVerifiedUsers). */
    employees: (): Promise<IvisEmployeesResponse> =>
        get('employees'),
} as const;
