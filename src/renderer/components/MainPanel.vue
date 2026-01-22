<!--
  MainPanel.vue - 右側主面板
  顯示待辦清單與排序控制，包含側邊欄切換按鈕
-->
<template>
  <main class="main-panel">
    <!-- 標題列 -->
    <header class="panel-header">
      <div class="header-left">
        <!-- 側邊欄切換按鈕 -->
        <button
          class="toggle-sidebar-btn"
          :title="store.sidebarVisible ? '隱藏側邊欄' : '顯示側邊欄'"
          @click="store.toggleSidebar"
        >
          <n-icon :component="store.sidebarVisible ? MenuOutline : MenuOutline" size="20" />
        </button>

        <h2 class="panel-title">{{ panelTitle }}</h2>
      </div>

      <div class="header-right">
        <!-- 視圖切換按鈕 -->
        <div class="view-toggle">
          <button
            class="view-btn"
            :class="{ active: store.viewType === 'list' }"
            title="列表視圖"
            @click="setViewType('list')"
          >
            <n-icon :component="ListOutline" size="18" />
          </button>
          <button
            class="view-btn"
            :class="{ active: store.viewType === 'calendar' }"
            title="日曆視圖"
            @click="setViewType('calendar')"
          >
            <n-icon :component="CalendarOutline" size="18" />
          </button>
        </div>

        <!-- 排序下拉選單（僅列表視圖顯示） -->
        <n-dropdown
          v-if="store.viewType === 'list'"
          :options="sortOptions"
          @select="handleSortSelect"
        >
          <button class="sort-btn">
            <n-icon :component="SwapVerticalOutline" />
            <span>{{ currentSortLabel }}</span>
            <n-icon :component="ChevronDownOutline" size="14" />
          </button>
        </n-dropdown>
      </div>
    </header>

    <!-- 待辦清單（列表視圖） -->
    <div v-if="store.viewType === 'list'" class="todo-container">
      <n-scrollbar>
        <TodoList />
      </n-scrollbar>
    </div>

    <!-- 日曆視圖 -->
    <div v-else class="calendar-container">
      <n-scrollbar>
        <CalendarView />
      </n-scrollbar>
    </div>

    <!-- 新增待辦輸入框（僅列表視圖顯示） -->
    <TodoInput v-if="store.viewType === 'list'" />
  </main>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';
import { NDropdown, NIcon, NScrollbar } from 'naive-ui';
import { SwapVerticalOutline, ChevronDownOutline, MenuOutline, CheckmarkOutline, ListOutline, CalendarOutline } from '@vicons/ionicons5';
import { useTodoStore, SMART_LIST, type SortType, type ViewType } from '../stores/todoStore';
import TodoList from './TodoList.vue';
import TodoInput from './TodoInput.vue';
import CalendarView from './CalendarView.vue';

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

// 排序選項基礎資料
const sortOptionsBase = [
  { label: '自訂排序', key: 'custom' },
  { label: '到期日', key: 'dueDate' },
  { label: '建立時間（新→舊）', key: 'createdAt-desc' },
  { label: '建立時間（舊→新）', key: 'createdAt-asc' },
  { label: '名稱（A→Z）', key: 'title' },
  { label: '完成狀態', key: 'completed' },
];

// 排序選項（帶有當前選擇標記）
const sortOptions = computed(() => {
  return sortOptionsBase.map(option => ({
    ...option,
    icon: option.key === store.sortType
      ? () => h(NIcon, { component: CheckmarkOutline, color: '#f2b830' })
      : undefined,
  }));
});

// 當前排序標籤
const currentSortLabel = computed(() => {
  const option = sortOptionsBase.find(o => o.key === store.sortType);
  return option?.label || '排序';
});

// 處理排序選擇
function handleSortSelect(key: string) {
  store.setSortType(key as SortType);
}

// 設定視圖類型
function setViewType(type: ViewType) {
  store.setViewType(type);
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

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  -webkit-app-region: no-drag;
}

.toggle-sidebar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.toggle-sidebar-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-surface);
}

.toggle-sidebar-btn:active {
  background-color: var(--bg-elevated);
}

.panel-title {
  font-family: var(--font-title);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
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

/* 標題右側區域 */
.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  -webkit-app-region: no-drag;
}

/* 視圖切換按鈕組 */
.view-toggle {
  display: flex;
  align-items: center;
  background-color: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 2px;
}

.view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.view-btn:hover {
  color: var(--text-secondary);
}

.view-btn.active {
  background-color: var(--bg-elevated);
  color: var(--accent);
}

/* 日曆容器 */
.calendar-container {
  flex: 1;
  overflow: hidden;
}

.calendar-container :deep(.n-scrollbar-content) {
  height: 100%;
}
</style>
