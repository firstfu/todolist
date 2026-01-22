<!--
  TodoList.vue - 待辦清單容器
  顯示當前分類的待辦事項列表，支援拖曳排序
-->
<template>
  <div class="todo-list">
    <!-- 載入中 -->
    <div v-if="store.isLoading" class="loading-state">
      <span>載入中...</span>
    </div>

    <!-- 空狀態 -->
    <n-empty
      v-else-if="store.currentTodos.length === 0 && completedTodosForAllView.length === 0"
      :description="emptyDescription"
      class="empty-state"
    >
      <template #icon>
        <n-icon :component="CheckmarkDoneOutline" size="48" />
      </template>
    </n-empty>

    <template v-else>
      <!-- 待辦列表（可拖曳排序） -->
      <draggable
        v-if="store.currentTodos.length > 0"
        v-model="localTodos"
        item-key="id"
        class="todo-items"
        ghost-class="ghost"
        handle=".drag-handle"
        :group="{ name: 'todos', pull: true, put: true }"
        @end="onDragEnd"
      >
        <template #item="{ element: todo }">
          <TodoItem :todo="todo" />
        </template>
      </draggable>

      <!-- 已完成區塊（僅在「所有任務」視圖顯示） -->
      <div
        v-if="showCompletedSection && completedTodosForAllView.length > 0"
        class="completed-section"
      >
        <button class="completed-header" @click="toggleCompletedSection">
          <n-icon :component="completedExpanded ? ChevronDownOutline : ChevronForwardOutline" size="16" />
          <span class="completed-title">已完成</span>
          <span class="completed-count">{{ completedTodosForAllView.length }}</span>
        </button>

        <Transition name="slide">
          <div v-if="completedExpanded" class="completed-items">
            <TodoItem
              v-for="todo in completedTodosForAllView"
              :key="todo.id"
              :todo="todo"
            />
          </div>
        </Transition>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { NEmpty, NIcon } from 'naive-ui';
import draggable from 'vuedraggable';
import { CheckmarkDoneOutline, ChevronDownOutline, ChevronForwardOutline } from '@vicons/ionicons5';
import { useTodoStore, SMART_LIST } from '../stores/todoStore';
import TodoItem from './TodoItem.vue';
import type { Todo } from '../types/electron';

const store = useTodoStore();

// 本地待辦列表（用於拖曳）
const localTodos = ref<Todo[]>([]);

// 已完成區塊是否展開
const completedExpanded = ref(true);

// 同步 store 的待辦到本地
watch(
  () => store.currentTodos,
  (newTodos) => {
    localTodos.value = [...newTodos];
  },
  { immediate: true, deep: true }
);

// 載入資料
onMounted(() => {
  store.loadData();
});

// 是否顯示已完成區塊（僅在「所有任務」視圖）
const showCompletedSection = computed(() => {
  return store.selectedCategoryId === SMART_LIST.ALL;
});

// 「所有任務」視圖的已完成任務
const completedTodosForAllView = computed(() => {
  if (store.selectedCategoryId !== SMART_LIST.ALL) {
    return [];
  }
  return store.todos.filter(t => t.completed).sort((a, b) => {
    // 按完成時間排序，最近完成的在前
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bTime - aTime;
  });
});

// 空狀態描述
const emptyDescription = computed(() => {
  if (store.selectedCategoryId === SMART_LIST.COMPLETED) {
    return '還沒有完成的任務';
  }
  return '沒有待辦事項，新增一個吧！';
});

// 切換已完成區塊展開/收合
function toggleCompletedSection() {
  completedExpanded.value = !completedExpanded.value;
}

// 拖曳結束
async function onDragEnd() {
  // 更新排序
  const orderUpdates = localTodos.value.map((todo, index) => ({
    id: todo.id,
    order: index,
  }));
  await store.updateTodoOrder(orderUpdates);
}
</script>

<style scoped>
.todo-list {
  min-height: 200px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--text-muted);
}

.empty-state {
  padding: var(--spacing-xl) 0;
}

.empty-state :deep(.n-empty__icon) {
  color: var(--text-muted);
}

.empty-state :deep(.n-empty__description) {
  color: var(--text-secondary);
}

.todo-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

/* 拖曳中的幽靈樣式 */
.ghost {
  opacity: 0.5;
}

/* 列表動畫 */
.todo-list-enter-active {
  animation: fade-in 0.3s ease;
}

.todo-list-leave-active {
  animation: fade-in 0.2s ease reverse;
}

.todo-list-move {
  transition: transform 0.3s ease;
}

/* 已完成區塊 */
.completed-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border);
}

.completed-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  width: 100%;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.completed-header:hover {
  color: var(--text-primary);
  background-color: var(--bg-surface);
}

.completed-title {
  font-size: 13px;
  font-weight: 500;
}

.completed-count {
  font-size: 12px;
  color: var(--text-muted);
  background-color: var(--bg-surface);
  padding: 2px 8px;
  border-radius: 10px;
}

.completed-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

/* 已完成區塊展開/收合動畫 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
