import { nanoid } from 'nanoid';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import db from '../db/index.js';
import type { SyncTask, SyncTaskType, SyncTaskStatus, DNSMapping } from '@localtrust/types';
import * as sshService from './ssh.service.js';
import * as dnsService from './dns.service.js';

/**
 * 同步服务
 * 负责将域名映射同步到远程节点的 hosts 文件
 */

const TEMP_DIR = path.join(os.tmpdir(), 'localtrust');

/**
 * 确保临时目录存在
 */
function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * 生成 hosts 文件内容
 */
export function generateHostsContent(mappings: DNSMapping[], includeComments: boolean = true): string {
  const lines: string[] = [];

  if (includeComments) {
    lines.push('# LocalTrust Managed - Start');
    lines.push('# 此区域由 LocalTrust 自动管理，请勿手动编辑');
    lines.push('');
  }

  // 按域名排序
  const sortedMappings = [...mappings].sort((a, b) => a.domain.localeCompare(b.domain));

  for (const mapping of sortedMappings) {
    const port = mapping.port ? `:${mapping.port}` : '';
    lines.push(`${mapping.ip}\t${mapping.domain}${port}`);
  }

  if (includeComments) {
    lines.push('');
    lines.push('# LocalTrust Managed - End');
  }

  return lines.join('\n') + '\n';
}

/**
 * 获取租户的所有域名映射
 */
