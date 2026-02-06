// 导出后端类型
export type {
  DNSMapping,
  CAInfo,
  SystemSettings,
  DNSServerConfig,
  RouterConfig
} from '@localtrust/types';

// 前端特有类型

/**
 * 表单数据：添加域名映射
 */
export interface AddDomainForm {
  domain: string;
  ip: string;
  port?: number;
}

/**
 * 表单数据：系统设置
 */
export interface SettingsForm {
  mode: 'local' | 'dns_server' | 'router';
  dnsServer?: {
    type: string;
    configPath: string;
    restartCommand: string;
  };
  router?: {
    model: string;
    ip: string;
    sshUsername: string;
    sshPassword: string;
  };
}

/**
 * 统计数据
 */
export interface Stats {
  domainCount: number;
  mode: string;
  dnsStatus: 'running' | 'stopped' | 'unknown';
}
