import type { FastifyInstance } from 'fastify';
import * as hostsService from '../services/hosts.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export default async function hostsRoutes(fastify: FastifyInstance) {
  // 获取本机模式状态
  fastify.get('/status', async (request, reply) => {
    try {
      const status = hostsService.getLocalModeStatus();
      return successResponse(status);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取本机模式状态失败');
    }
  });

  // 检查 hosts 文件权限
  fastify.get('/permission', async (request, reply) => {
    try {
      const permission = hostsService.checkHostsPermission();
      return successResponse(permission);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '检查权限失败');
    }
  });

  // 读取 hosts 文件内容
  fastify.get('/content', async (request, reply) => {
    try {
      const content = hostsService.readHostsFile();
      return successResponse({ content });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '读取 hosts 文件失败');
    }
  });

  // 获取 LocalTrust 管理的映射
  fastify.get('/mappings', async (request, reply) => {
    try {
      const content = hostsService.readHostsFile();
      const mappings = hostsService.parseHostsFile(content);
      return successResponse(mappings);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取域名映射失败');
    }
  });

  // 同步映射到 hosts 文件
  fastify.post('/sync', async (request, reply) => {
    try {
      const { mappings, autoBackup, backupDir } = request.body as {
        mappings: any[];
        autoBackup?: boolean;
        backupDir?: string;
      };

      hostsService.syncMappingsToHosts(mappings, autoBackup, backupDir);
      return successResponse({ message: '同步成功' });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '同步失败');
    }
  });

  // 备份 hosts 文件
  fastify.post('/backup', async (request, reply) => {
    try {
      const { backupDir } = request.body as { backupDir?: string };
      const backupFile = hostsService.backupHostsFile(backupDir);
      return successResponse({ backupFile, message: '备份成功' });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '备份失败');
    }
  });
}
