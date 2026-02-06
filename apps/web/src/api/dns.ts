import api from './index';
import type { DNSMapping } from '@localtrust/types';

/**
 * 获取所有域名映射（根据当前模式自动选择数据源）
 */
export async function getDNSMappings(search?: string): Promise<DNSMapping[]> {
  const params = search ? { search } : {};
  return api.get('/api/mappings', { params });
}

/**
 * 创建域名映射
 */
export async function createDNSMapping(data: {
  domain: string;
  ip: string;
  port?: number;
}): Promise<DNSMapping> {
  return api.post('/api/dns/mappings', data);
}

/**
 * 删除域名映射
 */
export async function deleteDNSMapping(domain: string): Promise<void> {
  return api.delete(`/api/dns/mappings/${domain}`);
}

/**
 * 获取域名映射统计（根据当前模式自动选择数据源）
 */
export async function getDNSStats(): Promise<{ count: number }> {
  return api.get('/api/stats');
}
