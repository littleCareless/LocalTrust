import { FastifyPluginAsync } from 'fastify';
import * as settingsService from '../services/settings.service';
import { successResponse, errorResponse } from '../utils/response';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取系统设置
  fastify.get('/', async (request, reply) => {
    try {
      const settings = settingsService.getSettings();
      return successResponse(settings);
    } catch (error) {
      console.error('获取系统设置失败:', error);
      return reply.code(500).send(errorResponse('获取系统设置失败'));
    }
  });

  // 更新系统设置
  fastify.put('/', async (request, reply) => {
    try {
      const settings = request.body as any;

      // 验证模式
      if (settings.mode && !['local', 'dns_server', 'router'].includes(settings.mode)) {
        return reply.code(400).send(errorResponse('无效的运行模式'));
      }

      const updated = settingsService.updateSettings(settings);
      return successResponse(updated, '系统设置更新成功');
    } catch (error) {
      console.error('更新系统设置失败:', error);
      return reply.code(500).send(errorResponse('更新系统设置失败'));
    }
  });

  // 获取当前运行模式
  fastify.get('/mode', async (request, reply) => {
    try {
      const mode = settingsService.getMode();
      return successResponse({ mode });
    } catch (error) {
      console.error('获取运行模式失败:', error);
      return reply.code(500).send(errorResponse('获取运行模式失败'));
    }
  });
};
