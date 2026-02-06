import db from '../db';
import { generateRootCA, certificateExists, readCertificate, readPrivateKey } from './cert-generator';
import type { CAInfo } from '@localtrust/types';

/**
 * CA 证书服务
 */

/**
 * 生成根 CA 证书
 */
export function generateCA(options?: {
  commonName?: string;
  organization?: string;
}): CAInfo {
  const commonName = options?.commonName || 'LocalTrust Root CA';
  const organization = options?.organization || 'LocalTrust';

  // 生成证书
  const generated = generateRootCA({
    commonName,
    organization,
    validityDays: 3650 // 10年
  });

  // 保存到数据库
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO ca_info (
      common_name, organization, valid_from, valid_to,
      serial_number, fingerprint, cert_path, key_path, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    commonName,
    organization,
    generated.validFrom.toISOString(),
    generated.validTo.toISOString(),
    generated.serialNumber,
    generated.fingerprint,
    generated.certPath,
    generated.keyPath,
    now
  );

  return {
    commonName,
    organization,
    validFrom: generated.validFrom.toISOString(),
    validTo: generated.validTo.toISOString(),
    serialNumber: generated.serialNumber,
    fingerprint: generated.fingerprint,
    certPath: generated.certPath,
    keyPath: generated.keyPath
  };
}

/**
 * 获取 CA 证书信息
 */
export function getCAInfo(): CAInfo | null {
  const stmt = db.prepare(`
    SELECT common_name, organization, valid_from, valid_to,
           serial_number, fingerprint, cert_path, key_path
    FROM ca_info
    ORDER BY id DESC
    LIMIT 1
  `);

  const row = stmt.get() as {
    common_name: string;
    organization: string;
    valid_from: string;
    valid_to: string;
    serial_number: string;
    fingerprint: string;
    cert_path: string;
    key_path: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    commonName: row.common_name,
    organization: row.organization,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    serialNumber: row.serial_number,
    fingerprint: row.fingerprint,
    certPath: row.cert_path,
    keyPath: row.key_path
  };
}

/**
 * 检查 CA 证书是否存在
 */
export function caExists(): boolean {
  return certificateExists('ca');
}

/**
 * 获取 CA 证书文件路径
 */
export function getCAFilePath(): string | null {
  const info = getCAInfo();
  return info?.certPath || null;
}

/**
 * 读取 CA 证书内容
 */
export function readCACertificate(): string | null {
  const info = getCAInfo();
  if (!info) {
    return null;
  }

  try {
    return readCertificate(info.certPath);
  } catch (error) {
    console.error('读取 CA 证书失败:', error);
    return null;
  }
}

/**
 * 读取 CA 私钥内容
 */
export function readCAPrivateKey(): string | null {
  const info = getCAInfo();
  if (!info) {
    return null;
  }

  try {
    return readPrivateKey(info.keyPath);
  } catch (error) {
    console.error('读取 CA 私钥失败:', error);
    return null;
  }
}

/**
 * 初始化 CA（如果不存在则生成）
 */
export function initCA(): CAInfo {
  const existing = getCAInfo();
  if (existing && caExists()) {
    return existing;
  }

  console.log('🔐 生成根 CA 证书...');
  return generateCA();
}
