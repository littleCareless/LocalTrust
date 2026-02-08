import api from './index';

// 节点类型定义
export interface Node {
  id: string;
  tenantId: string;
  name: string;
  host: string;
  port: number;
  osType: 'linux' | 'macos' | 'windows';
  status: 'online' | 'offline' | 'unknown' | 'error';
  lastSeenAt?: string;
  tags: string[];
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SSHConfig {
  username: string;
  authType: 'password' | 'private_key';
  password?: string;
  privateKey?: string;
  passphrase?: string;
  sudoRequired: boolean;
  sudoPassword?: string;
}

export interface CreateNodeRequest {
  tenantId: string;
  name: string;
  host: string;
  port?: number;
  osType?: 'linux' | 'macos' | 'windows';
  tags?: string[];
  isPrimary?: boolean;
  ssh?: SSHConfig;
}

export interface SyncResult {
  nodeId: string;
  success: boolean;
  error?: string;
}

export interface NodeStats {
  total: number;
  online: number;
  offline: number;
  unknown: number;
  error: number;
}

// 获取节点列表
export function getNodes(tenantId?: string): Promise<Node[]> {
  return api.get('/nodes', { params: { tenant_id: tenantId } });
}

// 获取节点详情
export function getNode(id: string): Promise<Node> {
  return api.get(`/nodes/${id}`);
}

// 创建节点
export function createNode(data: CreateNodeRequest): Promise<Node> {
  return api.post('/nodes', data);
}

// 更新节点
export function updateNode(id: string, data: Partial<CreateNodeRequest>): Promise<Node> {
  return api.put(`/nodes/${id}`, data);
}

// 删除节点
export function deleteNode(id: string): Promise<void> {
  return api.delete(`/nodes/${id}`);
}

// 测试 SSH 连接
export function testConnection(id: string): Promise<{ success: boolean; error?: string; latency?: number }> {
  return api.post(`/nodes/${id}/test-connection`);
}

// 配置 SSH
export function configureSSH(id: string, config: SSHConfig): Promise<{ configured: boolean }> {
  return api.post(`/nodes/${id}/ssh-config`, config);
}

// 同步 hosts 到节点
export function syncNode(id: string, tenantId?: string): Promise<{ taskId: string }> {
  return api.post(`/nodes/${id}/sync`, { tenant_id: tenantId });
}

// 批量同步
export function batchSync(nodeIds: string[], tenantId?: string): Promise<SyncResult[]> {
  return api.post('/nodes/sync-batch', { node_ids: nodeIds, tenant_id: tenantId });
}

// 获取节点同步任务列表
export function getSyncTasks(id: string): Promise<Array<{
  id: string;
  tenantId: string;
  nodeId: string;
  taskType: string;
  status: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}>> {
  return api.get(`/nodes/${id}/sync-tasks`);
}

// 获取节点统计
export function getNodeStats(tenantId?: string): Promise<NodeStats> {
  return api.get('/nodes/stats', { params: { tenant_id: tenantId } });
}
