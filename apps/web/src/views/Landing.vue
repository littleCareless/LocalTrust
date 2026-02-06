<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  TrendCharts,
  Lock,
  Lightning,
  Setting,
  Check,
  Star,
  Connection,
} from '@element-plus/icons-vue';

const router = useRouter();

// 实时数据动画
const stats = ref({
  domains: 0,
  certificates: 0,
  uptime: 0,
  teams: 0,
});

// 动画计数器
const animateValue = (key: keyof typeof stats.value, target: number, duration: number) => {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      stats.value[key] = target;
      clearInterval(timer);
    } else {
      stats.value[key] = Math.floor(current);
    }
  }, 16);
};

// 功能特性
const features = [
  {
    icon: Lightning,
    title: '快速部署',
    description: '5分钟内完成内部 HTTPS 环境搭建，无需复杂配置',
  },
  {
    icon: Lock,
    title: '安全可靠',
    description: '基于行业标准的 CA 证书体系，确保通信安全',
  },
  {
    icon: Setting,
    title: '灵活配置',
    description: '支持 DNS 服务器和路由器两种模式，适配多种场景',
  },
  {
    icon: Connection,
    title: '团队协作',
    description: '统一管理团队内部域名，提升开发效率',
  },
];

// 定价方案
const pricingPlans = [
  {
    name: '开源版',
    price: '免费',
    period: '永久',
    features: ['无限域名管理', '自签名证书生成', 'DNS 服务器模式', '社区支持', '开源代码'],
    highlighted: false,
    buttonText: '立即使用',
  },
  {
    name: '企业版',
    price: '联系我们',
    period: '定制',
    features: [
      '开源版全部功能',
      '路由器模式',
      '团队协作功能',
      '优先技术支持',
      '定制化开发',
      'SLA 保障',
    ],
    highlighted: true,
    buttonText: '联系销售',
  },
];

// 信任徽章
const trustBadges = [
  { icon: '🔒', text: 'SSL 加密' },
  { icon: '⚡', text: '高性能' },
  { icon: '🛡️', text: '安全认证' },
  { icon: '💎', text: '开源免费' },
];

const goToDashboard = () => {
  router.push('/');
};

onMounted(() => {
  // 启动数据动画
  setTimeout(() => {
    animateValue('domains', 1247, 2000);
    animateValue('certificates', 856, 2000);
    animateValue('uptime', 99, 2000);
    animateValue('teams', 342, 2000);
  }, 500);
});
</script>

<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-background">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>

      <div class="hero-content">
        <div class="hero-badge">
          <el-icon><Lightning /></el-icon>
          <span>为开发团队打造的 HTTPS 解决方案</span>
        </div>

        <h1 class="hero-title">
          让内网开发<br />
          <span class="gradient-text">拥有生产级 HTTPS</span>
        </h1>

        <p class="hero-description">
          LocalTrust 是一款专为软件开发团队设计的内部 HTTPS 管理工具<br />
          轻松管理内网域名和自签名证书，提升开发体验
        </p>

        <div class="hero-actions">
          <button class="btn-primary" @click="goToDashboard">
            <el-icon><TrendCharts /></el-icon>
            <span>开始使用</span>
          </button>
          <button class="btn-secondary">
            <span>查看文档</span>
          </button>
        </div>

        <!-- 实时统计 -->
        <div class="hero-stats">
          <div class="stat-item glass-card">
            <div class="stat-value">{{ stats.domains }}+</div>
            <div class="stat-label">活跃域名</div>
          </div>
          <div class="stat-item glass-card">
            <div class="stat-value">{{ stats.certificates }}+</div>
            <div class="stat-label">证书</div>
          </div>
          <div class="stat-item glass-card">
            <div class="stat-value">{{ stats.uptime }}%</div>
            <div class="stat-label">服务可用性</div>
          </div>
          <div class="stat-item glass-card">
            <div class="stat-value">{{ stats.teams }}+</div>
            <div class="stat-label">使用团队</div>
          </div>
        </div>
      </div>

      <!-- 数据可视化预览 -->
      <div class="hero-visual">
        <div class="dashboard-preview glass-card">
          <div class="preview-header">
            <div class="preview-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <span class="preview-title">LocalTrust Dashboard</span>
          </div>
          <div class="preview-content">
            <div class="chart-placeholder">
              <div class="chart-bar" style="height: 60%"></div>
              <div class="chart-bar" style="height: 85%"></div>
              <div class="chart-bar" style="height: 45%"></div>
              <div class="chart-bar" style="height: 95%"></div>
              <div class="chart-bar" style="height: 70%"></div>
              <div class="chart-bar" style="height: 80%"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="section-header">
        <h2 class="section-title">核心功能</h2>
        <p class="section-description">简单易用的功能，助力团队高效开发</p>
      </div>

      <div class="features-grid">
        <div v-for="(feature, index) in features" :key="index" class="feature-card glass-card">
          <div class="feature-icon">
            <el-icon :size="32">
              <component :is="feature.icon" />
            </el-icon>
          </div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="pricing-section">
      <div class="section-header">
        <h2 class="section-title">选择适合您的方案</h2>
        <p class="section-description">灵活的定价，满足不同规模团队的需求</p>
      </div>

      <div class="pricing-grid">
        <div
          v-for="(plan, index) in pricingPlans"
          :key="index"
          class="pricing-card glass-card"
          :class="{ highlighted: plan.highlighted }"
        >
          <div v-if="plan.highlighted" class="popular-badge">
            <el-icon><Star /></el-icon>
            <span>推荐</span>
          </div>

          <h3 class="plan-name">{{ plan.name }}</h3>
          <div class="plan-price">
            <span class="price">{{ plan.price }}</span>
            <span class="period">/ {{ plan.period }}</span>
          </div>

          <ul class="plan-features">
            <li v-for="(feature, idx) in plan.features" :key="idx">
              <el-icon class="check-icon"><Check /></el-icon>
              <span>{{ feature }}</span>
            </li>
          </ul>

          <button class="plan-button" :class="{ primary: plan.highlighted }" @click="goToDashboard">
            {{ plan.buttonText }}
          </button>
        </div>
      </div>
    </section>

    <!-- Trust Section -->
    <section class="tion">
      <div class="trus">
        <h2 class="trust-title">值得信赖的解决方案</h2>
        <div class="trust-badges">
          <div v-for="(badge, index) in trustBadges" :key="index" class="trust-badge glass-card">
            <span class="badge-icon">{{ badge.icon }}</span>
            <span class="badge-text">{{ badge.text }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content glass-card">
        <h2 class="cta-title">准备好提升开发体验了吗？</h2>
        <p class="cta-description">ocalTrust，让您的团队享受安全便捷的内网 HTTPS 环境</p>
        <button class="cta-button" @click="goToDashboard">
          <el-icon><Lock /></el-icon>
          <span>免费开始使用</span>
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <h3>🔒 LocalTrust</h3>
          <p>内部 HTTPS 管理工具</p>
        </div>
        <div class="footer-links">
          <a href="#">文档</a>
          <a href="#">GitHub</a>
          <a href="#">社区</a>
          <a href="#">关于</a>
        </div>
        <div class="footer-copyright">
          <p>© 2024 LocalTrust. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  width: 100%;
  min-height: 100vh;
  background: var(--bg-primary);
  overflow-x: hidden;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 40px 80px;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  top: -200px;
  left: -200px;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #06b6d4 0%, #10b981 100%);
  bottom: -150px;
  right: -150px;
  animation-delay: -10s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  top: 50%;
  right: 10%;
  animation-delay: -5s;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 900px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solia(102, 126, 234, 0.3);
  border-radius: 100px;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 32px;
  backdrop-filter: blur(10px);
}

