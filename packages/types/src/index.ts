// CA 证书相关类型
export interface CAInfo {
  commonName: string;
  organization: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  fingerprint: string;
  certPath?: string;
  keyPath?: string;
}

// DNS 映射相关类型
export interface DNSMapping {
  id: string;
  domain: string;
  ip: string;
  port?: number;
  managed?: boolean; // 是否由 LocalTrust 管理（本机模式专用）
  createdAt: string;
  updatedAt: string;
}

export interface CreateDNSMappingRequest {
  domain: string;
  ip: string;
  port?: number;
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
