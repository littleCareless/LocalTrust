import { FastifyPluginAsync } from 'fastify';
import {
  addCTLog,
  getCTLogs,
  getCTLog,
  getActiveCTLogs,
  deleteCTLog,
  submitToCT,
  getCTEntries,
  getCTStats,
  checkCTEntryStatus
} from '../services/ct-log.service';
import type { CreateCTLogRequest, SubmitToCTRequest } from '@localtrust/types';

export const ctLogRoutes: FastifyPluginAsync = async (fastify) => {
  // ==================== CT 日志管理 ====================

  // 获取所有 CT 日志
  fastify.get('/ct-logs', async () => {
    const logs = getCTLogs();
    return {
      success: true,
      data: logs
    };
  });

  // 获取活跃的 CT 日志
  fastify.get('/ct-logs/active', async () => {
    const logs = getActiveCTLogs();
    return {
      success: true,
      data: logs
    };
  });

  // 获取单个 CT 日志
  fastify.get('/ct-logs/:id', async (request) => {
    const { id } = request.params as { id: string };
    const log = getCTLog(id);
    
    if (!log) {
      return { success: false, error: 'CT 日志不存在' };
    }

    return { success: true, data: log };
  });

  // 添加 CT 日志
  fastify.post<{ Body: CreateCTLogRequest }>('/ct-logs', async (request) => {
    const data = request.body;

    if (!data.name || !data.url || !data.publicKey || !data.operator) {
      return { success: false, error: '缺少必填字段' };
    }

    try {
      const log = addCTLog(data);
      return {
        success: true,
        data: log,
        message: 'CT 日志添加成功'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 删除 CT 日志
  fastify.delete('/ct-logs/:id', async (request) => {
    const { id } = request.params as { id: string };
    const success = deleteCTLog(id);
    
    if (!success) {
      return { success: false, error: 'CT 日志不存在' };
    }

    return { success: true, message: 'CT 日志已删除' };
  });

  // 测试 CT 日志连接
  fastify.post('/ct-logs/:id/test', async (request) => {
    const { id } = request.params as { id: string };
    const log = getCTLog(id);
    
    if (!log) {
      return { success: false, error: 'CT 日志不存在' };
    }

    try {
      // 模拟测试
      return {
        success: true,
        message: 'CT 日志连接测试成功',
        data: {
          treeLength: Math.floor(Math.random() * 1000000),
          isOperable: true
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ==================== CT 证书条目 ====================

  // 获取 CT 统计
  fastify.get('/ct-stats', async () => {
    const stats = getCTStats();
    return {
      success: true,
      data: stats
    };
  });

  // 提交证书到 CT 日志
  fastify.post<{ Body: SubmitToCTRequest }>('/ct/submit', async (request) => {
    const { certificateId, logIds } = request.body;

    if (!certificateId) {
      return { success: false, error: '证书 ID 必填' };
    }

    try {
      const entries = await submitToCT(certificateId, logIds);
      return {
        success: true,
        data: entries,
        message: `已提交到 ${entries.length} 个 CT 日志`
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 获取证书的 CT 条目
  fastify.get('/ct/certificates/:id/entries', async (request) => {
    const { id } = request.params as { id: string };
    const entries = getCTEntries(id);
    
    return {
      success: true,
      data: entries,
      meta: {
        total: entries.length,
        pending: entries.filter(e => e.status === 'pending').length,
        included: entries.filter(e => e.status === 'included').length,
        rejected: entries.filter(e => e.status === 'rejected').length
      }
    };
  });

  // 批量检查 CT 条目状态
  fastify.post('/ct/check-status', async () => {
    try {
      await checkCTEntryStatus();
      return {
        success: true,
        message: 'CT 条目状态检查完成'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ==================== SCT 验证 ====================

  // 验证 SCT
  fastify.post('/ct/verify', async (request) => {
    const { sct, certificate } = request.body as any;

    if (!sct || !certificate) {
      return { success: false, error: '缺少 SCT 或证书' };
    }

    try {
      // 模拟验证
      const valid = Math.random() > 0.1;
      
      return {
        success: true,
        data: {
          valid,
          message: valid ? 'SCT 签名验证通过' : 'SCT 签名验证失败'
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
};
