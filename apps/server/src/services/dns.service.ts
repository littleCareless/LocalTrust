import { nanoid } from 'nanoid';
import db from '../db/index.js';
import type { DNSMapping } from '@localtrust/types';
import * as hostsService from './hosts.service.js';
import * as settingsService from './settings.service.js';

/**
 * DNS 映射服务
 */

/**
 * 同步到 hosts 文件（如果是本机模式）
 */
function syncToHostsIfNeeded() {
  try {
    const settings = settingsService.getSettings();

    if (settings.mode === 'local' && settings.localMode) {
      const mappings = getDbMappings();
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
 * 获取所有域名映射
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
 * 从数据库获取域名映射
 */
function getDbMappings(): DNSMapping[] {
  const stmt = db.prepare(`
    SELECT id, domain, ip, port, created_at, updated_at
    FROM dns_mappings
    ORDER BY created_at DESC
  `);

  const rows = stmt.all() as Array<{
    id: string;
    domain: string;
    ip: string;
    port: number | null;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    domain: row.domain,
    ip: row.ip,
    port: row.port || undefined,
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
    SELECT id, domain, ip, port, created_at, updated_at
    FROM dns_mappings
    WHERE id = ?
  `);

  const row = stmt.get(id) as {
    id: string;
    domain: string;
    ip: string;
    port: number | null;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    domain: row.domain,
    ip: row.ip,
    port: row.port || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 根据域名获取映射
 */
export function getMappingByDomain(domain: string): DNSMapping | null {
  const stmt = db.prepare(`
    SELECT id, domain, ip, port, created_at, updated_at
    FROM dns_mappings
    WHERE domain = ?
  `);

  const row = stmt.get(domain) as {
    id: string;
    domain: string;
    ip: string;
    port: number | null;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    domain: row.domain,
    ip: row.ip,
    port: row.port || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 创建域名映射
 */
export function createMapping(data: {
  domain: string;
  ip: string;
  port?: number;
}): DNSMapping {
  const id = nanoid();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO dns_mappings (id, domain, ip, port, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.domain, data.ip, data.port || null, now, now);

  const mapping = {
    id,
    domain: data.domain,
    ip: data.ip,
    port: data.port,
    createdAt: now,
    updatedAt: now
  };

  // 同步到 hosts 文件
  syncToHostsIfNeeded();

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
  }
): DNSMapping | null {
  const existing = getMappingById(id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE dns_mappings
    SET domain = ?, ip = ?, port = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.domain ?? existing.domain,
    data.ip ?? existing.ip,
    data.port ?? existing.port ?? null,
    now,
    id
  );

  // 同步到 hosts 文件
  syncToHostsIfNeeded();

  return getMappingById(id);
}

/**
 * 删除域名映射
 */
export function deleteMapping(domain: string): boolean {
  const stmt = db.prepare('DELETE FROM dns_mappings WHERE domain = ?');
  const result = stmt.run(domain);

  // 同步到 hosts 文件
  if (result.changes > 0) {
    syncToHostsIfNeeded();
  }

  return result.changes > 0;
}

/**
 * 搜索域名映射
 */
export function searchMappings(keyword: string): DNSMapping[] {
  const stmt = db.prepare(`
    SELECT id, domain, ip, port, created_at, updated_at
    FROM dns_mappings
    WHERE domain LIKE ? OR ip LIKE ?
    ORDER BY created_at DESC
  `);

  const searchPattern = `%${keyword}%`;
  const rows = stmt.all(searchPattern, searchPattern) as Array<{
    id: string;
    domain: string;
    ip: string;
    port: number | null;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    domain: row.domain,
    ip: row.ip,
    port: row.port || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * 获取域名映射总数
 */
export function getMappingsCount(): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM dns_mappings');
  const result = stmt.get() as { count: number };
  return result.count;
}
