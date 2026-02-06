<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { getSettings, updateSettings } from '../api/settings';
import { checkHostsPermission } from '../api/hosts';
import { ElMessage } from 'element-plus';
import type { SystemSettings } from '../types';

// 状态
const loading = ref(false);
const hostsPermission = ref<{ hasPermission: boolean; message: string } | null>(null);
const formData = ref<SystemSettings>({
  mode: 'local',
  localMode: {
    hostsPath: '',
    autoBackup: true,
    backupPath: '',
  },
  dnsServer: {
    type: 'dnsmasq',
    configPath: '/etc/dnsmasq.conf',
    restartCommand: 'sudo systemctl restart dnsmasq',
  },
  router: {
    model: 'openwrt',
    ip: '192.168.1.1',
    sshUsername: 'root',
    sshPassword: '',
  },
});

// DNS 服务器类型选项
const dnsServerTypes = [
  { label: 'dnsmasq', value: 'dnsmasq' },
  { label: 'bind9', value: 'bind9' },
  { label: 'CoreDNS', value: 'coredns' },
];

// 路由器型号选项
const routerModels = [
  { label: 'OpenWrt', value: 'openwrt' },
  { label: 'DD-WRT', value: 'ddwrt' },
  { label: 'Tomato', value: 'tomato' },
  { label: '其他', value: 'other' },
];

// 加载设置
const loadSettings = async () => {
  loading.value = true;
  try {
    const settings = await getSettings();
    formData.value = settings;

    // 如果是本机模式，检查 hosts 文件权限
    if (settings.mode === 'local') {
      const permissionResult = await checkHostsPermission();
      hostsPermission.value = permissionResult || null;
    }
  } catch (error) {
    console.error('加载系统设置失败:', error);
    ElMessage.error('加载系统设置失败');
  } finally {
    loading.value = false;
  }
};

// 保存设置
const handleSave = async () => {
  loading.value = true;
  try {
    await updateSettings(formData.value);
    ElMessage.success('系统设置保存成功');
  } catch (error) {
    console.error('保存系统设置失败:', error);
  } finally {
    loading.value = false;
  }
};

