import type {
  ACMEAccount,
  ACMECertificate,
  CertificateRenewalSettings,
  ApiResponse
} from '@localtrust/types';

const API_BASE = '/api/acme';

// ACME 账户管理
export const acmeApi = {
  // 获取所有账户
  getAccounts: async (): Promise<ApiResponse<ACMEAccount[]>> => {
    const response = await fetch(`${API_BASE}/accounts`);
    return response.json();
  },

  // 获取单个账户
  getAccount: async (id: string): Promise<ApiResponse<ACMEAccount>> => {
    const response = await fetch(`${API_BASE}/accounts/${id}`);
    return response.json();
  },

  // 创建账户
  createAccount: async (data: {
    email: string;
    serverUrl?: string;
    acceptTermsOfService?: boolean;
  }): Promise<ApiResponse<ACMEAccount>> => {
    const response = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // 删除账户
  deleteAccount: async (id: string): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // 获取所有证书
  getCertificates: async (): Promise<ApiResponse<ACMECertificate[]>> => {
    const response = await fetch(`${API_BASE}/certificates`);
    return response.json();
  },

  // 获取即将过期的证书
  getExpiringCertificates: async (days?: number): Promise<ApiResponse<ACMECertificate[]>> => {
    const url = days 
      ? `${API_BASE}/certificates/expiring?days=${days}`
      : `${API_BASE}/certificates/expiring`;
    const response = await fetch(url);
    return response.json();
  },

  // 获取单个证书
  getCertificate: async (id: string): Promise<ApiResponse<ACMECertificate & { renewalLogs: any[] }>> => {
    const response = await fetch(`${API_BASE}/certificates/${id}`);
    return response.json();
  },

  // 申请证书
  issueCertificate: async (data: {
    domain: string;
    accountId: string;
    challengeType?: 'http-01';
    autoRenewal?: boolean;
    notes?: string;
  }): Promise<ApiResponse<ACMECertificate>> => {
    const response = await fetch(`${API_BASE}/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // 续期证书
  renewCertificate: async (id: string, force?: boolean): Promise<ApiResponse<ACMECertificate>> => {
    const response = await fetch(`${API_BASE}/certificates/${id}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force })
    });
    return response.json();
  },

  // 切换自动续期
  toggleAutoRenewal: async (id: string, enabled: boolean): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE}/certificates/${id}/auto-renewal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    return response.json();
  },

  // 删除证书
  deleteCertificate: async (id: string): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE}/certificates/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // 获取证书状态
  getCertificateStatus: async (id: string): Promise<ApiResponse<{
    status: 'valid' | 'expiring_soon' | 'expired' | 'renewing';
    daysUntilExpiry: number;
    autoRenewalEnabled: boolean;
  }>> => {
    const response = await fetch(`${API_BASE}/certificates/${id}/status`);
    return response.json();
  },

  // 导出证书
  exportCertificate: async (id: string, outputDir?: string): Promise<ApiResponse<{
    certPath: string;
    keyPath: string;
  }>> => {
    const url = outputDir 
      ? `${API_BASE}/certificates/${id}/export?outputDir=${encodeURIComponent(outputDir)}`
      : `${API_BASE}/certificates/${id}/export`;
    const response = await fetch(url);
    return response.json();
  },

  // 获取续期日志
  getRenewalLogs: async (id: string): Promise<ApiResponse<any[]>> => {
    const response = await fetch(`${API_BASE}/certificates/${id}/logs`);
    return response.json();
  },

  // 获取续期设置
  getRenewalSettings: async (): Promise<ApiResponse<CertificateRenewalSettings>> => {
    const response = await fetch(`${API_BASE}/renewal/settings`);
    return response.json();
  },

  // 更新续期设置
  updateRenewalSettings: async (settings: Partial<CertificateRenewalSettings>): Promise<ApiResponse<CertificateRenewalSettings>> => {
    const response = await fetch(`${API_BASE}/renewal/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return response.json();
  },

  // 获取调度器状态
  getSchedulerStatus: async (): Promise<ApiResponse<{
    running: boolean;
    renewalEnabled: boolean;
    nextCheck: string | null;
  }>> => {
    const response = await fetch(`${API_BASE}/renewal/status`);
    return response.json();
  },

  // 手动触发检查
  triggerManualCheck: async (): Promise<ApiResponse<{
    checked: number;
    renewed: number;
    failed: number;
  }>> => {
    const response = await fetch(`${API_BASE}/renewal/check`, {
      method: 'POST'
    });
    return response.json();
  },

  // 获取统计信息
  getStats: async (): Promise<ApiResponse<{
    totalCertificates: number;
    activeCertificates: number;
    expiringIn30Days: number;
    expiringIn7Days: number;
    autoRenewalEnabled: number;
    schedulerRunning: boolean;
    renewalEnabled: boolean;
  }>> => {
    const response = await fetch(`${API_BASE}/stats`);
    return response.json();
  },

  // 批量检查
  batchCheck: async (): Promise<ApiResponse<{
    checked: number;
    renewed: number;
    failed: number;
  }>> => {
    const response = await fetch(`${API_BASE}/certificates/batch/check`, {
      method: 'POST'
    });
    return response.json();
  }
};
