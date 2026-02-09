import { FastifyPluginAsync } from 'fastify';
import {
  createCluster,
  getClusters,
  getCluster,
  getClusterMembers,
  getClusterNode,
  joinCluster,
  leaveCluster,
  updateNodeStatus,
  failover,
  getClusterStats,
  getClusterSyncLogs
} from '../services/cluster.service';
import type { CreateClusterRequest, JoinClusterRequest, LeaveClusterRequest } from '@localtrust/types';

export const clusterRoutes: FastifyPluginAsync = async (fastify) => {
  // ==================== 集群管理 ====================

  // 获取所有集群
  fastify.get('/clusters', async () => {
    const clusters = getClusters();
    return {
      success: true,
      data: clusters
    };
  });

  // 获取单个集群
  fastify.get('/clusters/:id', async (request) => {
    const { id } = request.params as { id: string };
    const cluster = getCluster(id);
    
    if (!cluster) {
      return { success: false, error: '集群不存在' };
    }

    // 获取成员列表
    const members = getClusterMembers(id);
    const stats = getClusterStats(id);

    return {
      success: true,
      data: {
        ...cluster,
        members,
        stats
      }
    };
  });

  // 创建集群
  fastify.post<{ Body: CreateClusterRequest }>('/clusters', async (request) => {
    const data = request.body;

    if (!data.name || !data.nodes || data.nodes.length === 0) {
      return { success: false, error: '缺少必填字段' };
    }

    try {
      const cluster = createCluster(data);
      return {
        success: true,
        data: cluster,
        message: '集群创建成功'
      };
    } catch (error: any) {
      fastify.log.error(error);
      return { success: false, error: error.message };
    }
  });

  // 获取集群成员
  fastify.get('/clusters/:id/members', async (request) => {
    const { id } = request.params as { id: string };
    const members = getClusterMembers(id);
    
    return {
      success: true,
      data: members
    };
  });

  // 获取集群统计
  fastify.get('/clusters/:id/stats', async (request) => {
    const { id } = request.params as { id: string };
    const stats = getClusterStats(id);
    
    return {
      success: true,
      data: stats
    };
  });

  // ==================== 节点管理 ====================

  // 获取节点详情
  fastify.get('/cluster-nodes/:id', async (request) => {
    const { id } = request.params as { id: string };
    const node = getClusterNode(id);
    
    if (!node) {
      return { success: false, error: '节点不存在' };
    }

    return { success: true, data: node };
  });

  // 加入集群
  fastify.post<{ Body: JoinClusterRequest }>('/clusters/:id/join', async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body;

    try {
      const node = joinCluster(id, data);
      return {
        success: true,
        data: node,
        message: '节点已加入集群'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 离开集群
  fastify.post<{ Body: LeaveClusterRequest }>('/cluster-nodes/:id/leave', async (request) => {
    const { id } = request.params as { id: string };
    const { force } = request.body || {};

    try {
      const success = leaveCluster(id, force);
      if (success) {
        return { success: true, message: '节点已离开集群' };
      }
      return { success: false, error: '节点不存在' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 更新节点状态
  fastify.put('/cluster-nodes/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    const status = request.body as any;

    updateNodeStatus(id, status);
    const node = getClusterNode(id);

    return { success: true, data: node };
  });

  // ==================== 故障转移 ====================

  // 故障转移
  fastify.post('/clusters/:id/failover', async (request) => {
    const { id } = request.params as { id: string };

    try {
      const newPrimaryId = await failover(id);
      const newPrimary = getClusterNode(newPrimaryId);
      
      return {
        success: true,
        data: { newPrimaryNodeId: newPrimaryId, newPrimaryNode: newPrimary },
        message: '故障转移完成'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ==================== 同步日志 ====================

  // 获取同步日志
  fastify.get('/clusters/:id/sync-logs', async (request) => {
    const { id } = request.params as { id: string };
    const logs = getClusterSyncLogs(id);
    
    return {
      success: true,
      data: logs
    };
  });

  // ==================== 心跳端点 ====================

  // 接收心跳
  fastify.post('/cluster/heartbeat', async (request) => {
    const { nodeId, status, latency, replicationLag } = request.body as any;

    updateNodeStatus(nodeId, {
      status: status || 'online',
      lastHeartbeatAt: new Date().toISOString(),
      syncLatency: latency,
      replicationLag
    });

    return { success: true, message: '心跳已接收' };
  });

  // ==================== 同步端点 ====================

  // 接收同步数据
  fastify.post('/cluster/sync', async (request) => {
    const { sourceNode, dataType, data } = request.body as any;

    console.log(`📥 收到同步数据: ${dataType} from ${sourceNode}`);
    
    // 实际实现应该处理数据同步
    // 1. 验证源节点身份
    // 2. 应用数据变更
    // 3. 更新同步状态

    return { success: true, message: '同步数据已接收' };
  });
};
