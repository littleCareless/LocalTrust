import { FastifyPluginAsync } from 'fastify';
import * as dnsService from '../services/dns.service';
import { validateDNSMapping, sanitizeDomain } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';

export const dnsRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取所有域名映射
  fastify.get('/mappings', async (request, reply) => {
    try {
      const { search } = request.query as { search?: string };

      let mappings;
      if (search) {
        mappings = dnsService.searchMappings(search);
      } else {
        mappings = dnsService.getAllMappings();
      }

      return successResponse(mappings);
    } catch (error) {
      console.error('获取域名映射失败:', error);
      return reply.code(500).send(errorResponse('获取域名映射失败'));
    }
  });

  // 添加域名映射
  fastify.post('/mappings', async (request, reply) => {
    try {
      const { domain, ip, port } = request.body as {
        domain: string;
        ip: string;
        port?: number;
      };

      // 验证数据
      const validation = validateDNSMapping({ domain, ip, port });
      if (!validation.valid) {
        return reply.code(400).send(errorResponse(validation.errors.join(', ')));
      }

      // 清理域名
      const cleanDomain = sanitizeDomain(domain);

      // 检查域名是否已存在
      const existing = dnsService.getMappingByDomain(cleanDomain);
      if (existing) {
        return reply.code(409).send(errorResponse('域名已存在'));
      }

      // 创建映射
      const mapping = dnsService.createMapping({
        domain: cleanDomain,
        ip,
        port
      });

      return reply.code(201).send(successResponse(mapping, '域名映射创建成功'));
    } catch (error) {
      console.error('创建域名映射失败:', error);
      return reply.code(500).send(errorResponse('创建域名映射失败'));
    }
  });

  // 删除域名映射
  fastify.delete('/mappings/:domain', async (request, reply) => {
    try {
      const { domain } = request.params as { domain: string };

      const success = dnsService.deleteMapping(domain);
      if (!success) {
        return reply.code(404).send(errorResponse('域名映射不存在'));
      }

      return successResponse(null, '域名映射删除成功');
    } catch (error) {
      console.error('删除域名映射失败:', error);
      return reply.code(500).send(errorResponse('删除域名映射失败'));
    }
  });

  // 获取域名映射统计
  fastify.get('/stats', async (request, reply) => {
    try {
      const count = dnsService.getMappingsCount();
      return successResponse({ count });
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return reply.code(500).send(errorResponse('获取统计信息失败'));
    }
  });
};
