import forge from 'node-forge';
import { nanoid } from 'nanoid';
import db from '../db';
import type { ACMEAccount, ACMECertificate, ACMEChallenge, ACMEDirectory, ACMEOrder } from '@localtrust/types';

/**
 * ACME 协议客户端服务
 * 支持与 Let's Encrypt 等 ACME 服务器交互
 */

// ACME 服务器目录
const LETSENCRYPT_DIRECTORY: ACMEDirectory = {
  newNonce: 'https://acme-v02.api.letsencrypt.org/acme/new-nonce',
  newAccount: 'https://acme-v02.api.letsencrypt.org/acme/new-account',
  newOrder: 'https://acme-v02.api.letsencrypt.org/acme/new-order',
  revokeCert: 'https://acme-v02.api.letsencrypt.org/acme/revoke-cert',
  keyChange: 'https://acme-v02.api.letsencrypt.org/acme/key-change'
};

const STAGING_DIRECTORY: ACMEDirectory = {
  newNonce: 'https://acme-staging-v02.api.letsencrypt.org/acme/new-nonce',
  newAccount: 'https://acme-staging-v02.api.letsencrypt.org/acme/new-account',
  newOrder: 'https://acme-staging-v02.api.letsencrypt.org/acme/new-order',
  revokeCert: 'https://acme-staging-v02.api.letsencrypt.org/acme/revoke-cert',
  keyChange: 'https://acme-staging-v02.api.letsencrypt.org/acme/key-change'
};

/**
 * ACME 客户端类
 */
export class ACMEClient {
  private directory: ACMEDirectory;
  private accountKeyPair: forge.pki.rsa.KeyPair;
  private accountId: string | null = null;
  private directoryCache: ACMEDirectory | null = null;
  private nonce: string | null = null;

  constructor(private serverUrl: string = 'https://acme-v02.api.letsencrypt.org/directory', private useStaging: boolean = false) {
    this.directory = useStaging ? STAGING_DIRECTORY : LETSENCRYPT_DIRECTORY;
    this.accountKeyPair = forge.pki.rsa.generateKeyPair(2048);
  }

  /**
   * 生成账户密钥对
   */
  static generateAccountKeyPair(): { publicKey: string; privateKey: string } {
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    return {
      publicKey: forge.pki.publicKeyToPem(keyPair.publicKey),
      privateKey: forge.pki.privateKeyToPem(keyPair.privateKey)
    };
  }

  /**
   * 获取 JWK
   */
  private getJWK(): { kty: string; e: string; n: string; alg: string; use: string } {
    const publicKey = this.accountKeyPair.publicKey as forge.pki.rsa.PublicKey;
    return {
      kty: 'RSA',
      e: forge.util.bytesToHex(publicKey.e.toByteArrayArray()),
      n: forge.util.bytesToHex(publicKey.n.toByteArrayArray()),
      alg: 'RS256',
      use: 'sig'
    };
  }

  /**
   * 计算 JWS
   */
  private async createJWS(
    payload: string | object,
    url: string,
    kid?: string
  ): Promise<{ protected: string; payload: string; signature: string }> {
    const header: any = { alg: 'RS256', nonce: await this.getNonce() };
    
    if (kid) {
      header.kid = kid;
    } else {
      header.jwk = this.getJWK();
    }

    const protectedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signingInput = `${protectedHeader}.${payloadStr}`;
    
    const md = forge.md.sha256.create();
    md.update(signingInput);
    const signature = forge.util.bytesToHex(
      this.accountKeyPair.privateKey.sign(md)
    ).replace(/<[^>]*>/g, '');

    return {
      protected: protectedHeader,
      payload: Buffer.from(payloadStr).toString('base64url'),
      signature: signature
    };
  }

  /**
   * 获取目录信息
   */
  async getDirectory(): Promise<ACMEDirectory> {
    if (this.directoryCache) {
      return this.directoryCache;
    }

    try {
      const response = await fetch(this.serverUrl, { method: 'GET' });
      const data = await response.json();
      this.directoryCache = data as ACMEDirectory;
      return this.directoryCache;
    } catch (error) {
      console.error('获取 ACME 目录失败:', error);
      throw new Error('无法获取 ACME 目录');
    }
  }

