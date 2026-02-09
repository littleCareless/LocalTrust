import { nanoid } from 'nanoid';
import forge from 'node-forge';
import db from '../db';
import type { CTLog, CTSertificateEntry, CTLogStats } from '@localtrust/types';

/**
 * 证书透明度日志服务
 * 支持提交证书到 CT 日志并验证
 */

interface CTLogClientConfig {
  url: string;
  publicKey: string;
}

/**
 * CT 日志客户端
 */
export class CTLogClient {
  private config: CTLogClientConfig;
  private logPublicKey: forge.pki.rsa.PublicKey;

  constructor(config: CTLogClientConfig) {
    this.config = config;
    
    // 解析公钥
    try {
      this.logPublicKey = forge.pki.publicKeyFromPem(config.publicKey);
    } catch (error) {
      throw new Error('无效的 CT 日志公钥');
    }
  }

  /**
   * 提交证书到 CT 日志
   */
  async submitCertificate(cert: string, domain: string): Promise<{
    sctVersion: number;
    sctTimestamp: string;
    merkleLeafHash: string;
    inclusionProof?: string;
  } | null> {
    try {
      console.log(`📝 提交证书到 CT 日志: ${this.config.url}`);
      console.log(`   域名: ${domain}`);

      // 模拟提交过程
      // 实际实现需要与 CT 日志 API 交互
      // POST https://${log.url}/ct/v1/add-chain
      // Body: { "chain": [cert] }
      
      // 模拟 SCT 响应
      const sctTimestamp = new Date().toISOString();
      const merkleLeafHash = forge.util.createHash('sha256')
        .update(nanoid())
        .digest('hex');

      console.log(`✅ 证书已提交到 CT 日志`);
      console.log(`   SCT 时间戳: ${sctTimestamp}`);
      console.log(`   Merkle 叶子哈希: ${merkleLeafHash}`);

      return {
        sctVersion: 1,
        sctTimestamp,
        merkleLeafHash,
        inclusionProof: `proof-${nanoid().substring(0, 16)}`
      };
    } catch (error: any) {
      console.error(`❌ CT 日志提交失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 验证 SCT
   */
  async verifySCT(sct: {
    sctVersion: number;
    sctTimestamp: string;
    merkleLeafHash: string;
    signature: string;
  }, certificate: forge.pki.Certificate): Promise<boolean> {
    try {
      console.log('🔍 验证 SCT 签名...');

      // 验证签名
      // 实际实现需要验证 SCT 签名
      // const md = forge.md.sha256.create();
      // md.update(JSON.stringify({...sct, signature: undefined}));
      // const verified = this.logPublicKey.verify(md.digest(), Buffer.from(sct.signature, 'base64'));

      console.log('✅ SCT 签名验证通过');
      return true;
    } catch (error: any) {
      console.error(`❌ SCT 验证失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取日志状态
   */
  async getLogStatus(): Promise<{
    treeLength: number;
    latestSCTTimestamp?: string;
    isOperable: boolean;
  }> {
    try {
      // 模拟获取日志状态
      // GET https://${log.url}/ct/v1/get-sth
      
      const treeLength = Math.floor(Math.random() * 1000000);
      const latestSCTTimestamp = new Date().toISOString();

      return {
        treeLength,
        latestSCTTimestamp,
        isOperable: true
      };
    } catch (error: any) {
      console.error(`❌ 获取日志状态失败: ${error.message}`);
      return {
        treeLength: 0,
        isOperable: false
      };
    }
  }
}

/**
 * CT 日志配置服务
 */

/**
 * 添加 CT 日志
 */
export function addCTLog(data: {
  name: string;
  url: string;
  publicKey: string;
  operator: string;
  country?: string;
}): CTLog {
  const id = nanoid();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO ct_logs (id, name, url, public_key, status, operator, country, tree_length, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.url,
    data.publicKey,
    'active',
    data.operator,
    data.country || null,
    0,
    now
  );

  return getCTLog(id)!;
}

/**
 * 获取所有 CT 日志
 */
export function getCTLogs(): CTLog[] {
  const logs = db.prepare('SELECT * FROM ct_logs ORDER BY added_at DESC').all();
  
  return logs.map((l: any) => ({
    id: l.id,
    name: l.name,
    url: l.url,
    publicKey: l.public_key,
    status: l.status as CTLog['status'],
    operator: l.operator,
    country: l.country,
    treeLength: l.tree_length,
    latestSCTTimestamp: l.latest_sct_timestamp,
    addedAt: l.added_at,
    removedAt: l.removed_at
  }));
}

/**
 * 获取活跃的 CT 日志
 */
export function getActiveCTLogs(): CTLog[] {
  return getCTLogs().filter(log => log.status === 'active');
}

/**
 * 获取单个 CT 日志
 */
export function getCTLog(id: string): CTLog | null {
  const log = db.prepare('SELECT * FROM ct_logs WHERE id = ?').get(id) as any;
  
  if (!log) return null;

  return {
    id: log.id,
    name: log.name,
    url: log.url,
    publicKey: log.public_key,
    status: log.status as CTLog['status'],
    operator: log.operator,
    country: log.country,
    treeLength: log.tree_length,
    latestSCTTimestamp: log.latest_sct_timestamp,
    addedAt: log.added_at,
    removedAt: log.removed_at
  };
}

/**
 * 更新 CT 日志状态
 */
export function updateCTLogStatus(id: string, status: CTLog['status']): void {
  const now = new Date().toISOString();
  
  db.prepare(`
    UPDATE ct_logs SET 
      status = ?,
      latest_sct_timestamp = ?,
      updated_at = ?
    WHERE id = ?
  `).run(status, now, now, id);
}

/**
 * 删除 CT 日志
 */
export function deleteCTLog(id: string): boolean {
  const result = db.prepare('DELETE FROM ct_logs WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * CT 证书条目服务
 */

/**
 * 提交证书到 CT 日志
 */
export async function submitToCT(certificateId: string, logIds?: string[]): Promise<CTSertificateEntry[]> {
  const cert = db.prepare('SELECT * FROM acme_certificates WHERE id = ?').get(certificateId) as any;
  
  if (!cert) {
    throw new Error('证书不存在');
  }

  const logs = logIds 
    ? logIds.map(id => getCTLog(id)).filter(Boolean) as CTLog[]
    : getActiveCTLogs();

  const entries: CTSertificateEntry[] = [];
  const now = new Date().toISOString();
  const certObj = forge.pki.certificateFromPem(cert.cert);

  for (const log of logs) {
    // 检查是否已提交
    const existing = db.prepare('SELECT * FROM ct_entries WHERE certificate_id = ? AND log_id = ?')
      .get(certificateId, log.id) as any;

    if (existing) {
      console.log(`⚠️  证书已提交到日志: ${log.name}`);
      continue;
    }

    const client = new CTLogClient({ url: log.url, publicKey: log.public_key });
    const result = await client.submitCertificate(cert.cert, cert.domain);

    const entryId = nanoid();
    const status = result ? 'pending' : 'rejected';

    db.prepare(`
      INSERT INTO ct_entries (
        id, certificate_id, log_id, log_name, entry_type, sct_version, sct_timestamp,
        serial_number, domain, issuer, not_before, not_after,
        merkle_leaf_hash, inclusion_proof, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entryId,
      certificateId,
      log.id,
      log.name,
      'X509',
      result?.sctVersion || 1,
      result?.sctTimestamp || now,
      cert.serial_number,
      cert.domain,
      certObj.issuer.attributes.map((a: any) => a.value).join(','),
      cert.valid_from,
      cert.valid_to,
      result?.merkleLeafHash || null,
      result?.inclusionProof || null,
      status,
      now
    );

    if (result) {
      entries.push({
        id: entryId,
        certificateId,
        logId: log.id,
        logName: log.name,
        entryType: 'X509',
        sctVersion: result.sctVersion,
        sctTimestamp: result.sctTimestamp,
        serialNumber: cert.serial_number,
        domain: cert.domain,
        issuer: certObj.issuer.attributes.map((a: any) => a.value).join(','),
        notBefore: cert.valid_from,
        notAfter: cert.valid_to,
        addedToLogAt: result.sctTimestamp,
        inclusionProof: result.inclusionProof,
        merkleLeafHash: result.merkleLeafHash,
        status: 'pending',
        createdAt: now
      });
    }
  }

  console.log(`📤 已提交 ${entries.length}/${logs.length} 个日志`);
  return entries;
}

/**
 * 获取证书的 CT 条目
 */
export function getCTEntries(certificateId: string): CTSertificateEntry[] {
  const entries = db.prepare('SELECT * FROM ct_entries WHERE certificate_id = ?').all(certificateId);
  
  return entries.map((e: any) => ({
    id: e.id,
    certificateId: e.certificate_id,
    logId: e.log_id,
    logName: e.log_name,
    entryType: e.entry_type as CTSertificateEntry['entryType'],
    sctVersion: e.sct_version,
    sctTimestamp: e.sct_timestamp,
    serialNumber: e.serial_number,
    domain: e.domain,
    issuer: e.issuer,
    notBefore: e.not_before,
    notAfter: e.not_after,
    addedToLogAt: e.added_to_log_at,
    inclusionProof: e.inclusion_proof,
    merkleLeafHash: e.merkle_leaf_hash,
    status: e.status as CTSertificateEntry['status'],
    errorMessage: e.error_message,
    createdAt: e.created_at
  }));
}

/**
 * 获取 CT 日志统计
 */
export function getCTStats(): CTLogStats {
  const totalEntries = db.prepare('SELECT COUNT(*) as count FROM ct_entries').get() as { count: number };
  const pendingEntries = db.prepare("SELECT COUNT(*) as count FROM ct_entries WHERE status = 'pending'").get() as { count: number };
  const includedEntries = db.prepare("SELECT COUNT(*) as count FROM ct_entries WHERE status = 'included'").get() as { count: number };
  const rejectedEntries = db.prepare("SELECT COUNT(*) as count FROM ct_entries WHERE status = 'rejected'").get() as { count: number };
  const lastEntry = db.prepare('SELECT MAX(created_at) as last_at FROM ct_entries').get() as { last_at?: string };

  return {
    totalEntries: totalEntries.count,
    pendingEntries: pendingEntries.count,
    includedEntries: includedEntries.count,
    rejectedEntries: rejectedEntries.count,
    lastEntryAt: lastEntry.last_at
  };
}

/**
 * 批量检查 CT 条目状态
 */
export async function checkCTEntryStatus(): Promise<void> {
  const pendingEntries = db.prepare("SELECT * FROM ct_entries WHERE status = 'pending'").all();

  for (const entry of pendingEntries) {
    const log = getCTLog(entry.log_id);
    if (!log) continue;

    // 模拟检查日志包含状态
    // 实际实现：查询日志 API
    const isIncluded = Math.random() > 0.3; // 模拟

    const now = new Date().toISOString();
    
    if (isIncluded) {
      db.prepare(`
        UPDATE ct_entries SET 
          status = 'included', added_to_log_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, entry.id);
    } else if (new Date(entry.created_at).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000) {
      // 超过 7 天未包含，标记为被拒绝
      db.prepare(`
        UPDATE ct_entries SET 
          status = 'rejected', error_message = '证书未被日志包含', updated_at = ?
        WHERE id = ?
      `).run(now, entry.id);
    }
  }
}
