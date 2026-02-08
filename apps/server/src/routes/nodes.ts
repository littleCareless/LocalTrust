import type { FastifyInstance } from 'fastify';
import * as nodeService from '../services/node.service.js';
import * as sshService from '../services/ssh.service.js';
import * as syncService from '../services/sync.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export default async function nodesRoutes(fastify: FastifyInstance) {
  // 获取所有节点
  fastify.get('/nodes', async (request, reply) => {
    try {
      const { tenant_id } = request.query as { tenant_id?: string };
      const nodes = tenant_id
        ? nodeService.getNodesByTenant(tenant_id)
        : nodeService.getAllNodes();
      return successResponse(nodes);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取节点列表失败');
    }
  });

  // 获取节点统计
  fastify.get('/nodes/stats', async (request, reply) => {
    try {
      const { tenant_id } = request.query as { tenant_id?: string };
      const stats = nodeService.getNodeStats(tenant_id);
      return successResponse(stats);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取统计信息失败');
    }
  });

  // 获取单个节点
  fastify.get('/nodes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const node = nodeService.getNodeById(id);

      if (!node) {
        return reply.code(404).send(errorResponse('节点不存在'));
      }

      // 获取 SSH 配置（不返回敏感信息）
      const sshConfig = sshService.getSSHConfig(id);
      const nodeWithSsh = {
        ...node,
        sshConfigured: !!sshConfig,
        // 不返回密码等敏感信息
      };

      return successResponse(nodeWithSsh);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取节点失败');
    }
  });

  // 创建节点
  fastify.post('/nodes', async (request, reply) => {
    try {
      const data = request.body as {
        tenant_id: string;
        name: string;
        host: string;
        port?: number;
        os_type?: string;
        tags?: string[];
        is_primary?: boolean;
        ssh?: {
          username: string;
          auth_type?: string;
          password?: string;
          private_key?: string;
          passphrase?: string;
          sudo_required?: boolean;
          sudo_password?: string;
        };
      };

      // 验证必填字段
      if (!data.tenant_id || !data.name || !data.host) {
        return reply.code(400).send(errorResponse('缺少必填字段: tenant_id, name, host'));
      }

      // 创建节点
      const node = nodeService.createNode({
        tenantId: data.tenant_id,
        name: data.name,
        host: data.host,
        port: data.port,
        osType: data.os_type as any,
        tags: data.tags,
        isPrimary: data.is_primary
      });

      // 如果提供了 SSH 配置，保存
      if (data.ssh) {
        sshService.saveSSHConfig({
          nodeId: node.id,
          authType: data.ssh.auth_type as any,
          username: data.ssh.username,
          password: data.ssh.password,
          privateKey: data.ssh.private_key,
          passphrase: data.ssh.passphrase,
          sudoRequired: data.ssh.sudo_required,
          sudoPassword: data.ssh.sudo_password
        });
      }

      return reply.code(201).send(successResponse(node, '节点创建成功'));
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '创建节点失败');
    }
  });

  // 更新节点
  fastify.put('/nodes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        name?: string;
        host?: string;
        port?: number;
        os_type?: string;
        tags?: string[];
        is_primary?: boolean;
      };

      const node = nodeService.updateNode(id, {
        name: data.name,
        host: data.host,
        port: data.port,
        osType: data.os_type as any,
        tags: data.tags,
        isPrimary: data.is_primary
      });

      if (!node) {
        return reply.code(404).send(errorResponse('节点不存在'));
      }

      return successResponse(node, '节点更新成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '更新节点失败');
    }
  });

  // 删除节点
  fastify.delete('/nodes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const success = nodeService.deleteNode(id);

      if (!success) {
        return reply.code(404).send(errorResponse('节点不存在'));
      }

      return successResponse(null, '节点删除成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '删除节点失败');
    }
  });

  // 测试 SSH 连接
  fastify.post('/nodes/:id/test-connection', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const node = nodeService.getNodeById(id);

      if (!node) {
        return reply.code(404).send(errorResponse('节点不存在'));
      }

      const sshConfig = sshService.getSSHConfig(id);
      if (!sshConfig) {
        return reply.code(400).send(errorResponse('节点未配置 SSH'));
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

      return successResponse(result, result.success ? '连接成功' : '连接失败');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '测试连接失败');
    }
  });

  // 配置 SSH
  fastify.post('/nodes/:id/ssh-config', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        auth_type?: string;
        username: string;
        password?: string;
        private_key?: string;
        passphrase?: string;
        sudo_required?: boolean;
        sudo_password?: string;
      };

      // 验证节点存在
      const node = nodeService.getNodeById(id);
      if (!node) {
        return reply.code(404).send(errorResponse('节点不存在'));
      }

      const sshConfig = sshService.saveSSHConfig({
        nodeId: id,
        authType: data.auth_type as any,
        username: data.username,
        password: data.password,
        privateKey: data.private_key,
        passphrase: data.passphrase,
        sudoRequired: data.sudo_required,
        sudoPassword: data.sudo_password
      });

      return successResponse({ configured: true }, 'SSH 配置保存成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '保存 SSH 配置失败');
    }
  });

  // 同步 hosts 到节点
  fastify.post('/nodes/:id/sync', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { tenant_id } = request.body as { tenant_id?: string };

      const node = nodeService.getNodeById(id);
      if (!node) {
        return reply.code(404).send(errorResponse('节点不存在'));
      }

      const result = await syncService.syncHostsToNode(tenant_id || node.tenantId, id);

      if (result.success) {
        return successResponse({ taskId: result.taskId }, '同步成功');
      } else {
        return reply.code(500).send(errorResponse(result.error || '同步失败'));
      }
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '同步失败');
    }
  });

  // 获取节点同步任务列表
  fastify.get('/nodes/:id/sync-tasks', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tasks = syncService.getSyncTasksForNode(id);
      return successResponse(tasks);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取同步任务失败');
    }
  });

  // 批量同步到多个节点
  fastify.post('/nodes/sync-batch', async (request, reply) => {
    try {
      const { node_ids, tenant_id } = request.body as {
        node_ids: string[];
        tenant_id?: string;
      };

      if (!node_ids || !Array.isArray(node_ids) || node_ids.length === 0) {
        return reply.code(400).send(errorResponse('请提供节点 ID 列表'));
      }

      // 验证所有节点存在
      for (const nodeId of node_ids) {
        const node = nodeService.getNodeById(nodeId);
        if (!node) {
          return reply.code(404).send(errorResponse(`节点 ${nodeId} 不存在`));
        }
      }

      const tenantId = tenant_id || nodeService.getNodeById(node_ids[0])!.tenantId;
      const results = await syncService.batchSyncHosts(tenantId, node_ids);

      return successResponse(results, '批量同步完成');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '批量同步失败');
    }
  });
}
