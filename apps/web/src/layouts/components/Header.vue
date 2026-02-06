<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useTheme } from '../../composables/useTheme';
import { Sunny, Moon } from '@element-plus/icons-vue';

const route = useRoute();
const { isDark, toggleTheme } = useTheme();

const pageTitle = computed(() => {
  return route.meta.title || 'LocalTrust';
});
</script>

<template>
  <div class="header">
    <div class="header-left">
      <div class="page-title">
        <span class="page-title-text">{{ pageTitle }}</span>
      </div>
    </div>
    <div class="header-right">
      <div class="app-badge">
        <span class="badge-icon">🔒</span>
        <span class="badge-text">内部 HTTPS 管理工具</span>
      </div>
      <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换到浅色模式' : '切换到深色模式'">
        <el-icon :size="20">
          <Sunny v-if="isDark" />
          <Moon v-else />
        </el-icon>
      </button>
    </div>
  </div>
</template>

<style scoped>
.header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title-text {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: var(--radius-full);
  transition: all var(--transition-base);
}

.app-badge:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-1px);
}

.badge-icon {
  font-size: 16px;
  filter: drop-shadow(0 0 4px rgba(102, 126, 234, 0.5));
}

.badge-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--text-primary);
}

.theme-toggle:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: var(--primary-color);
  transform: rotate(180deg);
}

.theme-toggle:active {
  transform: rotate(180deg) scale(0.95);
}
</style>
