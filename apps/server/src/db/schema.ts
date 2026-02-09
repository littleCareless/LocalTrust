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

  // ==================== ACME 账户表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS acme_accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      server_url TEXT NOT NULL DEFAULT 'https://acme-v02.api.letsencrypt.org/directory',
      private_key TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      terms_of_service_accepted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_acme_accounts_email ON acme_accounts(email);
  `);

  // ==================== ACME 证书表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS acme_certificates (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      account_id TEXT NOT NULL,
      cert TEXT NOT NULL,
      private_key TEXT NOT NULL,
      issuer_id TEXT,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      renewal_count INTEGER DEFAULT 0,
      auto_renewal_enabled INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES acme_accounts(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_acme_certificates_domain ON acme_certificates(domain);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_acme_certificates_status ON acme_certificates(status);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_acme_certificates_valid_to ON acme_certificates(valid_to);
  `);

  // ==================== ACME 续期记录表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS acme_renewal_logs (
      id TEXT PRIMARY KEY,
      certificate_id TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (certificate_id) REFERENCES acme_certificates(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_acme_renewal_logs_cert ON acme_renewal_logs(certificate_id);
  `);

  // ==================== ACME 挑战记录表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS acme_challenges (
      id TEXT PRIMARY KEY,
      certificate_id TEXT NOT NULL,
      challenge_type TEXT NOT NULL,
      token TEXT NOT NULL,
      key_authorization TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      validated_at TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (certificate_id) REFERENCES acme_certificates(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_acme_challenges_cert ON acme_challenges(certificate_id);
  `);

  // ==================== 证书自动续期设置表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS certificate_renewal_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      renewal_enabled INTEGER DEFAULT 1,
      reminder_days_before INTEGER DEFAULT 30,
      auto_renewal_days_before INTEGER DEFAULT 7,
      max_renewal_attempts INTEGER DEFAULT 3,
      notify_email TEXT,
      webhook_url TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // 初始化默认续期设置
  const checkRenewalSettings = db.prepare('SELECT COUNT(*) as count FROM certificate_renewal_settings');
  const renewalSettingsExist = checkRenewalSettings.get() as { count: number };

  if (renewalSettingsExist.count === 0) {
    const insertRenewalSettings = db.prepare(`
      INSERT INTO certificate_renewal_settings (renewal_enabled, reminder_days_before, auto_renewal_days_before, max_renewal_attempts, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertRenewalSettings.run(1, 30, 7, 3, new Date().toISOString());
  }

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

  // ==================== LDAP 配置表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS ldap_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 389,
      protocol TEXT NOT NULL DEFAULT 'ldap',
      base_dn TEXT NOT NULL,
      user_dn_template TEXT,
      group_dn_template TEXT,
      bind_dn TEXT,
      bind_password TEXT,
      use_ssl INTEGER DEFAULT 0,
      start_tls INTEGER DEFAULT 0,
      auth_method TEXT DEFAULT 'simple',
      user_search_base TEXT NOT NULL,
      user_search_filter TEXT DEFAULT '(objectClass=user)',
      group_search_base TEXT,
      group_search_filter TEXT DEFAULT '(objectClass=group)',
      sync_enabled INTEGER DEFAULT 0,
      sync_interval INTEGER DEFAULT 60,
      sync_users_only INTEGER DEFAULT 1,
      default_tenant_id TEXT DEFAULT 'default',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (default_tenant_id) REFERENCES tenants(id) ON DELETE SET DEFAULT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ldap_configs_active ON ldap_configs(is_active);
  `);

  // ==================== LDAP 用户表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS ldap_users (
      id TEXT PRIMARY KEY,
      config_id TEXT NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT,
      email TEXT,
      dn TEXT NOT NULL,
      member_of TEXT DEFAULT '[]',
      tenant_id TEXT,
      status TEXT DEFAULT 'active',
      last_sync_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (config_id) REFERENCES ldap_configs(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
      UNIQUE(config_id, username)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ldap_users_config ON ldap_users(config_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ldap_users_status ON ldap_users(status);
  `);

  // ==================== LDAP 同步日志表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS ldap_sync_logs (
      id TEXT PRIMARY KEY,
      config_id TEXT NOT NULL,
      users_added INTEGER DEFAULT 0,
      users_updated INTEGER DEFAULT 0,
      users_removed INTEGER DEFAULT 0,
      groups_found INTEGER DEFAULT 0,
      errors TEXT DEFAULT '[]',
      status TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (config_id) REFERENCES ldap_configs(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ldap_sync_logs_config ON ldap_sync_logs(config_id);
  `);

  // ==================== 集群配置表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS clusters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      total_nodes INTEGER DEFAULT 1,
      primary_node TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS cluster_nodes (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      api_port INTEGER DEFAULT 3001,
      role TEXT DEFAULT 'replica',
      heartbeat_interval INTEGER DEFAULT 5,
      heartbeat_timeout INTEGER DEFAULT 30,
      is_primary INTEGER DEFAULT 0,
      status TEXT DEFAULT 'offline',
      last_heartbeat_at TEXT,
      last_sync_at TEXT,
      sync_status TEXT DEFAULT 'unknown',
      sync_latency REAL,
      replication_lag REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cluster_nodes_cluster ON cluster_nodes(cluster_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cluster_nodes_status ON cluster_nodes(status);
  `);

  // ==================== 集群同步日志表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS cluster_sync_logs (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL,
      source_node TEXT NOT NULL,
      target_node TEXT NOT NULL,
      sync_type TEXT NOT NULL,
      items_synced INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cluster_sync_logs_cluster ON cluster_sync_logs(cluster_id);
  `);

  // ==================== CT 日志配置表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS ct_logs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      operator TEXT NOT NULL,
      country TEXT,
      tree_length INTEGER DEFAULT 0,
      latest_sct_timestamp TEXT,
      added_at TEXT NOT NULL,
      removed_at TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ct_logs_status ON ct_logs(status);
  `);

  // ==================== CT 证书条目表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS ct_entries (
      id TEXT PRIMARY KEY,
      certificate_id TEXT NOT NULL,
      log_id TEXT NOT NULL,
      log_name TEXT NOT NULL,
      entry_type TEXT DEFAULT 'X509',
      sct_version INTEGER DEFAULT 1,
      sct_timestamp TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      domain TEXT NOT NULL,
      issuer TEXT,
      not_before TEXT,
      not_after TEXT,
      added_to_log_at TEXT,
      inclusion_proof TEXT,
      merkle_leaf_hash TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (certificate_id) REFERENCES acme_certificates(id) ON DELETE CASCADE,
      FOREIGN KEY (log_id) REFERENCES ct_logs(id) ON DELETE CASCADE,
      UNIQUE(certificate_id, log_id)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ct_entries_cert ON ct_entries(certificate_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ct_entries_log ON ct_entries(log_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ct_entries_status ON ct_entries(status);
  `);

  // ==================== Kubernetes 集群表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS k8s_clusters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kubeconfig TEXT NOT NULL,
      context TEXT,
      namespace TEXT DEFAULT 'default',
      auth_type TEXT DEFAULT 'kubeconfig',
      token TEXT,
      certificate_data TEXT,
      server_url TEXT,
      insecure_skip_tls_verify INTEGER DEFAULT 0,
      status TEXT DEFAULT 'disconnected',
      last_connected_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_k8s_clusters_status ON k8s_clusters(status);
  `);

  // ==================== Kubernetes 同步记录表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS k8s_sync_logs (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL,
      secrets_created INTEGER DEFAULT 0,
      secrets_updated INTEGER DEFAULT 0,
      secrets_deleted INTEGER DEFAULT 0,
      configmaps_created INTEGER DEFAULT 0,
      configmaps_updated INTEGER DEFAULT 0,
      ingresses_created INTEGER DEFAULT 0,
      ingresses_updated INTEGER DEFAULT 0,
      errors TEXT DEFAULT '[]',
      status TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (cluster_id) REFERENCES k8s_clusters(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_k8s_sync_logs_cluster ON k8s_sync_logs(cluster_id);
  `);

  console.log('✅ 数据库表结构初始化完成（含 LDAP、集群、CT 日志、K8s 集成）');
}
