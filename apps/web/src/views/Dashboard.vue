<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getDNSStats, getDNSMappings } from '../api/dns';
import { getMode } from '../api/settings';
import { getCAInfo } from '../api/ca';
import { ElMessage } from 'element-plus';
import type { DNSMapping } from '../types';
import {
  DataLine,
  Setting,
  List,
  Document,
  Plus,
  TrendCharts,
  Connection,
} from '@element-plus/icons-vue';

const router = useRouter();

// 状态
const loading = ref(false);
const stats = ref({
  domainCount: 0,
  mode: 'dns_server',
  caStatus: 'unknown',
  serverStatus: 'unknown' as 'active' | 'inactive' | 'unknown',
});

// 加载统计数据
const loadStats = async () => {
  loading.value = true;
  try {
    const [dnsStats, modeData, caInfo] = await Promise.all([getDNSStats(), getMode(), getCAInfo()]);

    stats.value = {
      domainCount: dnsStats.count,
      mode: modeData.mode,
      caStatus: caInfo ? 'active' : 'inactive',
      serverStatus: 'active', // 能成功调用 API 说明服务器正常运行
    };
  } catch (error) {
    console.error('加载统计数据失败:', error);
    ElMessage.error('加载统计数据失败');
    stats.value.serverStatus = 'inactive';
  } finally {
    loading.value = false;
  }
};

// 获取运行模式文本
const getModeText = (mode: string) => {
  if (mode === 'local') return '本地模式';
  if (mode === 'dns_server') return 'DNS 服务器';
  return '路由器模式';
};

// 获取 CA 状态文本
const getCAStatusText = (status: string) => {
  return status === 'active' ? '已生成' : '未生成';
};

// 快捷操作
const goToPage = (path: string) => {
  router.push(path);
};

// 最近活动
const recentActivities = ref<
  Array<{ type: string; domain: string; time: string; icon: any; ip: string }>
>([]);

// 格式化时间为相对时间
const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
};

// 加载最近活动
const loadRecentActivities = async () => {
  try {
    const mappings = await getDNSMappings();
    // 取最近的3条记录
    const recent = mappings.slice(0, 3).map((mapping: DNSMapping) => ({
      type: 'add',
      domain: mapping.domain,
      ip: mapping.ip,
      time: formatRelativeTime(mapping.createdAt),
      icon: Plus,
    }));
    recentActivities.value = recent;
  } catch (error) {
    console.error('加载最近活动失败:', error);
  }
};

onMounted(() => {
  loadStats();
  loadRecentActivities();
});
</script>

