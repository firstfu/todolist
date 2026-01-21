<!--
  TodoList.vue - 待辦清單容器
  顯示當前分類的待辦事項列表
-->
<template>
  <div class="todo-list">
    <!-- 載入中 -->
    <div v-if="store.isLoading" class="loading-state">
      <span>載入中...</span>
    </div>

    <!-- 空狀態 -->
    <n-empty
      v-else-if="store.currentTodos.length === 0"
      :description="emptyDescription"
      class="empty-state"
    >
      <template #icon>
        <n-icon :component="CheckmarkDoneOutline" size="48" />
      </template>
    </n-empty>

    <!-- 待辦列表 -->
    <TransitionGroup v-else name="todo-list" tag="div" class="todo-items">
      <TodoItem
        v-for="todo in store.currentTodos"
        :key="todo.id"
        :todo="todo"
      />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { NEmpty, NIcon } from 'naive-ui';
import { CheckmarkDoneOutline } from '@vicons/ionicons5';
import { useTodoStore, SMART_LIST } from '../stores/todoStore';
import TodoItem from './TodoItem.vue';

const store = useTodoStore();

// 載入資料
onMounted(() => {
  store.loadData();
});

// 空狀態描述
const emptyDescription = computed(() => {
  if (store.selectedCategoryId === SMART_LIST.COMPLETED) {
    return '還沒有完成的任務';
  }
  return '沒有待辦事項，新增一個吧！';
});
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
</style>
