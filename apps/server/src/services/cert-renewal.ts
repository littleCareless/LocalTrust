import { ACMEClient, getExpiringCertificates, getRenewalSettings, toggleAutoRenewal } from './acme-client';
import db from '../db';
import { nanoid } from 'nanoid';
import type { ACMECertificate } from '@localtrust/types';

/**
 * 证书自动续期服务
 * 负责检查证书有效期并自动续期
 */

let renewalJob: NodeJS.Timeout | null = null;
let checkJob: NodeJS.Timeout | null = null;

/**
 * 计算证书剩余天数
 */
export function getDaysUntilExpiry(cert: ACMECertificate): number {
  const validTo = new Date(cert.validTo);
  const now = new Date();
  const diffMs = validTo.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 发送续期通知
 */
async function sendRenewalNotification(
  cert: ACMECertificate,
  daysUntilExpiry: number,
  notificationType: 'reminder' | 'renewal_success' | 'renewal_failed'
): Promise<void> {
  const settings = getRenewalSettings();
  
  // 记录到数据库
  const logId = nanoid();
  db.prepare(`
    INSERT INTO acme_renewal_logs (id, certificate_id, action, status, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    logId,
    cert.id,
    `notification_${notificationType}`,
    'success',
    JSON.stringify({
      daysUntilExpiry,
      notifyEmail: settings.notifyEmail,
      webhookUrl: settings.webhookUrl
    }),
    new Date().toISOString()
  );

  // 发送邮件通知
  if (settings.notifyEmail) {
    console.log(`📧 发送邮件通知到 ${settings.notifyEmail}:`);
    console.log(`   证书 ${cert.domain} ${notificationType === 'reminder' ? '即将过期' : notificationType === 'renewal_success' ? '续期成功' : '续期失败'}`);
    console.log(`   剩余天数: ${daysUntilExpiry}`);
    // TODO: 实现实际的邮件发送功能
  }

  // 发送 Webhook 通知
  if (settings.webhookUrl) {
    console.log(`🔔 发送 Webhook 通知到 ${settings.webhookUrl}`);
    // TODO: 实现实际的 Webhook 发送功能
  }
}

/**
 * 续期单个证书
 */
async function renewCertificate(cert: ACMECertificate): Promise<boolean> {
  const settings = getRenewalSettings();
  
  console.log(`🔄 开始续期证书: ${cert.domain}`);
  
  try {
    const client = new ACMEClient();
    const renewedCert = await client.renewCertificate(cert.id);

    const daysUntilExpiry = getDaysUntilExpiry(renewedCert);
    console.log(`✅ 证书续期成功: ${renewedCert.domain}`);
    console.log(`   新有效期至: ${renewedCert.validTo}`);
    console.log(`   剩余天数: ${daysUntilExpiry}`);

    // 发送续期成功通知
    await sendRenewalNotification(renewedCert, daysUntilExpiry, 'renewal_success');

    return true;
  } catch (error: any) {
    console.error(`❌ 证书续期失败: ${cert.domain}`);
    console.error(`   错误: ${error.message}`);

    // 发送续期失败通知
    await sendRenewalNotification(cert, getDaysUntilExpiry(cert), 'renewal_failed');

    return false;
  }
}

/**
 * 检查并续期即将过期的证书
 */
export async function checkAndRenewCertificates(): Promise<{
  checked: number;
  renewed: number;
  failed: number;
  reminders: ACMECertificate[];
}> {
  const settings = getRenewalSettings();
  
  if (!settings.renewalEnabled) {
    console.log('⚠️  自动续期功能已禁用');
    return { checked: 0, renewed: 0, failed: 0, reminders: [] };
  }

  console.log('🔍 检查证书有效期...');

  // 获取所有即将过期的证书
  const expiringCerts = getExpiringCertificates(settings.autoRenewalDaysBefore);
  const reminders: ACMECertificate[] = [];

  for (const cert of expiringCerts) {
    const daysUntilExpiry = getDaysUntilExpiry(cert);
    
    // 发送即将过期提醒
    await sendRenewalNotification(cert, daysUntilExpiry, 'reminder');
    reminders.push(cert);

    // 如果启用了自动续期且证书在自动续期阈值内
    if (cert.autoRenewalEnabled && daysUntilExpiry <= settings.autoRenewalDaysBefore) {
      const success = await renewCertificate(cert);
      if (success) {
        return { checked: 1, renewed: 1, failed: 0, reminders };
      } else {
        return { checked: 1, renewed: 0, failed: 1, reminders };
      }
    }
  }

  // 检查是否有证书已经过期
  const expiredCerts = getExpiringCertificates(0);
  for (const cert of expiredCerts) {
    if (cert.autoRenewalEnabled) {
      const success = await renewCertificate(cert);
      if (!success) {
        // 更新证书状态为过期
        db.prepare('UPDATE acme_certificates SET status = ? WHERE id = ?').run('expired', cert.id);
      }
    }
  }

  console.log(`✅ 检查完成: ${expiringCerts.length} 个证书需要关注`);
  return {
    checked: expiringCerts.length,
    renewed: 0,
    failed: 0,
    reminders
  };
}

/**
 * 检查单个证书并返回状态
 */
export async function checkCertificate(certificateId: string): Promise<{
  status: 'valid' | 'expiring_soon' | 'expired' | 'renewing';
  daysUntilExpiry: number;
  autoRenewalEnabled: boolean;
}> {
  const cert = db.prepare('SELECT * FROM acme_certificates WHERE id = ?').get(certificateId) as any;
  
  if (!cert) {
    throw new Error('证书不存在');
  }

  const daysUntilExpiry = getDaysUntilExpiry({
    ...cert,
    status: cert.status
  } as ACMECertificate);

  const settings = getRenewalSettings();

  // 确定证书状态
  let status: 'valid' | 'expiring_soon' | 'expired' | 'renewing' = 'valid';
  
  if (daysUntilExpiry <= 0) {
    status = 'expired';
  } else if (daysUntilExpiry <= settings.reminderDaysBefore) {
    status = 'expiring_soon';
  }

  if (cert.status === 'renewing') {
    status = 'renewing';
  }

  return {
    status,
    daysUntilExpiry,
    autoRenewalEnabled: !!cert.auto_renewal_enabled
  };
}

/**
 * 启动证书续期调度器
 */
export function startRenewalScheduler(): void {
  if (renewalJob || checkJob) {
    console.log('⚠️  续期调度器已在运行');
    return;
  }

  const settings = getRenewalSettings();
  
  console.log('🚀 启动证书自动续期调度器...');
  console.log(`   自动续期: ${settings.renewalEnabled ? '启用' : '禁用'}`);
  console.log(`   自动续期阈值: ${settings.autoRenewalDaysBefore} 天`);

  // 每 24 小时检查一次证书有效期
  checkJob = setInterval(async () => {
    try {
      const result = await checkAndRenewCertificates();
      console.log(`📊 续期检查完成: 检查 ${result.checked} 个, 续期 ${result.renewed} 个, 失败 ${result.failed} 个`);
    } catch (error: any) {
      console.error('❌ 续期检查失败:', error.message);
    }
  }, 24 * 60 * 60 * 1000); // 24 小时

  // 立即执行一次检查
  checkAndRenewCertificates().catch(console.error);

  console.log('✅ 续期调度器已启动 (每 24 小时检查一次)');
}

/**
 * 停止证书续期调度器
 */
export function stopRenewalScheduler(): void {
  if (renewalJob) {
    clearInterval(renewalJob);
    renewalJob = null;
  }
  if (checkJob) {
    clearInterval(checkJob);
    checkJob = null;
  }
  console.log('🛑 续期调度器已停止');
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus(): {
  running: boolean;
  renewalEnabled: boolean;
  nextCheck: string | null;
} {
  const settings = getRenewalSettings();
  return {
    running: !!checkJob,
    renewalEnabled: settings.renewalEnabled,
    nextCheck: checkJob ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
  };
}

/**
 * 手动触发证书检查
 */
export async function triggerManualCheck(): Promise<{
  checked: number;
  renewed: number;
  failed: number;
  certificates: ACMECertificate[];
}> {
  const result = await checkAndRenewCertificates();
  return {
    checked: result.checked,
    renewed: result.renewed,
    failed: result.failed,
    certificates: result.reminders
  };
}

/**
 * 导出证书到文件
 */
export function exportCertificate(certificateId: string, outputDir: string): {
  certPath: string;
  keyPath: string;
  chainPath?: string;
} {
  const cert = db.prepare('SELECT * FROM acme_certificates WHERE id = ?').get(certificateId) as any;
  
  if (!cert) {
    throw new Error('证书不存在');
  }

  const fs = require('fs');
  const path = require('path');

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const safeDomain = cert.domain.replace(/\*/g, 'wildcard');
  const certPath = path.join(outputDir, `${safeDomain}.crt`);
  const keyPath = path.join(outputDir, `${safeDomain}.key`);

  // 保存证书
  fs.writeFileSync(certPath, cert.cert);
  fs.writeFileSync(keyPath, cert.private_key);

  return {
    certPath,
    keyPath
  };
}

/**
 * 批量导入证书（从其他来源）
 */
export function importCertificate(
  domain: string,
  cert: string,
  privateKey: string,
  autoRenewalEnabled: boolean = false
): ACMECertificate {
  const forge = require('node-forge');
  
  // 解析证书
  const certObj = forge.pki.certificateFromPem(cert);
  const serialNumber = certObj.serialNumber;
  const validFrom = certObj.validity.notBefore;
  const validTo = certObj.validity.notAfter;

  // 计算指纹
  const md = forge.md.sha256.create();
  md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(certObj)).getBytes());
  const fingerprint = md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(':') || '';

  const id = nanoid();
  const now = new Date().toISOString();

  // 保存到数据库
  db.prepare(`
    INSERT INTO acme_certificates (
      id, domain, cert, private_key, valid_from, valid_to,
      serial_number, fingerprint, status, auto_renewal_enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    domain,
    cert,
    privateKey,
    validFrom.toISOString(),
    validTo.toISOString(),
    serialNumber,
    fingerprint,
    'active',
    autoRenewalEnabled ? 1 : 0,
    now,
    now
  );

  return {
    id,
    domain,
    accountId: '',
    cert,
    privateKey,
    validFrom: validFrom.toISOString(),
    validTo: validTo.toISOString(),
    serialNumber,
    fingerprint,
    status: 'active',
    renewalCount: 0,
    autoRenewalEnabled,
    createdAt: now,
    updatedAt: now
  };
}
