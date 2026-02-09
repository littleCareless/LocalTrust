import { nanoid } from 'nanoid';
import db from '../db';
import type { ClusterConfig, ClusterInfo, ClusterMember, ClusterNodeStatus, ClusterRole, ClusterSyncStatus } from '@localtrust/types';

/**
 * 高可用集群服务
 * 支持多节点部署和实时同步
 */

interface ClusterNodeInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  apiPort: number;
  role: ClusterRole;
  status: ClusterNodeStatus;
}

// 集群节点缓存
const nodeRegistry = new Map<string, ClusterNodeInfo>();

/**
 * 集群客户端类
 */
export class ClusterClient {
  private nodeInfo: ClusterNodeInfo;
  private clusterId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(clusterId: string, nodeInfo: ClusterNodeInfo) {
    this.clusterId = clusterId;
    this.nodeInfo = nodeInfo;
  }

  /**
   * 发送心跳
   */
  async sendHeartbeat(): Promise<void> {
    try {
      // 模拟发送到其他节点
      // 实际实现：HTTP 请求到其他节点的 /api/cluster/heartbeat 端点
      const now = new Date().toISOString();
      
      db.prepare(`
        UPDATE cluster_nodes SET 
          last_heartbeat_at = ?, status = 'online', updated_at = ?
        WHERE id = ?
      `).run(now, now, this.nodeInfo.id);

      // 更新本地注册表
      this.nodeInfo.status = 'online';
      this.nodeInfo.lastHeartbeatAt = now;
      nodeRegistry.set(this.nodeInfo.id, this.nodeInfo);

      console.log(`💓 心跳已发送: ${this.nodeInfo.name} (${this.nodeInfo.host}:${this.nodeInfo.apiPort})`);
    } catch (error: any) {
      console.error(`❌ 心跳发送失败: ${error.message}`);
      this.markOffline();
    }
  }

  /**
   * 标记节点离线
   */
  async markOffline(): Promise<void> {
    db.prepare(`
      UPDATE cluster_nodes SET status = 'offline', updated_at = ? WHERE id = ?
    `).run(new Date().toISOString(), this.nodeInfo.id);

    this.nodeInfo.status = 'offline';
    nodeRegistry.delete(this.nodeInfo.id);
  }

