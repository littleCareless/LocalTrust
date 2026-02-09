<template>
  <div class="certificates-page">
    <div class="page-header">
      <h1>ACME 证书管理</h1>
      <p class="subtitle">通过 Let's Encrypt 等 ACME 服务器自动获取和续期 SSL/TLS 证书</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalCertificates }}</div>
          <div class="stat-label">证书总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value text-success">{{ stats.activeCertificates }}</div>
          <div class="stat-label">有效证书</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card warning">
          <div class="stat-value">{{ stats.expiringIn30Days }}</div>
          <div class="stat-label">30天内过期</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card danger">
          <div class="stat-value">{{ stats.expiringIn7Days }}</div>
          <div class="stat-label">7天内过期</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作按钮 -->
    <el-card shadow="never" class="action-card">
      <el-space wrap>
        <el-button type="primary" @click="showCreateAccountDialog">
          <el-icon><Plus /></el-icon>
          创建 ACME 账户
        </el-button>
        <el-button type="success" @click="showIssueCertDialog">
          <el-icon><Document /></el-icon>
          申请新证书
        </el-button>
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button @click="batchCheck" :loading="checking">
          <el-icon><Search /></el-icon>
          检查证书状态
        </el-button>
      </el-space>
    </el-card>

    <!-- ACME 账户管理 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="card-header">
          <span>ACME 账户</span>
          <el-tag :type="accounts.length > 0 ? 'success' : 'info'">
            {{ accounts.length }} 个账户
          </el-tag>
        </div>
      </template>

      <el-table :data="accounts" stripe v-if="accounts.length > 0">
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="serverUrl" label="服务器" width="300">
          <template #default="{ row }">
            <el-tag size="small">{{ row.serverUrl.includes('staging') ? 'Staging' : 'Production' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="termsOfServiceAccepted" label="TOS" width="100">
          <template #default="{ row }">
            <el-tag :type="row.termsOfServiceAccepted ? 'success' : 'warning'" size="small">
              {{ row.termsOfServiceAccepted ? '已接受' : '未接受' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
              {{ row.isActive ? '活跃' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="danger" size="small" text @click="deleteAccount(row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="暂无 ACME 账户" />
    </el-card>

    <!-- 证书列表 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="card-header">
          <span>证书列表</span>
          <div class="header-actions">
            <el-switch
              v-model="onlyExpiring"
              active-text="仅显示即将过期"
              @change="fetchCertificates"
            />
          </div>
        </div>
      </template>

      <el-table :data="certificates" stripe v-if="certificates.length > 0">
        <el-table-column prop="domain" label="域名" min-width="150" />
        <el-table-column prop="validFrom" label="起始日期" width="150">
          <template #default="{ row }">
            {{ formatDate(row.validFrom) }}
          </template>
        </el-table-column>
        <el-table-column prop="validTo" label="到期日期" width="150">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpiringSoon(row.validTo) }">
              {{ formatDate(row.validTo) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="剩余天数" width="100">
          <template #default="{ row }">
            <el-tag :type="getDaysTagType(row.validTo)" size="small">
              {{ getDaysUntilExpiry(row.validTo) }} 天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="autoRenewalEnabled" label="自动续期" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.autoRenewalEnabled"
              size="small"
              @change="toggleAutoRenewal(row.id, $event)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="续期证书">
                <el-button type="success" size="small" @click="renewCertificate(row.id)">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="查看详情">
                <el-button size="small" @click="showCertDetail(row)">
                  <el-icon><Document /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="导出证书">
                <el-button size="small" @click="exportCertificate(row.id)">
                  <el-icon><Download /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除">
                <el-button type="danger" size="small" text @click="deleteCertificate(row.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="暂无证书" />
    </el-card>

    <!-- 续期设置 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="card-header">
          <span>自动续期设置</span>
          <el-tag :type="renewalSettings.renewalEnabled ? 'success' : 'info'">
            {{ renewalSettings.renewalEnabled ? '已启用' : '已禁用' }}
          </el-tag>
        </div>
      </template>

      <el-form :model="renewalSettings" label-width="160px">
        <el-form-item label="自动续期总开关">
          <el-switch v-model="renewalSettings.renewalEnabled" @change="saveRenewalSettings" />
        </el-form-item>
        <el-form-item label="提醒天数">
          <el-input-number 
            v-model="renewalSettings.reminderDaysBefore" 
            :min="1" 
            :max="90"
            @change="saveRenewalSettings"
          />
          <span class="form-tip">证书到期前多少天发送提醒</span>
        </el-form-item>
        <el-form-item label="自动续期阈值">
          <el-input-number 
            v-model="renewalSettings.autoRenewalDaysBefore" 
            :min="1" 
            :max="30"
            @change="saveRenewalSettings"
          />
          <span class="form-tip">证书到期前多少天自动续期</span>
        </el-form-item>
        <el-form-item label="通知邮箱">
          <el-input 
            v-model="renewalSettings.notifyEmail" 
            placeholder="选填，接收续期通知"
            style="width: 300px"
            @blur="saveRenewalSettings"
          />
        </el-form-item>
        <el-form-item label="Webhook URL">
          <el-input 
            v-model="renewalSettings.webhookUrl" 
            placeholder="选填，接收续期 Webhook 通知"
            style="width: 400px"
            @blur="saveRenewalSettings"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 创建账户对话框 -->
    <el-dialog v-model="showAccountDialog" title="创建 ACME 账户" width="500px">
      <el-form :model="newAccount" label-width="120px">
        <el-form-item label="邮箱" required>
          <el-input v-model="newAccount.email" placeholder="用于注册 Let's Encrypt 账户" />
        </el-form-item>
        <el-form-item label="服务器">
          <el-select v-model="newAccount.serverUrl" style="width: 100%">
            <el-option label="Let's Encrypt (生产环境)" value="https://acme-v02.api.letsencrypt.org/directory" />
            <el-option label="Let's Encrypt (测试环境)" value="https://acme-staging-v02.api.letsencrypt.org/directory" />
          </el-select>
        </el-form-item>
        <el-form-item label="">
          <el-checkbox v-model="newAccount.acceptTermsOfService">
            我接受 Let's Encrypt 的服务条款
          </el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAccountDialog = false">取消</el-button>
        <el-button type="primary" @click="createAccount" :loading="creating">创建</el-button>
      </template>
    </el-dialog>

    <!-- 申请证书对话框 -->
    <el-dialog v-model="showIssueDialog" title="申请新证书" width="500px">
      <el-form :model="newCert" label-width="120px">
        <el-form-item label="域名" required>
          <el-input v-model="newCert.domain" placeholder="example.com" />
        </el-form-item>
        <el-form-item label="账户" required>
          <el-select v-model="newCert.accountId" style="width: 100%" placeholder="选择 ACME 账户">
            <el-option 
              v-for="acc in accounts" 
              :key="acc.id" 
              :label="acc.email" 
              :value="acc.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="挑战类型">
          <el-select v-model="newCert.challengeType" style="width: 100%">
            <el-option label="HTTP-01 (推荐)" value="http-01" />
          </el-select>
          <div class="form-tip">需要配置 DNS 记录将域名指向本服务器</div>
        </el-form-item>
        <el-form-item label="启用自动续期">
          <el-switch v-model="newCert.autoRenewal" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input 
            v-model="newCert.notes" 
            type="textarea" 
            :rows="2"
            placeholder="可选" 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showIssueDialog = false">取消</el-button>
        <el-button type="primary" @click="issueCertificate" :loading="issuing">申请</el-button>
      </template>
    </el-dialog>

    <!-- 证书详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="证书详情" width="700px">
      <el-descriptions :column="2" border v-if="selectedCert">
        <el-descriptions-item label="域名">{{ selectedCert.domain }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(selectedCert.status)">
            {{ getStatusText(selectedCert.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="起始日期">{{ formatDate(selectedCert.validFrom) }}</el-descriptions-item>
        <el-descriptions-item label="到期日期">{{ formatDate(selectedCert.validTo) }}</el-descriptions-item>
        <el-descriptions-item label="剩余天数">{{ getDaysUntilExpiry(selectedCert.validTo) }} 天</el-descriptions-item>
        <el-descriptions-item label="自动续期">
          {{ selectedCert.autoRenewalEnabled ? '已启用' : '已禁用' }}
        </el-descriptions-item>
        <el-descriptions-item label="序列号" :span="2">
          <code>{{ selectedCert.serialNumber }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="指纹" :span="2">
          <code>{{ selectedCert.fingerprint }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="证书" :span="2">
          <el-input type="textarea" :rows="10" :value="selectedCert.cert" readonly />
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Document, Refresh, Search, Download, Delete } from '@element-plus/icons-vue';
import { acmeApi } from '@/api/acme';
import type { ACMEAccount, ACMECertificate, CertificateRenewalSettings } from '@localtrust/types';

const accounts = ref<ACMEAccount[]>([]);
const certificates = ref<ACMECertificate[]>([]);
const renewalSettings = ref<CertificateRenewalSettings>({
  renewalEnabled: true,
  reminderDaysBefore: 30,
  autoRenewalDaysBefore: 7,
  maxRenewalAttempts: 3
});

const stats = reactive({
  totalCertificates: 0,
  activeCertificates: 0,
  expiringIn30Days: 0,
  expiringIn7Days: 0
});

const showAccountDialog = ref(false);
const showIssueDialog = ref(false);
const showDetailDialog = ref(false);
const onlyExpiring = ref(false);
const checking = ref(false);
const creating = ref(false);
const issuing = ref(false);

const newAccount = reactive({
  email: '',
  serverUrl: 'https://acme-v02.api.letsencrypt.org/directory',
  acceptTermsOfService: true
});

const newCert = reactive({
  domain: '',
  accountId: '',
  challengeType: 'http-01' as const,
  autoRenewal: true,
  notes: ''
});

const selectedCert = ref<ACMECertificate | null>(null);

// 获取统计数据
const fetchStats = async () => {
  try {
    const res = await acmeApi.getStats();
    if (res.success) {
      Object.assign(stats, res.data);
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
};

// 获取账户列表
const fetchAccounts = async () => {
  try {
    const res = await acmeApi.getAccounts();
    if (res.success) {
      accounts.value = res.data || [];
    }
  } catch (error) {
    console.error('获取账户列表失败:', error);
  }
};

// 获取证书列表
const fetchCertificates = async () => {
  try {
    let res;
    if (onlyExpiring.value) {
      res = await acmeApi.getExpiringCertificates(30);
    } else {
      res = await acmeApi.getCertificates();
    }
    if (res.success) {
      certificates.value = res.data || [];
    }
  } catch (error) {
    console.error('获取证书列表失败:', error);
  }
};

// 获取续期设置
const fetchRenewalSettings = async () => {
  try {
    const res = await acmeApi.getRenewalSettings();
    if (res.success && res.data) {
      renewalSettings.value = res.data;
    }
  } catch (error) {
    console.error('获取续期设置失败:', error);
  }
};

// 刷新所有数据
const refreshData = async () => {
  await Promise.all([
    fetchStats(),
    fetchAccounts(),
    fetchCertificates(),
    fetchRenewalSettings()
  ]);
};

// 创建账户
const createAccount = async () => {
  if (!newAccount.email) {
    ElMessage.warning('请输入邮箱地址');
    return;
  }

  creating.value = true;
  try {
    const res = await acmeApi.createAccount({
      email: newAccount.email,
      serverUrl: newAccount.serverUrl,
      acceptTermsOfService: newAccount.acceptTermsOfService
    });

    if (res.success) {
      ElMessage.success('账户创建成功');
      showAccountDialog.value = false;
      newAccount.email = '';
      await fetchAccounts();
    } else {
      ElMessage.error(res.error || '创建失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败');
  } finally {
    creating.value = false;
  }
};

// 删除账户
const deleteAccount = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除此账户吗？相关证书不会被删除。', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    });

    const res = await acmeApi.deleteAccount(id);
    if (res.success) {
      ElMessage.success('账户已删除');
      await fetchAccounts();
    } else {
      ElMessage.error(res.error || '删除失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

// 申请证书
const issueCertificate = async () => {
  if (!newCert.domain || !newCert.accountId) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  issuing.value = true;
  try {
    const res = await acmeApi.issueCertificate({
      domain: newCert.domain,
      accountId: newCert.accountId,
      challengeType: newCert.challengeType,
      autoRenewal: newCert.autoRenewal,
      notes: newCert.notes
    });

    if (res.success) {
      ElMessage.success('证书申请已提交，请配置挑战响应后等待验证');
      showIssueDialog.value = false;
      newCert.domain = '';
      newCert.notes = '';
      await fetchCertificates();
      await fetchStats();
    } else {
      ElMessage.error(res.error || '申请失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '申请失败');
  } finally {
    issuing.value = false;
  }
};

// 续期证书
const renewCertificate = async (id: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要立即续期此证书吗？',
      '确认续期',
      {
        confirmButtonText: '续期',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    const res = await acmeApi.renewCertificate(id);
    if (res.success) {
      ElMessage.success('证书续期成功');
      await fetchCertificates();
      await fetchStats();
    } else {
      ElMessage.error(res.error || '续期失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '续期失败');
    }
  }
};

// 切换自动续期
const toggleAutoRenewal = async (id: string, enabled: boolean) => {
  try {
    const res = await acmeApi.toggleAutoRenewal(id, enabled);
    if (res.success) {
      ElMessage.success(`自动续期已${enabled ? '启用' : '禁用'}`);
      await fetchCertificates();
    } else {
      ElMessage.error(res.error || '操作失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  }
};

// 删除证书
const deleteCertificate = async (id: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此证书吗？此操作不可恢复。',
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    );

    const res = await acmeApi.deleteCertificate(id);
    if (res.success) {
      ElMessage.success('证书已删除');
      await fetchCertificates();
      await fetchStats();
    } else {
      ElMessage.error(res.error || '删除失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

// 显示证书详情
const showCertDetail = (cert: ACMECertificate) => {
  selectedCert.value = cert;
  showDetailDialog.value = true;
};

// 导出证书
const exportCertificate = async (id: string) => {
  try {
    const res = await acmeApi.exportCertificate(id);
    if (res.success) {
      ElMessage.success(`证书已导出到: ${res.data?.certPath}`);
    } else {
      ElMessage.error(res.error || '导出失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败');
  }
};

// 批量检查
const batchCheck = async () => {
  checking.value = true;
  try {
    const res = await acmeApi.batchCheck();
    if (res.success) {
      ElMessage.success(`检查完成: ${res.data?.checked} 个证书`);
      await fetchCertificates();
      await fetchStats();
    } else {
      ElMessage.error(res.error || '检查失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '检查失败');
  } finally {
    checking.value = false;
  }
};

// 保存续期设置
const saveRenewalSettings = async () => {
  try {
    const res = await acmeApi.updateRenewalSettings(renewalSettings.value);
    if (res.success) {
      ElMessage.success('设置已保存');
    } else {
      ElMessage.error(res.error || '保存失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  }
};

// 工具函数
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

const getDaysUntilExpiry = (validTo: string) => {
  const days = Math.ceil((new Date(validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
};

const isExpiringSoon = (validTo: string) => {
  return getDaysUntilExpiry(validTo) <= 30;
};

const getDaysTagType = (validTo: string) => {
  const days = getDaysUntilExpiry(validTo);
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'success';
};

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'expired': return 'danger';
    case 'renewing': return 'warning';
    default: return 'info';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return '有效';
    case 'expired': return '已过期';
    case 'revoked': return '已吊销';
    case 'renewing': return '续期中';
    default: return status;
  }
};

const showCreateAccountDialog = () => {
  showAccountDialog.value = true;
};

const showIssueCertDialog = () => {
  showIssueDialog.value = true;
};

onMounted(() => {
  refreshData();
});
</script>

<style scoped>
.certificates-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.subtitle {
  margin: 8px 0 0;
  color: #909399;
  font-size: 14px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  color: #909399;
  font-size: 14px;
  margin-top: 8px;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.warning :deep(.el-card__body) {
  background-color: #fdf6ec;
}

.danger :deep(.el-card__body) {
  background-color: #fef0f0;
}

.action-card {
  margin-bottom: 20px;
}

.section-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 16px;
}

.form-tip {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

:deep(.el-descriptions-item__label) {
  width: 120px;
}

code {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}
</style>
