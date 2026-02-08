import { nanoid } from 'nanoid';
import db from '../db/index.js';
import type { DNSMapping, CreateDNSMappingRequest } from '@localtrust/types';
import * as hostsService from './hosts.service.js';
import * as settingsService from './settings.service.js';

/**
 * DNS 映射服务（多租户版）
 */

/**
 * 同步到 hosts 文件（如果是本机模式）
 */
function syncToHostsIfNeeded(tenantId?: string) {
  try {
    const settings = settingsService.getSettings();

    if (settings.mode === 'local' && settings.localMode) {
      const mappings = tenantId ? getMappingsByTenant(tenantId) : getDbMappings();
      hostsService.syncMappingsToHosts(
        mappings,
        settings.localMode.autoBackup,
        settings.localMode.backupPath
      );
    }
  } catch (error) {
    console.error('同步到 hosts 文件失败:', error);
  }
}

/**
 * 获取所有域名映射（默认租户或兼容模式）
 */
export function getAllMappings(): DNSMapping[] {
  const settings = settingsService.getSettings();

  // 如果是本地模式，从 hosts 文件读取
  if (settings.mode === 'local') {
    try {
      const hostsContent = hostsService.readHostsFile();
      const hostsMappings = hostsService.parseHostsFile(hostsContent);

      // 同时从数据库读取，合并结果（去重，hosts文件优先）
      const dbMappings = getDbMappings();
      const mergedMappings = mergeMappings(hostsMappings, dbMappings);

      return mergedMappings;
    } catch (error) {
      console.error('从 hosts 文件读取失败，回退到数据库:', error);
      return getDbMappings();
    }
  }

  // 其他模式从数据库读取
  return getDbMappings();
}

/**
 * 获取指定租户的域名映射
 */
