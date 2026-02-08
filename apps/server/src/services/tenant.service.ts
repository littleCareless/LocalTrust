import { nanoid } from 'nanoid';
import db from '../db/index.js';
import type { Tenant, CreateTenantRequest, UpdateTenantRequest, TenantSettings } from '@localtrust/types';

/**
 * 租户管理服务
 */

/**
 * 创建租户
 */
export function createTenant(data: CreateTenantRequest): Tenant {
  const id = nanoid();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO tenants
    (id, name, slug, description, settings, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.name,
    data.slug,
    data.description || null,
    JSON.stringify(data.settings || {}),
    1,
    now,
    now
  );

  return getTenantById(id)!;
}

/**
 * 获取租户 by ID
 */
export function getTenantById(id: string): Tenant | null {
  const stmt = db.prepare(`
    SELECT id, name, slug, description, settings, is_active, created_at, updated_at
    FROM tenants
    WHERE id = ?
  `);

  const row = stmt.get(id) as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    settings: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return mapTenantRow(row);
}

/**
 * 获取租户 by Slug
 */
export function getTenantBySlug(slug: string): Tenant | null {
  const stmt = db.prepare(`
    SELECT id, name, slug, description, settings, is_active, created_at, updated_at
    FROM tenants
    WHERE slug = ?
  `);

  const row = stmt.get(slug) as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    settings: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    return null;
  }

  return mapTenantRow(row);
}

/**
 * 获取所有租户
 */
export function getAllTenants(): Tenant[] {
  const stmt = db.prepare(`
    SELECT id, name, slug, description, settings, is_active, created_at, updated_at
    FROM tenants
    ORDER BY name ASC
  `);

  const rows = stmt.all() as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    settings: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(mapTenantRow);
}

/**
 * 获取活跃租户
 */
export function getActiveTenants(): Tenant[] {
  const stmt = db.prepare(`
    SELECT id, name, slug, description, settings, is_active, created_at, updated_at
    FROM tenants
    WHERE is_active = 1
    ORDER BY name ASC
  `);

  const rows = stmt.all() as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    settings: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(mapTenantRow);
}

/**
 * 更新租户
 */
export function updateTenant(id: string, data: UpdateTenantRequest): Tenant | null {
  const existing = getTenantById(id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE tenants
    SET name = ?, description = ?, settings = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.name ?? existing.name,
    data.description ?? existing.description,
    JSON.stringify(data.settings ?? existing.settings),
    data.isActive !== undefined ? (data.isActive ? 1 : 0) : (existing.isActive ? 1 : 0),
    now,
    id
  );

  return getTenantById(id);
}

/**
 * 删除租户
 */
export function deleteTenant(id: string): boolean {
  // 注意：删除租户会级联删除关联的节点和域名映射
  const stmt = db.prepare('DELETE FROM tenants WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * 更新租户设置
 */
export function updateTenantSettings(id: string, settings: Partial<TenantSettings>): Tenant | null {
  const existing = getTenantById(id);
  if (!existing) {
    return null;
  }

  const mergedSettings = { ...existing.settings, ...settings };
  return updateTenant(id, { settings: mergedSettings });
}

/**
 * 检查 slug 是否已存在
 */
export function isSlugExists(slug: string, excludeId?: string): boolean {
  let stmt;
  if (excludeId) {
    stmt = db.prepare(`
      SELECT COUNT(*) as count FROM tenants
      WHERE slug = ? AND id != ?
    `);
    const result = stmt.get(slug, excludeId) as { count: number };
    return result.count > 0;
  } else {
    stmt = db.prepare(`
      SELECT COUNT(*) as count FROM tenants
      WHERE slug = ?
    `);
    const result = stmt.get(slug) as { count: number };
    return result.count > 0;
  }
}

/**
 * 验证租户访问权限
 */
export function validateTenantAccess(tenantId: string): boolean {
  const tenant = getTenantById(tenantId);
  return tenant !== null && tenant.isActive;
}

/**
 * 获取默认租户
 */
export function getDefaultTenant(): Tenant | null {
  // 优先返回 slug 为 'default' 的租户
  const defaultTenant = getTenantBySlug('default');
  if (defaultTenant) {
    return defaultTenant;
  }

  // 否则返回第一个活跃租户
  const activeTenants = getActiveTenants();
  return activeTenants.length > 0 ? activeTenants[0] : null;
}

/**
 * 获取租户统计信息
 */
export function getTenantStats(): {
  total: number;
  active: number;
  inactive: number;
} {
  const tenants = getAllTenants();

  return {
    total: tenants.length,
    active: tenants.filter(t => t.isActive).length,
    inactive: tenants.filter(t => !t.isActive).length
  };
}

/**
 * 映射数据库行到 Tenant 对象
 */
function mapTenantRow(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  settings: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    settings: JSON.parse(row.settings) as TenantSettings,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
