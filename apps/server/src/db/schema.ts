import type Database from 'better-sqlite3';

/**
 * 初始化数据库表结构
 */
export function initSchema(db: Database.Database): void {
  // 创建域名映射表
  db.exec(`
    CREATE TABLE IF NOT EXISTS dns_mappings (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      ip TEXT NOT NULL,
      port INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 创建域名索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_dns_mappings_domain
    ON dns_mappings(domain);
  `);

  // 创建系统设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 创建 CA 证书信息表
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
      created_at TEXT NOT NULL
    );
  `);

  // 初始化默认系统设置
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

  console.log('✅ 数据库表结构初始化完成');
}
