/**
 * Vue 應用入口
 * 初始化 Vue 3、Naive UI、Pinia
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import {
  create,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NButton,
  NInput,
  NCheckbox,
  NDropdown,
  NIcon,
  NScrollbar,
  NEmpty,
  NTooltip,
} from 'naive-ui';
import App from './App.vue';
import './styles/global.css';

// 建立 Naive UI 實例（按需引入）
const naive = create({
  components: [
    NConfigProvider,
    NMessageProvider,
    NDialogProvider,
    NButton,
    NInput,
    NCheckbox,
    NDropdown,
    NIcon,
    NScrollbar,
    NEmpty,
    NTooltip,
  ],
});

// 建立 Vue 應用
const app = createApp(App);

// 使用 Pinia 狀態管理
app.use(createPinia());

// 使用 Naive UI
app.use(naive);

// 掛載應用
app.mount('#app');