  /**
   * 获取新 nonce
   */
  async getNonce(): Promise<string> {
    if (this.nonce) {
      return this.nonce;
    }

    try {
      const dir = await this.getDirectory();
      const response = await fetch(dir.newNonce, { 
        method: 'HEAD',
        headers: { 'Replay-Nonce': '' }
      });
      this.nonce = response.headers.get('Replay-Nonce') || nanoid();
      return this.nonce;
    } catch (error) {
      console.error('获取 nonce 失败:', error);
      throw new Error('无法获取 nonce');
    }
  }

  /**
   * 创建或更新账户
   */
  async createAccount(email: string, acceptTerms: boolean = true): Promise<ACMEAccount> {
    const dir = await this.getDirectory();
    
    const payload: any = {
      termsOfServiceAgreed: acceptTerms,
      contact: [`mailto:${email}`]
    };

    const jws = await this.createJWS(JSON.stringify(payload), dir.newAccount);
    
    try {
      const response = await fetch(dir.newAccount, {
        method: 'POST',
        headers: { 'Content-Type': 'application/jose+json' },
        body: JSON.stringify(jws)
      });

      if (response.status === 200) {
        // 账户已存在
        this.accountId = response.headers.get('Location') || null;
      } else if (response.status === 201) {
        // 新账户创建成功
        this.accountId = response.headers.get('Location') || nanoid();
      } else {
        const error = await response.json();
        throw new Error(error.detail || '账户创建失败');
      }

      // 保存到数据库
      const now = new Date().toISOString();
      const id = nanoid();
      
      const stmt = db.prepare(`
        INSERT INTO acme_accounts (id, email, server_url, private_key, is_active, terms_of_service_accepted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        email,
        this.serverUrl,
        forge.pki.privateKeyToPem(this.accountKeyPair.privateKey),
        1,
        acceptTerms ? 1 : 0,
        now,
        now
      );

      return {
        id,
        email,
        serverUrl: this.serverUrl,
        isActive: true,
        termsOfServiceAccepted: acceptTerms,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      console.error('创建 ACME 账户失败:', error);
      throw error;
    }
  }

  /**
   * 创建新订单
   */
  async createOrder(domains: string[]): Promise<{ orderUrl: string; order: ACMEOrder }> {
    const dir = await this.getDirectory();
    
    const payload = {
      identifiers: domains.map(d => ({ type: 'dns', value: d }))
    };

    const jws = await this.createJWS(JSON.stringify(payload), dir.newOrder, this.accountId!);
    
    const response = await fetch(dir.newOrder, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jose+json' },
      body: JSON.stringify(jws)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '订单创建失败');
    }

    const order = await response.json();
    return {
      orderUrl: response.headers.get('Location') || '',
      order
    };
  }

  /**
   * 获取订单状态
   */
  async getOrder(orderUrl: string): Promise<ACMEOrder> {
    const kid = this.accountId!;
    const payload = '';
    const jws = await this.createJWS(payload, orderUrl, kid);

    const response = await fetch(orderUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jose+json' },
      body: JSON.stringify(jws)
    });

    if (!response.ok) {
      throw new Error('获取订单状态失败');
    }

    return response.json();
  }

  /**
   * 生成 HTTP-01 挑战响应
   */
  static generateHTTP01Challenge(accountThumbprint: string, token: string): string {
    return `${token}.${forge.util.createHash('sha256').update(accountThumbprint).digest('base64url')}`;
  }

  /**
   * 获取账户 JWK 指纹
   */
  private getAccountThumbprint(): string {
    const jwk = this.getJWK();
    const der = forge.util.createHash('sha256').update(JSON.stringify(jwk)).digest();
    return forge.util.bytesToBase64(der).replace(/=/g, '');
  }

  /**
   * 完成 HTTP-01 挑战
   */
  async completeHTTP01Challenge(authzUrl: string): Promise<{ token: string; keyAuthorization: string }> {
    const kid = this.accountId!;
    const payload = {};
    const jws = await this.createJWS(JSON.stringify(payload), authzUrl, kid);

    const response = await fetch(authzUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jose+json' },
      body: JSON.stringify(jws)
    });

    if (!response.ok) {
      throw new Error('获取挑战信息失败');
    }

    const challengeData = await response.json();
    const http01Challenge = challengeData.challenges.find((c: any) => c.type === 'http-01');
    
    if (!http01Challenge) {
      throw new Error('未找到 HTTP-01 挑战');
    }

    const token = http01Challenge.token;
    const accountThumbprint = this.getAccountThumbprint();
    const keyAuthorization = `${token}.${accountThumbprint}`;

    return { token, keyAuthorization };
  }

  /**
   * 请求验证挑战
   */
  async verifyChallenge(challengeUrl: string): Promise<void> {
    const kid = this.accountId!;
    const payload = {};
    const jws = await this.createJWS(JSON.stringify(payload), challengeUrl, kid);

    const response = await fetch(challengeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jose+json' },
      body: JSON.stringify(jws)
    });

    if (!response.ok) {
      throw new Error('验证挑战请求失败');
    }
  }

  /**
   * 等待挑战完成
   */
  async waitForChallengeStatus(challengeUrl: string, maxAttempts: number = 30): Promise<boolean> {
    const kid = this.accountId!;
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const payload = '';
      const jws = await this.createJWS(payload, challengeUrl, kid);

      const response = await fetch(challengeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/jose+json' },
        body: JSON.stringify(jws)
      });

      if (!response.ok) {
        throw new Error('检查挑战状态失败');
      }

      const challenge = await response.json();
      
      if (challenge.status === 'valid') {
        return true;
      }
      
      if (challenge.status === 'invalid') {
        throw new Error(`挑战失败: ${challenge.error?.detail || '未知错误'}`);
      }
    }

    throw new Error('挑战验证超时');
  }

  /**
   * 生成证书私钥和 CSR
   */
  static generateCSR(domains: string[]): { privateKey: string; csr: string } {
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keyPair.publicKey;
    csr.setSubject([{ name: 'commonName', value: domains[0] }]);
    
    if (domains.length > 1) {
      csr.setAttributes([
        {
          name: 'subjectAltName',
          altNames: domains.slice(1).map(d => ({ type: 2, value: d }))
        }
      ]);
    }

    csr.sign(keyPair.privateKey, forge.md.sha256.create());

    return {
      privateKey: forge.pki.privateKeyToPem(keyPair.privateKey),
      csr: forge.pkiCertificationRequestToPem(csr)
    };
  }

  /**
   * 完成订单（获取证书）
   */
  async finalizeOrder(orderUrl: string, csr: string): Promise<string> {
    const kid = this.accountId!;
    const payload = { csr: Buffer.from(csr).toString('base64url') };
    const jws = await this.createJWS(JSON.stringify(payload), orderUrl, kid);

    const response = await fetch(orderUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jose+json' },
      body: JSON.stringify(jws)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '完成订单失败');
    }

    const result = await response.json();
    return result.certificate;
  }

  /**
   * 下载证书链
   */
  async downloadCertificate(certificateUrl: string): Promise<{ cert: string; chain: string }> {
    const kid = this.accountId!;
    const payload = '';
    const jws = await this.createJWS(payload, certificateUrl, kid);

    const response = await fetch(certificateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jose+json' },
      body: JSON.stringify(jws)
    });

    if (!response.ok) {
      throw new Error('下载证书失败');
    }

    const cert = await response.text();
    
    // 分离证书和链
    const certs = cert.split('-----END CERTIFICATE-----');
    const fullCert = certs[0] + '-----END CERTIFICATE-----';
    const chain = certs[1] ? certs[1].trim() + '-----END CERTIFICATE-----' : '';

    return { cert: fullCert, chain };
  }

  /**
   * 完整的证书申请流程
   */
  async issueCertificate(
    domains: string[],
    accountId: string
  ): Promise<{
    certificate: ACMECertificate;
    challenges: ACMEChallenge[];
  }> {
    // 获取账户信息
    const account = db.prepare('SELECT * FROM acme_accounts WHERE id = ?').get(accountId) as any;
    if (!account) {
      throw new Error('账户不存在');
    }

    // 解析账户私钥
    this.accountKeyPair.privateKey = forge.pki.privateKeyFromPem(account.private_key);
    this.accountId = accountId;

    // 1. 创建订单
    const { orderUrl, order } = await this.createOrder(domains);

    // 2. 获取授权并完成挑战
    const challenges: ACMEChallenge[] = [];
    
    for (const authUrl of order.authorizations) {
      const { token, keyAuthorization } = await this.completeHTTP01Challenge(authUrl);

      // 保存挑战信息到数据库
      const challengeId = nanoid();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 300000); // 5分钟过期

      const stmt = db.prepare(`
        INSERT INTO acme_challenges (id, certificate_id, challenge_type, token, key_authorization, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(challengeId, '', 'http-01', token, keyAuthorization, 'pending', expiresAt.toISOString(), now.toISOString());

      challenges.push({
        id: challengeId,
        certificateId: '',
        challengeType: 'http-01',
        token,
        keyAuthorization,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString()
      });

      // 触发验证
      const authResponse = await fetch(authUrl, { method: 'GET' });
      const authData = await authResponse.json();
      const httpChallenge = authData.challenges.find((c: any) => c.type === 'http-01');
      
      if (httpChallenge) {
        await this.verifyChallenge(httpChallenge.url);
      }
    }

    // 3. 等待所有挑战完成
    for (const challenge of challenges) {
      const challengeData = db.prepare('SELECT * FROM acme_challenges WHERE id = ?').get(challenge.id) as any;
      if (challengeData) {
        await this.waitForChallengeStatus(challengeData.token);
      }
    }

    // 4. 生成 CSR 并完成订单
    const { privateKey, csr } = ACMEClient.generateCSR(domains);
    const certificateUrl = await this.finalizeOrder(orderUrl, csr);

    // 5. 下载证书
    const { cert: certificatePem } = await this.downloadCertificate(certificateUrl);

    // 6. 解析证书获取信息
    const cert = forge.pki.certificateFromPem(certificatePem);
    const serialNumber = cert.serialNumber;
    const validFrom = cert.validity.notBefore;
    const validTo = cert.validity.notAfter;

    // 计算指纹
    const md = forge.md.sha256.create();
    md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
    const fingerprint = md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(':') || '';

    // 7. 保存证书到数据库
    const certId = nanoid();
    const now = new Date().toISOString();

    const insertCert = db.prepare(`
      INSERT INTO acme_certificates (
        id, domain, account_id, cert, private_key, valid_from, valid_to,
        serial_number, fingerprint, status, renewal_count, auto_renewal_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCert.run(
      certId,
      domains[0],
      accountId,
      certificatePem,
      privateKey,
      validFrom.toISOString(),
      validTo.toISOString(),
      serialNumber,
      fingerprint,
      'active',
      0,
      0,
      now,
      now
    );

    // 更新挑战关联的证书 ID
    const updateChallenges = db.prepare('UPDATE acme_challenges SET certificate_id = ? WHERE id = ?');
    for (const challenge of challenges) {
      updateChallenges.run(certId, challenge.id);
      challenge.certificateId = certId;
    }

    return {
      certificate: {
        id: certId,
        domain: domains[0],
        accountId,
        cert: certificatePem,
        privateKey,
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        serialNumber,
        fingerprint,
        status: 'active',
        renewalCount: 0,
        autoRenewalEnabled: false,
        createdAt: now,
        updatedAt: now
      },
      challenges
    };
  }

  /**
   * 续期证书
   */
  async renewCertificate(certificateId: string): Promise<ACMECertificate> {
    const cert = db.prepare('SELECT * FROM acme_certificates WHERE id = ?').get(certificateId) as any;
    if (!cert) {
      throw new Error('证书不存在');
    }

    const logId = nanoid();
    const now = new Date().toISOString();

    // 记录续期日志
    db.prepare(`
      INSERT INTO acme_renewal_logs (id, certificate_id, action, status, created_at)
      VALUES (?, ?, 'renewal', 'pending', ?)
    `).run(logId, certificateId, now);

    try {
      // 解析账户私钥
      const account = db.prepare('SELECT * FROM acme_accounts WHERE id = ?').get(cert.account_id) as any;
      this.accountKeyPair.privateKey = forge.pki.privateKeyFromPem(account.private_key);
      this.accountId = cert.account_id;

      // 发起新订单
      const { orderUrl } = await this.createOrder([cert.domain]);

      // 完成挑战验证
      const authResponse = await fetch(orderUrl, { method: 'GET' });
      const orderData = await authResponse.json();

      for (const authUrl of orderData.authorizations) {
        const { keyAuthorization } = await this.completeHTTP01Challenge(authUrl);
        const authInfo = await fetch(authUrl, { method: 'GET' });
        const authData = await authInfo.json();
        const httpChallenge = authData.challenges.find((c: any) => c.type === 'http-01');
        
        if (httpChallenge) {
          await this.verifyChallenge(httpChallenge.url);
          await this.waitForChallengeStatus(httpChallenge.url);
        }
      }

      // 生成新的 CSR 并完成订单
      const { privateKey, csr } = ACMEClient.generateCSR([cert.domain]);
      const certificateUrl = await this.finalizeOrder(orderUrl, csr);

      // 下载新证书
      const { cert: newCertPem } = await this.downloadCertificate(certificateUrl);
      const certObj = forge.pki.certificateFromPem(newCertPem);
      const serialNumber = certObj.serialNumber;
      const validFrom = certObj.validity.notBefore;
      const validTo = certObj.validity.notAfter;

      // 计算指纹
      const md = forge.md.sha256.create();
      md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(certObj)).getBytes());
      const fingerprint = md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(':') || '';

      // 更新数据库中的证书
      db.prepare(`
        UPDATE acme_certificates SET
          cert = ?, private_key = ?, valid_from = ?, valid_to = ?,
          serial_number = ?, fingerprint = ?, renewal_count = renewal_count + 1,
          status = 'active', updated_at = ?
        WHERE id = ?
      `).run(newCertPem, privateKey, validFrom.toISOString(), validTo.toISOString(), serialNumber, fingerprint, now, certificateId);

      // 更新续期日志
      db.prepare(`
        UPDATE acme_renewal_logs SET status = 'success', details = ? WHERE id = ?
      `).run(JSON.stringify({ newValidTo: validTo.toISOString() }), logId);

      return {
        ...cert,
        cert: newCertPem,
        privateKey,
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        serialNumber,
        fingerprint,
        status: 'active' as const,
        renewalCount: cert.renewal_count + 1,
        updatedAt: now
      };
    } catch (error: any) {
      // 记录失败日志
      db.prepare(`
        UPDATE acme_renewal_logs SET status = 'failed', error_message = ? WHERE id = ?
      `).run(error.message, logId);

      throw error;
    }
  }
}

/**
 * ACME 服务工具函数
 */

/**
 * 获取所有 ACME 账户
 */
export function getACMEAccounts(): ACMEAccount[] {
  const accounts = db.prepare('SELECT * FROM acme_accounts ORDER BY created_at DESC').all();
  return accounts.map((a: any) => ({
    id: a.id,
    email: a.email,
    serverUrl: a.server_url,
    isActive: !!a.is_active,
    termsOfServiceAccepted: !!a.terms_of_service_accepted,
    createdAt: a.created_at,
    updatedAt: a.updated_at
  }));
}

/**
 * 获取 ACME 账户
 */
export function getACMEAccount(id: string): ACMEAccount | null {
  const account = db.prepare('SELECT * FROM acme_accounts WHERE id = ?').get(id) as any;
  if (!account) return null;
  
  return {
    id: account.id,
    email: account.email,
    serverUrl: account.server_url,
    isActive: !!account.is_active,
    termsOfServiceAccepted: !!account.terms_of_service_accepted,
    createdAt: account.created_at,
    updatedAt: account.updated_at
  };
}

/**
 * 获取所有 ACME 证书
 */
export function getACMCertificates(): ACMECertificate[] {
  const certs = db.prepare(`
    SELECT c.*, a.email as account_email
    FROM acme_certificates c
    LEFT JOIN acme_accounts a ON c.account_id = a.id
    ORDER BY c.created_at DESC
  `).all();
  
  return certs.map((c: any) => ({
    id: c.id,
    domain: c.domain,
    accountId: c.account_id,
    cert: c.cert,
    privateKey: c.private_key,
    issuerId: c.issuer_id,
    validFrom: c.valid_from,
    validTo: c.valid_to,
    serialNumber: c.serial_number,
    fingerprint: c.fingerprint,
    status: c.status,
    renewalCount: c.renewal_count,
    autoRenewalEnabled: !!c.auto_renewal_enabled,
    notes: c.notes,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
}

/**
 * 获取即将过期的证书
 */
export function getExpiringCertificates(daysThreshold: number = 30): ACMECertificate[] {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  const certs = db.prepare(`
    SELECT c.*, a.email as account_email
    FROM acme_certificates c
    LEFT JOIN acme_accounts a ON c.account_id = a.id
    WHERE c.status = 'active' AND c.valid_to <= ?
    ORDER BY c.valid_to ASC
  `).all(thresholdDate.toISOString());
  
  return certs.map((c: any) => ({
    id: c.id,
    domain: c.domain,
    accountId: c.account_id,
    cert: c.cert,
    privateKey: c.private_key,
    issuerId: c.issuer_id,
    validFrom: c.valid_from,
    validTo: c.valid_to,
    serialNumber: c.serial_number,
    fingerprint: c.fingerprint,
    status: c.status,
    renewalCount: c.renewal_count,
    autoRenewalEnabled: !!c.auto_renewal_enabled,
    notes: c.notes,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
}

/**
 * 获取证书续期日志
 */
export function getRenewalLogs(certificateId: string): ACMERenewalLog[] {
  const logs = db.prepare(`
    SELECT * FROM acme_renewal_logs WHERE certificate_id = ? ORDER BY created_at DESC
  `).all(certificateId);
  
  return logs.map((l: any) => ({
    id: l.id,
    certificateId: l.certificate_id,
    action: l.action,
    status: l.status,
    errorMessage: l.error_message,
    details: l.details ? JSON.parse(l.details) : undefined,
    createdAt: l.created_at
  }));
}

/**
 * 获取续期设置
 */
export function getRenewalSettings(): CertificateRenewalSettings {
  const settings = db.prepare('SELECT * FROM certificate_renewal_settings LIMIT 1').get() as any;
  
  if (!settings) {
    return {
      renewalEnabled: true,
      reminderDaysBefore: 30,
      autoRenewalDaysBefore: 7,
      maxRenewalAttempts: 3
    };
  }

  return {
    renewalEnabled: !!settings.renewal_enabled,
    reminderDaysBefore: settings.reminder_days_before,
    autoRenewalDaysBefore: settings.auto_renewal_days_before,
    maxRenewalAttempts: settings.max_renewal_attempts,
    notifyEmail: settings.notify_email,
    webhookUrl: settings.webhook_url
  };
}

/**
 * 更新续期设置
 */
export function updateRenewalSettings(settings: Partial<CertificateRenewalSettings>): void {
  const existing = db.prepare('SELECT * FROM certificate_renewal_settings LIMIT 1').get() as any;
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE certificate_renewal_settings SET
        renewal_enabled = COALESCE(?, renewal_enabled),
        reminder_days_before = COALESCE(?, reminder_days_before),
        auto_renewal_days_before = COALESCE(?, auto_renewal_days_before),
        max_renewal_attempts = COALESCE(?, max_renewal_attempts),
        notify_email = COALESCE(?, notify_email),
        webhook_url = COALESCE(?, webhook_url),
        updated_at = ?
    `).run(
      settings.renewalEnabled ? 1 : undefined,
      settings.reminderDaysBefore,
      settings.autoRenewalDaysBefore,
      settings.maxRenewalAttempts,
      settings.notifyEmail,
      settings.webhookUrl,
      now
    );
  }
}

/**
 * 切换证书自动续期状态
 */
export function toggleAutoRenewal(certificateId: string, enabled: boolean): void {
  db.prepare('UPDATE acme_certificates SET auto_renewal_enabled = ?, updated_at = ? WHERE id = ?')
    .run(enabled ? 1 : 0, new Date().toISOString(), certificateId);
}

/**
 * 删除 ACME 账户
 */
export function deleteACMEAccount(id: string): boolean {
  const result = db.prepare('DELETE FROM acme_accounts WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * 删除 ACME 证书
 */
export function deleteACMCertificate(id: string): boolean {
  const result = db.prepare('DELETE FROM acme_certificates WHERE id = ?').run(id);
  return result.changes > 0;
}
