<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getDNSMappings, createDNSMapping, deleteDNSMapping } from '../api/dns';
import { getMode } from '../api/settings';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, Search } from '@element-plus/icons-vue';
import type { DNSMapping, AddDomainForm } from '../types';

// 状态
const loading = ref(false);
const dialogVisible = ref(false);
const searchKeyword = ref('');
const ipFilter = ref('');
const managedFilter = ref<'all' | 'managed' | 'manual'>('all');
const mappings = ref<DNSMapping[]>([]);
const currentMode = ref<string>('dns_server');

// 是否为本机模式
const isLocalMode = computed(() => currentMode.value === 'local');

// 获取所有去重的IP地址列表
const uniqueIPs = computed(() => {
  const ips = mappings.value.map((mapping: { ip: any }) => mapping.ip);
  return Array.from(new Set(ips)).sort();
});

// 过滤后的域名列表
const filteredMappings = computed(() => {
  let result = mappings.value;

  // 按IP地址筛选
  if (ipFilter.value) {
    result = result.filter((mapping: { ip: string }) => mapping.ip === ipFilter.value);
  }

  // 按管理状态筛选（仅在本机模式下）
  if (isLocalMode.value && managedFilter.value !== 'all') {
    if (managedFilter.value === 'managed') {
      result = result.filter((mapping: { managed?: boolean }) => mapping.managed === true);
    } else if (managedFilter.value === 'manual') {
      result = result.filter((mapping: { managed?: boolean }) => mapping.managed === false);
    }
  }

  return result;
});

// 表单数据
const formData = ref<AddDomainForm>({
  domain: '',
  ip: '',
  port: undefined,
});

// 表单验证规则
const formRules = {
  domain: [
    { required: true, message: '请输入域名', trigger: 'blur' },
    {
      pattern:
        /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
      message: '域名格式不正确',
      trigger: 'blur',
    },
  ],
  ip: [
    { required: true, message: '请输入 IP 地址', trigger: 'blur' },
    {
      pattern:
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      message: 'IP 地址格式不正确',
      trigger: 'blur',
    },
  ],
  port: [
    { type: 'number', min: 1, max: 65535, message: '端口号必须在 1-65535 之间', trigger: 'blur' },
  ],
};

const formRef = ref();

// 加载域名列表
const loadMappings = async () => {
  loading.value = true;
  try {
    mappings.value = await getDNSMappings(searchKeyword.value || undefined);
  } catch (error) {
    console.error('加载域名列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 加载当前模式
const loadMode = async () => {
  try {
    const modeData = await getMode();
    currentMode.value = modeData.mode;
  } catch (error) {
    console.error('加载运行模式失败:', error);
  }
};

// 搜索域名
const handleSearch = () => {
  loadMappings();
};

// 打开添加对话框
const openAddDialog = () => {
  formData.value = {
    domain: '',
    ip: '',
    port: undefined,
  };
  dialogVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    loading.value = true;
    try {
      await createDNSMapping(formData.value);
      ElMessage.success('域名映射添加成功');
      dialogVisible.value = false;
      loadMappings();
    } catch (error) {
      console.error('添加域名映射失败:', error);
    } finally {
      loading.value = false;
    }
  });
};

// 删除域名映射
const handleDelete = async (domain: string, managed?: boolean) => {
  // 本机模式下，只能删除 LocalTrust 管理的域名
  if (isLocalMode.value && !managed) {
    ElMessage.warning('手动配置的域名不可删除，请直接编辑 hosts 文件');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要删除域名 "${domain}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    loading.value = true;
    await deleteDNSMapping(domain);
    ElMessage.success('域名映射删除成功');
    loadMappings();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除域名映射失败:', error);
    }
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
};

onMounted(() => {
  loadMode();
  loadMappings();
});
</script>

<template>
  <div class="domains">
    <!-- 工具栏 -->
    <el-card class="toolbar">
      <el-row :gutter="20" justify="space-between" style="margin-bottom: 16px">
        <el-col :span="12">
          <el-button type="imary" :icon="Plus" @click="openAddDialog"> 添加域名 </el-button>
        </el-col>
        <el-col :span="12">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索域名或 IP"
            :prefix-icon="Search"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch">搜索</el-button>
            </template>
          </el-input>
        </el-col>
      </el-row>

      <!-- 筛选器 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-select v-model="ipFilter" placeholder="按 IP 地址筛选" clearable style="width: 100%">
            <template #prefix>IP 筛选</template>
            <el-option label="全部" value="" />
            <el-option v-for="ip in uniqueIPs" :key="ip" :label="ip" :value="ip" />
          </el-select>
        </el-col>
        <el-col :span="12" v-if="isLocalMode">
          <el-select v-model="managedFilter" placeholder="按管理状态筛选" style="width: 100%">
            <template #prefix>管理状态</template>
            <el-option label="全部" value="all" />
            <el-option label="LocalTrust 管理" value="managed" />
            <el-option label="手动配置" value="manual" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 域名列表 -->
    <el-card style="margin-top: 20px">
      <el-table :data="filteredMappings" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="domain" label="域名" min-width="200" />
        <el-table-column prop="ip" label="IP 地址" width="150" />
        <el-table-column prop="port" label="端口" width="100">
          <template #default="{ row }">
            {{ row.port || '-' }}
          </template>
        </el-table-column>
        <el-table-column v-if="isLocalMode" label="管理状态" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.managed" type="success" size="small"> LocalTrust 管理 </el-tag>
            <el-tag v-else type="info" size="small"> 手动配置 </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-tooltip
              v-if="isLocalMode && !row.managed"
              content="手动配置的域名不可删除，请直接编辑 hosts 文件"
              placement="top"
            >
              <el-button type="danger" size="small" :icon="Delete" disabled> 删除 </el-button>
            </el-tooltip>
            <el-button
              v-else
              type="danger"
              size="small"
              :icon="Delete"
              @click="handleDelete(row.domain, row.managed)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && mappings.length === 0" description="暂无域名映射" />
    </el-card>

    <!-- 添加域名对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="添加域名映射"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="域名" prop="domain">
          <el-input v-model="formData.domain" placeholder="例如：example.local" clearable />
        </el-form-item>
        <el-form-item label="IP 地址" prop="ip">
          <el-input v-model="formData.ip" placeholder="例如：192.168.1.100" clearable />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number
            v-model="formData.port"
            :min="1"
            :max="65535"
            placeholder="可选"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading"> 确定 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.domains {
  width: 100%;
}

.toolbar {
  margin-bottom: 0;
}
</style>
