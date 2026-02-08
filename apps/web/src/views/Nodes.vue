<template>
  <div class="nodes-page">
    <div class="page-header">
      <h1>节点管理</h1>
      <el-button type="primary" @click="showAddDialog">添加节点</el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover">
          <template #default>
            <div class="stat-item">
              <span class="stat-label">总节点数</span>
              <span class="stat-value">{{ stats.total }}</span>
            </div>
          </template>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #default>
            <div class="stat-item success">
              <span class="stat-label">在线</span>
              <span class="stat-value">{{ stats.online }}</span>
            </div>
          </template>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #default>
            <div class="stat-item warning">
              <span class="stat-label">离线</span>
              <span class="stat-value">{{ stats.offline }}</span>
            </div>
          </template>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #default>
            <div class="stat-item danger">
              <span class="stat-label">错误</span>
              <span class="stat-value">{{ stats.error }}</span>
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选器 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="租户">
          <el-select v-model="filters.tenantId" placeholder="选择租户" clearable @change="fetchNodes">
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable @change="fetchNodes">
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
            <el-option label="错误" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchNodes">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 节点列表 -->
    <el-card>
      <el-table :data="nodes" stripe style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="150">
          <template #default="{ row }">
            <div class="node-name">
              <el-icon v-if="row.isPrimary" color="#409EFF"><Star /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="host" label="主机地址" min-width="180">
          <template #default="{ row }">
            <el-tag>{{ row.host }}:{{ row.port }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="osType" label="系统" width="100">
          <template #default="{ row }">
            <el-tag :type="osTagType(row.osType)">{{ row.osType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">
              <el-icon v-if="row.status === 'online'" class="status-icon"><CircleCheck /></el-icon>
              <el-icon v-else-if="row.status === 'error'" class="status-icon"><CircleClose /></el-icon>
              <el-icon v-else class="status-icon"><QuestionFilled /></el-icon>
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="tags" label="标签" min-width="150">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags" :key="tag" size="small" class="node-tag">
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastSeenAt" label="最后在线" width="180">
          <template #default="{ row }">
            {{ formatDate(row.lastSeenAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="测试连接">
                <el-button size="small" @click="checkConnection(row)">
                  <el-icon><Connection /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="同步 hosts">
                <el-button size="small" type="success" @click="syncHostsNode(row)">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑">
                <el-button size="small" @click="editNode(row)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除">
                <el-button size="small" type="danger" @click="removeNode(row)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑节点对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑节点' : '添加节点'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        status-icon
      >
        <el-form-item label="所属租户" prop="tenantId">
          <el-select v-model="form.tenantId" placeholder="选择租户" style="width: 100%">
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="节点名称" prop="name">
          <el-input v-model="form.name" placeholder="输入节点名称" />
        </el-form-item>
        <el-form-item label="主机地址" prop="host">
          <el-input v-model="form.host" placeholder="如: 192.168.1.100" />
        </el-form-item>
        <el-form-item label="SSH 端口" prop="port">
          <el-input-number v-model="form.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="操作系统">
          <el-select v-model="form.osType" style="width: 100%">
            <el-option label="Linux" value="linux" />
            <el-option label="macOS" value="macos" />
            <el-option label="Windows" value="windows" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tags" multiple filterable allow-create placeholder="添加标签" style="width: 100%">
            <el-option v-for="tag in availableTags" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>
        <el-form-item label="主节点">
          <el-switch v-model="form.isPrimary" active-text="设为主节点" />
        </el-form-item>

        <el-divider>SSH 配置</el-divider>

        <el-form-item label="用户名" prop="ssh.username">
          <el-input v-model="form.ssh.username" placeholder="SSH 登录用户名" />
        </el-form-item>
        <el-form-item label="认证方式">
          <el-radio-group v-model="form.ssh.authType">
            <el-radio label="password">密码</el-radio>
            <el-radio label="private_key">私钥</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.ssh.authType === 'password'" label="密码">
          <el-input v-model="form.ssh.password" type="password" show-password placeholder="SSH 密码" />
        </el-form-item>
        <el-form-item v-if="form.ssh.authType === 'private_key'" label="私钥内容">
          <el-input
            v-model="form.ssh.privateKey"
            type="textarea"
            :rows="4"
            placeholder="粘贴 SSH 私钥内容"
          />
        </el-form-item>
        <el-form-item v-if="form.ssh.authType === 'private_key'" label="私钥密码">
          <el-input v-model="form.ssh.passphrase" type="password" show-password placeholder="私钥密码（可选）" />
        </el-form-item>
        <el-form-item label="需要 sudo">
          <el-switch v-model="form.ssh.sudoRequired" active-text="需要 sudo 权限" />
        </el-form-item>
        <el-form-item v-if="form.ssh.sudoRequired" label="sudo 密码">
          <el-input v-model="form.ssh.sudoPassword" type="password" show-password placeholder="sudo 密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  CircleCheck, CircleClose, QuestionFilled, Connection, Refresh, Edit, Delete, Star
} from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import * as nodesApi from '../api/nodes';
import { getTenants } from '../api/tenants';
import type { Node, OSType } from '../types';

const nodes = ref<Node[]>([]);
const tenants = ref<any[]>([]);
const stats = ref({ total: 0, online: 0, offline: 0, unknown: 0, error: 0 });
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref('');

const formRef = ref<FormInstance>();
const filters = reactive({
  tenantId: '',
  status: ''
});

const form = reactive({
  tenantId: '',
  name: '',
  host: '',
  port: 22,
  osType: 'linux',
  tags: [] as string[],
  isPrimary: false,
  ssh: {
    authType: 'password' as 'password' | 'private_key',
    username: '',
    password: '',
    privateKey: '',
    passphrase: '',
    sudoRequired: false,
    sudoPassword: ''
  }
});

const rules: FormRules = {
  tenantId: [{ required: true, message: '请选择租户', trigger: 'change' }],
  name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  'ssh.username': [{ required: true, message: '请输入 SSH 用户名', trigger: 'blur' }]
};

const availableTags = ['web', 'api', 'db', 'cache', 'worker'];

// 获取节点列表
async function fetchNodes() {
  loading.value = true;
  try {
    nodes.value = await nodesApi.getNodes(filters.tenantId || undefined);
    stats.value = await nodesApi.getNodeStats(filters.tenantId || undefined);
  } catch (error) {
    ElMessage.error('获取节点列表失败');
  } finally {
    loading.value = false;
  }
}

// 获取租户列表
async function fetchTenants() {
  try {
    tenants.value = await getTenants();
  } catch (error) {
    console.error('获取租户列表失败:', error);
  }
}

// 重置筛选
function resetFilters() {
  filters.tenantId = '';
  filters.status = '';
  fetchNodes();
}

// 显示添加对话框
function showAddDialog() {
  isEdit.value = false;
  editingId.value = '';
  resetForm();
  dialogVisible.value = true;
}

// 编辑节点
function editNode(node: Node) {
  isEdit.value = true;
  editingId.value = node.id;
  Object.assign(form, {
    tenantId: node.tenantId,
    name: node.name,
    host: node.host,
    port: node.port,
    osType: node.osType || 'linux',
    tags: node.tags || [],
    isPrimary: node.isPrimary,
    ssh: {
      authType: 'password',
      username: '',
      password: '',
      privateKey: '',
      passphrase: '',
      sudoRequired: false,
      sudoPassword: ''
    }
  });
  dialogVisible.value = true;
}

// 重置表单
function resetForm() {
  formRef.value?.resetFields();
  Object.assign(form, {
    tenantId: tenants.value[0]?.id || '',
    name: '',
    host: '',
    port: 22,
    osType: 'linux',
    tags: [],
    isPrimary: false,
    ssh: {
      authType: 'password',
      username: '',
      password: '',
      privateKey: '',
      passphrase: '',
      sudoRequired: false,
      sudoPassword: ''
    }
  });
}

// 提交表单
async function submitForm() {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    const nodeData = {
      tenantId: form.tenantId,
      name: form.name,
      host: form.host,
      port: form.port,
      osType: form.osType as OSType,
      tags: form.tags,
      isPrimary: form.isPrimary
    };

    try {
      if (isEdit.value) {
        await nodesApi.updateNode(editingId.value, nodeData);
        ElMessage.success('节点更新成功');
      } else {
        await nodesApi.createNode(nodeData);
        ElMessage.success('节点创建成功');
      }
      dialogVisible.value = false;
      fetchNodes();
    } catch (error) {
      ElMessage.error(isEdit.value ? '更新节点失败' : '创建节点失败');
    }
  });
}

// 删除节点
async function removeNode(node: Node) {
  try {
    await ElMessageBox.confirm(`确定要删除节点 "${node.name}" 吗？`, '确认删除', {
      type: 'warning'
    });
    await nodesApi.deleteNode(node.id);
    ElMessage.success('删除成功');
    fetchNodes();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

// 测试连接
async function checkConnection(node: Node) {
  try {
    const result = await nodesApi.testConnection(node.id);
    if (result.success) {
      ElMessage.success(`连接成功 (延迟: ${result.latency}ms)`);
    } else {
      ElMessage.error(`连接失败: ${result.error}`);
    }
  } catch (error) {
    ElMessage.error('测试连接失败');
  }
}

// 同步 hosts
async function syncHostsNode(node: Node) {
  try {
    const result = await nodesApi.syncNode(node.id);
    ElMessage.success(`同步任务已创建: ${result.taskId}`);
  } catch (error) {
    ElMessage.error('同步失败');
  }
}

// 状态标签类型
function statusTagType(status: string): string {
  const map: Record<string, string> = {
    online: 'success',
    offline: 'info',
    unknown: 'warning',
    error: 'danger'
  };
  return map[status] || 'info';
}

// 状态文本
function statusText(status: string): string {
  const map: Record<string, string> = {
    online: '在线',
    offline: '离线',
    unknown: '未知',
    error: '错误'
  };
  return map[status] || '未知';
}

// OS 标签类型
function osTagType(os: string): string {
  const map: Record<string, string> = {
    linux: '',
    macos: 'success',
    windows: 'primary'
  };
  return map[os] || '';
}

// 格式化日期
function formatDate(date: string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
}

onMounted(() => {
  fetchTenants().then(() => fetchNodes());
});
</script>

<style scoped lang="scss">
.nodes-page {
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
    &.danger .stat-value { color: #f56c6c; }
  }
}

.filter-card {
  margin-bottom: 20px;
}

.node-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-tag {
  margin-right: 4px;
}

.status-icon {
  margin-right: 4px;
}
</style>
