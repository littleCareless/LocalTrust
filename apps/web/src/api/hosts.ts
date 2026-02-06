import request from './index';
import type { DNSMapping } from '@localtrust/types';

/**
 * 获取本机模式状态
 */
export async function getLocalModeStatus(): Promise<{
  hostsPath: string;
  permission: {
    hasPermission: boolean;
    message: string;
  };
  mappingsCount: number;
  mappings: DNSMapping[];
}> {
  return request.get('/api/hosts/status');
}

/**
 * 检查 hosts 文件权限
 */
export async function checkHostsPermission(): Promise<{
  hasPermission: boolean;
  message: string;
}> {
  return request.get('/api/hosts/permission');
}

/**
 * 读取 hosts 文件内容
 */
export async function getHostsContent(): Promise<{
  content: string;
}> {
  return request.get('/api/hosts/content');
}

/**
 * 获取 LocalTrust 管理的映射
 */
export async function getHostsMappings(): Promise<DNSMapping[]> {
  return request.get('/api/hosts/mappings');
}

/**
 * 同步映射到 hosts 文件
 */
export async function syncMappingsToHosts(data: {
  mappings: DNSMapping[];
  autoBackup?: boolean;
  backupDir?: string;
}): Promise<{ message: string }> {
  return request.post('/api/hosts/sync', data);
}

/**
 * 备份 hosts 文件
 */
export async function backupHostsFile(data?: { backupDir?: string }): Promise<{
  backupFile: string;
  message: string;
}> {
  return request.post('/api/hosts/backup', data || {});
}
