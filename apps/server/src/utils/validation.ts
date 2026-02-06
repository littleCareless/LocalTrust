/**
 * 数据验证工具函数
 */

/**
 * 验证域名格式
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // 域名正则：支持子域名、localhost、.local 等
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

  // 长度限制
  if (domain.length > 253) {
    return false;
  }

  // 每个标签长度限制
  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length > 63) {
      return false;
    }
  }

  return domainRegex.test(domain);
}

/**
 * 验证 IPv4 地址格式
 */
export function isValidIPv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

/**
 * 验证端口号
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * 验证 DNS 映射数据
 */
export interface DNSMappingValidation {
  valid: boolean;
  errors: string[];
}

export function validateDNSMapping(data: {
  domain?: string;
  ip?: string;
  port?: number;
}): DNSMappingValidation {
  const errors: string[] = [];

  if (!data.domain) {
    errors.push('域名不能为空');
  } else if (!isValidDomain(data.domain)) {
    errors.push('域名格式不正确');
  }

  if (!data.ip) {
    errors.push('IP 地址不能为空');
  } else if (!isValidIPv4(data.ip)) {
    errors.push('IP 地址格式不正确');
  }

  if (data.port !== undefined && data.port !== null) {
    if (!isValidPort(data.port)) {
      errors.push('端口号必须在 1-65535 之间');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 清理域名（移除协议、路径等）
 */
export function sanitizeDomain(domain: string): string {
  let cleaned = domain.trim().toLowerCase();

  // 移除协议
  cleaned = cleaned.replace(/^https?:\/\//, '');

  // 移除端口
  cleaned = cleaned.replace(/:\d+$/, '');

  // 移除路径
  cleaned = cleaned.replace(/\/.*$/, '');

  return cleaned;
}
