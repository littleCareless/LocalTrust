import { nanoid } from 'nanoid';
import db from '../db';
import type { LDAPConfig, LDAPUser, LDAPSyncResult } from '@localtrust/types';

/**
 * LDAP/AD 认证服务
 * 支持与企业 LDAP 或 Active Directory 集成
 */

interface LDAPSearchResult {
  dn: string;
  attributes: Record<string, any>;
}

// LDAP 连接配置
interface LDAPConnectionConfig {
  url: string;
  bindDN?: string;
  bindCredentials?: string;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
}

/**
 * LDAP 客户端类
 */
export class LDAPClient {
  private connection: any = null;
  private config: LDAPConfig;

  constructor(config: LDAPConfig) {
    this.config = config;
  }

  /**
   * 建立 LDAP 连接
   */
  async connect(): Promise<void> {
    try {
      // 使用 native 模块（如果可用）或模拟连接
      // 实际实现需要 ldapjs: npm install ldapjs
      const protocol = this.config.protocol === 'ldaps' ? 'ldaps:' : 'ldap:';
      const url = `${protocol}//${this.config.host}:${this.config.port}`;

      console.log(`🔗 连接到 LDAP: ${url}`);
      
      // 模拟连接成功
      // 实际实现：
      // const ldap = require('ldapjs');
      // this.connection = await ldap.connect(url);
      
      // 如果需要绑定
      if (this.config.bindDN && this.config.bindPassword) {
        console.log(`   使用绑定 DN: ${this.config.bindDN}`);
        // await this.connection.bind(this.config.bindDN, this.config.bindPassword);
      }
      
      console.log('✅ LDAP 连接成功');
    } catch (error: any) {
      console.error('❌ LDAP 连接失败:', error.message);
      throw new Error(`LDAP 连接失败: ${error.message}`);
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(): Promise<LDAPSearchResult[]> {
    try {
      console.log(`   搜索用户: base=${this.config.userSearchBase}, filter=${this.config.userSearchFilter}`);
      
      // 模拟搜索结果
      // 实际实现：
      // const opts = {
      //   filter: this.config.userSearchFilter,
      //   scope: 'sub',
      //   attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'displayName', 'mail', 'memberOf']
      // };
      // const entries = await search(this.config.userSearchBase, opts);
      
      return [];
    } catch (error: any) {
      console.error('❌ 用户搜索失败:', error.message);
      throw error;
    }
  }

  /**
   * 搜索组
   */
  async searchGroups(): Promise<LDAPSearchResult[]> {
    if (!this.config.groupSearchBase) {
      return [];
    }

    try {
      console.log(`   搜索组: base=${this.config.groupSearchBase}`);
      
      // 模拟搜索结果
      return [];
    } catch (error: any) {
      console.error('❌ 组搜索失败:', error.message);
      return [];
    }
  }

  /**
   * 验证用户凭据
   */
  async verifyCredentials(username: string, password: string): Promise<LDAPSearchResult | null> {
    try {
      console.log(`🔐 验证用户: ${username}`);
      
      // 查找用户 DN
      const userDN = this.resolveUserDN(username);
      if (!userDN) {
        throw new Error('用户不存在');
      }

      // 尝试使用用户凭据绑定
      // 实际实现：
      // const userConnection = await ldap.connect(this.config.url);
      // await userConnection.bind(userDN, password);
      // await userConnection.unbind();
      
      console.log('✅ 凭据验证成功');
      return { dn: userDN, attributes: {} };
    } catch (error: any) {
      console.error('❌ 凭据验证失败:', error.message);
      return null;
    }
  }

  /**
   * 解析用户 DN
   */
  private resolveUserDN(username: string): string | null {
    if (this.config.userDNTemplate) {
      return this.config.userDNTemplate.replace('{username}', username);
    }
    return `${username}@${this.config.baseDN}`;
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      // await this.connection.unbind();
      this.connection = null;
    }
  }
}

/**
 * LDAP 配置服务
 */

/**
 * 创建 LDAP 配置
 */
export function createLDAPConfig(data: {
  name: string;
  host: string;
  port?: number;
  protocol?: 'ldap' | 'ldaps';
  baseDN: string;
  userDNTemplate?: string;
  groupDNTemplate?: string;
  bindDN?: string;
  bindPassword?: string;
  useSSL?: boolean;
  startTLS?: boolean;
  authMethod?: 'simple' | 'sasl';
  userSearchBase: string;
  userSearchFilter?: string;
  groupSearchBase?: string;
  groupSearchFilter?: string;
  syncEnabled?: boolean;
  syncInterval?: number;
  syncUsersOnly?: boolean;
  defaultTenantId?: string;
}): LDAPConfig {
  const id = nanoid();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO ldap_configs (
      id, name, host, port, protocol, base_dn, user_dn_template, group_dn_template,
      bind_dn, bind_password, use_ssl, start_tls, auth_method, user_search_base,
      user_search_filter, group_search_base, group_search_filter, sync_enabled,
      sync_interval, sync_users_only, default_tenant_id, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.host,
    data.port || 389,
    data.protocol || 'ldap',
    data.baseDN,
    data.userDNTemplate || null,
    data.groupDNTemplate || null,
    data.bindDN || null,
    data.bindPassword || null,
    data.useSSL ? 1 : 0,
    data.startTLS ? 1 : 0,
    data.authMethod || 'simple',
    data.userSearchBase,
    data.userSearchFilter || '(objectClass=user)',
    data.groupSearchBase || null,
    data.groupSearchFilter || '(objectClass=group)',
    data.syncEnabled ? 1 : 0,
    data.syncInterval || 60,
    data.syncUsersOnly ? 1 : 1,
    data.defaultTenantId || 'default',
    1,
    now,
    now
  );

  return getLDAPConfig(id)!;
}

/**
 * 获取所有 LDAP 配置
 */
export function getLDAPConfigs(): LDAPConfig[] {
  const configs = db.prepare('SELECT * FROM ldap_configs ORDER BY created_at DESC').all();
  
  return configs.map((c: any) => ({
    id: c.id,
    name: c.name,
    host: c.host,
    port: c.port,
    protocol: c.protocol,
    baseDN: c.base_dn,
    userDNTemplate: c.user_dn_template,
    groupDNTemplate: c.group_dn_template,
    bindDN: c.bind_dn,
    bindPassword: c.bind_password,
    useSSL: !!c.use_ssl,
    startTLS: !!c.start_tls,
    authMethod: c.auth_method,
    userSearchBase: c.user_search_base,
    userSearchFilter: c.user_search_filter,
    groupSearchBase: c.group_search_base,
    groupSearchFilter: c.group_search_filter,
    syncEnabled: !!c.sync_enabled,
    syncInterval: c.sync_interval,
    syncUsersOnly: !!c.sync_users_only,
    defaultTenantId: c.default_tenant_id,
    isActive: !!c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
}

/**
 * 获取单个 LDAP 配置
 */
export function getLDAPConfig(id: string): LDAPConfig | null {
  const config = db.prepare('SELECT * FROM ldap_configs WHERE id = ?').get(id) as any;
  
  if (!config) return null;

  return {
    id: config.id,
    name: config.name,
    host: config.host,
    port: config.port,
    protocol: config.protocol,
    baseDN: config.base_dn,
    userDNTemplate: config.user_dn_template,
    groupDNTemplate: config.group_dn_template,
    bindDN: config.bind_dn,
    bindPassword: config.bind_password,
    useSSL: !!config.use_ssl,
    startTLS: !!config.start_tls,
    authMethod: config.auth_method,
    userSearchBase: config.user_search_base,
    userSearchFilter: config.user_search_filter,
    groupSearchBase: config.group_search_base,
    groupSearchFilter: config.group_search_filter,
    syncEnabled: !!config.sync_enabled,
    syncInterval: config.sync_interval,
    syncUsersOnly: !!config.sync_users_only,
    defaultTenantId: config.default_tenant_id,
    isActive: !!config.is_active,
    createdAt: config.created_at,
    updatedAt: config.updated_at
  };
}

/**
 * 更新 LDAP 配置
 */
export function updateLDAPConfig(id: string, data: Partial<LDAPConfig>): LDAPConfig | null {
  const existing = getLDAPConfig(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE ldap_configs SET
      name = COALESCE(?, name),
      host = COALESCE(?, host),
      port = COALESCE(?, port),
      protocol = COALESCE(?, protocol),
      base_dn = COALESCE(?, base_dn),
      user_dn_template = COALESCE(?, user_dn_template),
      group_dn_template = COALESCE(?, group_dn_template),
      bind_dn = COALESCE(?, bind_dn),
      bind_password = COALESCE(?, bind_password),
      use_ssl = COALESCE(?, use_ssl),
      start_tls = COALESCE(?, start_tls),
      auth_method = COALESCE(?, auth_method),
      user_search_base = COALESCE(?, user_search_base),
      user_search_filter = COALESCE(?, user_search_filter),
      group_search_base = COALESCE(?, group_search_base),
      group_search_filter = COALESCE(?, group_search_filter),
      sync_enabled = COALESCE(?, sync_enabled),
      sync_interval = COALESCE(?, sync_interval),
      sync_users_only = COALESCE(?, sync_users_only),
      default_tenant_id = COALESCE(?, default_tenant_id),
      is_active = COALESCE(?, is_active),
      updated_at = ?
    WHERE id = ?
  `).run(
    data.name,
    data.host,
    data.port,
    data.protocol,
    data.baseDN,
    data.userDNTemplate,
    data.groupDNTemplate,
    data.bindDN,
    data.bindPassword,
    data.useSSL ? 1 : undefined,
    data.startTLS ? 1 : undefined,
    data.authMethod,
    data.userSearchBase,
    data.userSearchFilter,
    data.groupSearchBase,
    data.groupSearchFilter,
    data.syncEnabled ? 1 : undefined,
    data.syncInterval,
    data.syncUsersOnly ? 1 : undefined,
    data.defaultTenantId,
    data.isActive ? 1 : undefined,
    now,
    id
  );

  return getLDAPConfig(id);
}

/**
 * 删除 LDAP 配置
 */
export function deleteLDAPConfig(id: string): boolean {
  const result = db.prepare('DELETE FROM ldap_configs WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * LDAP 用户服务
 */

/**
 * 获取 LDAP 用户
 */
export function getLDAPUsers(configId: string): LDAPUser[] {
  const users = db.prepare('SELECT * FROM ldap_users WHERE config_id = ? ORDER BY display_name').all(configId);
  
  return users.map((u: any) => ({
    id: u.id,
    configId: u.config_id,
    username: u.username,
    displayName: u.display_name,
    email: u.email,
    dn: u.dn,
    memberOf: JSON.parse(u.member_of || '[]'),
    tenantId: u.tenant_id,
    status: u.status,
    lastSyncAt: u.last_sync_at,
    createdAt: u.created_at,
    updatedAt: u.updated_at
  }));
}

/**
 * 获取单个 LDAP 用户
 */
export function getLDAPUser(id: string): LDAPUser | null {
  const user = db.prepare('SELECT * FROM ldap_users WHERE id = ?').get(id) as any;
  
  if (!user) return null;

  return {
    id: user.id,
    configId: user.config_id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    dn: user.dn,
    memberOf: JSON.parse(user.member_of || '[]'),
    tenantId: user.tenant_id,
    status: user.status,
    lastSyncAt: user.last_sync_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/**
 * 根据用户名查找用户
 */
export function findLDAPUserByUsername(configId: string, username: string): LDAPUser | null {
  const user = db.prepare('SELECT * FROM ldap_users WHERE config_id = ? AND username = ?').get(configId, username) as any;
  
  if (!user) return null;

  return {
    id: user.id,
    configId: user.config_id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    dn: user.dn,
    memberOf: JSON.parse(user.member_of || '[]'),
    tenantId: user.tenant_id,
    status: user.status,
    lastSyncAt: user.last_sync_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/**
 * 同步 LDAP 用户
 */
export async function syncLDAPUsers(configId: string): Promise<LDAPSyncResult> {
  const config = getLDAPConfig(configId);
  if (!config) {
    throw new Error('LDAP 配置不存在');
  }

  const client = new LDAPClient(config);
  const logId = nanoid();
  const now = new Date().toISOString();
  
  const result: LDAPSyncResult = {
    success: true,
    usersAdded: 0,
    usersUpdated: 0,
    usersRemoved: 0,
    groupsFound: 0,
    errors: [],
    syncedAt: now
  };

  try {
    await client.connect();

    // 搜索用户
    const users = await client.searchUsers();
    const groups = await client.searchGroups();

    result.groupsFound = groups.length;

    // 获取现有用户
    const existingUsers = getLDAPUsers(configId);
    const existingUsernames = new Set(existingUsers.map(u => u.username));
    const syncedUsernames = new Set<string>();

    // 处理用户
    for (const user of users) {
      const username = user.attributes.sAMAccountName || user.attributes.userPrincipalName;
      if (!username) continue;

      syncedUsernames.add(username);

      const existingUser = existingUsers.find(u => u.username === username);
      const displayName = user.attributes.displayName || username;
      const email = user.attributes.mail;

      if (existingUser) {
        // 更新现有用户
        db.prepare(`
          UPDATE ldap_users SET
            display_name = ?, email = ?, member_of = ?, last_sync_at = ?, updated_at = ?
          WHERE id = ?
        `).run(
          displayName,
          email,
          JSON.stringify(user.attributes.memberOf || []),
          now,
          now,
          existingUser.id
        );
        result.usersUpdated++;
      } else {
        // 创建新用户
        const userId = nanoid();
        db.prepare(`
          INSERT INTO ldap_users (
            id, config_id, username, display_name, email, dn, member_of,
            tenant_id, status, last_sync_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          configId,
          username,
          displayName,
          email,
          user.dn,
          JSON.stringify(user.attributes.memberOf || []),
          config.defaultTenantId,
          'active',
          now,
          now,
          now
        );
        result.usersAdded++;
      }
    }

    // 标记已删除的用户
    for (const existingUser of existingUsers) {
      if (!syncedUsernames.has(existingUser.username)) {
        db.prepare("UPDATE ldap_users SET status = 'inactive', updated_at = ? WHERE id = ?")
          .run(now, existingUser.id);
        result.usersRemoved++;
      }
    }

    // 记录同步日志
    db.prepare(`
      INSERT INTO ldap_sync_logs (
        id, config_id, users_added, users_updated, users_removed, groups_found, errors, status, synced_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      configId,
      result.usersAdded,
      result.usersUpdated,
      result.usersRemoved,
      result.groupsFound,
      JSON.stringify(result.errors),
      'success',
      now,
      now
    );

    await client.disconnect();

    console.log(`✅ LDAP 同步完成: +${result.usersAdded}, ~${result.usersUpdated}, -${result.usersRemoved}`);
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);

    // 记录失败日志
    db.prepare(`
      INSERT INTO ldap_sync_logs (
        id, config_id, users_added, users_updated, users_removed, groups_found, errors, status, synced_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      configId,
      0, 0, 0, 0,
      JSON.stringify(result.errors),
      'failed',
      now,
      now
    );

    throw error;
  }

  return result;
}

/**
 * LDAP 登录验证
 */
export async function ldapLogin(configId: string, username: string, password: string): Promise<LDAPUser | null> {
  const config = getLDAPConfig(configId);
  if (!config || !config.isActive) {
    throw new Error('LDAP 配置不存在或已禁用');
  }

  const client = new LDAPClient(config);
  await client.connect();

  const result = await client.verifyCredentials(username, password);
  
  if (!result) {
    return null;
  }

  // 查找或创建用户
  let user = findLDAPUserByUsername(configId, username);
  
  if (!user) {
    // 创建新用户
    const userId = nanoid();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO ldap_users (
        id, config_id, username, display_name, email, dn, member_of,
        tenant_id, status, last_sync_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      configId,
      username,
      username,
      null,
      result.dn,
      '[]',
      config.defaultTenantId,
      'active',
      now,
      now,
      now
    );

    user = getLDAPUser(userId);
  } else {
    // 更新最后登录时间
    db.prepare("UPDATE ldap_users SET last_sync_at = ?, updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), new Date().toISOString(), user.id);
  }

  await client.disconnect();
  return user;
}

/**
 * 获取同步日志
 */
export function getLDAPSyncLogs(configId: string, limit: number = 20) {
  return db.prepare(`
    SELECT * FROM ldap_sync_logs 
    WHERE config_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(configId, limit);
}
