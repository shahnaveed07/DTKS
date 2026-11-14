import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Cloudflare D1 + R2 Local/Node Runtime Adapter
 * Provides the exact Cloudflare D1 (`env.DB.prepare(sql).bind(...).all() / .first() / .run() / .batch()`)
 * and Cloudflare R2 (`env.ASSETS_BUCKET.put() / .get() / .delete()`) APIs backed by Node's built-in
 * `node:sqlite` and local filesystem storage.
 */

class D1PreparedStatement {
  constructor(db, sql, boundValues = []) {
    this.db = db;
    this.sql = sql;
    this.boundValues = boundValues;
  }

  bind(...values) {
    const normalized = values.map((v) => {
      if (v === undefined) return null;
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v;
    });
    return new D1PreparedStatement(this.db, this.sql, normalized);
  }

  async all() {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.all(...this.boundValues);
    return {
      success: true,
      results: rows,
      meta: {},
    };
  }

  async first(colName) {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...this.boundValues) || null;
    if (!row) return null;
    if (colName) return row[colName];
    return row;
  }

  async run() {
    const stmt = this.db.prepare(this.sql);
    const info = stmt.run(...this.boundValues);
    return {
      success: true,
      meta: {
        changes: Number(info.changes || 0),
        last_row_id: Number(info.lastInsertRowid || 0),
      },
    };
  }
}

export class LocalD1Database {
  constructor(dbPath = ':memory:', migrationFiles = []) {
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    this.sqlite = new DatabaseSync(dbPath);
    this.sqlite.exec('PRAGMA foreign_keys = ON;');
    this.sqlite.exec('PRAGMA journal_mode = WAL;');

    for (const file of migrationFiles) {
      if (fs.existsSync(file)) {
        const sql = fs.readFileSync(file, 'utf8');
        this.sqlite.exec(sql);
      }
    }
  }

  prepare(sql) {
    return new D1PreparedStatement(this.sqlite, sql);
  }

  async exec(sql) {
    this.sqlite.exec(sql);
    return { count: 1 };
  }

  async batch(statements = []) {
    const results = [];
    this.sqlite.exec('BEGIN TRANSACTION;');
    try {
      for (const stmt of statements) {
        const isSelect = /^\s*SELECT/i.test(stmt.sql);
        if (isSelect) {
          results.push(await stmt.all());
        } else {
          results.push(await stmt.run());
        }
      }
      this.sqlite.exec('COMMIT;');
      return results;
    } catch (err) {
      this.sqlite.exec('ROLLBACK;');
      throw err;
    }
  }

  close() {
    this.sqlite.close();
  }
}

export class LocalR2Bucket {
  constructor(storageDir) {
    this.storageDir = storageDir;
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  _resolvePaths(key) {
    const safeKey = String(key).replace(/^\/+/, '').replace(/\.\./g, '');
    const dataPath = path.join(this.storageDir, safeKey);
    const metaPath = `${dataPath}.meta.json`;
    return { dataPath, metaPath };
  }

  async put(key, value, options = {}) {
    const { dataPath, metaPath } = this._resolvePaths(key);
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });

    let bytes;
    if (value instanceof Uint8Array) {
      bytes = value;
    } else if (value instanceof ArrayBuffer) {
      bytes = new Uint8Array(value);
    } else if (typeof value === 'string') {
      bytes = new TextEncoder().encode(value);
    } else {
      bytes = new Uint8Array(0);
    }

    fs.writeFileSync(dataPath, bytes);
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        key,
        size: bytes.byteLength,
        httpMetadata: options.httpMetadata || { contentType: 'application/octet-stream' },
        uploaded: new Date().toISOString(),
      }),
      'utf8'
    );

    return { key, size: bytes.byteLength };
  }

  async get(key) {
    const { dataPath, metaPath } = this._resolvePaths(key);
    if (!fs.existsSync(dataPath)) return null;

    const bytes = fs.readFileSync(dataPath);
    let meta = { httpMetadata: { contentType: 'image/jpeg' } };
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {
        // ignore malformed meta
      }
    }

    return {
      key,
      size: bytes.byteLength,
      httpMetadata: meta.httpMetadata || { contentType: 'image/jpeg' },
      body: bytes,
      async arrayBuffer() {
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      },
    };
  }

  async delete(key) {
    const { dataPath, metaPath } = this._resolvePaths(key);
    if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  }
}

export function createNodeWorkerEnv({
  dbPath = path.resolve(process.cwd(), 'data/dtks.sqlite'),
  r2Dir = path.resolve(process.cwd(), 'data/r2-storage'),
  migrationsDir = path.resolve(process.cwd(), 'backend/migrations'),
  overrides = {},
} = {}) {
  const migrationFiles = [
    path.join(migrationsDir, '0001_initial_schema.sql'),
    path.join(migrationsDir, '0002_seed_data.sql'),
  ];

  const db = new LocalD1Database(dbPath, migrationFiles);
  const bucket = new LocalR2Bucket(r2Dir);

  return {
    DB: db,
    ASSETS_BUCKET: bucket,
    ENVIRONMENT: process.env.ENVIRONMENT || process.env.NODE_ENV || 'development',
    JWT_SECRET:
      process.env.JWT_SECRET ||
      'dtks-local-dev-only-ephemeral-hmac-secret-key-2026',
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '900',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '604800',
    INITIAL_ADMIN_NAME:
      process.env.INITIAL_ADMIN_NAME ||
      process.env.ADMIN_INITIAL_NAME ||
      'DTKS Principal Administrator',
    INITIAL_ADMIN_EMAIL:
      process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_INITIAL_EMAIL || '',
    INITIAL_ADMIN_PASSWORD:
      process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD || '',
    CORS_ALLOWED_ORIGINS:
      process.env.CORS_ALLOWED_ORIGINS ||
      'https://dreamtechkashmirsolutions.studio,https://www.dreamtechkashmirsolutions.studio,http://localhost:3000,http://localhost:5173',
    RESEND_API_KEY:
      process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY || '',
    EMAIL_FROM_ADDRESS:
      process.env.EMAIL_FROM_ADDRESS || 'notifications@dreamtechkashmirsolutions.studio',
    ADMIN_NOTIFICATION_EMAIL:
      process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@dreamtechkashmirsolutions.studio',
    ...overrides,
  };
}
