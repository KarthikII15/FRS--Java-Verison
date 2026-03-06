import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import EventEmitter from 'events';
import { env } from '../../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * FaceDB - persistent face embedding + visitor store.
 *
 * Tables:
 * - faces (id, metadata, created_at)
 * - embeddings (id, face_id, embedding BLOB)
 * - visitors (id, face_id, visit_count, last_seen)
 */
class FaceDB extends EventEmitter {
  constructor() {
    super();
    this.db = null;
    this.threshold = Number(process.env.FACE_MATCH_THRESHOLD ?? 0.6);
  }

  /**
   * Initialize database connection and schema.
   */
  async initialize() {
    if (this.db) return;

    const dbPath =
      process.env.FACE_DB_PATH ||
      path.join(env.analytics.configPath, 'face_db.sqlite');

    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS faces (
        id TEXT PRIMARY KEY,
        metadata TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        face_id TEXT NOT NULL,
        embedding BLOB NOT NULL,
        FOREIGN KEY(face_id) REFERENCES faces(id) ON DELETE CASCADE
      );
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS visitors (
        id TEXT PRIMARY KEY,
        face_id TEXT,
        visit_count INTEGER NOT NULL DEFAULT 0,
        last_seen TEXT NOT NULL
      );
    `);

    // eslint-disable-next-line no-console
    console.log('[FaceDB] Initialized at', dbPath);
  }

  /**
   * Add a single face.
   *
   * @param {number[]} embedding
   * @param {Object} metadata
   * @returns {Promise<string>} faceId
   */
  async addFace(embedding, metadata = {}) {
    if (!this.db) await this.initialize();
    const faceId = metadata.id || `face_${Date.now()}`;
    const metaJson = JSON.stringify(metadata);
    const buf = Buffer.from(JSON.stringify(embedding || []));

    await this.db.exec('BEGIN');
    try {
      await this.db.run(
        'INSERT OR REPLACE INTO faces (id, metadata, created_at) VALUES (?, ?, ?)',
        faceId,
        metaJson,
        new Date().toISOString(),
      );
      await this.db.run(
        'INSERT OR REPLACE INTO embeddings (id, face_id, embedding) VALUES (?, ?, ?)',
        faceId,
        faceId,
        buf,
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await this.db.exec('ROLLBACK');
      // eslint-disable-next-line no-console
      console.error('[FaceDB] addFace error:', err);
      throw err;
    }

    return faceId;
  }

  /**
   * Batch upsert of faces.
   *
   * @param {Array<{id?:string,embedding:number[],metadata?:Object}>} faces
   */
  async batchUpsert(faces) {
    if (!this.db) await this.initialize();
    if (!Array.isArray(faces) || faces.length === 0) return;

    await this.db.exec('BEGIN');
    try {
      for (const f of faces) {
        // eslint-disable-next-line no-await-in-loop
        await this.addFace(f.embedding, { ...(f.metadata || {}), id: f.id });
      }
      await this.db.exec('COMMIT');
    } catch (err) {
      await this.db.exec('ROLLBACK');
      // eslint-disable-next-line no-console
      console.error('[FaceDB] batchUpsert error:', err);
      throw err;
    }
  }

  /**
   * Find best match for embedding.
   *
   * @param {number[]} embedding
   * @param {number} [threshold]
   */
  async findMatch(embedding, threshold = this.threshold) {
    if (!this.db) await this.initialize();
    if (!Array.isArray(embedding) || embedding.length === 0) return null;

    const rows = await this.db.all(`
      SELECT f.id as faceId, f.metadata, e.embedding
      FROM faces f
      JOIN embeddings e ON e.face_id = f.id
    `);

    let best = null;
    let bestSim = 0;
    for (const row of rows) {
      const storedVec = JSON.parse(Buffer.from(row.embedding).toString('utf8'));
      const sim = this.cosineSimilarity(embedding, storedVec);
      if (sim > bestSim) {
        bestSim = sim;
        best = {
          faceId: row.faceId,
          similarity: sim,
          metadata: JSON.parse(row.metadata || '{}'),
        };
      }
    }

    if (!best || bestSim < threshold) return null;
    return best;
  }

  /**
   * Delete face and related records.
   * @param {string} faceId
   */
  async deleteFace(faceId) {
    if (!this.db) await this.initialize();
    await this.db.run('DELETE FROM faces WHERE id = ?', faceId);
  }

  /**
   * Get simple stats.
   */
  async getStats() {
    if (!this.db) await this.initialize();
    const faceRow = await this.db.get('SELECT COUNT(1) as c FROM faces');
    const visitorRow = await this.db.get('SELECT COUNT(1) as c FROM visitors');
    return {
      faceCount: faceRow?.c || 0,
      visitorCount: visitorRow?.c || 0,
    };
  }

  /**
   * Simple cosine similarity.
   *
   * @private
   */
  // eslint-disable-next-line class-methods-use-this
  cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

const faceDB = new FaceDB();
export default faceDB;

