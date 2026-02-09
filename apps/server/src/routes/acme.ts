import { FastifyPluginAsync } from 'fastify';
import {
  ACMEClient,
  getACMEAccounts,
  getACMEAccount,
  getACMCertificates,
  getExpiringCertificates,
  getRenewalLogs,
  getRenewalSettings,
  updateRenewalSettings,
  toggleAutoRenewal,
  deleteACMEAccount,
  deleteACMCertificate
} from '../services/acme-client';
import {
  checkCertificate,
  checkAndRenewCertificates,
  triggerManualCheck,
  getSchedulerStatus,
  exportCertificate
} from '../services/cert-renewal';
import type {
  CreateACMEAccountRequest,
  IssueACMECertificateRequest,
  RenewCertificateRequest,
  UpdateRenewalSettingsRequest
} from '@localtrust/types';

export const acmeRoutes: FastifyPluginAsync = async (fastify) => {
  // ==================== ACME 账户管理 ====================

  // 获取所有 ACME 账户
  fastify.get('/accounts', async () => {
    const accounts = getACMEAccounts();
    return {
      success: true,
      data: accounts
    };
  });

  // 获取单个 ACME 账户
  fastify.get('/accounts/:id', async (request) => {
    const { id } = request.params as { id: string };
    const account = getACMEAccount(id);
    
    if (!account) {
      return {
        success: false,
        error: '账户不存在'
      };
    }

    return {
      success: true,
      data: account
    };
  });

  // 创建 ACME 账户
  fastify.post<{ Body: CreateACMEAccountRequest }>('/accounts', async (request) => {
    const { email, serverUrl, acceptTermsOfService } = request.body;

    if (!email) {
      return {
        success: false,
        error: '邮箱地址必填'
      };
    }

    try {
      const client = new ACMEClient(serverUrl);
      const account = await client.createAccount(email, acceptTermsOfService || true);

      return {
        success: true,
        data: account,
        message: 'ACME 账户创建成功'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '创建账户失败'
      };
    }
  });

  // 删除 ACME 账户
  fastify.delete('/accounts/:id', async (request) => {
    const { id } = request.params as { id: string };
    
    const success = deleteACMEAccount(id);
    
    if (!success) {
      return {
        success: false,
        error: '账户不存在'
      };
    }

    return {
      success: true,
      message: '账户删除成功'
    };
  });

  // ==================== ACME 证书管理 ====================

  // 获取所有 ACME 证书
  fastify.get('/certificates', async () => {
    const certs = getACMCertificates();
    return {
      success: true,
      data: certs
    };
  });

  // 获取即将过期的证书
  fastify.get('/certificates/expiring', async (request) => {
    const { days } = request.query as { days?: string };
    const daysThreshold = parseInt(days || '30', 10);
    const certs = getExpiringCertificates(daysThreshold);
    
    return {
      success: true,
      data: certs,
      meta: {
        thresholdDays: daysThreshold,
        count: certs.length
      }
    };
  });

  // 获取单个证书详情
  fastify.get('/certificates/:id', async (request) => {
    const { id } = request.params as { id: string };
    const certs = getACMCertificates();
    const cert = certs.find(c => c.id === id);
    
    if (!cert) {
      return {
        success: false,
        error: '证书不存在'
      };
    }

    // 获取续期日志
    const logs = getRenewalLogs(id);

    return {
      success: true,
      data: {
        ...cert,
        renewalLogs: logs
      }
    };
  });

  // 申请新证书
  fastify.post<{ Body: IssueACMECertificateRequest }>('/certificates/issue', async (request) => {
    const { domain, accountId, challengeType, autoRenewal, notes } = request.body;

    if (!domain || !accountId) {
      return {
        success: false,
        error: '域名和账户 ID 必填'
      };
    }

    try {
      const client = new ACMEClient();
      const { certificate, challenges } = await client.issueCertificate([domain], accountId);

      // 启用自动续期
      if (autoRenewal) {
        toggleAutoRenewal(certificate.id, true);
      }

      // 更新备注
      if (notes) {
        require('../db').default.prepare('UPDATE acme_certificates SET notes = ? WHERE id = ?')
          .run(notes, certificate.id);
      }

      return {
        success: true,
        data: certificate,
        challenges: challenges,
        message: '证书申请成功。请配置 HTTP-01 挑战响应后完成验证。'
      };
    } catch (error: any) {
      fastify.log.error(error);
      return {
        success: false,
        error: error.message || '证书申请失败'
      };
    }
  });

  // 续期证书
  fastify.post<{ Body: RenewCertificateRequest }>('/certificates/:id/renew', async (request) => {
    const { id } = request.params as { id: string };
    const { force } = request.body || {};

    const certs = getACMCertificates();
    const cert = certs.find(c => c.id === id);
    
    if (!cert) {
      return {
        success: false,
        error: '证书不存在'
      };
    }

    // 检查是否强制续期
    if (!force) {
      const daysUntilExpiry = Math.ceil(
        (new Date(cert.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry > 30) {
        return {
          success: false,
          error: `证书还有 ${daysUntilExpiry} 天到期，无需立即续期`
        };
      }
    }

    try {
      const client = new ACMEClient();
      const renewedCert = await client.renewCertificate(id);

      return {
        success: true,
        data: renewedCert,
        message: '证书续期成功'
      };
    } catch (error: any) {
      fastify.log.error(error);
      return {
        success: false,
        error: error.message || '证书续期失败'
      };
    }
  });

  // 切换自动续期状态
  fastify.post('/certificates/:id/auto-renewal', async (request) => {
    const { id } = request.params as { id: string };
    const { enabled } = request.body as { enabled: boolean };

    toggleAutoRenewal(id, enabled);

    return {
      success: true,
      message: `自动续期已${enabled ? '启用' : '禁用'}`
    };
  });

  // 删除证书
  fastify.delete('/certificates/:id', async (request) => {
    const { id } = request.params as { id: string };
    
    const success = deleteACMCertificate(id);
    
    if (!success) {
      return {
        success: false,
        error: '证书不存在'
      };
    }

    return {
      success: true,
      message: '证书删除成功'
    };
  });

  // 获取证书状态
  fastify.get('/certificates/:id/status', async (request) => {
    const { id } = request.params as { id: string };

    try {
      const status = await checkCertificate(id);
      return {
        success: true,
        data: status
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 导出证书
  fastify.get('/certificates/:id/export', async (request) => {
    const { id } = request.params as { id: string };
    const { outputDir } = request.query as { outputDir?: string };

    try {
      const certs = getACMCertificates();
      const cert = certs.find(c => c.id === id);
      
      if (!cert) {
        return {
          success: false,
          error: '证书不存在'
        };
      }

      const output = outputDir || './data/certs/acme';
      const { certPath, keyPath } = exportCertificate(id, output);

      return {
        success: true,
        data: {
          certPath,
          keyPath
        },
        message: '证书已导出'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 获取续期日志
  fastify.get('/certificates/:id/logs', async (request) => {
    const { id } = request.params as { id: string };
    const logs = getRenewalLogs(id);

    return {
      success: true,
      data: logs
    };
  });

  // ==================== 续期设置管理 ====================

  // 获取续期设置
  fastify.get('/renewal/settings', async () => {
    const settings = getRenewalSettings();
    return {
      success: true,
      data: settings
    };
  });

  // 更新续期设置
  fastify.put<{ Body: UpdateRenewalSettingsRequest }>('/renewal/settings', async (request) => {
    updateRenewalSettings(request.body);
    const settings = getRenewalSettings();

    return {
      success: true,
      data: settings,
      message: '设置已更新'
    };
  });

  // 获取调度器状态
  fastify.get('/renewal/status', async () => {
    const status = getSchedulerStatus();
    return {
      success: true,
      data: status
    };
  });

  // 手动触发续期检查
  fastify.post('/renewal/check', async () => {
    try {
      const result = await triggerManualCheck();
      return {
        success: true,
        data: result,
        message: '检查完成'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // ==================== 挑战响应 ====================

  // 获取 HTTP-01 挑战响应
  fastify.get('/challenges/http-01/:token', async (request) => {
    const { token } = request.params as { token: string };
    
    // 从数据库获取挑战信息
    const challenge = require('../db').default
      .prepare('SELECT * FROM acme_challenges WHERE token = ? AND status = ?')
      .get(token, 'pending') as any;

    if (!challenge) {
      return {
        success: false,
        error: '挑战不存在或已过期'
      };
    }

    // 返回 keyAuthorization (ACME 协议要求的格式)
    return challenge.keyAuthorization;
  });

  // ==================== 批量操作 ====================

  // 批量检查证书状态
  fastify.post('/certificates/batch/check', async () => {
    const result = await checkAndRenewCertificates();
    
    return {
      success: true,
      data: result,
      message: `检查完成: ${result.checked} 个证书需要关注`
    };
  });

  // 获取统计信息
  fastify.get('/stats', async () => {
    const certs = getACMCertificates();
    const expiring30 = getExpiringCertificates(30);
    const expiring7 = getExpiringCertificates(7);
    const settings = getRenewalSettings();
    const schedulerStatus = getSchedulerStatus();

    const now = new Date();
    const stats = {
      totalCertificates: certs.length,
      activeCertificates: certs.filter(c => c.status === 'active').length,
      expiringIn30Days: expiring30.length,
      expiringIn7Days: expiring7.length,
      autoRenewalEnabled: certs.filter(c => c.autoRenewalEnabled).length,
      schedulerRunning: schedulerStatus.running,
      renewalEnabled: settings.renewalEnabled
    };

    return {
      success: true,
      data: stats
    };
  });
};
