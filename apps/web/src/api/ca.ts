import api from './index';
import type { CAInfo } from '@localtrust/types';

/**
 * 获取 CA 证书信息
 */
export async function getCAInfo(): Promise<CAInfo | null> {
  return api.get('/api/ca/info');
}

/**
 * 生成 CA 证书
 */
export async function generateCA(data?: {
  commonName?: string;
  organization?: string;
}): Promise<CAInfo> {
  return api.post('/api/ca/generate', data);
}

/**
 * 下载 CA 证书
 */
export function downloadCA(): void {
  window.open('http://localhost:3001/api/ca/download', '_blank');
}
