import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

/**
 * 证书生成工具
 */

export interface CertificateOptions {
  commonName: string;
  organization?: string;
  country?: string;
  validityDays?: number;
}

export interface GeneratedCertificate {
  cert: string;
  key: string;
  certPath: string;
  keyPath: string;
  serialNumber: string;
  fingerprint: string;
  validFrom: Date;
  validTo: Date;
}

/**
 * 生成根 CA 证书
 */
export function generateRootCA(options: CertificateOptions): GeneratedCertificate {
  const {
    commonName,
    organization = 'LocalTrust',
    country = 'CN',
    validityDays = 3650 // 10年
  } = options;

  // 生成密钥对
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // 创建证书
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = Date.now().toString(16);

  const validFrom = new Date();
  const validTo = new Date();
  validTo.setDate(validTo.getDate() + validityDays);

  cert.validity.notBefore = validFrom;
  cert.validity.notAfter = validTo;

  // 设置证书主题
  const attrs = [
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: organization },
    { name: 'countryName', value: country }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs); // 自签名，issuer 和 subject 相同

  // 设置扩展
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true,
      critical: true
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      cRLSign: true,
      critical: true
    },
    {
      name: 'subjectKeyIdentifier'
    }
  ]);

  // 自签名
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // 转换为 PEM 格式
  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

  // 保存到文件
  const certsDir = path.join(process.cwd(), 'data', 'certs');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const certPath = path.join(certsDir, 'ca.crt');
  const keyPath = path.join(certsDir, 'ca.key');

  fs.writeFileSync(certPath, certPem);
  fs.writeFileSync(keyPath, keyPem);

  // 计算指纹
  const md = forge.md.sha256.create();
  md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
  const fingerprint = md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(':') || '';

  return {
    cert: certPem,
    key: keyPem,
    certPath,
    keyPath,
    serialNumber: cert.serialNumber,
    fingerprint,
    validFrom,
    validTo
  };
}

/**
 * 生成域名证书（由 CA 签名）
 */
export function generateDomainCertificate(
  domain: string,
  caCert: string,
  caKey: string,
  validityDays = 365
): GeneratedCertificate {
  // 解析 CA 证书和密钥
  const caCertObj = forge.pki.certificateFromPem(caCert);
  const caKeyObj = forge.pki.privateKeyFromPem(caKey);

  // 生成密钥对
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // 创建证书
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = Date.now().toString(16);

  const validFrom = new Date();
  const validTo = new Date();
  validTo.setDate(validTo.getDate() + validityDays);

  cert.validity.notBefore = validFrom;
  cert.validity.notAfter = validTo;

  // 设置证书主题
  cert.setSubject([
    { name: 'commonName', value: domain }
  ]);

  // 设置颁发者（CA）
  cert.setIssuer(caCertObj.subject.attributes);

  // 设置扩展
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false
    },
    {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2, // DNS
          value: domain
        },
        {
          type: 2,
          value: `*.${domain}` // 支持通配符
        }
      ]
    }
  ]);

  // 使用 CA 私钥签名
  cert.sign(caKeyObj, forge.md.sha256.create());

  // 转换为 PEM 格式
  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

  // 保存到文件
  const certsDir = path.join(process.cwd(), 'data', 'certs', 'domains');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const safeDomain = domain.replace(/\*/g, 'wildcard');
  const certPath = path.join(certsDir, `${safeDomain}.crt`);
  const keyPath = path.join(certsDir, `${safeDomain}.key`);

  fs.writeFileSync(certPath, certPem);
  fs.writeFileSync(keyPath, keyPem);

  // 计算指纹
  const md = forge.md.sha256.create();
  md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
  const fingerprint = md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(':') || '';

  return {
    cert: certPem,
    key: keyPem,
    certPath,
    keyPath,
    serialNumber: cert.serialNumber,
    fingerprint,
    validFrom,
    validTo
  };
}

/**
 * 检查证书是否存在
 */
export function certificateExists(type: 'ca' | 'domain', domain?: string): boolean {
  if (type === 'ca') {
    const certPath = path.join(process.cwd(), 'data', 'certs', 'ca.crt');
    return fs.existsSync(certPath);
  } else if (domain) {
    const safeDomain = domain.replace(/\*/g, 'wildcard');
    const certPath = path.join(process.cwd(), 'data', 'certs', 'domains', `${safeDomain}.crt`);
    return fs.existsSync(certPath);
  }
  return false;
}

/**
 * 读取证书文件
 */
export function readCertificate(certPath: string): string {
  return fs.readFileSync(certPath, 'utf-8');
}

/**
 * 读取私钥文件
 */
export function readPrivateKey(keyPath: string): string {
  return fs.readFileSync(keyPath, 'utf-8');
}
