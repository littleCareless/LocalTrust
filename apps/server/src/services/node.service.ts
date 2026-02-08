import { nanoid } from 'nanoid';
import db from '../db/index.js';
import type { Node, CreateNodeRequest, UpdateNodeRequest, NodeStatus } from '@localtrust/types';
import * as sshService from './ssh.service.js';

/**
 * 节点管理服务
 */

/**
 * 创建节点
 */
export function createNode(data: CreateNodeRequest): Node {
  const id = nanoid();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO nodes
    (id, tenant_id, name, host, port, os_type, status, tags, is_primary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.tenantId,
    data.name,
    data.host,
    data.port || 22,
    data.osType || 'linux',
    'unknown',
    JSON.stringify(data.tags || []),
    data.isPrimary ? 1 : 0,
    now,
    now
  );

  return getNodeById(id)!;
}

/**
 * 获取节点 by ID
 */
export function getNodeById(id: string): Node | null {
  const stmt = db.prepare(`
    SELECT id, tenant_id, name, host, port, os_type, status, last_seen_at,
           tags, is_primary, created_at, updated_at
    FROM nodes
    WHERE id = ?
  `);

  const row = stmt.get(id) as {
    id: string;
    tenant_id: string;
    name: string;
    host: string;
    port: number;
    os_type: string;
    status: string;
    last_seen_at: string | null;
    tags: string;
    is_primary: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return mapNodeRow(row);
}

/**
 * 获取节点 by Host
 */
export function getNodeByHost(host: string): Node | null {
  const stmt = db.prepare(`
    SELECT id, tenant_id, name, host, port, os_type, status, last_seen_at,
           tags, is_primary, created_at, updated_at
    FROM nodes
    WHERE host = ?
  `);

  const row = stmt.get(host) as {
    id: string;
    tenant_id: string;
    name: string;
    host: string;
    port: number;
    os_type: string;
    status: string;
    last_seen_at: string | null;
    tags: string;
    is_primary: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return mapNodeRow(row);
}

/**
 * 获取租户的所有节点
 */
export function getNodesByTenant(tenantId: string): Node[] {
  const stmt = db.prepare(`
    SELECT id, tenant_id, name, host, port, os_type, status, last_seen_at,
           tags, is_primary, created_at, updated_at
    FROM nodes
    WHERE tenant_id = ?
    ORDER BY is_primary DESC, name ASC
  `);

  const rows = stmt.all(tenantId) as Array<{
    id: string;
    tenant_id: string;
    name: string;
    host: string;
    port: number;
    os_type: string;
    status: string;
    last_seen_at: string | null;
    tags: string;
    is_primary: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(mapNodeRow);
}

/**
 * 获取所有节点
 */
export function getAllNodes(): Node[] {
  const stmt = db.prepare(`
    SELECT id, tenant_id, name, host, port, os_type, status, last_seen_at,
           tags, is_primary, created_at, updated_at
    FROM nodes
    ORDER BY tenant_id, is_primary DESC, name ASC
  `);

  const rows = stmt.all() as Array<{
    id: string;
    tenant_id: string;
    name: string;
    host: string;
    port: number;
    os_type: string;
    status: string;
    last_seen_at: string | null;
    tags: string;
    is_primary: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(mapNodeRow);
}

/**
 * 更新节点
 */
export function updateNode(id: string, data: UpdateNodeRequest): Node | null {
  const existing = getNodeById(id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE nodes
    SET name = ?, host = ?, port = ?, os_type = ?, tags = ?, is_primary = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.name ?? existing.name,
    data.host ?? existing.host,
    data.port ?? existing.port,
    data.osType ?? existing.osType,
    JSON.stringify(data.tags ?? existing.tags),
    data.isPrimary !== undefined ? (data.isPrimary ? 1 : 0) : (existing.isPrimary ? 1 : 0),
    now,
    id
  );

  return getNodeById(id);
}

/**
 * 删除节点
 */
export function deleteNode(id: string): boolean {
  // 同时删除 SSH 配置
  sshService.deleteSSHConfig(id);

  const stmt = db.prepare('DELETE FROM nodes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * 检查节点主机是否可达
 */
export async function checkNodeStatus(id: string): Promise<NodeStatus> {
  const node = getNodeById(id);
  if (!node) {
    return 'unknown';
  }

  const sshConfig = sshService.getSSHConfig(id);
  if (!sshConfig) {
    return 'unknown';
  }

  const result = await sshService.testSSHConnection(
    node.host,
    node.port,
    sshConfig.username,
    sshConfig.authType,
    sshConfig.password,
    sshConfig.privateKey,
    sshConfig.passphrase
  );

  // 更新节点状态
  if (result.success) {
    updateNodeStatus(id, 'online');
    return 'online';
  } else {
    updateNodeStatus(id, 'error');
    return 'error';
  }
}

/**
 * 更新节点状态
 */
export function updateNodeStatus(id: string, status: NodeStatus): void {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE nodes
    SET status = ?, last_seen_at = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(status, now, now, id);
}

/**
 * 批量检查节点状态
 */
export async function batchCheckNodeStatus(tenantId?: string): Promise<Map<string, NodeStatus>> {
  const results = new Map<string, NodeStatus>();
  const nodes = tenantId ? getNodesByTenant(tenantId) : getAllNodes();

  for (const node of nodes) {
    const status = await checkNodeStatus(node.id);
    results.set(node.id, status);
  }

  return results;
}

/**
 * 获取节点统计信息
 */
export function getNodeStats(tenantId?: string): {
  total: number;
  online: number;
  offline: number;
  unknown: number;
  error: number;
} {
  let nodes: Node[];
  if (tenantId) {
    nodes = getNodesByTenant(tenantId);
  } else {
    nodes = getAllNodes();
  }

  const stats = {
    total: nodes.length,
    online: 0,
    offline: 0,
    unknown: 0,
    error: 0
  };

  for (const node of nodes) {
    switch (node.status) {
      case 'online':
        stats.online++;
        break;
      case 'offline':
        stats.offline++;
        break;
      case 'unknown':
        stats.unknown++;
        break;
      case 'error':
        stats.error++;
        break;
    }
  }

  return stats;
}

/**
 * 映射数据库行到 Node 对象
 */
function mapNodeRow(row: {
  id: string;
  tenant_id: string;
  name: string;
  host: string;
  port: number;
  os_type: string;
  status: string;
  last_seen_at: string | null;
  tags: string;
  is_primary: number;
  created_at: string;
  updated_at: string;
}): Node {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    host: row.host,
    port: row.port,
    osType: row.os_type as Node['osType'],
    status: row.status as NodeStatus,
    lastSeenAt: row.last_seen_at || undefined,
    tags: JSON.parse(row.tags),
    isPrimary: row.is_primary === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