// 监听模式变化，初始化对应配置
watch(
  () => formData.value.mode,
  async (newMode) => {
    if (newMode === 'local' && !formData.value.localMode) {
      formData.value.localMode = {
        hostsPath: '',
        autoBackup: true,
        backupPath: '',
      };
      // 检查 hosts 文件权限
      try {
        const permissionResult = await checkHostsPermission();
        hostsPermission.value = permissionResult || null;
      } catch (error) {
        console.error('检查 hosts 权限失败:', error);
      }
    } else if (newMode === 'dns_server' && !formData.value.dnsServer) {
      formData.value.dnsServer = {
        type: 'dnsmasq',
        configPath: '/etc/dnsmasq.conf',
        restartCommand: 'sudo systemctl restart dnsmasq',
      };
    } else if (newMode === 'router' && !formData.value.router) {
      formData.value.router = {
        model: 'openwrt',
        ip: '192.168.1.1',
        sshUsername: 'root',
        sshPassword: '',
      };
    }
  }
);

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="settings" v-loading="loading">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
        </div>
      </template>

      <el-form :model="formData" label-width="140px">
        <!-- 运行模式 -->
        <el-form-item label="运行模式">
          <el-radio-group v-model="formData.mode">
            <el-radio label="local">本机模式</el-radio>
            <el-radio label="dns_server">DNS 服务器模式</el-radio>
            <el-radio label="router">路由器模式</el-radio>
          </el-radio-group>
          <div class="form-tip">
            <p v-if="formData.mode === 'local'">直接修改本机的 hosts 文件，无需额外配置</p>
            <p v-else-if="formData.mode === 'dns_server'">在本机运行 DNS 服务器，直接响应域名解析请求</p>
            <p v-else>通过 SSH 连接到路由器，修改路由器的 DNS 配置</p>
          </div>
        </el-form-item>

        <el-divider />

        <!-- 本机模式配置 -->
        <template v-if="formData.mode === 'local' && formData.localMode">
          <h3 style="margin-bottom: 20px">本机模式配置</h3>

          <!-- 权限检查提示 -->
          <el-alert
            v-if="hostsPermission"
            :title="hostsPermission.message"
            :type="hostsPermission.hasPermission ? 'success' : 'warning'"
            :closable="false"
            style="margin-bottom: 20px"
          />

          <el-form-item label="hosts 文件路径">
            <el-input
              v-model="formData.localMode.hostsPath"
              placeholder="留空则自动检测系统默认路径"
            />
            <div class="form-tip">
              Windows: C:\Windows\System32\drivers\etc\hosts<br />
              macOS/Linux: /etc/hosts
            </div>
          </el-form-item>

          <el-form-item label="自动备份">
            <el-switch v-model="formData.localMode.autoBackup" />
            <div class="form-tip">修改 hosts 文件前自动创建备份</div>
          </el-form-item>

          <el-form-item label="备份目录" v-if="formData.localMode.autoBackup">
            <el-input
              v-model="formData.localMode.backupPath"
              placeholder="留空则使用默认备份目录 ~/.localtrust/backups"
            />
          </el-form-item>
        </template>

        <!-- DNS 服务器模式配置 -->
        <template v-if="formData.mode === 'dns_server' && formData.dnsServer">
          <h3 style="margin-bottom: 20px">DNS 服务器配置</h3>

          <el-form-item label="DNS 服务类型">
            <el-select v-model="formData.dnsServer.type" style="width: 100%">
              <el-option
                v-for="item in dnsServerTypes"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="配置文件路径">
            <el-input v-model="formData.dnsServer.configPath" placeholder="/etc/dnsmasq.conf" />
          </el-form-item>

          <el-form-item label="重启命令">
            <el-input
              v-model="formData.dnsServer.restartCommand"
              placeholder="sudo systemctl restart dnsmasq"
            />
            <div class="form-tip">修改配置后用于重启 DNS 服务的命令</div>
          </el-form-item>
        </template>

        <!-- 路由器模式配置 -->
        <template v-if="formData.mode === 'router' && formData.router">
          <h3 style="margin-bottom: 20px">路由器配置</h3>

          <el-form-item label="路由器型号">
            <el-select v-model="formData.router.model" style="width: 100%">
              <el-option
                v-for="item in routerModels"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="路由器 IP">
            <el-input v-model="formData.router.ip" placeholder="192.168.1.1" />
          </el-form-item>

          <el-form-item label="SSH 用户名">
            <el-input v-model="formData.router.sshUsername" placeholder="root" />
          </el-form-item>

          <el-form-item label="SSH 密码">
            <el-input
              v-model="formData.router.sshPassword"
              type="password"
              placeholder="请输入 SSH 密码"
              show-password
            />
            <div class="form-tip">密码将加密存储，仅用于 SSH 连接</div>
          </el-form-item>
        </template>

        <el-divider />

        <!-- 保存按钮 -->
        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="loading"> 保存设置 </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 使用提示 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>使用提示</span>
        </div>
      </template>
      <el-alert title="本机模式" type="success" :closable="false" style="margin-bottom: 15px">
        <p>最简单的使用方式，直接修改本机的 hosts 文件。适用于：</p>
        <ul>
          <li>个人开发环境</li>
          <li>快速测试和调试</li>
          <li>不需要团队共享的场景</li>
        </ul>
        <p style="margin-top: 10px">
          <strong>注意：</strong>Windows 需要以管理员身份运行，macOS/Linux 需要使用 sudo 或修改文件权限
        </p>
      </el-alert>

      <el-alert title="DNS 服务器模式" type="info" :closable="false" style="margin-bottom: 15px">
        <p>适用于在本机或服务器上运行 DNS 服务的场景。需要：</p>
        <ul>
          <li>安装并配置 dnsmasq、bind9 或 CoreDNS</li>
          <li>确保有权限修改配置文件</li>
          <li>确保有权限重启 DNS 服务</li>
        </ul>
      </el-alert>

      <el-alert title="路由器模式" type="warning" :closable="false">
        <p>适用于通过路由器管理内网 DNS 的场景。需要：</p>
        <ul>
          <li>路由器支持 SSH 访问（如 OpenWrt、DD-WRT）</li>
          <li>确保能够通过 SSH 连接到路由器</li>
          <li>确保有权限修改路由器的 DNS 配置</li>
        </ul>
      </el-alert>
    </el-card>
  </div>
</template>

<style scoped>
.settings {
  width: 100%;
  .card-header {
    font-size: 16px;
    font-weight: 500;
  }
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.5;
}

h3 {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

:deep(.el-alert) {
  padding: 15px;
}

:deep(.el-alert ul) {
  margin: 10px 0 0 20px;
  padding: 0;
}

:deep(.el-alert li) {
  margin: 5px 0;
}
</style>
