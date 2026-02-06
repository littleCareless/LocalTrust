<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Monitor, List, Setting, QuestionFilled } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

const activeMenu = computed(() => route.path);

const handleMenuSelect = (path: string) => {
  router.push(path);
};
</script>

<template>
  <div class="sidebar">
    <div class="logo-area">
      <div class="logo-gradient"></div>
      <div class="logo-content">
        <div class="logo-icon">🔒</div>
        <h1 class="logo-title">LocalTrust</h1>
      </div>
    </div>
    <el-menu :default-active="activeMenu" class="sidebar-menu" @select="handleMenuSelect">
      <el-menu-item index="/" class="menu-item-modern">
        <el-icon class="menu-icon"><Monitor /></el-icon>
        <span class="menu-label">仪表盘</span>
      </el-menu-item>
      <el-menu-item index="/domains" class="menu-item-modern">
        <el-icon class="menu-icon"><List /></el-icon>
        <span class="menu-label">域名管理</span>
      </el-menu-item>
      <el-menu-item index="/settings" class="menu-item-modern">
        <el-icon class="menu-icon"><Setting /></el-icon>
        <span class="menu-label">系统设置</span>
      </el-menu-item>
      <el-menu-item index="/help" class="menu-item-modern">
        <el-icon class="menu-icon"><QuestionFilled /></el-icon>
        <span class="menu-label">帮助文档</span>
      </el-menu-item>
    </el-menu>
    <div class="sidebar-footer">
      <span class="version-badge">v1.0.0</span>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
}

.logo-area {
  position: relative;
  margin: 0 16px 32px;
  padding: 20px;
  background: var(--bg-dark-elevated);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-base);
}

.logo-area:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-color);
}

.logo-area:hover .logo-gradient {
  opacity: 1;
}

.logo-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--primary-gradient);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.logo-contents {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
  filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.5));
}

.logo-title {
  font-size: 20px;
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background: transparent;
  padding: 0 12px;
}

.menu-item-modern {
  height: 48px;
  line-height: 48px;
  margin-bottom: 8px;
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.menu-item-modern::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--primary-gradient);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.menu-item-modern:hover {
  background: rgba(102, 126, 234, 0.08);
  color: var(--text-primary);
  transform: translateX(4px);
}

.menu-item-modern.is-active {
  background: rgba(102, 126, 234, 0.12);
  color: var(--text-primary);
}

.menu-item-modern.is-active::before {
  opacity: 1;
}

.menu-item-modern.is-active .menu-icon {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.menu-icon {
  font-size: 20px;
  transition: all var(--transition-base);
}

.menu-label {
  font-size: 15px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 20px 28px;
  text-align: center;
}

.version-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: var(--radius-full);
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
  font-family: var(--font-family-mono);
}
</style>
