#!/usr/bin/env node
/**
 * bulk_enroll.js — Batch face enrollment from a directory of photos.
 *
 * Usage:
 *   AUTH_TOKEN=<token> node scripts/bulk_enroll.js /path/to/photos [options]
 *
 * Options:
 *   --api-url   Backend URL (default: http://localhost:8080/api)
 *   --concurrency  Parallel uploads (default: 3)
 *   --dry-run   List files without uploading
 *
 * Photo naming conventions (checked in order):
 *   1. {employeeId}.jpg / .jpeg / .png / .webp         → employeeId = filename stem
 *   2. {employeeId}_{anything}.jpg                      → employeeId = part before first _
 *   3. {employeeCode}_{name}.jpg                        → resolved via /api/employees?search=
 *
 * Output:
 *   A summary CSV is written to ./bulk_enroll_results_{timestamp}.csv
 */

import fs from 'fs';
import path from 'path';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

// ── Config from env / args ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const photoDir  = args.find(a => !a.startsWith('--')) || process.env.PHOTO_DIR;
const apiUrl    = getArg('--api-url', 'http://localhost:8080/api');
const authToken = process.env.AUTH_TOKEN;
const concurrency = parseInt(getArg('--concurrency', '3'), 10);
const dryRun    = args.includes('--dry-run');

function getArg(flag, def) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

// ── Validation ───────────────────────────────────────────────────────────────
if (!photoDir) {
  console.error('[bulk_enroll] ERROR: Photo directory required.\n  Usage: AUTH_TOKEN=xxx node scripts/bulk_enroll.js /path/to/photos');
  process.exit(1);
}
if (!authToken) {
  console.error('[bulk_enroll] ERROR: AUTH_TOKEN env variable is required.');
  process.exit(1);
}
if (!fs.existsSync(photoDir)) {
  console.error(`[bulk_enroll] ERROR: Directory not found: ${photoDir}`);
  process.exit(1);
}

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const files = fs.readdirSync(photoDir)
    .filter(f => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
    .map(f => path.join(photoDir, f));

  if (files.length === 0) {
    console.error(`[bulk_enroll] No image files found in: ${photoDir}`);
    process.exit(1);
  }

  console.log(`[bulk_enroll] Found ${files.length} photos in ${photoDir}`);
  if (dryRun) {
    console.log('[bulk_enroll] --dry-run mode — listing files only:');
    files.forEach(f => console.log('  ', path.basename(f), '→ employeeId:', parseEmployeeId(f)));
    process.exit(0);
  }

  const results = [];
  let done = 0;

  // Process in batches of `concurrency`
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(enrollFile));
    results.push(...batchResults);
    done += batch.length;
    process.stdout.write(`\r[bulk_enroll] Progress: ${done}/${files.length}`);
  }
  console.log(''); // newline after progress

  // Summary
  const ok      = results.filter(r => r.status === 'ok');
  const failed  = results.filter(r => r.status !== 'ok');
  console.log(`\n[bulk_enroll] Done — ✅ ${ok.length} enrolled, ❌ ${failed.length} failed`);
  if (failed.length) {
    console.log('[bulk_enroll] Failures:');
    failed.forEach(r => console.log(`  ${r.file}: ${r.error}`));
  }

  // Write CSV
  const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const csv = [
    'file,employeeId,status,confidence,aligned,error',
    ...results.map(r =>
      [r.file, r.employeeId, r.status, r.confidence ?? '', r.aligned ?? '', r.error ?? ''].join(',')
    ),
  ].join('\n');
  const outFile = `bulk_enroll_results_${ts}.csv`;
  fs.writeFileSync(outFile, csv);
  console.log(`[bulk_enroll] Results written to ${outFile}`);

  process.exit(failed.length > 0 ? 1 : 0);
}

async function enrollFile(filePath) {
  const filename   = path.basename(filePath);
  const employeeId = parseEmployeeId(filePath);

  if (!employeeId) {
    return { file: filename, employeeId: null, status: 'skip', error: 'Could not parse employee ID from filename' };
  }

  try {
    const form = new FormData();
    form.set('photo', await fileFromPath(filePath));

    const res = await fetch(`${apiUrl}/employees/${employeeId}/enroll-face`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body:    form,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        file: filename, employeeId,
        status: 'error',
        error:  json.message || `HTTP ${res.status}`,
      };
    }

    return {
      file:       filename,
      employeeId,
      status:     'ok',
      confidence: json.confidence,
      aligned:    json.aligned,
    };
  } catch (e) {
    return { file: filename, employeeId, status: 'error', error: e.message };
  }
}

function parseEmployeeId(filePath) {
  const stem = path.basename(filePath, path.extname(filePath));
  // Strategy 1: pure numeric or UUID stem → use directly
  if (/^\d+$/.test(stem) || /^[0-9a-f-]{36}$/i.test(stem)) return stem;
  // Strategy 2: {id}_{anything} → id is the part before first underscore
  const underscorePart = stem.split('_')[0];
  if (/^\d+$/.test(underscorePart)) return underscorePart;
  // Strategy 3: use full stem as-is (employee code)
  return stem || null;
}

main().catch(err => {
  console.error('[bulk_enroll] Fatal:', err.message);
  process.exit(1);
});
