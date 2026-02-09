import { FastifyPluginAsync } from 'fastify';
import {
  addK8sCluster,
  getK8sClusters,
  getK8sCluster,
  updateK8sCluster,
  deleteK8sCluster,
  testClusterConnection,
  syncCertificatesToK8s,
  deployIngress,
  getK8sSyncLogs
} from '../services/k8s.service';
import type { CreateK8sClusterRequest, UpdateK8sClusterRequest, SyncCertificatesToK8sRequest, DeployIngressRequest } from '@localtrust/types';

export const k8sRoutes: FastifyPluginAsync = async (fastify) => {
  // ==================== Kubernetes 集群管理 ====================

  // 获取所有 K8s 集群
  fastify.get('/k8s/clusters', async () => {
    const clusters = getK8sClusters();
    // 隐藏敏感信息
    const safeClusters = clusters.map(({ kubeconfig, token, certificateData, ...rest }) => rest);
    return {
      success: true,
      data: safeClusters
    };
  });

  // 获取单个 K8s 集群
  fastify.get('/k8s/clusters/:id', async (request) => {
    const { id } = request.params as { id: string };
    const cluster = getK8sCluster(id);
    
    if (!cluster) {
      return { success: false, error: '集群不存在' };
    }

    // 隐藏敏感信息
    const { kubeconfig, token, certificateData, ...safeData } = cluster;
    return {
      success: true,
      data: safeData
    };
  });

  // 添加 K8s 集群
  fastify.post<{ Body: CreateK8sClusterRequest }>('/k8s/clusters', async (request) => {
    const data = request.body;

    if (!data.name || !data.kubeconfig) {
      return { success: false, error: '缺少必填字段' };
    }

    try {
      const cluster = addK8sCluster(data);
      const { kubeconfig, token, certificateData, ...safeData } = cluster;
      return {
        success: true,
        data: safeData,
        message: 'Kubernetes 集群添加成功'
      };
    } catch (error: any) {
      fastify.log.error(error);
      return { success: false, error: error.message };
    }
  });

  // 更新 K8s 集群
  fastify.put<{ Body: UpdateK8sClusterRequest }>('/k8s/clusters/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body;

    try {
      const cluster = updateK8sCluster(id, data);
      if (!cluster) {
        return { success: false, error: '集群不存在' };
      }
      const { kubeconfig, token, certificateData, ...safeData } = cluster;
      return { success: true, data: safeData };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 删除 K8s 集群
  fastify.delete('/k8s/clusters/:id', async (request) => {
    const { id } = request.params as { id: string };
    const success = deleteK8sCluster(id);
    
    if (!success) {
      return { success: false, error: '集群不存在' };
    }

    return { success: true, message: '集群已删除' };
  });

  // 测试集群连接
  fastify.post('/k8s/clusters/:id/test', async (request) => {
    const { id } = request.params as { id: string };
    
    try {
      const connected = await testClusterConnection(id);
      return {
        success: connected,
        message: connected ? '连接成功' : '连接失败'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ==================== 证书同步 ====================

  // 同步证书到 K8s
  fastify.post<{ Body: SyncCertificatesToK8sRequest }>('/k8s/sync', async (request) => {
    const data = request.body;

    if (!data.clusterId || !data.namespace || !data.certificates || data.certificates.length === 0) {
      return { success: false, error: '缺少必填字段' };
    }

    try {
      const result = await syncCertificatesToK8s(data);
      return {
        success: result.success,
        data: result,
        message: `同步完成: ${result.secretsCreated} 创建, ${result.secretsUpdated} 更新`
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ==================== Ingress 部署 ====================

  // 部署 Ingress
  fastify.post<{ Body: DeployIngressRequest }>('/k8s/ingress', async (request) => {
    const data = request.body;

    if (!data.clusterId || !data.namespace || !data.domain || !data.serviceName || !data.servicePort) {
      return { success: false, error: '缺少必填字段' };
    }

    try {
      const ingress = await deployIngress(data);
      return {
        success: true,
        data: ingress,
        message: 'Ingress 部署成功'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ==================== 同步日志 ====================

  // 获取同步日志
  fastify.get('/k8s/clusters/:id/sync-logs', async (request) => {
    const { id } = request.params as { id: string };
    const logs = getK8sSyncLogs(id);
    
    return {
      success: true,
      data: logs
    };
  });

  // ==================== 资源管理 ====================

  // 列出集群中的 Secret
  fastify.get('/k8s/clusters/:id/secrets', async (request) => {
    const { id } = request.params as { id: string };
    const { namespace } = request.query as { namespace?: string };
    
    const cluster = getK8sCluster(id);
    if (!cluster) {
      return { success: false, error: '集群不存在' };
    }

    // 模拟返回
    return {
      success: true,
      data: [],
      meta: { count: 0 }
    };
  });

  // 列出集群中的 ConfigMap
  fastify.get('/k8s/clusters/:id/configmaps', async (request) => {
    const { id } = request.params as { id: string };
    const { namespace } = request.query as { namespace?: string };
    
    const cluster = getK8sCluster(id);
    if (!cluster) {
      return { success: false, error: '集群不存在' };
    }

    // 模拟返回
    return {
      success: true,
      data: [],
      meta: { count: 0 }
    };
  });

  // 列出集群中的 Ingress
  fastify.get('/k8s/clusters/:id/ingresses', async (request) => {
    const { id } = request.params as { id: string };
    const { namespace } = request.query as { namespace?: string };
    
    const cluster = getK8sCluster(id);
    if (!cluster) {
      return { success: false, error: '集群不存在' };
    }

    // 模拟返回
    return {
      success: true,
      data: [],
      meta: { count: 0 }
    };
  });
};
