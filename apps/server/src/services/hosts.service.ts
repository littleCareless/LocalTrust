import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { DNSMapping } from '@localtrust/types';

// 获取 hosts 文件路径
export function getHostsPath(): string {
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    case 'darwin':
    case 'linux':
      return '/etc/hosts';
    default:
      throw new Error(`不支持的操作系统: ${platform}`);
  }
}

// 读取 hosts 文件内容
export function readHostsFile(): string {
  const hostsPath = getHostsPath();

  try {
    return fs.readFileSync(hostsPath, 'utf-8');
  } catch (error) {
    throw new Error(`读取 hosts 文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 解析 hosts 文件，提取 LocalTrust 管理的条目
export function parseHostsFile(content: string): DNSMapping[] {
  const lines = content.split('\n');
  const mappings: DNSMapping[] = [];
  let inLocalTrustSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测 LocalTrust 管理区域的开始和结束
    if (trimmed === '# LocalTrust Managed - Start') {
      inLocalTrustSection = true;
      continue;
    }
    if (trimmed === '# LocalTrust Managed - End') {
      inLocalTrustSection = false;
      continue;
    }

    // 只解析 LocalTrust 管理区域内的条目
    if (inLocalTrustSection && trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const [ip, domain] = parts;
        mappings.push({
          id: `${domain}-${ip}`,
          domain,
          ip,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  return mappings;
}

// 解析 hosts 文件中的所有域名（包括非 LocalTrust 管理的）
export function parseAllHostsFile(content: string): DNSMapping[] {
  const lines = content.split('\n');
  const mappings: DNSMapping[] = [];
  let inLocalTrustSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测 LocalTrust 管理区域
    if (trimmed === '# LocalTrust Managed - Start') {
      inLocalTrustSection = true;
      continue;
    }
    if (trimmed === '# LocalTrust Managed - End') {
      inLocalTrustSection = false;
      continue;
    }

    // 跳过空行和纯注释行
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // 解析所有有效的 IP-域名映射
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const [ip, domain] = parts;
      // 跳过 localhost 和 IPv6 相关的系统默认配置
      if (domain === 'localhost' || domain.includes('localhost') || ip === '::1' || ip.startsWith('fe80::')) {
        continue;
      }
      mappings.push({
        id: `${domain}-${ip}`,
        domain,
        ip,
        managed: inLocalTrustSection, // 标记是否由 LocalTrust 管理
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  return mappings;
}

// 备份 hosts 文件
export function backupHostsFile(backupDir?: string): string {
  const hostsPath = getHostsPath();
  const content = readHostsFile();

  // 确定备份目录
  const backupPath = backupDir || path.join(os.homedir(), '.localtrust', 'backups');

  // 创建备份目录
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }

  // 生成备份文件名（带时间戳）
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupPath, `hosts.backup.${timestamp}`);

  // 写入备份文件
  fs.writeFileSync(backupFile, content, 'utf-8');

  return backupFile;
}

// 写入 hosts 文件
export function writeHostsFile(content: string): void {
  const hostsPath = getHostsPath();

  try {
    fs.writeFileSync(hostsPath, content, 'utf-8');
  } catch (error) {
    throw new Error(`写入 hosts 文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 同步域名映射到 hosts 文件
export function syncMappingsToHosts(mappings: DNSMapping[], autoBackup: boolean = true, backupDir?: string): void {
  // 自动备份
  if (autoBackup) {
    backupHostsFile(backupDir);
  }

  // 读取当前 hosts 文件
  const currentContent = readHostsFile();
  const lines = currentContent.split('\n');

  // 移除旧的 LocalTrust 管理区域
  const newLines: string[] = [];
  let inLocalTrustSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '# LocalTrust Managed - Start') {
      inLocalTrustSection = true;
      continue;
    }
    if (trimmed === '# LocalTrust Managed - End') {
      inLocalTrustSection = false;
      continue;
    }

    if (!inLocalTrustSection) {
      newLines.push(line);
    }
  }

  // 移除末尾的空行
  while (newLines.length > 0 && newLines[newLines.length - 1].trim() === '') {
    newLines.pop();
  }

  // 添加 LocalTrust 管理区域
  if (mappings.length > 0) {
    newLines.push('');
    newLines.push('# LocalTrust Managed - Start');
    newLines.push('# 此区域由 LocalTrust 自动管理，请勿手动编辑');

    for (const mapping of mappings) {
      newLines.push(`${mapping.ip}\t${mapping.domain}`);
    }

    newLines.push('# LocalTrust Managed - End');
  }

  // 写入 hosts 文件
  const newContent = newLines.join('\n') + '\n';
  writeHostsFile(newContent);
}

// 添加单个域名映射到 hosts 文件
export function addMappingToHosts(mapping: DNSMapping, autoBackup: boolean = true, backupDir?: string): void {
  const currentMappings = parseHostsFile(readHostsFile());

  // 检查在
  const existingIndex = currentMappings.findIndex(m => m.domain === mapping.domain);

  if (existingIndex >= 0) {
    // 更新现有映射
    currentMappings[existingIndex] = mapping;
  } else {
    // 添加新映射
    currentMappings.push(mapping);
  }

  syncMappingsToHosts(currentMappings, autoBackup, backupDir);
}

// 从 hosts 文件删除域名映射
export function removeMappingFromHosts(domain: string, autoBackup: boolean = true, backupDir?: string): void {
  const currentMappings = parseHostsFile(readHostsFile());
  const filteredMappings = currentMappings.filter(m => m.domain !== domain);

  syncMappingsToHosts(filteredMappings, autoBackup, backupDir);
}

// 检查是否有权限修改 hosts 文件
export function checkHostsPermission(): { hasPermission: boolean; message: string } {
  const hostsPath = getHostsPath();

  try {
    // 尝试读取
    fs.accessSync(hostsPath, fs.constants.R_OK);

    // 尝试写入（检查权限但不实际写入）
    fs.accessSync(hostsPath, fs.constants.W_OK);

    return {
      hasPermission: true,
      message: '拥有 hosts 文件读写权限'
    };
  } catch (error) {
    const platform = os.platform();
    let message = '没有 hosts 文件读写权限。';

    if (platform === 'win32') {
      message += '请以管理员身份运ust。';
    } else {
      message += '请使用 sudo 运行 LocalTrust，或修改 hosts 文件权限。';
    }

    return {
      hasPermission: false,
      message
    };
  }
}

// 获取本机模式状态
export function getLocalModeStatus() {
  const hostsPath = getHostsPath();
  const permission = checkHostsPermission();
  const mappings = permission.hasPermission ? parseHostsFile(readHostsFile()) : [];

  return {
    hostsPath,
    permission,
    mappingsCount: mappings.length,
    mappings
  };
}
