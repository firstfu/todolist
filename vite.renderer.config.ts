/**
 * Vite 渲染進程配置
 * 配置 Vue 3 支援與路徑別名
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig(async () => {
  const vue = (await import('@vitejs/plugin-vue')).default;

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
      },
    },
  };
});
