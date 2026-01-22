<!--
  App.vue - 應用主框架
  包含側邊欄與主面板的佈局，支援側邊欄顯示/隱藏
-->
<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-container">
          <Transition name="sidebar">
            <Sidebar v-show="store.sidebarVisible" />
          </Transition>
          <MainPanel />
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui';
import Sidebar from './components/Sidebar.vue';
import MainPanel from './components/MainPanel.vue';
import { useTodoStore } from './stores/todoStore';

const store = useTodoStore();

// Naive UI 主題覆蓋，配合淡墨書房風格（較淺的深色調）
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#f2b830',
    primaryColorHover: '#f7c95a',
    primaryColorPressed: '#dba520',
    borderRadius: '8px',
    fontFamily: "'Noto Sans TC', sans-serif",
  },
  Button: {
    textColorPrimary: '#1a1f26',
  },
  Input: {
    color: '#242a33',
    colorFocus: '#2e3640',
    border: '1px solid #3d4550',
    borderFocus: '1px solid #f2b830',
    textColor: '#eaf0f6',
    placeholderColor: '#5a6370',
  },
  Checkbox: {
    colorChecked: '#f2b830',
    borderChecked: '1px solid #f2b830',
    checkMarkColor: '#1a1f26',
  },
  Dropdown: {
    color: '#242a33',
    optionColorHover: '#2e3640',
    optionTextColor: '#eaf0f6',
  },
};
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-deep);
}

/* 側邊欄過渡動畫 */
.sidebar-enter-active,
.sidebar-leave-active {
  transition: all 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  width: 0 !important;
  min-width: 0 !important;
  opacity: 0;
  transform: translateX(-100%);
}
</style>
