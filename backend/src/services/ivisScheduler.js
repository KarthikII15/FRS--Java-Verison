import {
  syncSites,
  syncEmployees,
  syncVisitorStats,
  syncZoneStats,
  syncAttendance,
  syncCleanliness,
  syncProfileCount,
  runFullSync,
} from './ivisSync.js';

const INTERVALS = {
  sites: 60 * 60 * 1000,
  employees: 30 * 60 * 1000,
  visitorStats: 15 * 60 * 1000,
  zoneStats: 15 * 60 * 1000,
  attendance: 10 * 60 * 1000,
  cleanliness: 60 * 60 * 1000,
  profileCount: 30 * 60 * 1000,
};

const activeTimers = [];

export function startIvisScheduler() {
  console.log('[SCHEDULER] Starting IVIS sync scheduler...');

  setTimeout(() => {
    runFullSync().catch((err) =>
      console.error('[SCHEDULER] Initial full sync failed:', err.message)
    );
  }, 10_000);

  const register = (name, fn, intervalMs) => {
    const timer = setInterval(() => {
      fn().catch((err) =>
        console.error(`[SCHEDULER] ${name} sync failed:`, err.message)
      );
    }, intervalMs);
    activeTimers.push(timer);
    console.log(`[SCHEDULER] ✅ ${name} — every ${intervalMs / 60000} min`);
  };

  register('sites', syncSites, INTERVALS.sites);
  register('employees', syncEmployees, INTERVALS.employees);
  register('visitorStats', syncVisitorStats, INTERVALS.visitorStats);
  register('zoneStats', syncZoneStats, INTERVALS.zoneStats);
  register('attendance', syncAttendance, INTERVALS.attendance);
  register('cleanliness', syncCleanliness, INTERVALS.cleanliness);
  register('profileCount', syncProfileCount, INTERVALS.profileCount);

  console.log('[SCHEDULER] All sync jobs registered.');
}

export function stopIvisScheduler() {
  activeTimers.forEach(clearInterval);
  activeTimers.length = 0;
  console.log('[SCHEDULER] All sync jobs stopped.');
}
