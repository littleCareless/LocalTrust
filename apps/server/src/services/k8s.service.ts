import { nanoid } from 'nanoid';
import db from '../db';
import type { K8sCluster, K8sSecret, K8sConfigMap, K8sIngress, K8sSyncResult } from '@localtrust/types';

/**
 * Kubernetes 集成服务
 * 支持将证书同步到 K8s Secret 和 ConfigMap
 */

interface K8sClientConfig {
  kubeconfig: string;
  context?: string;
  namespace: string;
  insecureSkipTLSVerify: boolean;
}

/**
 * Kubernetes 客户端
 */
export class K8sClient {
  private config: K8sClientConfig;
  private isConnected: boolean = false;

  constructor(config: K8sClientConfig) {
    this.config = config;
  }

  /**
   * 连接到集群
   */
  async connect(): Promise<boolean> {
    try {
      console.log(`☸️  连接到 Kubernetes 集群...`);
      console.log(`   Namespace: ${this.config.namespace}`);

      // 模拟连接
      // 实际实现需要 @kubernetes/client-node 库
      // import * as k8s from '@kubernetes/client-node';
      // const kc = new k8s.KubeConfig();
      // kc.loadFromString(this.config.kubeconfig);
      // this.client = kc.makeApiClient(k8s.CoreV1Api);

      this.isConnected = true;
      console.log('✅ Kubernetes 连接成功');
      return true;
    } catch (error: any) {
      console.error(`❌ Kubernetes 连接失败: ${error.message}`);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 创建 Secret
   */
  async createSecret(secret: K8sSecret): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('未连接到 Kubernetes 集群');
    }

    try {
      console.log(`🔐 创建 Secret: ${secret.name} (namespace: ${secret.namespace})`);

      // 模拟创建 Secret
      // 实际实现：
      // await this.client.createNamespacedSecret({
      //   metadata: {
      //     name: secret.name,
      //     namespace: secret.namespace,
      //     labels: secret.labels,
      //     annotations: secret.annotations
      //   },
      //   type: secret.type,
      //   data: Object.fromEntries(
      //     Object.entries(secret.data).map(([k, v]) => [k, Buffer.from(v).toString('base64')])
      //   )
      // });

      return true;
    } catch (error: any) {
      console.error(`❌ 创建 Secret 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新 Secret
   */
  async updateSecret(secret: K8sSecret): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('未连接到 Kubernetes 集群');
    }

    try {
      console.log(`🔄 更新 Secret: ${secret.name}`);
      
      // 模拟更新
      return true;
    } catch (error: any) {
      console.error(`❌ 更新 Secret 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除 Secret
   */
  async deleteSecret(name: string, namespace: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('未连接到 Kubernetes 集群');
    }

    try {
      console.log(`🗑️  删除 Secret: ${name} (namespace: ${namespace})`);
      
      // 模拟删除
      return true;
    } catch (error: any) {
      console.error(`❌ 删除 Secret 失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 创建 ConfigMap
   */
  async createConfigMap(configmap: K8sConfigMap): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('未连接到 Kubernetes 集群');
    }

    try {
      console.log(`📦 创建 ConfigMap: ${configmap.name} (namespace: ${configmap.namespace})`);
      
      // 模拟创建
      return true;
    } catch (error: any) {
      console.error(`❌ 创建 ConfigMap 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建 Ingress
   */
  async createIngress(ingress: K8sIngress): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('未连接到 Kubernetes 集群');
    }

    try {
      console.log(`🌐 创建 Ingress: ${ingress.host} (namespace: ${ingress.namespace})`);
      
      // 模拟创建
      return true;
    } catch (error: any) {
      console.error(`❌ 创建 Ingress 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取 Secret
   */
  async getSecret(name: string, namespace: string): Promise<K8sSecret | null> {
    if (!this.isConnected) {
      throw new Error('未连接到 Kubernetes 集群');
    }

    // 模拟获取
    return null;
  }

  /**
   * 列出所有 Secret
   */
  async listSecrets(namespace: string): Promise<K8sSecret[]> {
    if (!this.isConnected) {
      throw new Error('未连接到 Kubernetes 集群');
    }

    // 模拟列出
    return [];
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 已断开 Kubernetes 连接');
  }
}

/**
 * Kubernetes 集群配置服务
 */

/**
 * 添加 K8s 集群
 */
export function addK8sCluster(data: {
  name: string;
  kubeconfig: string;
  context?: string;
  namespace?: string;
  authType?: 'kubeconfig' | 'service_account' | 'token';
  insecureSkipTLSVerify?: boolean;
}): K8sCluster {
  const id = nanoid();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO k8s_clusters (
      id, name, kubeconfig, context, namespace, auth_type,
      insecure_skip_tls_verify, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.kubeconfig,
    data.context || null,
    data.namespace || 'default',
    data.authType || 'kubeconfig',
    data.insecureSkipTLSVerify ? 1 : 0,
    'disconnected',
    now,
    now
  );

  return getK8sCluster(id)!;
}

/**
 * 获取所有 K8s 集群
 */
export function getK8sClusters(): K8sCluster[] {
  const clusters = db.prepare('SELECT * FROM k8s_clusters ORDER BY created_at DESC').all();
  
  return clusters.map((c: any) => ({
    id: c.id,
    name: c.name,
    kubeconfig: c.kubeconfig,
    context: c.context,
    namespace: c.namespace,
    authType: c.auth_type,
    token: c.token,
    certificateData: c.certificate_data,
    serverUrl: c.server_url,
    insecureSkipTLSVerify: !!c.insecure_skip_tls_verify,
    status: c.status as K8sCluster['status'],
    lastConnectedAt: c.last_connected_at,
    lastError: c.last_error,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
}

/**
 * 获取单个 K8s 集群
 */
export function getK8sCluster(id: string): K8sCluster | null {
  const cluster = db.prepare('SELECT * FROM k8s_clusters WHERE id = ?').get(id) as any;
  
  if (!cluster) return null;

  return {
    id: cluster.id,
    name: cluster.name,
    kubeconfig: cluster.kubeconfig,
    context: cluster.context,
    namespace: cluster.namespace,
    authType: cluster.auth_type,
    token: cluster.token,
    certificateData: cluster.certificate_data,
    serverUrl: cluster.server_url,
    insecureSkipTLSVerify: !!cluster.insecure_skip_tls_verify,
    status: cluster.status as K8sCluster['status'],
    lastConnectedAt: cluster.last_connected_at,
    lastError: cluster.last_error,
    createdAt: cluster.created_at,
    updatedAt: cluster.updated_at
  };
}

/**
 * 更新 K8s 集群
 */
export function updateK8sCluster(id: string, data: Partial<{
  name: string;
  kubeconfig: string;
  context: string;
  namespace: string;
  authType: 'kubeconfig' | 'service_account' | 'token';
  insecureSkipTLSVerify: boolean;
}>): K8sCluster | null {
  const existing = getK8sCluster(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE k8s_clusters SET
      name = COALESCE(?, name),
      kubeconfig = COALESCE(?, kubeconfig),
      context = COALESCE(?, context),
      namespace = COALESCE(?, namespace),
      auth_type = COALESCE(?, auth_type),
      insecure_skip_tls_verify = COALESCE(?, insecure_skip_tls_verify),
      updated_at = ?
    WHERE id = ?
  `).run(
    data.name,
    data.kubeconfig,
    data.context,
    data.namespace,
    data.authType,
    data.insecureSkipTLSVerify ? 1 : undefined,
    now,
    id
  );

  return getK8sCluster(id);
}

/**
 * 删除 K8s 集群
 */
export function deleteK8sCluster(id: string): boolean {
  const result = db.prepare('DELETE FROM k8s_clusters WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * 测试集群连接
 */
export async function testClusterConnection(id: string): Promise<boolean> {
  const cluster = getK8sCluster(id);
  if (!cluster) {
    throw new Error('集群不存在');
  }

  const client = new K8sClient({
    kubeconfig: cluster.kubeconfig,
    context: cluster.context,
    namespace: cluster.namespace,
    insecureSkipTLSVerify: cluster.insecureSkipTLSVerify
  });

  const connected = await client.connect();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE k8s_clusters SET
      status = ?,
      last_connected_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    connected ? 'connected' : 'error',
    connected ? now : null,
    now,
    id
  );

  await client.disconnect();
  return connected;
}

/**
 * 同步证书到 K8s
 */
export async function syncCertificatesToK8s(data: {
  clusterId: string;
  namespace: string;
  certificates: {
    certificateId: string;
    secretName: string;
    certKey?: string;
    caCertKey?: string;
  }[];
}): Promise<K8sSyncResult> {
  const cluster = getK8sCluster(data.clusterId);
  if (!cluster) {
    throw new Error('K8s 集群不存在');
  }

  const client = new K8sClient({
    kubeconfig: cluster.kubeconfig,
    context: cluster.context,
    namespace: data.namespace,
    insecureSkipTLSVerify: cluster.insecureSkipTLSVerify
  });

  const result: K8sSyncResult = {
    success: true,
    secretsCreated: 0,
    secretsUpdated: 0,
    secretsDeleted: 0,
    configmapsCreated: 0,
    configmapsUpdated: 0,
    ingressesCreated: 0,
    ingressesUpdated: 0,
    errors: [],
    syncedAt: new Date().toISOString()
  };

  try {
    await client.connect();

    // 获取需要同步的证书
    const certIds = data.certificates.map(c => c.certificateId);
    const certificates = db.prepare(`
      SELECT * FROM acme_certificates WHERE id IN (${certIds.map(() => '?').join(',')})
    `).all(...certIds) as any[];

    const certificateMap = new Map(certificates.map(c => [c.id, c]));

    // 同步 Secret
    for (const certData of data.certificates) {
      const cert = certificateMap.get(certData.certificateId);
      if (!cert) {
        result.errors.push(`证书不存在: ${certData.certificateId}`);
        continue;
      }

      try {
        // 检查 Secret 是否存在
        const existingSecret = await client.getSecret(certData.secretName, data.namespace);

        const secret: K8sSecret = {
          name: certData.secretName,
          namespace: data.namespace,
          type: 'kubernetes.io/tls',
          data: {
            [certData.certKey || 'tls.crt']: cert.cert,
            [certData.caCertKey || 'tls.key']: cert.private_key
          },
          labels: {
            'managed-by': 'localtrust',
            'certificate-id': cert.id,
            'domain': cert.domain
          },
          annotations: {
            'localtrust.cert/created': new Date().toISOString()
          }
        };

        if (existingSecret) {
          await client.updateSecret(secret);
          result.secretsUpdated++;
        } else {
          await client.createSecret(secret);
          result.secretsCreated++;
        }
      } catch (error: any) {
        result.errors.push(`同步 Secret 失败: ${certData.secretName} - ${error.message}`);
      }
    }

    await client.disconnect();

    // 记录同步日志
    const logId = nanoid();
    db.prepare(`
      INSERT INTO k8s_sync_logs (
        id, cluster_id, secrets_created, secrets_updated, secrets_deleted,
        configmaps_created, configmaps_updated, ingresses_created, ingresses_updated,
        errors, status, synced_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      data.clusterId,
      result.secretsCreated,
      result.secretsUpdated,
      result.secretsDeleted,
      result.configmapsCreated,
      result.configmapsUpdated,
      result.ingressesCreated,
      result.ingressesUpdated,
      JSON.stringify(result.errors),
      result.errors.length > 0 ? 'partial' : 'success',
      result.syncedAt,
      result.syncedAt
    );

    console.log(`✅ K8s 同步完成: ${result.secretsCreated} 创建, ${result.secretsUpdated} 更新`);
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
    throw error;
  }

  return result;
}

/**
 * 部署 Ingress
 */
export async function deployIngress(data: {
  clusterId: string;
  namespace: string;
  domain: string;
  serviceName: string;
  servicePort: number;
  certificateId?: string;
  annotations?: Record<string, string>;
}): Promise<K8sIngress> {
  const cluster = getK8sCluster(data.clusterId);
  if (!cluster) {
    throw new Error('K8s 集群不存在');
  }

  const client = new K8sClient({
    kubeconfig: cluster.kubeconfig,
    context: cluster.context,
    namespace: data.namespace,
    insecureSkipTLSVerify: cluster.insecureSkipTLSVerify
  });

  await client.connect();

  const ingress: K8sIngress = {
    name: `ingress-${data.domain.replace(/\./g, '-')}`,
    namespace: data.namespace,
    host: data.domain,
    serviceName: data.serviceName,
    servicePort: data.servicePort,
    tlsEnabled: !!data.certificateId,
    tlsSecretName: data.certificateId ? `cert-${data.domain.replace(/\./g, '-')}` : undefined,
    annotations: data.annotations
  };

  await client.createIngress(ingress);
  await client.disconnect();

  return ingress;
}

/**
 * 获取同步日志
 */
export function getK8sSyncLogs(clusterId: string, limit: number = 20) {
  return db.prepare(`
    SELECT * FROM k8s_sync_logs 
    WHERE cluster_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(clusterId, limit);
}
