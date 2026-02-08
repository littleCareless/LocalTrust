// 导出后端类型
export type {
  SSHConnectionResult,
  SyncTask,
  CAInfo,
  SystemSettings
} from '@localtrust/types';

// ==================== 租户类型 ====================
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantForm {
  name: string;
  slug: string;
  description?: string;
}

export interface TenantSettings {
  dnsServer?: {
    type: string;
    port: number;
  };
  certificate?: {
    validityDays: number;
    algorithm: string;
  };
  sync?: {
    autoSync: boolean;
    interval: number;
  };
}

// ==================== 节点类型 ====================
export type NodeStatus = 'online' | 'offline' | 'unknown' | 'error';
export type OSType = 'linux' | 'macos' | 'windows';
export type AuthType = 'password' | 'private_key';

export interface Node {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  host: string;
  port: number;
  osType: OSType;
  status: NodeStatus;
  lastSeenAt?: string;
  tags: string[];
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SSHConfig {
  authType: AuthType;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  sudoRequired: boolean;
  sudoPassword?: string;
}

export interface CreateNodeForm {
  tenantId: string;
  name: string;
  host: string;
  port?: number;
  osType?: OSType;
  tags?: string[];
  isPrimary?: boolean;
  ssh?: SSHConfig;
}

export interface NodeStats {
  total: number;
  online: number;
  offline: number;
  unknown: number;
  error: number;
}

export interface SyncResult {
  nodeId: string;
  success: boolean;
  error?: string;
}

// ==================== 域名映射类型（多租户版） ====================
export interface DNSMapping {
  id: string;
  tenantId: string;
  domain: string;
  ip: string;
  port?: number;
  nodeId?: string;
  recordType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDNSMappingRequest {
  tenantId: string;
  domain: string;
  ip: string;
  port?: number;
  nodeId?: string;
  recordType?: string;
}

// ==================== 表单数据 ====================

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
