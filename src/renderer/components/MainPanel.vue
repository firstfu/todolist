<!--
  MainPanel.vue - 右側主面板
  顯示待辦清單與排序控制
-->
<template>
  <main class="main-panel">
    <!-- 標題列 -->
    <header class="panel-header">
      <h2 class="panel-title">{{ panelTitle }}</h2>

      <!-- 排序下拉選單 -->
      <n-dropdown
        :options="sortOptions"
        @select="handleSortSelect"
      >
        <button class="sort-btn">
          <n-icon :component="SwapVerticalOutline" />
          <span>{{ currentSortLabel }}</span>
          <n-icon :component="ChevronDownOutline" size="14" />
        </button>
      </n-dropdown>
    </header>

    <!-- 待辦清單 -->
    <div class="todo-container">
      <n-scrollbar>
        <TodoList />
      </n-scrollbar>
    </div>

    <!-- 新增待辦輸入框 -->
    <TodoInput />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NDropdown, NIcon, NScrollbar } from 'naive-ui';
import { SwapVerticalOutline, ChevronDownOutline } from '@vicons/ionicons5';
import { useTodoStore, SMART_LIST, type SortType } from '../stores/todoStore';
import TodoList from './TodoList.vue';
import TodoInput from './TodoInput.vue';

const store = useTodoStore();

// 面板標題
const panelTitle = computed(() => {
  if (store.selectedCategoryId === SMART_LIST.ALL) {
    return '所有任務';
  }
  if (store.selectedCategoryId === SMART_LIST.COMPLETED) {
    return '已完成';
  }
  const category = store.categories.find(c => c.id === store.selectedCategoryId);
  return category?.name || '待辦事項';
});

// 排序選項
const sortOptions = [
  { label: '自訂排序', key: 'custom' },
  { label: '建立時間（新→舊）', key: 'createdAt-desc' },
  { label: '建立時間（舊→新）', key: 'createdAt-asc' },
  { label: '名稱（A→Z）', key: 'title' },
  { label: '完成狀態', key: 'completed' },
];

// 當前排序標籤
const currentSortLabel = computed(() => {
  const option = sortOptions.find(o => o.key === store.sortType);
  return option?.label || '排序';
});

// 處理排序選擇
function handleSortSelect(key: string) {
  store.setSortType(key as SortType);
}
</script>

<style scoped>
.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-deep);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  padding-top: 44px; /* 留空給視窗控制按鈕 */
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
}

.panel-title {
  font-family: var(--font-title);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  -webkit-app-region: no-drag;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  font-size: 13px;
  -webkit-app-region: no-drag;
}

.sort-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-surface);
}

.todo-container {
  flex: 1;
  overflow: hidden;
  padding: var(--spacing-md) 0;
}

.todo-container :deep(.n-scrollbar-content) {
  padding: 0 var(--spacing-xl);
}
</style>
