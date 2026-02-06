import db from '../db';
import type { SystemSettings } from '@localtrust/types';

/**
 * 系统设置服务
 */

/**
 * 获取系统设置
 */
export function getSettings(): SystemSettings {
  const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
  const row = stmt.get('config') as { value: string } | undefined;

  if (!row) {
    // 返回默认设置
    return {
      mode: 'local',
      localMode: {
        hostsPath: '',
        autoBackup: true,
        backupPath: ''
      },
      dnsServer: {
        type: 'dnsmasq',
        configPath: '/etc/dnsmasq.conf',
        restartCommand: 'sudo systemctl restart dnsmasq'
      },
      router: {
        model: 'openwrt',
        ip: '192.168.1.1',
        sshUsername: 'root',
        sshPassword: ''
      }
    };
  }

  const settings = JSON.parse(row.value);

  // 转换为前端格式（camelCase）
  return {
    mode: settings.mode,
    localMode: settings.local_mode ? {
      hostsPath: settings.local_mode.hosts_path,
      autoBackup: settings.local_mode.auto_backup,
      backupPath: settings.local_mode.backup_path
    } : undefined,
    dnsServer: settings.dns_server ? {
      type: settings.dns_server.type,
      configPath: settings.dns_server.config_path,
      restartCommand: settings.dns_server.restart_command
    } : undefined,
    router: settings.router ? {
      model: settings.router.model,
      ip: settings.router.ip,
      sshUsername: settings.router.ssh_username,
      sshPassword: settings.router.ssh_password
    } : undefined
  };
}

/**
 * 更新系统设置
 */
export function updateSettings(settings: SystemSettings): SystemSettings {
  const now = new Date().toISOString();

  // 转换为数据库格式（snake_case）
  const dbSettings = {
    mode: settings.mode,
    local_mode: settings.localMode ? {
      hosts_path: settings.localMode.hostsPath,
      auto_backup: settings.localMode.autoBackup,
      backup_path: settings.localMode.backupPath
    } : undefined,
    dns_server: settings.dnsServer ? {
      type: settings.dnsServer.type,
      config_path: settings.dnsServer.configPath,
      restart_command: settings.dnsServer.restartCommand
    } : undefined,
    router: settings.router ? {
      model: settings.router.model,
      ip: settings.router.ip,
      ssh_username: settings.router.sshUsername,
      ssh_password: settings.router.sshPassword
    } : undefined
  };

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO system_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  stmt.run('config', JSON.stringify(dbSettings), now);

  return settings;
}

/**
 * 获取当前运行模式
 */
export function getMode(): 'local' | 'dns_server' | 'router' {
  const settings = getSettings();
  return settings.mode;
}

/**
 * 更新运行模式
 */
export function updateMode(mode: 'local' | 'dns_server' | 'router'): void {
  const settings = getSettings();
  settings.mode = mode;
  updateSettings(settings);
}
