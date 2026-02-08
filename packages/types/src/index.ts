// ==================== 租户/命名空间类型 ====================
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings: TenantSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
    interval: number; // 秒
  };
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  description?: string;
  settings?: TenantSettings;
}

export interface UpdateTenantRequest {
  name?: string;
  description?: string;
  settings?: TenantSettings;
  isActive?: boolean;
}

// ==================== 节点类型 ====================
export type NodeStatus = 'online' | 'offline' | 'unknown' | 'error';
export type OSType = 'linux' | 'macos' | 'windows';

export interface Node {
  id: string;
  tenantId: string;
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

export interface CreateNodeRequest {
  tenantId: string;
  name: string;
  host: string;
  port?: number;
  osType?: OSType;
  tags?: string[];
  isPrimary?: boolean;
}

export interface UpdateNodeRequest {
  name?: string;
  host?: string;
  port?: number;
  osType?: OSType;
  tags?: string[];
  isPrimary?: boolean;
}

// ==================== SSH 配置类型 ====================
export type AuthType = 'password' | 'private_key' | 'keyboard_interactive';

export interface SSHConfig {
  id: string;
  nodeId: string;
  authType: AuthType;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  sudoRequired: boolean;
  sudoPassword?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSSHConfigRequest {
  nodeId: string;
  authType?: AuthType;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  sudoRequired?: boolean;
  sudoPassword?: string;
}

export interface SSHConnectionResult {
  success: boolean;
  error?: string;
  output?: string;
  latency?: number; // ms
}

// ==================== DNS 映射类型（多租户版） ====================
export type RecordType = 'A' | 'CNAME' | 'AAAA';

export interface DNSMapping {
  id: string;
  tenantId: string;
  domain: string;
  ip: string;
  port?: number;
  nodeId?: string;
  recordType: RecordType;
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
  recordType?: RecordType;
}

// ==================== 同步任务类型 ====================
export type SyncTaskType = 'hosts' | 'dns' | 'certificate';
export type SyncTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SyncTask {
  id: string;
  tenantId: string;
  nodeId: string;
  taskType: SyncTaskType;
  status: SyncTaskStatus;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface CreateSyncTaskRequest {
  tenantId: string;
  nodeId: string;
  taskType: SyncTaskType;
}

// ==================== CA 证书相关类型（多租户版） ====================
export interface CAInfo {
  commonName: string;
  organization: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  fingerprint: string;
  certPath?: string;
  keyPath?: string;
  tenantId?: string;
}

// 证书相关类型
export interface Certificate {
  id: string;
  domain: string;
  commonName: string;
  subjectAltNames: string[];
  validFrom: string;
  validTo: string;
  serialNumber: string;
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
}

export interface IssueCertificateRequest {
  domain: string;
  subjectAltNames?: string[];
  validityDays?: number;
}

// 系统设置类型
export type SystemMode = 'local' | 'dns_server' | 'router';

export interface LocalModeConfig {
  hostsPath: string;
  autoBackup: boolean;
  backupPath?: string;
}

export interface DNSServerConfig {
  type: 'dnsmasq' | 'bind9' | 'coredns';
  configPath: string;
  restartCommand: string;
}

export interface RouterConfig {
  model: 'openwrt' | 'ddwrt' | 'tomato' | 'other';
  ip: string;
  sshUsername: string;
  sshPassword: string;
}

export interface SystemSettings {
  mode: SystemMode;
  localMode?: LocalModeConfig;
  dnsServer?: DNSServerConfig;
  router?: RouterConfig;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页类型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
