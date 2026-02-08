import { Client } from 'ssh2';
import type { SSHConfig, SSHConnectionResult } from '@localtrust/types';
import db from '../db/index.js';

/**
 * SSH 连接服务
 * 负责管理远程节点的 SSH 连接和命令执行
 */

/**
 * 获取节点的 SSH 配置
 */
export function getSSHConfig(nodeId: string): SSHConfig | null {
  const stmt = db.prepare(`
    SELECT id, node_id, auth_type, username, password, private_key, passphrase,
           sudo_required, sudo_password, created_at, updated_at
    FROM node_ssh_configs
    WHERE node_id = ?
  `);

  const row = stmt.get(nodeId) as {
    id: string;
    node_id: string;
    auth_type: string;
    username: string;
    password: string | null;
    private_key: string | null;
    passphrase: string | null;
    sudo_required: number;
    sudo_password: string | null;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nodeId: row.node_id,
    authType: row.auth_type as SSHConfig['authType'],
    username: row.username,
    password: row.password || undefined,
    privateKey: row.private_key || undefined,
    passphrase: row.passphrase || undefined,
    sudoRequired: row.sudo_required === 1,
    sudoPassword: row.sudo_password || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 保存 SSH 配置
 */
export function saveSSHConfig(data: {
  nodeId: string;
  authType?: SSHConfig['authType'];
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  sudoRequired?: boolean;
  sudoPassword?: string;
}): SSHConfig {
  const id = `ssh_${data.nodeId}`;
  const now = new Date().toISOString();

  // 检查是否已存在
  const existing = getSSHConfig(data.nodeId);

  if (existing) {
    const stmt = db.prepare(`
      UPDATE node_ssh_configs
      SET auth_type = ?, username = ?, password = ?, private_key = ?,
          passphrase = ?, sudo_required = ?, sudo_password = ?, updated_at = ?
      WHERE node_id = ?
    `);

    stmt.run(
      data.authType || 'password',
      data.username,
      data.password || null,
      data.privateKey || null,
      data.passphrase || null,
      data.sudoRequired ? 1 : 0,
      data.sudoPassword || null,
      now,
      data.nodeId
    );
  } else {
    const stmt = db.prepare(`
      INSERT INTO node_ssh_configs
      (id, node_id, auth_type, username, password, private_key, passphrase,
       sudo_required, sudo_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.nodeId,
      data.authType || 'password',
      data.username,
      data.password || null,
      data.privateKey || null,
      data.passphrase || null,
      data.sudoRequired ? 1 : 0,
      data.sudoPassword || null,
      now,
      now
    );
  }

  return {
    id,
    nodeId: data.nodeId,
    authType: data.authType || 'password',
    username: data.username,
    password: data.password,
    privateKey: data.privateKey,
    passphrase: data.passphrase,
    sudoRequired: data.sudoRequired || false,
    sudoPassword: data.sudoPassword,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * 删除 SSH 配置
 */
export function deleteSSHConfig(nodeId: string): boolean {
  const stmt = db.prepare('DELETE FROM node_ssh_configs WHERE node_id = ?');
  const result = stmt.run(nodeId);
  return result.changes > 0;
}

/**
 * 测试 SSH 连接
 */
export async function testSSHConnection(
  host: string,
  port: number,
  username: string,
  authType: SSHConfig['authType'],
  password?: string,
  privateKey?: string,
  passphrase?: string
): Promise<SSHConnectionResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const conn = new Client();

    conn.on('ready', () => {
      const latency = Date.now() - startTime;

      // 测试执行简单命令
      conn.exec('echo "connection test"', (err, stream) => {
        if (err) {
          conn.end();
          resolve({
            success: false,
            error: `连接成功但执行命令失败: ${err.message}`,
            latency
          });
          return;
        }

        let output = '';
        stream.on('close', () => {
          conn.end();
          resolve({
            success: true,
            output: output.trim(),
            latency
          });
        });
        stream.on('data', (data) => {
          output += data.toString();
        });
        stream.stderr.on('data', (data) => {
          output += data.toString();
        });
      });
    });

    conn.on('error', (err) => {
      resolve({
        success: false,
        error: `连接失败: ${err.message}`,
        latency: Date.now() - startTime
      });
    });

    conn.on('close', () => {
      // 连接已关闭
    });

    // 构建连接配置
    const connectConfig: any = {
      host,
      port,
      username,
      readyTimeout: 10000,
      timeout: 30000
    };

    // 根据认证类型设置不同参数
    if (authType === 'private_key' && privateKey) {
      connectConfig.privateKey = privateKey;
      if (passphrase) {
        connectConfig.passphrase = passphrase;
      }
    } else if (password) {
      connectConfig.password = password;
    }

    try {
      conn.connect(connectConfig);
    } catch (err) {
      resolve({
        success: false,
        error: `连接异常: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  });
}

/**
 * 在远程节点上执行命令
 */
export async function executeRemoteCommand(
  nodeId: string,
  command: string,
  useSudo: boolean = false
): Promise<SSHConnectionResult> {
  const sshConfig = getSSHConfig(nodeId);
  if (!sshConfig) {
    return {
      success: false,
      error: '未找到节点的 SSH 配置'
    };
  }

  const nodeStmt = db.prepare('SELECT host, port, os_type FROM nodes WHERE id = ?');
  const node = nodeStmt.get(nodeId) as { host: string; port: number; os_type: string } | undefined;

  if (!node) {
    return {
      success: false,
      error: '未找到节点信息'
    };
  }

  const startTime = Date.now();

  return new Promise((resolve) => {
    const conn = new Client();

    conn.on('ready', () => {
      const latency = Date.now() - startTime;

      // 构建实际执行的命令
      let actualCommand = command;
      if (useSudo && sshConfig.sudoRequired) {
        const sudoPassword = sshConfig.sudoPassword ? `echo '${sshConfig.sudoPassword}' | ` : '';
        actualCommand = `${sudoPassword}sudo ${command}`;
      }

      conn.exec(actualCommand, (err, stream) => {
        if (err) {
          conn.end();
          resolve({
            success: false,
            error: `执行命令失败: ${err.message}`,
            latency
          });
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number, signal: string) => {
          conn.end();

          if (code !== 0) {
            resolve({
              success: false,
              error: `命令执行失败 (退出码: ${code})`,
              output: stderr.trim() || stdout.trim(),
              latency
            });
            return;
          }

          resolve({
            success: true,
            output: stdout.trim(),
            latency
          });
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      });
    });

    conn.on('error', (err) => {
      resolve({
        success: false,
        error: `SSH 连接失败: ${err.message}`,
        latency: Date.now() - startTime
      });
    });

    conn.connect({
      host: node.host,
      port: node.port,
      username: sshConfig.username,
      readyTimeout: 10000,
      timeout: 60000,
      ...(sshConfig.authType === 'private_key' && sshConfig.privateKey
        ? {
            privateKey: sshConfig.privateKey,
            passphrase: sshConfig.passphrase
          }
        : {
            password: sshConfig.password
          })
    });
  });
}

/**
 * 上传文件到远程节点
 */
export async function uploadFile(
  nodeId: string,
  localPath: string,
  remotePath: string
): Promise<SSHConnectionResult> {
  const sshConfig = getSSHConfig(nodeId);
  if (!sshConfig) {
    return {
      success: false,
      error: '未找到节点的 SSH 配置'
    };
  }

  const nodeStmt = db.prepare('SELECT host, port FROM nodes WHERE id = ?');
  const node = nodeStmt.get(nodeId) as { host: string; port: number } | undefined;

  if (!node) {
    return {
      success: false,
      error: '未找到节点信息'
    };
  }

  const fs = await import('fs');

  return new Promise((resolve) => {
    const conn = new Client();
    let sftp: any;

    conn.on('ready', () => {
      conn.sftp((err, sftpClient) => {
        if (err) {
          conn.end();
          resolve({
            success: false,
            error: `SFTP 连接失败: ${err.message}`
          });
          return;
        }

        sftp = sftpClient;

        sftp.fastPut(localPath, remotePath, (err: Error) => {
          conn.end();

          if (err) {
            resolve({
              success: false,
              error: `文件上传失败: ${err.message}`
            });
            return;
          }

          resolve({
            success: true,
            output: `文件已上传到 ${remotePath}`
          });
        });
      });
    });

    conn.on('error', (err) => {
      resolve({
        success: false,
        error: `SSH 连接失败: ${err.message}`
      });
    });

    conn.connect({
      host: node.host,
      port: node.port,
      username: sshConfig.username,
      readyTimeout: 10000,
      timeout: 60000,
      ...(sshConfig.authType === 'private_key' && sshConfig.privateKey
        ? {
            privateKey: sshConfig.privateKey,
            passphrase: sshConfig.passphrase
          }
        : {
            password: sshConfig.password
          })
    });
  });
}

/**
 * 从远程节点下载文件
 */
export async function downloadFile(
  nodeId: string,
  remotePath: string,
  localPath: string
): Promise<SSHConnectionResult> {
  const sshConfig = getSSHConfig(nodeId);
  if (!sshConfig) {
    return {
      success: false,
      error: '未找到节点的 SSH 配置'
    };
  }

  const nodeStmt = db.prepare('SELECT host, port FROM nodes WHERE id = ?');
  const node = nodeStmt.get(nodeId) as { host: string; port: number } | undefined;

  if (!node) {
    return {
      success: false,
      error: '未找到节点信息'
    };
  }

  return new Promise((resolve) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          resolve({
            success: false,
            error: `SFTP 连接失败: ${err.message}`
          });
          return;
        }

        sftp.fastGet(remotePath, localPath, (err: Error) => {
          conn.end();

          if (err) {
            resolve({
              success: false,
              error: `文件下载失败: ${err.message}`
            });
            return;
          }

          resolve({
            success: true,
            output: `文件已下载到 ${localPath}`
          });
        });
      });
    });

    conn.on('error', (err) => {
      resolve({
        success: false,
        error: `SSH 连接失败: ${err.message}`
      });
    });

    conn.connect({
      host: node.host,
      port: node.port,
      username: sshConfig.username,
      readyTimeout: 10000,
      timeout: 60000,
      ...(sshConfig.authType === 'private_key' && sshConfig.privateKey
        ? {
            privateKey: sshConfig.privateKey,
            passphrase: sshConfig.passphrase
          }
        : {
            password: sshConfig.password
          })
    });
  });
}
