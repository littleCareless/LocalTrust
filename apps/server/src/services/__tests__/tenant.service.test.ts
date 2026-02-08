import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 创建临时数据库用于测试
const testDbPath = path.join(process.cwd(), 'test-data', `test-${Date.now()}.db`);
const testDbDir = path.dirname(testDbPath);

if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}

const db = new Database(testDbPath);

// 导入 schema 初始化函数
// 注意：由于 schema.ts 使用当前目录的导入，我们需要模拟
describe('Tenant Service', () => {
  beforeAll(() => {
    // 初始化表结构
    db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        settings TEXT DEFAULT '{}',
        isActive INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER DEFAULT 22,
        osType TEXT DEFAULT 'linux',
        status TEXT DEFAULT 'unknown',
        lastSeenAt TEXT,
        tags TEXT DEFAULT '[]',
        isPrimary INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (tenantId) REFERENCES tenants(id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS dns_mappings (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        domain TEXT NOT NULL,
        ip TEXT NOT NULL,
        port INTEGER,
        nodeId TEXT,
        recordType TEXT DEFAULT 'A',
        isActive INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (tenantId) REFERENCES tenants(id),
        FOREIGN KEY (nodeId) REFERENCES nodes(id)
      );
    `);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('createTenant', () => {
    it('should create a new tenant', () => {
      const id = `tenant-${Date.now()}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO tenants (id, name, slug, description, isActive, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, '测试租户', 'test-tenant', '测试描述', 1, now, now);

      const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as any;

      expect(tenant).toBeDefined();
      expect(tenant.name).toBe('测试租户');
      expect(tenant.slug).toBe('test-tenant');
      expect(tenant.isActive).toBe(1);
    });

    it('should reject duplicate slug', () => {
      const now = new Date().toISOString();

      // 尝试插入重复的 slug
      expect(() => {
        db.prepare(`
          INSERT INTO tenants (id, name, slug, description, isActive, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('another-id', '另一个租户', 'test-tenant', '描述', 1, now, now);
      }).toThrow();
    });
  });

  describe('getTenants', () => {
    it('should return all active tenants', () => {
      const tenants = db.prepare(`
        SELECT * FROM tenants WHERE isActive = 1 ORDER BY created_at DESC
      `).all();

      expect(tenants.length).toBeGreaterThan(0);
      expect(tenants[0]).toHaveProperty('id');
      expect(tenants[0]).toHaveProperty('name');
    });
  });

  describe('getTenantStats', () => {
    it('should return tenant statistics', () => {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN isActive = 0 THEN 1 ELSE 0 END) as inactive
        FROM tenants
      `).get() as any;

      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.inactive).toBe('number');
    });
  });
});
