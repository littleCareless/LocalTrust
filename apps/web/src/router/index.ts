import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/landing',
      name: 'Landing',
      component: () => import('../views/Landing.vue'),
      meta: { title: 'LocalTrust - 内部 HTTPS 管理工具' }
    },
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue'),
          meta: { title: '仪表盘' }
        },
        {
          path: 'domains',
          name: 'Domains',
          component: () => import('../views/Domains.vue'),
          meta: { title: '域名管理' }
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('../views/Settings.vue'),
          meta: { title: '系统设置' }
        },
        {
          path: 'help',
          name: 'Help',
          component: () => import('../views/Help.vue'),
          meta: { title: '帮助文档' }
        }
      ]
    }
  ]
});

// 路由守卫：设置页面标题
router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - LocalTrust`;
  }
  next();
});

export default router;