.hero-title {
  font-size: 64px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin: 0 0 24px;
}

.gradient-text {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 20px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0 0 40px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 80px;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.5);
}

.btn-secondary {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

/* 玻璃态卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s ease;
}

html.dark .glass-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

/* Hero Stats */
.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.stat-item {
  padding: 24px;
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Dashboard Preview */
.hero-visual {
  position: relative;
  z-index: 1;
  margin-top: 80px;
  max-width: 1000px;
  width: 100%;
}

.dashboard-preview {
  padding: 0;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot-red {
  background: #ef4444;
}
.dot-yellow {
  background: #f59e0b;
}
.dot-green {
  background: #10b981;
}

.preview-title {
  font-size: 13px;
  color: var(--text-secondary);
}

.preview-content {
  padding: 40px;
}

.chart-placeholder {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 200px;
  gap: 16px;
}

.chart-bar {
  flex: 1;
  background: var(--primary-gradient);
  border-radius: 8px 8px 0 0;
  animation: growBar 1.5s ease-out;
}

@keyframes growBar {
  from {
    height: 0 !important;
  }
}

/* Features Section */
.features-section,
.pricing-section,
.trust-section {
  padding: 120px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 64px;
}

.sectitle {
  font-size: 48px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.section-description {
  font-size: 18px;
  color: var(--text-secondary);
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.feature-card {
  padding: 40px 32px;
  text-align: center;
}

.feature-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  border-radius: 20px;
  color: white;
}

.feature-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.feature-description {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

/* Pricing Section */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;
}

.pricing-card {
  padding: 40px 32px;
  position: relative;
}

.pricing-card.highlighted {
  border-color: var(--primary-color);
  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3);
}

.popular-badge {
  position: absolute;
  top: -16px;
  right: 32px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: var(--primary-gradient);
  color: white;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
}

.plan-name {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.plan-price {
  margin-bottom: 32px;
}

.price {
  font-size: 48px;
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  backgroundp: text;
}

.period {
  font-size: 16px;
  color: var(--text-secondary);
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 32px;
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  color: var(--text-primary);
}

.check-icon {
  color: var(--success-color);
  flex-shrink: 0;
}

.plan-button {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-elevated);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.plan-button.p {
  background: var(--primary-gradient);
  color: white;
  border: none;
}

.plan-button:hover {
  transform: translateY(-2px);
}

/* Trust Section */
.trust-content {
  text-align: center;
}

.trust-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 48px;
}

.trust-badges {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.trust-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
}

.badge-icon {
  font-size: 32px;
}

.badge-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

/* CTA Section */
.ctan {
  padding: 80px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.cta-content {
  padding: 80px 40px;
  text-align: center;
}

.cta-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.cta-description {
  font-size: 18px;
  color: var(--text-secondary);
  margin: 0 0 40px;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 20px 48px;
  font-size: 18px;
  font-weight: 600;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
}

.cta-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5);
}

/* Footer */
.landing-footer {
  padding: 60px 40px 40px;
  border-top: 1px solid var(--border-color);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.footer-brand h3 {
  font-size: 24px;
  margin: 0 0 8px;
  color: var(--text-primary);
}

.footer-brand p {
  margin: 0;
  color: var(--text-secondary);
}

.footer-links {
  display: flex;
  gap: 32px;
}

.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-links a:hover {
  color: var(--primary-color);
}

.footer-copyright {
  color: var(--text-tertiary);
  font-size: 14px;
}

/* 响应式 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 40px;
  }

  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .features-grid,
  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .trust-badges {
    flex-direction: column;
  }
}
</style>