export function getMappingsByTenant(tenantId: string): DNSMapping[] {
  const stmt = db.prepare(`
    SELECT id, tenant_id, domain, ip, port, node_id, record_type, is_active, created_at, updated_at
    FROM dns_mappings
    WHERE tenant_id = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(tenantId) as Array<{
    id: string;
    tenant_id: string;
    domain: string;
    ip: string;
    port: number | null;
    node_id: string | null;
    record_type: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    ip: row.ip,
    port: row.port || undefined,
    nodeId: row.node_id || undefined,
    recordType: row.record_type as DNSMapping['recordType'],
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * 从数据库获取域名映射（兼容旧版本）
 */
function getDbMappings(): DNSMapping[] {
  const stmt = db.prepare(`
    SELECT id, tenant_id, domain, ip, port, node_id, record_type, is_active, created_at, updated_at
    FROM dns_mappings
    ORDER BY created_at DESC
  `);

  const rows = stmt.all() as Array<{
    id: string;
    tenant_id: string;
    domain: string;
    ip: string;
    port: number | null;
    node_id: string | null;
    record_type: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    ip: row.ip,
    port: row.port || undefined,
    nodeId: row.node_id || undefined,
    recordType: row.record_type as DNSMapping['recordType'],
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * 合并 hosts 文件和数据库的映射（hosts 文件优先）
 */
function mergeMappings(hostsMappings: DNSMapping[], dbMappings: DNSMapping[]): DNSMapping[] {
  const domainMap = new Map<string, DNSMapping>();

  // 先添加数据库映射
  for (const mapping of dbMappings) {
    domainMap.set(mapping.domain, mapping);
  }

  // hosts 文件映射覆盖数据库映射
  for (const mapping of hostsMappings) {
    domainMap.set(mapping.domain, mapping);
  }

  return Array.from(domainMap.values());
}

/**
 * 根据 ID 获取域名映射
 */
export function getMappingById(id: string): DNSMapping | null {
  const stmt = db.prepare(`
    SELECT id, tenant_id, domain, ip, port, node_id, record_type, is_active, created_at, updated_at
    FROM dns_mappings
    WHERE id = ?
  `);

  const row = stmt.get(id) as {
    id: string;
    tenant_id: string;
    domain: string;
    ip: string;
    port: number | null;
    node_id: string | null;
    record_type: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    ip: row.ip,
    port: row.port || undefined,
    nodeId: row.node_id || undefined,
    recordType: row.record_type as DNSMapping['recordType'],
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 根据域名获取映射（指定租户）
 */
export function getMappingByDomain(domain: string, tenantId?: string): DNSMapping | null {
  let stmt;
  let params: string[];

  if (tenantId) {
    stmt = db.prepare(`
      SELECT id, tenant_id, domain, ip, port, node_id, record_type, is_active, created_at, updated_at
      FROM dns_mappings
      WHERE domain = ? AND tenant_id = ?
    `);
    params = [domain, tenantId];
  } else {
    stmt = db.prepare(`
      SELECT id, tenant_id, domain, ip, port, node_id, record_type, is_active, created_at, updated_at
      FROM dns_mappings
      WHERE domain = ?
    `);
    params = [domain];
  }

  const row = stmt.get(...params) as {
    id: string;
    tenant_id: string;
    domain: string;
    ip: string;
    port: number | null;
    node_id: string | null;
    record_type: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    ip: row.ip,
    port: row.port || undefined,
    nodeId: row.node_id || undefined,
    recordType: row.record_type as DNSMapping['recordType'],
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 创建域名映射
 */
export function createMapping(data: CreateDNSMappingRequest): DNSMapping {
  const id = nanoid();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO dns_mappings
    (id, tenant_id, domain, ip, port, node_id, record_type, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.tenantId,
    data.domain,
    data.ip,
    data.port || null,
    data.nodeId || null,
    data.recordType || 'A',
    1,
    now,
    now
  );

  const mapping = {
    id,
    tenantId: data.tenantId,
    domain: data.domain,
    ip: data.ip,
    port: data.port,
    nodeId: data.nodeId,
    recordType: (data.recordType || 'A') as DNSMapping['recordType'],
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  // 同步到 hosts 文件
  syncToHostsIfNeeded(data.tenantId);

  return mapping;
}

/**
 * 更新域名映射
 */
export function updateMapping(
  id: string,
  data: {
    domain?: string;
    ip?: string;
    port?: number;
    nodeId?: string;
    recordType?: string;
    isActive?: boolean;
  }
): DNSMapping | null {
  const existing = getMappingById(id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE dns_mappings
    SET domain = ?, ip = ?, port = ?, node_id = ?, record_type = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.domain ?? existing.domain,
    data.ip ?? existing.ip,
    data.port ?? existing.port ?? null,
    data.nodeId ?? existing.nodeId ?? null,
    data.recordType ?? existing.recordType ?? 'A',
    data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
    now,
    id
  );

  // 同步到 hosts 文件
  syncToHostsIfNeeded(existing.tenantId);

  return getMappingById(id);
}

/**
 * 删除域名映射
 */
export function deleteMapping(domain: string, tenantId?: string): boolean {
  let stmt;
  let params: string[];

  if (tenantId) {
    stmt = db.prepare('DELETE FROM dns_mappings WHERE domain = ? AND tenant_id = ?');
    params = [domain, tenantId];
  } else {
    stmt = db.prepare('DELETE FROM dns_mappings WHERE domain = ?');
    params = [domain];
  }

  const result = stmt.run(...params);

  // 同步到 hosts 文件
  if (result.changes > 0 && tenantId) {
    syncToHostsIfNeeded(tenantId);
  }

  return result.changes > 0;
}

/**
 * 搜索域名映射（指定租户）
 */
export function searchMappings(keyword: string, tenantId?: string): DNSMapping[] {
  let stmt;
  let params: string[];

  const searchPattern = `%${keyword}%`;

  if (tenantId) {
    stmt = db.prepare(`
      SELECT id, tenant_id, domain, ip, port, node_id, record_type, is_active, created_at, updated_at
      FROM dns_mappings
      WHERE tenant_id = ? AND (domain LIKE ? OR ip LIKE ?)
      ORDER BY created_at DESC
    `);
    params = [tenantId, searchPattern, searchPattern];
  } else {
    stmt = db.prepare(`
      SELECT id, tenant_id, domain, ip, port, node_id, record_type, is_active, created_at, updated_at
      FROM dns_mappings
      WHERE domain LIKE ? OR ip LIKE ?
      ORDER BY created_at DESC
    `);
    params = [searchPattern, searchPattern];
  }

  const rows = stmt.all(...params) as Array<{
    id: string;
    tenant_id: string;
    domain: string;
    ip: string;
    port: number | null;
    node_id: string | null;
    record_type: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    ip: row.ip,
    port: row.port || undefined,
    nodeId: row.node_id || undefined,
    recordType: row.record_type as DNSMapping['recordType'],
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * 获取域名映射总数（指定租户）
 */
export function getMappingsCount(tenantId?: string): number {
  if (tenantId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM dns_mappings WHERE tenant_id = ?');
    const result = stmt.get(tenantId) as { count: number };
    return result.count;
  }

  const stmt = db.prepare('SELECT COUNT(*) as count FROM dns_mappings');
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * 检查域名是否已存在（指定租户）
 */
export function isDomainExists(domain: string, tenantId: string, excludeId?: string): boolean {
  let stmt;
  let params: string[];

  if (excludeId) {
    stmt = db.prepare(`
      SELECT COUNT(*) as count FROM dns_mappings
      WHERE domain = ? AND tenant_id = ? AND id != ?
    `);
    params = [domain, tenantId, excludeId];
  } else {
    stmt = db.prepare(`
      SELECT COUNT(*) as count FROM dns_mappings
      WHERE domain = ? AND tenant_id = ?
    `);
    params = [domain, tenantId];
  }

  const result = stmt.get(...params) as { count: number };
  return result.count > 0;
}
