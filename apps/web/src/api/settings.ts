import api from './index';
import type { SystemSettings } from '@localtrust/types';

/**
 * 获取系统设置
 */
export async function getSettings(): Promise<SystemSettings> {
  return api.get('/api/settings');
}

/**
 * 更新系统设置
 */
export async function updateSettings(settings: SystemSettings): Promise<SystemSettings> {
  return api.put('/api/settings', settings);
}

/**
 * 获取当前运行模式
 */
export async function getMode(): Promise<{ mode: 'local' | 'dns_server' | 'router' }> {
  return api.get('/api/settings/mode');
}
