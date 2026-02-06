<script setup lang="ts">
import Header from './components/Header.vue';
import Sidebar from './components/Sidebar.vue';
</script>

<template>
  <el-container class="main-layout">
    <el-aside width="240px" class="modern-aside">
      <Sidebar />
    </el-aside>
    <el-container class="main-container">
      <el-header height="70px" class="modern-header">
        <Header />
      </el-header>
      <el-main class="modern-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.main-layout {
  height: 100vh;
  background: var(--bg-dark-primary);
}

.modern-aside {
  background: var(--bg-dark-primary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  overflow-x: hidden;
}

.main-container {
  background: var(--bg-dark-primary);
}

.modern-header {
  background: var(--bg-dark-elevated);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 32px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.modern-main {
  background: var(--bg-dark-primary);
  padding: 32px;
  overflow-y: auto;
}
</style>
