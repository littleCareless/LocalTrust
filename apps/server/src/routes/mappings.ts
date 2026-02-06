import type { FastifyInstance } from 'fastify';
import * as hostsService from '../services/hosts.service.js';
import * as dnsService from '../services/dns.service.js';
import * as settingsService from '../services/settings.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export default async function mappingsRoutes(fastify: FastifyInstance) {
  // 获取当前生效的域名映射（根据模式自动选择数据源）
  fastify.get('/mappings', async (request, reply) => {
    try {
      const settings = settingsService.getSettings();

      if (settings.mode === 'local') {
        // 本机模式：从 hosts 文件读取所有域名
        const permission = hostsService.checkHostsPermission();

        if (!permission.hasPermission) {
          return errorResponse('没有 hosts 文件读取权限');
        }

        const content = hostsService.readHostsFile();
        const mappings = hostsService.parseAllHostsFile(content);
        return successResponse(mappings);
      } else {
        // DNS 服务器模式：从数据库读取
        const mappings = await dnsService.getAllMappings();
        return successResponse(mappings);
      }
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取域名映射失败');
    }
  });

  // 获取域名统计信息（根据模式自动选择数据源）
  fastify.get('/stats', async (request, reply) => {
    try {
      const settings = settingsService.getSettings();

      if (settings.mode === 'local') {
        // 本机模式：统计 hosts 文件中的域名
        const permission = hostsService.checkHostsPermission();

        if (!permission.hasPermission) {
          return successResponse({ count: 0, hasPermission: false });
        }

        const content = hostsService.readHostsFile();
        const mappings = hostsService.parseAllHostsFile(content);
        return successResponse({
          count: mappings.length,
          managed: mappings.filter(m => m.managed).length,
          manual: mappings.filter(m => !m.managed).length,
          hasPermission: true
        });
      } else {
        // DNS 服务器模式：统计数据库中的域名
        const count = dnsService.getMappingsCount();
        return successResponse({ count, hasPermission: true });
      }
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取统计信息失败');
    }
  });
}