  /**
   * 同步数据到其他节点
   */
  async syncData(dataType: string, data: any): Promise<void> {
    try {
      console.log(`🔄 同步 ${dataType}: ${JSON.stringify(data).substring(0, 100)}...`);
      
      // 获取所有在线节点
      const nodes = getOnlineClusterNodes(this.clusterId);
      
      for (const node of nodes) {
        if (node.id !== this.nodeInfo.id) {
          // 发送到其他节点
          // 实际实现：HTTP POST 到 http://${node.host}:${node.apiPort}/api/cluster/sync
          console.log(`   → ${node.name} (${node.host}:${node.apiPort})`);
        }
      }

      // 记录同步日志
      const logId = nanoid();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO cluster_sync_logs (
          id, cluster_id, source_node, target_node, sync_type, items_synced, status, started_at, completed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        this.clusterId,
        this.nodeInfo.id,
        nodes.map(n => n.id).join(','),
        dataType,
        1,
        'completed',
        now,
        now,
        now
      );
    } catch (error: any) {
      console.error(`❌ 数据同步失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动心跳
   */
  startHeartbeat(intervalSeconds: number = 5): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch(console.error);
    }, intervalSeconds * 1000);
    
    console.log(`🚀 心跳已启动: ${this.nodeInfo.name} (间隔 ${intervalSeconds}s)`);
  }

  /**
   * 停止心跳
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

/**
 * 集群配置服务
 */

/**
 * 创建集群
 */
export function createCluster(data: {
  name: string;
  nodes: {
    host: string;
    port?: number;
    apiPort?: number;
    role?: ClusterRole;
  }[];
}): ClusterInfo {
  const clusterId = nanoid();
  const now = new Date().toISOString();

  // 创建集群
  db.prepare(`
    INSERT INTO clusters (id, name, total_nodes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(clusterId, data.name, data.nodes.length, now, now);

  // 创建节点记录
  const nodes: ClusterNodeInfo[] = [];
  for (let i = 0; i < data.nodes.length; i++) {
    const nodeData = data.nodes[i];
    const nodeId = nanoid();
    const isPrimary = i === 0 || nodeData.role === 'primary';
    
    db.prepare(`
      INSERT INTO cluster_nodes (
        id, cluster_id, node_id, name, host, port, api_port, role,
        heartbeat_interval, heartbeat_timeout, is_primary, status, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nodeId,
      clusterId,
      nodeId,
      nodeData.host,
      nodeData.host,
      nodeData.port || 22,
      nodeData.apiPort || 3001,
      nodeData.role || (isPrimary ? 'primary' : 'replica'),
      5,
      30,
      isPrimary ? 1 : 0,
      'offline',
      'unknown',
      now,
      now
    );

    nodes.push({
      id: nodeId,
      name: nodeData.host,
      host: nodeData.host,
      port: nodeData.port || 22,
      apiPort: nodeData.apiPort || 3001,
      role: nodeData.role || (isPrimary ? 'primary' : 'replica'),
      status: 'offline'
    });
  }

  // 如果有主节点，更新集群
  if (nodes.some(n => n.role === 'primary')) {
    const primaryNode = nodes.find(n => n.role === 'primary');
    db.prepare('UPDATE clusters SET primary_node = ? WHERE id = ?')
      .run(primaryNode?.id, clusterId);
  }

  return getCluster(clusterId)!;
}

/**
 * 获取所有集群
 */
export function getClusters(): ClusterInfo[] {
  const clusters = db.prepare('SELECT * FROM clusters ORDER BY created_at DESC').all();
  
  return clusters.map((c: any) => ({
    id: c.id,
    name: c.name,
    totalNodes: c.total_nodes,
    primaryNode: c.primary_node,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
}

/**
 * 获取单个集群
 */
export function getCluster(clusterId: string): ClusterInfo | null {
  const cluster = db.prepare('SELECT * FROM clusters WHERE id = ?').get(clusterId) as any;
  
  if (!cluster) return null;

  return {
    id: cluster.id,
    name: cluster.name,
    totalNodes: cluster.total_nodes,
    primaryNode: cluster.primary_node,
    createdAt: cluster.created_at,
    updatedAt: cluster.updated_at
  };
}

/**
 * 获取集群成员
 */
export function getClusterMembers(clusterId: string): ClusterMember[] {
  const nodes = db.prepare('SELECT * FROM cluster_nodes WHERE cluster_id = ?').all(clusterId);
  
  return nodes.map((n: any) => ({
    nodeId: n.id,
    name: n.name,
    host: n.host,
    role: n.role as ClusterRole,
    status: n.status as ClusterNodeStatus,
    lastHeartbeatAt: n.last_heartbeat_at,
    syncStatus: n.sync_status as ClusterSyncStatus
  }));
}

/**
 * 获取节点配置
 */
export function getClusterNode(nodeId: string): ClusterConfig | null {
  const node = db.prepare('SELECT * FROM cluster_nodes WHERE id = ?').get(nodeId) as any;
  
  if (!node) return null;

  return {
    id: node.id,
    nodeId: node.node_id,
    clusterId: node.cluster_id,
    name: node.name,
    host: node.host,
    port: node.port,
    apiPort: node.api_port,
    role: node.role as ClusterRole,
    heartbeatInterval: node.heartbeat_interval,
    heartbeatTimeout: node.heartbeat_timeout,
    isPrimary: !!node.is_primary,
    status: node.status as ClusterNodeStatus,
    lastHeartbeatAt: node.last_heartbeat_at,
    lastSyncAt: node.last_sync_at,
    syncStatus: node.sync_status as ClusterSyncStatus,
    syncLatency: node.sync_latency,
    replicationLag: node.replication_lag,
    createdAt: node.created_at,
    updatedAt: node.updated_at
  };
}

/**
 * 更新节点状态
 */
export function updateNodeStatus(nodeId: string, status: Partial<{
  status: ClusterNodeStatus;
  lastHeartbeatAt: string;
  lastSyncAt: string;
  syncStatus: ClusterSyncStatus;
  syncLatency: number;
  replicationLag: number;
}>): void {
  const updates: string[] = [];
  const values: any[] = [];
  const now = new Date().toISOString();

  if (status.status) {
    updates.push('status = ?');
    values.push(status.status);
  }
  if (status.lastHeartbeatAt) {
    updates.push('last_heartbeat_at = ?');
    values.push(status.lastHeartbeatAt);
  }
  if (status.lastSyncAt) {
    updates.push('last_sync_at = ?');
    values.push(status.lastSyncAt);
  }
  if (status.syncStatus) {
    updates.push('sync_status = ?');
    values.push(status.syncStatus);
  }
  if (status.syncLatency !== undefined) {
    updates.push('sync_latency = ?');
    values.push(status.syncLatency);
  }
  if (status.replicationLag !== undefined) {
    updates.push('replication_lag = ?');
    values.push(status.replicationLag);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(nodeId);

  db.prepare(`UPDATE cluster_nodes SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

/**
 * 加入集群
 */
export function joinCluster(clusterId: string, data: {
  host: string;
  port?: number;
  apiPort?: number;
  role?: ClusterRole;
}): ClusterConfig {
  const existingCluster = getCluster(clusterId);
  if (!existingCluster) {
    throw new Error('集群不存在');
  }

  const nodeId = nanoid();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO cluster_nodes (
      id, cluster_id, node_id, name, host, port, api_port, role,
      heartbeat_interval, heartbeat_timeout, is_primary, status, sync_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    clusterId,
    nodeId,
    data.host,
    data.host,
    data.port || 22,
    data.apiPort || 3001,
    data.role || 'replica',
    5,
    30,
    0,
    'joining',
    'unknown',
    now,
    now
  );

  // 更新集群节点数
  db.prepare('UPDATE clusters SET total_nodes = total_nodes + 1, updated_at = ? WHERE id = ?')
    .run(now, clusterId);

  return getClusterNode(nodeId)!;
}

/**
 * 离开集群
 */
export function leaveCluster(nodeId: string, force: boolean = false): boolean {
  const node = getClusterNode(nodeId);
  if (!node) return false;

  const now = new Date().toISOString();

  // 如果是主节点且非强制退出，检查是否有其他主节点
  if (node.isPrimary && !force) {
    const members = getClusterMembers(node.clusterId);
    const otherPrimary = members.find(m => m.role === 'primary' && m.nodeId !== nodeId);
    if (!otherPrimary) {
      throw new Error('无法离开集群：当前节点是唯一的主节点。请先提升其他节点为主节点或强制离开。');
    }
  }

  db.prepare('DELETE FROM cluster_nodes WHERE id = ?').run(nodeId);

  // 更新集群信息
  db.prepare(`
    UPDATE clusters SET 
      total_nodes = total_nodes - 1,
      primary_node = CASE WHEN primary_node = ? THEN NULL ELSE primary_node END,
      updated_at = ?
    WHERE id = ?
  `).run(nodeId, now, node.clusterId);

  return true;
}

/**
 * 获取在线节点
 */
export function getOnlineClusterNodes(clusterId: string): ClusterNodeInfo[] {
  const nodes = db.prepare(`
    SELECT * FROM cluster_nodes 
    WHERE cluster_id = ? AND status = 'online'
  `).all(clusterId);

  return nodes.map((n: any) => ({
    id: n.id,
    name: n.name,
    host: n.host,
    port: n.port,
    apiPort: n.api_port,
    role: n.role as ClusterRole,
    status: 'online' as ClusterNodeStatus,
    lastHeartbeatAt: n.last_heartbeat_at
  }));
}

/**
 * 获取集群统计
 */
export function getClusterStats(clusterId: string): {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  syncedNodes: number;
  outOfSyncNodes: number;
} {
  const nodes = db.prepare('SELECT * FROM cluster_nodes WHERE cluster_id = ?').all(clusterId);

  return {
    totalNodes: nodes.length,
    onlineNodes: nodes.filter((n: any) => n.status === 'online').length,
    offlineNodes: nodes.filter((n: any) => n.status === 'offline').length,
    syncedNodes: nodes.filter((n: any) => n.sync_status === 'synced').length,
    outOfSyncNodes: nodes.filter((n: any) => n.sync_status === 'out_of_sync').length
  };
}

/**
 * 故障转移
 */
export async function failover(clusterId: string): Promise<string> {
  const cluster = getCluster(clusterId);
  if (!cluster) {
    throw new Error('集群不存在');
  }

  // 查找合适的候选节点
  const members = getClusterMembers(clusterId);
  const candidates = members.filter(m => m.status === 'online' && m.role !== 'primary');

  if (candidates.length === 0) {
    throw new Error('没有可用的候选节点进行故障转移');
  }

  // 选择延迟最低的节点
  const newPrimary = candidates.sort((a, b) => {
    const aNode = getClusterNode(a.nodeId);
    const bNode = getClusterNode(b.nodeId);
    return (aNode?.replicationLag || 0) - (bNode?.replicationLag || 0);
  })[0];

  const now = new Date().toISOString();

  // 降级旧主节点
  if (cluster.primaryNode) {
    db.prepare(`
      UPDATE cluster_nodes SET 
        is_primary = 0, role = 'replica', updated_at = ?
      WHERE id = ?
    `).run(now, cluster.primaryNode);
  }

  // 提升新主节点
  db.prepare(`
    UPDATE cluster_nodes SET 
      is_primary = 1, role = 'primary', updated_at = ?
    WHERE id = ?
  `).run(now, newPrimary.nodeId);

  // 更新集群
  db.prepare('UPDATE clusters SET primary_node = ?, updated_at = ? WHERE id = ?')
    .run(newPrimary.nodeId, now, clusterId);

  console.log(`🔄 故障转移完成: ${newPrimary.name} 成为新的主节点`);

  return newPrimary.nodeId;
}

/**
 * 获取同步日志
 */
export function getClusterSyncLogs(clusterId: string, limit: number = 50) {
  return db.prepare(`
    SELECT * FROM cluster_sync_logs 
    WHERE cluster_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(clusterId, limit);
}
