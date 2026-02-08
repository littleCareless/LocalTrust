<template>
  <div class="tenants-page">
    <div class="page-header">
      <h1>租户管理</h1>
      <el-button type="primary" @click="showAddDialog">添加租户</el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #default>
            <div class="stat-item">
              <span class="stat-label">总租户数</span>
              <span class="stat-value">{{ stats.total }}</span>
            </div>
          </template>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #default>
            <div class="stat-item success">
              <span class="stat-label">活跃</span>
              <span class="stat-value">{{ stats.active }}</span>
            </div>
          </template>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #default>
            <div class="stat-item warning">
              <span class="stat-label">非活跃</span>
              <span class="stat-value">{{ stats.inactive }}</span>
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>

    <!-- 租户列表 -->
    <el-card>
      <el-table :data="tenants" stripe style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="150">
          <template #default="{ row }">
            <div class="tenant-name">
              <el-tag>{{ row.slug }}</el-tag>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '活跃' : '非活跃' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="查看详情">
                <el-button size="small" @click="viewDetails(row)">
                  <el-icon><View /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑">
                <el-button size="small" @click="editTenant(row)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="管理节点">
                <el-button size="small" type="success" @click="manageNodes(row)">
                  <el-icon><Connection /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除">
                <el-button size="small" type="danger" :disabled="row.slug === 'default'" @click="removeTenant(row)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑租户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑租户' : '添加租户'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        status-icon
      >
        <el-form-item label="租户名称" prop="name">
          <el-input v-model="form.name" placeholder="输入租户名称" />
        </el-form-item>
        <el-form-item label="租户标识" prop="slug">
          <el-input v-model="form.slug" placeholder="如: team-a" :disabled="isEdit">
            <template #prepend>slug</template>
          </el-input>
          <div class="form-tip">唯一标识符，用于 API 和 URL 中</div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="输入租户描述（可选）"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.isActive" active-text="活跃" inactive-text="非活跃" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 租户详情抽屉 -->
    <el-drawer v-model="detailsVisible" title="租户详情" size="400px">
      <template v-if="selectedTenant">
        <div class="detail-section">
          <h3>基本信息</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="ID">
              <el-tag size="small">{{ selectedTenant.id }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="名称">{{ selectedTenant.name }}</el-descriptions-item>
            <el-descriptions-item label="标识">{{ selectedTenant.slug }}</el-descriptions-item>
            <el-descriptions-item label="描述">
              {{ selectedTenant.description || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="selectedTenant.isActive ? 'success' : 'info'">
                {{ selectedTenant.isActive ? '活跃' : '非活跃' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDate(selectedTenant.createdAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <h3>节点统计</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="总节点">
              <el-tag>{{ details?.nodeStats?.total || 0 }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="在线">
              <el-tag type="success">{{ details?.nodeStats?.online || 0 }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="离线">
              <el-tag type="info">{{ details?.nodeStats?.offline || 0 }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="错误">
              <el-tag type="danger">{{ details?.nodeStats?.error || 0 }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <h3>域名统计</h3>
          <el-statistic title="域名映射数" :value="details?.domainCount || 0" />
        </div>

        <div class="detail-actions">
          <el-button type="primary" @click="manageNodes(selectedTenant)">管理节点</el-button>
          <el-button @click="editTenant(selectedTenant)">编辑租户</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { View, Edit, Delete, Connection } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import * as tenantsApi from '../api/tenants';
import type { Tenant } from '../types';

const tenants = ref<Tenant[]>([]);
const stats = ref({ total: 0, active: 0, inactive: 0 });
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const detailsVisible = ref(false);
const editingId = ref('');
const selectedTenant = ref<Tenant | null>(null);
const details = ref<any>(null);

const formRef = ref<FormInstance>();

const form = reactive({
  name: '',
  slug: '',
  description: '',
  isActive: true
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入租户名称', trigger: 'blur' }],
  slug: [
    { required: true, message: '请输入租户标识', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9-]*[a-z0-9]$/, message: '标识格式不正确（需以字母开头，只包含字母、数字、连字符）', trigger: 'blur' }
  ]
};

// 获取租户列表
async function fetchTenants() {
  loading.value = true;
  try {
    tenants.value = await tenantsApi.getTenants();
  } catch (error) {
    ElMessage.error('获取租户列表失败');
  } finally {
    loading.value = false;
  }
}

// 获取统计数据
async function fetchStats() {
  try {
    stats.value = await tenantsApi.getTenantStats();
  } catch (error) {
    console.error('获取统计失败:', error);
  }
}

// 显示添加对话框
function showAddDialog() {
  isEdit.value = false;
  editingId.value = '';
  resetForm();
  dialogVisible.value = true;
}

// 编辑租户
function editTenant(tenant: Tenant) {
  isEdit.value = true;
  editingId.value = tenant.id;
  Object.assign(form, {
    name: tenant.name,
    slug: tenant.slug,
    description: tenant.description || '',
    isActive: tenant.isActive
  });
  dialogVisible.value = true;
}

// 重置表单
function resetForm() {
  formRef.value?.resetFields();
  Object.assign(form, {
    name: '',
    slug: '',
    description: '',
    isActive: true
  });
}

// 提交表单
async function submitForm() {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    try {
      if (isEdit.value) {
        await tenantsApi.updateTenant(editingId.value, form);
        ElMessage.success('租户更新成功');
      } else {
        await tenantsApi.createTenant(form);
        ElMessage.success('租户创建成功');
      }
      dialogVisible.value = false;
      fetchTenants();
      fetchStats();
    } catch (error) {
      ElMessage.error(isEdit.value ? '更新租户失败' : '创建租户失败');
    }
  });
}

// 删除租户
async function removeTenant(tenant: Tenant) {
  try {
    await ElMessageBox.confirm(`确定要删除租户 "${tenant.name}" 吗？这将同时删除所有关联的节点和域名映射。`, '确认删除', {
      type: 'warning'
    });
    await tenantsApi.deleteTenant(tenant.id);
    ElMessage.success('删除成功');
    fetchTenants();
    fetchStats();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

// 查看详情
async function viewDetails(tenant: Tenant) {
  selectedTenant.value = tenant;
  try {
    details.value = await tenantsApi.getTenantDetails(tenant.id);
  } catch (error) {
    console.error('获取详情失败:', error);
  }
  detailsVisible.value = true;
}

// 管理节点
function manageNodes(tenant: Tenant) {
  // 跳转到节点管理页面并筛选该租户
  window.location.href = `/nodes?tenant=${tenant.id}`;
}

// 格式化日期
function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN');
}

onMounted(() => {
  fetchTenants();
  fetchStats();
});
</script>

<style scoped lang="scss">
.tenants-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }
}

.stats-row {
  margin-bottom: 20px;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .stat-label {
      color: #909399;
      font-size: 14px;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
    }

    &.success .stat-value { color: #67c23a; }
    &.warning .stat-value { color: #e6a23c; }
  }
}

.tenant-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.detail-section {
  margin-bottom: 24px;

  h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
  }
}

.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
</style>
