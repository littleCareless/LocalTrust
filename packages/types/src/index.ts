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

// ==================== ACME 协议相关类型 ====================
export type ACMEChallengeType = 'http-01' | 'dns-01';
export type ACMEChallengeStatus = 'pending' | 'valid' | 'invalid';
export type ACMEAccountStatus = 'active' | 'deactivated' | 'revoked';

export interface ACMEAccount {
  id: string;
  email: string;
  serverUrl: string;
  isActive: boolean;
  termsOfServiceAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ACMECertificate {
  id: string;
  domain: string;
  accountId: string;
  cert: string;
  privateKey: string;
  issuerId?: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  fingerprint: string;
  status: 'active' | 'expired' | 'revoked' | 'renewing';
  renewalCount: number;
  autoRenewalEnabled: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ACMERenewalLog {
  id: string;
  certificateId: string;
  action: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface ACMEChallenge {
  id: string;
  certificateId: string;
  challengeType: ACMEChallengeType;
  token: string;
  keyAuthorization: string;
  status: ACMEChallengeStatus;
  validatedAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface CertificateRenewalSettings {
  renewalEnabled: boolean;
  reminderDaysBefore: number;
  autoRenewalDaysBefore: number;
  maxRenewalAttempts: number;
  notifyEmail?: string;
  webhookUrl?: string;
}

// ACME API 请求类型
export interface CreateACMEAccountRequest {
  email: string;
  serverUrl?: string;
  acceptTermsOfService?: boolean;
}

export interface IssueACMECertificateRequest {
  domain: string;
  accountId: string;
  challengeType?: ACMEChallengeType;
  autoRenewal?: boolean;
  notes?: string;
}

export interface RenewCertificateRequest {
  certificateId: string;
  force?: boolean;
}

export interface UpdateRenewalSettingsRequest {
  renewalEnabled?: boolean;
  reminderDaysBefore?: number;
  autoRenewalDaysBefore?: number;
  maxRenewalAttempts?: number;
  notifyEmail?: string;
  webhookUrl?: string;
}

// ACME 服务端点类型
export interface ACMEDirectory {
  newNonce: string;
  newAccount: string;
  newOrder: string;
  revokeCert: string;
  keyChange: string;
}

export interface ACMEOrder {
  status: 'pending' | 'ready' | 'processing' | 'valid' | 'invalid';
  expires: string;
  identifiers: { type: string; value: string }[];
  authorizations: string[];
  finalize: string;
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

// ==================== LDAP/AD 认证相关类型 ====================
export type LDAPProtocol = 'ldap' | 'ldaps';
export type LDAPAuthMethod = 'simple' | 'sasl';
export type LDAPUserStatus = 'active' | 'inactive' | 'disabled';

export interface LDAPConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: LDAPProtocol;
  baseDN: string;
  userDNTemplate?: string;
  groupDNTemplate?: string;
  bindDN?: string;
  bindPassword?: string;
  useSSL: boolean;
  startTLS: boolean;
  authMethod: LDAPAuthMethod;
  userSearchBase: string;
  userSearchFilter: string;
  groupSearchBase?: string;
  groupSearchFilter?: string;
  syncEnabled: boolean;
  syncInterval: number; // 分钟
  syncUsersOnly: boolean;
  defaultTenantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LDAPUser {
  id: string;
  configId: string;
  username: string;
  displayName: string;
  email: string;
  dn: string;
  memberOf: string[];
  tenantId?: string;
  status: LDAPUserStatus;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LDAPGroup {
  id: string;
  configId: string;
  name: string;
  dn: string;
  memberCount: number;
  createdAt: string;
}

export interface LDAPSyncResult {
  success: boolean;
  usersAdded: number;
  usersUpdated: number;
  usersRemoved: number;
  groupsFound: number;
  errors: string[];
  syncedAt: string;
}

// API 请求类型
export interface CreateLDAPConfigRequest {
  name: string;
  host: string;
  port?: number;
  protocol?: LDAPProtocol;
  baseDN: string;
  userDNTemplate?: string;
  groupDNTemplate?: string;
  bindDN?: string;
  bindPassword?: string;
  useSSL?: boolean;
  startTLS?: boolean;
  authMethod?: LDAPAuthMethod;
  userSearchBase: string;
  userSearchFilter?: string;
  groupSearchBase?: string;
  groupSearchFilter?: string;
  syncEnabled?: boolean;
  syncInterval?: number;
  syncUsersOnly?: boolean;
  defaultTenantId?: string;
}

export interface UpdateLDAPConfigRequest extends Partial<CreateLDAPConfigRequest> {
  isActive?: boolean;
}

export interface LDAPLoginRequest {
  configId: string;
  username: string;
  password: string;
}

export interface LDAPLoginResponse {
  success: boolean;
  user: LDAPUser;
  token?: string;
  message?: string;
}

// ==================== 高可用集群相关类型 ====================
export type ClusterNodeStatus = 'online' | 'offline' | 'joining' | 'leaving' | 'unhealthy';
export type ClusterRole = 'primary' | 'replica' | 'witness';
export type ClusterSyncStatus = 'synced' | 'syncing' | 'out_of_sync' | 'unknown';

export interface ClusterConfig {
  id: string;
  name: string;
  nodeId: string;
  clusterId: string;
  role: ClusterRole;
  host: string;
  port: number;
  apiPort: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  isPrimary: boolean;
  status: ClusterNodeStatus;
  lastHeartbeatAt?: string;
  lastSyncAt?: string;
  syncStatus: ClusterSyncStatus;
  syncLatency?: number;
  replicationLag?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClusterInfo {
  id: string;
  name: string;
  totalNodes: number;
  onlineNodes: number;
  primaryNode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClusterMember {
  nodeId: string;
  name: string;
  host: string;
  role: ClusterRole;
  status: ClusterNodeStatus;
  lastHeartbeatAt?: string;
  syncStatus: ClusterSyncStatus;
}

// API 请求类型
export interface CreateClusterRequest {
  name: string;
  nodes: {
    host: string;
    port?: number;
    apiPort?: number;
    role?: ClusterRole;
  }[];
}

export interface JoinClusterRequest {
  clusterId: string;
  host: string;
  port?: number;
  apiPort?: number;
  role?: ClusterRole;
}

export interface LeaveClusterRequest {
  nodeId: string;
  force?: boolean;
}

// ==================== 证书透明度日志相关类型 ====================
export type CTLogStatus = 'active' | 'retired' | 'rejected';
export type CTEntryType = 'X509' | 'Precert';

export interface CTLog {
  id: string;
  name: string;
  url: string;
  publicKey: string;
  status: CTLogStatus;
  operator: string;
  country?: string;
  treeLength: number;
  latestSCTTimestamp?: string;
  addedAt: string;
  removedAt?: string;
}

export interface CTSertificateEntry {
  id: string;
  certificateId: string;
  logId: string;
  logName: string;
  entryType: CTEntryType;
  sctVersion: number;
  sctTimestamp: string;
  serialNumber: string;
  domain: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  addedToLogAt: string;
  inclusionProof?: string;
  merkleLeafHash?: string;
  status: 'pending' | 'included' | 'rejected';
  errorMessage?: string;
  createdAt: string;
}

export interface CTLogStats {
  totalEntries: number;
  pendingEntries: number;
  includedEntries: number;
  rejectedEntries: number;
  lastEntryAt?: string;
}

// API 请求类型
export interface CreateCTLogRequest {
  name: string;
  url: string;
  publicKey: string;
  operator: string;
  country?: string;
}

export interface SubmitToCTRequest {
  certificateId: string;
  logIds?: string[]; // 指定提交到哪些日志，默认全部
}

// ==================== Kubernetes 集成相关类型 ====================
export type K8sClusterStatus = 'connected' | 'disconnected' | 'error';
export type K8sAuthType = 'kubeconfig' | 'service_account' | 'token';
export type K8sResourceType = 'secret' | 'configmap' | 'ingress';

export interface K8sCluster {
  id: string;
  name: string;
  kubeconfig: string;
  context?: string;
  namespace: string;
  authType: K8sAuthType;
  token?: string;
  certificateData?: string;
  serverUrl?: string;
  insecureSkipTLSVerify: boolean;
  status: K8sClusterStatus;
  lastConnectedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface K8sSecret {
  name: string;
  namespace: string;
  type: string;
  data: Record<string, string>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface K8sConfigMap {
  name: string;
  namespace: string;
  data: Record<string, string>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface K8sIngress {
  name: string;
  namespace: string;
  host: string;
  serviceName: string;
  servicePort: number;
  tlsEnabled: boolean;
  tlsSecretName?: string;
  annotations?: Record<string, string>;
  createdAt?: string;
}

export interface K8sSyncResult {
  success: boolean;
  secretsCreated: number;
  secretsUpdated: number;
  secretsDeleted: number;
  configmapsCreated: number;
  configmapsUpdated: number;
  ingressesCreated: number;
  ingressesUpdated: number;
  errors: string[];
  syncedAt: string;
}

// API 请求类型
export interface CreateK8sClusterRequest {
  name: string;
  kubeconfig: string;
  context?: string;
  namespace?: string;
  authType?: K8sAuthType;
  insecureSkipTLSVerify?: boolean;
}

export interface UpdateK8sClusterRequest {
  name?: string;
  kubeconfig?: string;
  context?: string;
  namespace?: string;
  authType?: K8sAuthType;
  insecureSkipTLSVerify?: boolean;
}

export interface SyncCertificatesToK8sRequest {
  clusterId: string;
  namespace: string;
  certificates: {
    certificateId: string;
    secretName: string;
    certKey?: string;
    caCertKey?: string;
  }[];
}

export interface DeployIngressRequest {
  clusterId: string;
  namespace: string;
  domain: string;
  serviceName: string;
  servicePort: number;
  certificateId?: string;
  annotations?: Record<string, string>;
}
