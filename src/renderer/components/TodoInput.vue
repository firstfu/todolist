<!--
  TodoInput.vue - 新增待辦輸入框
  底部固定的輸入區域
-->
<template>
  <div class="todo-input-container">
    <div class="input-wrapper" :class="{ focused: isFocused }">
      <n-icon :component="AddOutline" class="input-icon" />
      <input
        ref="inputRef"
        v-model="newTodoTitle"
        class="todo-input"
        placeholder="新增待辦事項..."
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keyup.enter="addTodo"
      />
      <Transition name="fade">
        <button
          v-if="newTodoTitle.trim()"
          class="submit-btn"
          @click="addTodo"
        >
          <n-icon :component="ArrowForwardOutline" />
        </button>
      </Transition>
    </div>

    <!-- 快捷鍵提示 -->
    <div class="shortcut-hint">
      <kbd>Enter</kbd> 新增
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NIcon, useMessage } from 'naive-ui';
import { AddOutline, ArrowForwardOutline } from '@vicons/ionicons5';
import { useTodoStore, SMART_LIST } from '../stores/todoStore';

const store = useTodoStore();
const message = useMessage();

const inputRef = ref<HTMLInputElement | null>(null);
const newTodoTitle = ref('');
const isFocused = ref(false);

// 新增待辦
async function addTodo() {
  const title = newTodoTitle.value.trim();
  if (!title) return;

  // 檢查是否在「已完成」視圖
  if (store.selectedCategoryId === SMART_LIST.COMPLETED) {
    message.warning('無法在「已完成」視圖新增任務');
    return;
  }

  // 檢查是否有分類
  if (store.categories.length === 0) {
    message.warning('請先新增一個分類');
    return;
  }

  try {
    const result = await store.addTodo(title);
    if (result) {
      newTodoTitle.value = '';
      message.success('已新增任務');
    } else {
      message.error('新增任務失敗');
    }
  } catch (error) {
    console.error('新增任務錯誤:', error);
    message.error('新增任務發生錯誤');
  }

  // 保持輸入框焦點
  inputRef.value?.focus();
}
</script>

<style scoped>
.todo-input-container {
  padding: var(--spacing-md) var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-top: 1px solid var(--border);
  background-color: var(--bg-deep);
}

.input-wrapper {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
  gap: var(--spacing-sm);
}

.input-wrapper:hover {
  border-color: var(--text-muted);
}

.input-wrapper.focused {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.input-icon {
  color: var(--text-muted);
  font-size: 20px;
  transition: color var(--transition-fast);
}

.input-wrapper.focused .input-icon {
  color: var(--accent);
}

.todo-input {
  flex: 1;
  padding: 0;
  font-size: 15px;
  background: transparent;
  color: var(--text-primary);
}

.todo-input::placeholder {
  color: var(--text-muted);
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: var(--accent);
  color: var(--bg-deep);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.submit-btn:hover {
  background-color: var(--accent-hover);
  transform: scale(1.05);
}

.submit-btn:active {
  transform: scale(0.95);
}

.shortcut-hint {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  font-size: 12px;
  color: var(--text-muted);
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

/* 淡入淡出動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