export function getMappingsForTenant(tenantId: string): DNSMapping[] {
  const stmt = db.prepare(`
    SELECT id, tenant_id, domain, ip, port, record_type, is_active, created_at, updated_at
    FROM dns_mappings
    WHERE tenant_id = ? AND is_active = 1
    ORDER BY domain ASC
  `);

  const rows = stmt.all(tenantId) as Array<{
    id: string;
    tenant_id: string;
    domain: string;
    ip: string;
    port: number | null;
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
    recordType: row.record_type as DNSMapping['recordType'],
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * 创建同步任务
 */
export function createSyncTask(data: {
  tenantId: string;
  nodeId: string;
  taskType: SyncTaskType;
}): SyncTask {
  const id = nanoid();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO sync_tasks
    (id, tenant_id, node_id, task_type, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.tenantId, data.nodeId, data.taskType, 'pending', now);

  return getSyncTaskById(id)!;
}

/**
 * 获取同步任务 by ID
 */
export function getSyncTaskById(id: string): SyncTask | null {
  const stmt = db.prepare(`
    SELECT id, tenant_id, node_id, task_type, status, error_message,
           started_at, completed_at, created_at
    FROM sync_tasks
    WHERE id = ?
  `);

  const row = stmt.get(id) as {
    id: string;
    tenant_id: string;
    node_id: string;
    task_type: string;
    status: string;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return mapSyncTaskRow(row);
}

/**
 * 获取节点的最后同步任务
 */
export function getLastSyncTaskForNode(nodeId: string): SyncTask | null {
  const stmt = db.prepare(`
    SELECT id, tenant_id, node_id, task_type, status, error_message,
           started_at, completed_at, created_at
    FROM sync_tasks
    WHERE node_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const row = stmt.get(nodeId) as {
    id: string;
    tenant_id: string;
    node_id: string;
    task_type: string;
    status: string;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return mapSyncTaskRow(row);
}

/**
 * 获取节点的所有同步任务
 */
export function getSyncTasksForNode(nodeId: string): SyncTask[] {
  const stmt = db.prepare(`
    SELECT id, tenant_id, node_id, task_type, status, error_message,
           started_at, completed_at, created_at
    FROM sync_tasks
    WHERE node_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `);

  const rows = stmt.all(nodeId) as Array<{
    id: string;
    tenant_id: string;
    node_id: string;
    task_type: string;
    status: string;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
  }>;

  return rows.map(mapSyncTaskRow);
}

/**
 * 更新同步任务状态
 */
export function updateSyncTaskStatus(
  id: string,
  status: SyncTaskStatus,
  errorMessage?: string
): void {
  const now = new Date().toISOString();
  const completedAt = ['completed', 'failed'].includes(status) ? now : null;

  const stmt = db.prepare(`
    UPDATE sync_tasks
    SET status = ?, error_message = ?, started_at = ?, completed_at = ?
    WHERE id = ?
  `);

  stmt.run(status, errorMessage || null, now, completedAt, id);
}

/**
 * 同步 hosts 文件到远程节点
 */
export async function syncHostsToNode(
  tenantId: string,
  nodeId: string
): Promise<{ success: boolean; taskId: string; error?: string }> {
  // 创建同步任务
  const task = createSyncTask({ tenantId, nodeId, taskType: 'hosts' });

  try {
    // 获取域名映射
    const mappings = getMappingsForTenant(tenantId);

    // 生成 hosts 内容
    const hostsContent = generateHostsContent(mappings);

    // 创建临时文件
    ensureTempDir();
    const tempFile = path.join(TEMP_DIR, `hosts_${tenantId}_${Date.now()}`);

    // 检查节点是否需要 sudo
    const sshConfig = sshService.getSSHConfig(nodeId);
    const needSudo = sshConfig?.sudoRequired || false;

    if (needSudo) {
      // 需要 sudo，写入临时文件后使用 sudo tee
      fs.writeFileSync(tempFile, hostsContent, 'utf-8');

      const result = await sshService.executeRemoteCommand(
        nodeId,
        `cat "${tempFile}" | sudo tee /etc/hosts > /dev/null`,
        false
      );

      // 清理临时文件
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // 忽略清理错误
      }

      if (!result.success) {
        updateSyncTaskStatus(task.id, 'failed', result.error);
        return { success: false, taskId: task.id, error: result.error };
      }
    } else {
      // 不需要 sudo，直接写入
      const result = await sshService.executeRemoteCommand(
        nodeId,
        `echo "${hostsContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" | sudo tee /etc/hosts > /dev/null`,
        false
      );

      if (!result.success) {
        updateSyncTaskStatus(task.id, 'failed', result.error);
        return { success: false, taskId: task.id, error: result.error };
      }
    }

    updateSyncTaskStatus(task.id, 'completed');
    return { success: true, taskId: task.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    updateSyncTaskStatus(task.id, 'failed', errorMessage);
    return { success: false, taskId: task.id, error: errorMessage };
  }
}

/**
 * 批量同步到多个节点
 */
export async function batchSyncHosts(
  tenantId: string,
  nodeIds: string[]
): Promise<Array<{ nodeId: string; success: boolean; error?: string }>> {
  const results: Array<{ nodeId: string; success: boolean; error?: string }> = [];

  for (const nodeId of nodeIds) {
    const result = await syncHostsToNode(tenantId, nodeId);
    results.push({ nodeId, success: result.success, error: result.error });
  }

  return results;
}

/**
 * 同步到租户的所有节点
 */
export async function syncHostsToAllNodes(
  tenantId: string
): Promise<Array<{ nodeId: string; success: boolean; error?: string }>> {
  const nodeStmt = db.prepare('SELECT id FROM nodes WHERE tenant_id = ?');
  const nodes = nodeStmt.all(tenantId) as Array<{ id: string }>;

  const nodeIds = nodes.map(n => n.id);
  return batchSyncHosts(tenantId, nodeIds);
}

/**
 * 获取同步任务统计
 */
export function getSyncTaskStats(nodeId?: string): {
  pending: number;
  running: number;
  completed: number;
  failed: number;
} {
  let stmt;

  if (nodeId) {
    stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM sync_tasks
      WHERE node_id = ?
      GROUP BY status
    `);
  } else {
    stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM sync_tasks
      GROUP BY status
    `);
  }

  const rows = stmt.all(nodeId) as Array<{ status: string; count: number }>;

  const stats = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0
  };

  for (const row of rows) {
    switch (row.status) {
      case 'pending':
        stats.pending = row.count;
        break;
      case 'running':
        stats.running = row.count;
        break;
      case 'completed':
        stats.completed = row.count;
        break;
      case 'failed':
        stats.failed = row.count;
        break;
    }
  }

  return stats;
}

/**
 * 映射数据库行到 SyncTask 对象
 */
function mapSyncTaskRow(row: {
  id: string;
  tenant_id: string;
  node_id: string;
  task_type: string;
  status: string;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}): SyncTask {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    nodeId: row.node_id,
    taskType: row.task_type as SyncTaskType,
    status: row.status as SyncTaskStatus,
    errorMessage: row.error_message || undefined,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at
  };
}
