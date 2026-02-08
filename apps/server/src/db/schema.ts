import type Database from 'better-sqlite3';

/**
 * 初始化数据库表结构
 */
export function initSchema(db: Database.Database): void {
  // ==================== 租户/命名空间表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      settings TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
  `);

  // ==================== 节点表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      os_type TEXT DEFAULT 'linux',
      status TEXT DEFAULT 'offline',
      last_seen_at TEXT,
      tags TEXT DEFAULT '[]',
      is_primary INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_nodes_tenant ON nodes(tenant_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
  `);

  // ==================== SSH 配置表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS node_ssh_configs (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL UNIQUE,
      auth_type TEXT NOT NULL DEFAULT 'password',
      username TEXT NOT NULL,
      password TEXT,
      private_key TEXT,
      passphrase TEXT,
      sudo_required INTEGER DEFAULT 0,
      sudo_password TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    );
  `);

  // ==================== 域名映射表（添加租户关联） ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS dns_mappings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER,
      node_id TEXT,
      record_type TEXT DEFAULT 'A',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_dns_mappings_domain_tenant
    ON dns_mappings(domain, tenant_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_dns_mappings_tenant ON dns_mappings(tenant_id);
  `);

  // ==================== 系统设置表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ==================== CA 证书信息表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS ca_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      common_name TEXT NOT NULL,
      organization TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      cert_path TEXT NOT NULL,
      key_path TEXT NOT NULL,
      tenant_id TEXT DEFAULT 'default',
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET DEFAULT
    );
  `);

  // ==================== 同步任务表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_tasks (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sync_tasks_status ON sync_tasks(status);
  `);

  // ==================== 初始化默认租户 ====================
  const checkTenant = db.prepare('SELECT COUNT(*) as count FROM tenants');
  const tenantExists = checkTenant.get() as { count: number };

  if (tenantExists.count === 0) {
    const now = new Date().toISOString();
    const insertTenant = db.prepare(`
      INSERT INTO tenants (id, name, slug, description, settings, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTenant.run(
      'default',
      '默认租户',
      'default',
      '系统默认租户',
      JSON.stringify({}),
      1,
      now,
      now
    );
  }

  // ==================== 初始化默认系统设置 ====================
  const defaultSettings = {
    mode: 'dns_server',
    dns_server: {
      type: 'dnsmasq',
      config_path: '/etc/dnsmasq.conf',
      restart_command: 'sudo systemctl restart dnsmasq'
    },
    router: {
      model: 'openwrt',
      ip: '192.168.1.1',
      ssh_username: 'root',
      ssh_password: ''
    }
  };

  const checkSettings = db.prepare('SELECT COUNT(*) as count FROM system_settings WHERE key = ?');
  const settingsExist = checkSettings.get('config') as { count: number };

  if (settingsExist.count === 0) {
    const insertSettings = db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    insertSettings.run('config', JSON.stringify(defaultSettings), new Date().toISOString());
  }

  console.log('✅ 数据库表结构初始化完成（多租户版本）');
}