<template>
  <div class="dashboard-modern" v-loading="loading">
    <!-- Hero Stats Section -->
    <div class="hero-stats-section">
      <div class="section-header">
        <div>
          <h1 class="page-title">
            <span class="gradient-text">仪表盘</span>
          </h1>
          <p class="page-subtitle">实时监控您的 HTTPS 管理环境</p>
        </div>
        <button class="btn-primary-modern" @click="goToPage('/domains')">
          <el-icon><Plus /></el-icon>
          <span>添加域名</span>
        </button>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card-glass">
          <div class="stat-card-bg"></div>
          <div class="stat-card-content">
            <div class="stat-icon-wrapper stat-primary">
              <el-icon :size="28">
                <DataLine />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">域名总数</div>
              <div class="stat-value">{{ stats.domainCount }}</div>
              <div class="stat-trend positive">
                <el-icon><TrendCharts /></el-icon>
                <span>+12% 本周</span>
              </div>
            </div>
          </div>
        </div>

        <div class="stat-card-glass">
          <div class="stat-card-bg"></div>
          <div class="stat-card-content">
            <div class="stat-icon-wrapper stat-success">
              <el-icon :size="28">
                <Setting />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">运行模式</div>
              <div class="stat-value">{{ getModeText(stats.mode) }}</div>
              <div class="stat-badge active">运行中</div>
            </div>
          </div>
        </div>

        <div class="stat-card-glass">
          <div class="stat-card-bg"></div>
          <div class="stat-card-content">
            <div
              class="stat-icon-wrapper"
              :class="stats.caStatus === 'active' ? 'stat-success' : 'stat-warning'"
            >
              <el-icon :size="28">
                <Document />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">CA 证书</div>
              <div class="stat-value">{{ getCAStatusText(stats.caStatus) }}</div>
              <div class="stat-badge" :class="stats.caStatus === 'active' ? 'active' : 'inactive'">
                {{ stats.caStatus === 'active' ? '有效' : '未配置' }}
              </div>
            </div>
          </div>
        </div>

        <div class="stat-card-glass">
          <div class="stat-card-bg"></div>
          <div class="stat-card-content">
            <div
              class="stat-icon-wrapper"
              :class="stats.serverStatus === 'active' ? 'stat-success' : 'stat-warning'"
            >
              <el-icon :size="28">
                <Connection />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">服务状态</div>
              <div class="stat-value">
                {{ stats.serverStatus === 'active' ? '运行中' : '未运行' }}
              </div>
              <div
                class="stat-trend"
                :class="stats.serverStatus === 'active' ? 'positive' : 'negative'"
              >
                <el-icon><TrendCharts /></el-icon>
                <span>{{ stats.serverStatus === 'active' ? '稳定运行' : '服务异常' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions-section">
      <h2 class="section-title">快捷操作</h2>
      <div class="actions-grid">
        <div class="action-card-glass" @click="goToPage('/domains')">
          <div class="action-icon">
            <el-icon :size="32"><List /></el-icon>
          </div>
          <div class="action-content">
            <h3>管理域名</h3>
            <p>查看和管理所有域名映射</p>
          </div>
          <div class="action-arrow">→</div>
        </div>

        <div class="action-card-glass" @click="goToPage('/settings')">
          <div class="action-icon">
            <el-icon :size="32"><Setting /></el-icon>
          </div>
          <div class="action-content">
            <h3>系统设置</h3>
            <p>配置运行模式和参数</p>
          </div>
          <div class="action-arrow">→</div>
        </div>

        <div class="action-card-glass" @click="goToPage('/help')">
          <div class="action-icon">
            <el-icon :size="32"><Document /></el-icon>
          </div>
          <div class="action-content">
            <h3>帮助文档</h3>
            <p>证书安装和配置指南</p>
          </div>
          <div class="action-arrow">→</div>
        </div>
      </div>
    </div>

    <!-- 最近活动 & 快速开始 -->
    <div class="bottom-section">
      <div class="activity-card-glass">
        <div class="card-header-modern">
          <h2 class="section-title">最近活动</h2>
          <button class="btn-text">查看全部</button>
        </div>
        <div class="activity-list">
          <div v-for="(activity, index) in recentActivities" :key="index" class="activity-item">
            <div class="activity-icon">
              <el-icon><component :is="activity.icon" /></el-icon>
            </div>
            <div class="activity-content">
              <div class="activity-domain">{{ activity.domain }}</div>
              <div class="activity-ip">{{ activity.ip }}</div>
              <div class="activity-time">{{ activity.time }}</div>
            </div>
            <div class="activity-type">
              <span class="type-badge add">新增</span>
            </div>
          </div>
          <div v-if="recentActivities.length === 0" class="no-activities">
            <el-empty description="暂无最近活动" :image-size="80" />
          </div>
        </div>
      </div>

      <div class="guide-card-glass">
        <div class="card-header-modern">
          <h2 class="section-title">快速开始</h2>
        </div>
        <div class="guide-steps">
          <div class="guide-step completed">
            <div class="step-number">1</div>
            <div class="step-content">
              <div class="step-title">配置系统</div>
              <div class="step-desc">选择运行模式</div>
            </div>
            <el-icon class="step-check"><Check /></el-icon>
          </div>
          <div class="guide-step active">
            <div class="step-number">2</div>
            <div class="step-content">
              <div class="step-title">添加域名</div>
              <div class="step-desc">配置域名映射</div>
            </div>
          </div>
          <div class="guide-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <div class="step-title">安装证书</div>
              <div class="step-desc">下载并安装 CA</div>
            </div>
          </div>
          <div class="guide-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <div class="step-title">配置 DNS</div>
              <div class="step-desc">设置 DNS 服务器</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-modern {
  width: 100%;
  padding: 0;
}

/* Hero Stats Section */
.hero-stats-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--text-primary);
}

.gradient-text {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  .btn-primary-modern {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: var(--primary-gradient);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  }
}

.btn-primary-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
}

/* 玻璃态统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card-glass {
  position: relative;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(102, 126, 234, 0.2) 100%);

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 24px;
  overflow: hidden;
  transition: all 0.3s ease;
}

html.dark .stat-card-glass {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.stat-card-glass:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

.stat-card-bg {
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: var(--primary-gradient);
  opacity: 0.05;
  border-radius: 50%;
  filter: blur(40px);
}

.stat-card-content {
  position: relative;
  display: flex;
  gap: 16px;
}

.stat-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.stat-primary {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  color: #667eea;
}

.stat-success {
  background: linear-gradient(35deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
  color: #10b981;
}

.stat-warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%);
  color: #f59e0b;
}

.stat-info {
  color: #06b6d4;
}

.stat-card-glass:hover .stat-icon-wrapper {
  transform: scale(1.1);
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1;
}

.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
}

.stat-trend.positive {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.stat-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.stat-badge.active {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-badge.inactive {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

/* 快捷操作 */
.quick-actions-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.action-card-glass {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

html.dark .action-card-glass {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.action-card-glass:hover {
  transform: translateX(4px);
  border-color: var(--primary-color);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
}

.action-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.action-content p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.action-arrow {
  font-size: 24px;
  color: var(--text-tertiary);
  transition: all 0.3s ease;
}

.action-card-glass:hover .action-arrow {
  color: var(--primary-color);
  transform: translateX(4px);
}

/* 底部区域 */
.bottom-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.activity-card-glass,
.guide-card-glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 24px;
}

html.dark .activity-card-glass,
html.dark .guide-card-glass {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.card-header-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-text {
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-text:hover {
  opacity: 0.8;
}

/* 活动列表 */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
}

.activity-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-domain {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-family-mono);
}

.activity-ip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.activity-time {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.no-activities {
  padding: 20px;
  text-align: center;
}

.type-badge {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.type-badge.add {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.type-badge.update {
  background: rgba(6, 182, 212, 0.1);
  color: #06b6d4;
}

.type-badge.cert {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

/* 快速开始步骤 */
.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-step {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
  position: relative;
}

.guide-step.active {
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.guide-step.completed {
  opacity: 0.6;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.guide-step.completed .step-number {
  background: #10b981;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.step-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.step-check {
  color: #10b981;
  font-size: 20px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .bottom-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
