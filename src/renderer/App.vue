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

// Naive UI 主題覆蓋，配合墨夜書房風格
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#f0b429',
    primaryColorHover: '#f5c451',
    primaryColorPressed: '#d9a21e',
    borderRadius: '8px',
    fontFamily: "'Noto Sans TC', sans-serif",
  },
  Button: {
    textColorPrimary: '#0d1117',
  },
  Input: {
    color: '#161b22',
    colorFocus: '#21262d',
    border: '1px solid #30363d',
    borderFocus: '1px solid #f0b429',
    textColor: '#e6edf3',
    placeholderColor: '#484f58',
  },
  Checkbox: {
    colorChecked: '#f0b429',
    borderChecked: '1px solid #f0b429',
    checkMarkColor: '#0d1117',
  },
  Dropdown: {
    color: '#161b22',
    optionColorHover: '#21262d',
    optionTextColor: '#e6edf3',
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
