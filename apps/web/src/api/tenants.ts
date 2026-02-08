import api from './index';

// 租户类型定义
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
    interval: number;
  };
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  description?: string;
  settings?: TenantSettings;
}

export interface TenantDetails extends Tenant {
  nodes: Array<{
    id: string;
    name: string;
    host: string;
    status: string;
  }>;
  domainCount: number;
  nodeStats: {
    total: number;
    online: number;
    offline: number;
    error: number;
  };
}

export interface TenantStats {
  total: number;
  active: number;
  inactive: number;
}

// 获取租户列表
export function getTenants(): Promise<Tenant[]> {
  return api.get('/tenants');
}

// 获取租户详情（包含节点和域名统计）
export function getTenantDetails(id: string): Promise<TenantDetails> {
  return api.get(`/tenants/${id}/details`);
}

// 创建租户
export function createTenant(data: CreateTenantRequest): Promise<Tenant> {
  return api.post('/tenants', data);
}

// 更新租户
export function updateTenant(
  id: string,
  data: Partial<CreateTenantRequest> & { isActive?: boolean }
): Promise<Tenant> {
  return api.put(`/tenants/${id}`, data);
}

// 删除租户
export function deleteTenant(id: string): Promise<void> {
  return api.delete(`/tenants/${id}`);
}

// 获取租户统计
export function getTenantStats(): Promise<TenantStats> {
  return api.get('/tenants/stats');
}

// 更新租户设置
export function updateTenantSettings(
  id: string,
  settings: Partial<TenantSettings>
): Promise<TenantSettings> {
  return api.put(`/tenants/${id}/settings`, settings);
}
