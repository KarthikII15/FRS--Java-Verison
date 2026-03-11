/**
 * useIvisData.ts — Generic React hook for fetching IVIS data from the backend proxy.
 *
 * Features:
 *  - Auto-fetches on mount and when `deps` change
 *  - Optional auto-refresh via `refreshInterval` (milliseconds)
 *  - Manual `refetch()` trigger
 *  - `enabled` guard to lazy-load or skip fetching
 *  - Tracks `lastFetchedAt` timestamp for display/debugging
 *
 * Usage:
 *   const { data, loading, error, refetch } = useIvisData(
 *     () => ivisApi.visitorStatsHourly({ toTime: '2026-03-10 23:59:59' }),
 *     [selectedDate],
 *     { refreshInterval: 30_000 }
 *   );
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/** Options for controlling fetch behaviour */
interface UseIvisDataOptions {
    /** Auto-refresh interval in ms. Omit or set to 0 to disable. */
    refreshInterval?: number;
    /** Skip the initial fetch. Useful for conditional or manually-triggered loads. */
    enabled?: boolean;
}

/** Return shape of the hook */
interface UseIvisDataResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
    lastFetchedAt: Date | null;
}

/**
 * @param fetcher  - Async function returning the IVIS response (e.g. `() => ivisApi.xxx(params)`)
 * @param deps     - Dependency array — refetches when any value changes (like useEffect deps)
 * @param options  - `refreshInterval` and `enabled` options
 */
export function useIvisData<T>(
    fetcher: () => Promise<T>,
    deps: unknown[] = [],
    options: UseIvisDataOptions = {}
): UseIvisDataResult<T> {
    const { refreshInterval, enabled = true } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(enabled);
    const [error, setError] = useState<string | null>(null);
    const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

    // Keep the latest fetcher reference stable without changing the callback identity
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const fetchData = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        setError(null);
        try {
            const result = await fetcherRef.current();
            setData(result);
            setLastFetchedAt(new Date());
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error from IVIS';
            setError(message);
            console.error('[useIvisData]', message);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, ...deps]);

    // Fetch on mount and whenever deps change
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-refresh interval
    useEffect(() => {
        if (!refreshInterval || !enabled) return;
        const id = setInterval(fetchData, refreshInterval);
        return () => clearInterval(id);
    }, [fetchData, refreshInterval, enabled]);

    return { data, loading, error, refetch: fetchData, lastFetchedAt };
}
