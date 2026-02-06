import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SystemSettings } from '@localtrust/types';

export const useSystemStore = defineStore('system', () => {
  // 状态
  const settings = ref<SystemSettings | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 获取系统设置
  async function fetchSettings() {
    loading.value = true;
    error.value = null;
    try {
      const { getSettings } = await import('../api/settings');
      const data = await getSettings();
      settings.value = data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取系统设置失败';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // 更新系统设置
  async function updateSettings(newSettings: SystemSettings) {
    loading.value = true;
    error.value = null;
    try {
      const { updateSettings: updateSettingsApi } = await import('../api/settings');
      const data = await updateSettingsApi(newSettings);
      settings.value = data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新系统设置失败';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings
  };
});
