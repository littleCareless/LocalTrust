import type { FastifyInstance } from 'fastify';
import * as tenantService from '../services/tenant.service.js';
import * as nodeService from '../services/node.service.js';
import * as dnsService from '../services/dns.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export default async function tenantsRoutes(fastify: FastifyInstance) {
  // 获取所有租户
  fastify.get('/tenants', async (request, reply) => {
    try {
      const tenants = tenantService.getAllTenants();
      return successResponse(tenants);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取租户列表失败');
    }
  });

  // 获取租户统计
  fastify.get('/tenants/stats', async (request, reply) => {
    try {
      const stats = tenantService.getTenantStats();
      return successResponse(stats);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取统计信息失败');
    }
  });

  // 获取单个租户
  fastify.get('/tenants/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenant = tenantService.getTenantById(id);

      if (!tenant) {
        return reply.code(404).send(errorResponse('租户不存在'));
      }

      return successResponse(tenant);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取租户失败');
    }
  });

  // 创建租户
  fastify.post('/tenants', async (request, reply) => {
    try {
      const data = request.body as {
        name: string;
        slug: string;
        description?: string;
        settings?: any;
      };

      // 验证必填字段
      if (!data.name || !data.slug) {
        return reply.code(400).send(errorResponse('缺少必填字段: name, slug'));
      }

      // 检查 slug 是否已存在
      if (tenantService.isSlugExists(data.slug)) {
        return reply.code(409).send(errorResponse('租户标识已存在'));
      }

      // 验证 slug 格式（只能包含字母、数字、连字符）
      if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(data.slug)) {
        return reply.code(400).send(errorResponse('租户标识格式不正确（需以字母开头，只包含字母、数字、连字符）'));
      }

      const tenant = tenantService.createTenant({
        name: data.name,
        slug: data.slug,
        description: data.description,
        settings: data.settings
      });

      return reply.code(201).send(successResponse(tenant, '租户创建成功'));
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '创建租户失败');
    }
  });

  // 更新租户
  fastify.put('/tenants/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        name?: string;
        description?: string;
        settings?: any;
        is_active?: boolean;
      };

      // 如果要更新 slug，检查是否冲突
      if (data.name) {
        // 重新验证 slug 格式
        const newSlug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (tenantService.isSlugExists(newSlug, id)) {
          return reply.code(409).send(errorResponse('租户标识已存在'));
        }
      }

      const tenant = tenantService.updateTenant(id, {
        name: data.name,
        description: data.description,
        settings: data.settings,
        isActive: data.is_active
      });

      if (!tenant) {
        return reply.code(404).send(errorResponse('租户不存在'));
      }

      return successResponse(tenant, '租户更新成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '更新租户失败');
    }
  });

  // 删除租户
  fastify.delete('/tenants/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // 不能删除默认租户
      const tenant = tenantService.getTenantById(id);
      if (tenant?.slug === 'default') {
        return reply.code(400).send(errorResponse('不能删除默认租户'));
      }

      const success = tenantService.deleteTenant(id);

      if (!success) {
        return reply.code(404).send(errorResponse('租户不存在'));
      }

      return successResponse(null, '租户删除成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '删除租户失败');
    }
  });

  // 获取租户详情（包含节点和域名统计）
  fastify.get('/tenants/:id/details', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenant = tenantService.getTenantById(id);

      if (!tenant) {
        return reply.code(404).send(errorResponse('租户不存在'));
      }

      // 获取关联的节点
      const nodes = nodeService.getNodesByTenant(id);

      // 获取域名统计
      const domainCount = dnsService.getMappingsCount(id);

      // 获取节点统计
      const nodeStats = nodeService.getNodeStats(id);

      return successResponse({
        ...tenant,
        nodes,
        domainCount,
        nodeStats
      });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取租户详情失败');
    }
  });

  // 更新租户设置
  fastify.put('/tenants/:id/settings', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        dns_server?: { type: string; port: number };
        certificate?: { validityDays: number; algorithm: string };
        sync?: { autoSync: boolean; interval: number };
      };

      const tenant = tenantService.updateTenantSettings(id, data);

      if (!tenant) {
        return reply.code(404).send(errorResponse('租户不存在'));
      }

      return successResponse(tenant.settings, '设置更新成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '更新设置失败');
    }
  });
}
