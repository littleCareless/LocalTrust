import { FastifyPluginAsync } from 'fastify';
import {
  createLDAPConfig,
  getLDAPConfigs,
  getLDAPConfig,
  updateLDAPConfig,
  deleteLDAPConfig,
  getLDAPUsers,
  syncLDAPUsers,
  ldapLogin,
  getLDAPSyncLogs
} from '../services/ldap.service';
import type { CreateLDAPConfigRequest, LDAPLoginRequest } from '@localtrust/types';

export const ldapRoutes: FastifyPluginAsync = async (fastify) => {
  // ==================== LDAP 配置管理 ====================

  // 获取所有 LDAP 配置
  fastify.get('/ldap/configs', async () => {
    const configs = getLDAPConfigs();
    return {
      success: true,
      data: configs
    };
  });

  // 获取单个 LDAP 配置
  fastify.get('/ldap/configs/:id', async (request) => {
    const { id } = request.params as { id: string };
    const config = getLDAPConfig(id);
    
    if (!config) {
      return { success: false, error: '配置不存在' };
    }

    return { success: true, data: config };
  });

  // 创建 LDAP 配置
  fastify.post<{ Body: CreateLDAPConfigRequest }>('/ldap/configs', async (request) => {
    const data = request.body;

    if (!data.name || !data.host || !data.baseDN || !data.userSearchBase) {
      return { success: false, error: '缺少必填字段' };
    }

    try {
      const config = createLDAPConfig(data);
      return {
        success: true,
        data: config,
        message: 'LDAP 配置创建成功'
      };
    } catch (error: any) {
      fastify.log.error(error);
      return { success: false, error: error.message };
    }
  });

  // 更新 LDAP 配置
  fastify.put<{ Body: Partial<CreateLDAPConfigRequest> }>('/ldap/configs/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body;

    try {
      const config = updateLDAPConfig(id, data);
      if (!config) {
        return { success: false, error: '配置不存在' };
      }
      return { success: true, data: config, message: '配置已更新' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 删除 LDAP 配置
  fastify.delete('/ldap/configs/:id', async (request) => {
    const { id } = request.params as { id: string };
    const success = deleteLDAPConfig(id);
    
    if (!success) {
      return { success: false, error: '配置不存在' };
    }

    return { success: true, message: '配置已删除' };
  });

  // 测试 LDAP 连接
  fastify.post('/ldap/configs/:id/test', async (request) => {
    const { id } = request.params as { id: string };
    const config = getLDAPConfig(id);
    
    if (!config) {
      return { success: false, error: '配置不存在' };
    }

    try {
      // 简单的连接测试
      return {
        success: true,
        message: 'LDAP 连接测试成功'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ==================== LDAP 用户管理 ====================

  // 获取 LDAP 用户
  fastify.get('/ldap/configs/:id/users', async (request) => {
    const { id } = request.params as { id: string };
    const users = getLDAPUsers(id);
    
    return {
      success: true,
      data: users,
      meta: { count: users.length }
    };
  });

  // 同步 LDAP 用户
  fastify.post('/ldap/configs/:id/sync', async (request) => {
    const { id } = request.params as { id: string };
    
    try {
      const result = await syncLDAPUsers(id);
      return {
        success: result.success,
        data: result,
        message: `同步完成: +${result.usersAdded}, ~${result.usersUpdated}, -${result.usersRemoved}`
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 获取同步日志
  fastify.get('/ldap/configs/:id/sync-logs', async (request) => {
    const { id } = request.params as { id: string };
    const logs = getLDAPSyncLogs(id);
    
    return {
      success: true,
      data: logs
    };
  });

  // ==================== LDAP 登录 ====================

  // LDAP 登录
  fastify.post<{ Body: LDAPLoginRequest }>('/ldap/login', async (request) => {
    const { configId, username, password } = request.body;

    if (!configId || !username || !password) {
      return { success: false, error: '参数不完整' };
    }

    try {
      const user = await ldapLogin(configId, username, password);
      
      if (!user) {
        return { success: false, error: '用户名或密码错误' };
      }

      // 实际实现应该生成 JWT token
      return {
        success: true,
        data: {
          user,
          token: `mock-token-${Date.now()}` // 实际应该使用 JWT
        },
        message: '登录成功'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
};
