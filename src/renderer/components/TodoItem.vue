<!--
  TodoItem.vue - 單一待辦項目
  支援展開子任務、標記完成、編輯、刪除、拖曳、設定到期日
-->
<template>
  <div class="todo-item-wrapper">
    <!-- 主任務 -->
    <div
      class="todo-item"
      :class="{
        completed: todo.completed,
        expanded: isExpanded,
      }"
    >
      <!-- 拖曳把手 -->
      <span class="drag-handle">
        <n-icon :component="ReorderTwoOutline" size="14" />
      </span>

      <!-- 展開/收合按鈕 -->
      <button
        class="expand-btn"
        :class="{ 'has-children': hasChildren }"
        @click="toggleExpand"
      >
        <n-icon :component="isExpanded ? ChevronDownOutline : ChevronForwardOutline" />
      </button>

      <!-- Checkbox -->
      <button
        class="checkbox"
        :class="{ checked: todo.completed }"
        @click="toggleComplete"
      >
        <span v-if="todo.completed" class="checkmark">
          <n-icon :component="CheckmarkOutline" size="14" />
        </span>
      </button>

      <!-- 標題 -->
      <div class="todo-content" @dblclick="startEdit">
        <input
          v-if="isEditing"
          ref="editInputRef"
          v-model="editingTitle"
          class="edit-input"
          @blur="finishEdit"
          @keyup.enter="finishEdit"
          @keyup.escape="cancelEdit"
        />
        <template v-else>
          <span class="todo-title" :class="{ completed: todo.completed }">
            {{ todo.title }}
          </span>
          <span class="created-at">建立於 {{ createdAtText }}</span>
        </template>
      </div>

      <!-- 到期日顯示 -->
      <n-popover
        trigger="click"
        placement="bottom"
        :show="showDatePicker"
        @update:show="showDatePicker = $event"
      >
        <template #trigger>
          <button
            class="due-date-btn"
            :class="dueDateInfo.status"
            @click.stop="showDatePicker = true"
          >
            <n-icon :component="CalendarOutline" size="14" />
            <span v-if="dueDateInfo.text">{{ dueDateInfo.text }}</span>
          </button>
        </template>
        <div class="date-picker-content">
          <n-date-picker
            v-model:value="selectedDate"
            type="date"
            :is-date-disabled="isDateDisabled"
            @update:value="onDateChange"
          />
          <button v-if="todo.dueDate" class="clear-date-btn" @click="clearDueDate">
            清除到期日
          </button>
        </div>
      </n-popover>

      <!-- 子任務數量標籤 -->
      <span v-if="hasChildren && !isExpanded" class="children-count">
        {{ completedChildrenCount }}/{{ todo.children.length }}
      </span>

      <!-- 刪除按鈕 -->
      <button class="delete-btn" @click="handleDelete">
        <n-icon :component="TrashOutline" size="16" />
      </button>
    </div>

    <!-- 子任務列表（展開時顯示，可新增子任務） -->
    <Transition name="children-expand">
      <div v-if="isExpanded" class="children-container">
        <!-- 進度指示器 -->
        <div class="children-header">
          <div class="progress-section">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: childrenProgress + '%' }"
              ></div>
            </div>
            <span class="progress-text">
              {{ completedChildrenCount }}/{{ todo.children.length }} 完成
            </span>
          </div>
          <div class="connector-line"></div>
        </div>

        <!-- 子任務列表 -->
        <TransitionGroup name="child-item" tag="div" class="children-list">
          <div
            v-for="(child, index) in todo.children"
            :key="child.id"
            class="child-item"
            :class="{
              completed: child.completed,
              'just-completed': recentlyCompleted === child.id
            }"
            :style="{ '--item-index': index }"
          >
            <!-- 連接線裝飾 -->
            <div class="child-connector">
              <div class="connector-dot"></div>
            </div>

            <!-- 子任務 Checkbox -->
            <button
              class="child-checkbox"
              :class="{ checked: child.completed }"
              @click="toggleChildComplete(child)"
            >
              <span class="checkbox-inner">
                <svg v-if="child.completed" class="check-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12l5 5L20 7"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </button>

            <!-- 子任務內容 -->
            <div class="child-content" @dblclick="startChildEdit(child)">
              <input
                v-if="editingChildId === child.id"
                ref="editChildInputRef"
                v-model="editingChildTitle"
                class="child-edit-input"
                @blur="finishChildEdit"
                @keyup.enter="finishChildEdit"
                @keyup.escape="cancelChildEdit"
              />
              <span v-else class="child-title" :class="{ completed: child.completed }">
                {{ child.title }}
              </span>
            </div>

            <!-- 刪除按鈕 -->
            <button class="child-delete-btn" @click="handleChildDelete(child)">
              <n-icon :component="CloseOutline" size="12" />
            </button>
          </div>
        </TransitionGroup>

        <!-- 空狀態提示 -->
        <div v-if="!hasChildren" class="empty-children">
          <div class="empty-icon">
            <n-icon :component="LayersOutline" size="28" />
          </div>
          <span class="empty-text">尚無子任務</span>
          <span class="empty-hint">在下方輸入框新增子任務</span>
        </div>

        <!-- 新增子任務區塊 -->
        <div class="add-child-section">
          <div class="add-child-icon">
            <n-icon :component="AddOutline" size="14" />
          </div>
          <input
            ref="addChildInputRef"
            v-model="newChildTitle"
            class="add-child-input"
            placeholder="新增子任務..."
            @keyup.enter="addChild"
            @focus="addChildFocused = true"
            @blur="addChildFocused = false"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { NIcon, NPopover, NDatePicker, useMessage, useDialog } from 'naive-ui';
import {
  ChevronForwardOutline,
  ChevronDownOutline,
  CheckmarkOutline,
  TrashOutline,
  CalendarOutline,
  ReorderTwoOutline,
  AddOutline,
  CloseOutline,
  LayersOutline,
} from '@vicons/ionicons5';
import { useTodoStore, formatDueDate, formatCreatedAt } from '../stores/todoStore';
import type { Todo, SubTodo } from '../types/electron';

const props = defineProps<{
  todo: Todo;
}>();

const store = useTodoStore();
const message = useMessage();
const dialog = useDialog();

// 編輯主任務狀態
const isEditing = ref(false);
const editingTitle = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

// 編輯子任務狀態
const editingChildId = ref<string | null>(null);
const editingChildTitle = ref('');
const editChildInputRef = ref<HTMLInputElement | null>(null);

// 新增子任務
const newChildTitle = ref('');
const addChildInputRef = ref<HTMLInputElement | null>(null);
const addChildFocused = ref(false);
const recentlyCompleted = ref<string | null>(null);

// 日期選擇器
const showDatePicker = ref(false);
const selectedDate = computed({
  get: () => props.todo.dueDate ? new Date(props.todo.dueDate).getTime() : null,
  set: () => {},
});

// 計算屬性
const hasChildren = computed(() => props.todo.children.length > 0);
const isExpanded = computed(() => store.isExpanded(props.todo.id));
const completedChildrenCount = computed(() =>
  props.todo.children.filter(c => c.completed).length
);
const childrenProgress = computed(() =>
  props.todo.children.length > 0
    ? (completedChildrenCount.value / props.todo.children.length) * 100
    : 0
);
const dueDateInfo = computed(() => formatDueDate(props.todo.dueDate));
const createdAtText = computed(() => formatCreatedAt(props.todo.createdAt));

// 禁用過去的日期（可選）
function isDateDisabled(timestamp: number) {
  return false; // 允許選擇任何日期
}

// 日期改變
async function onDateChange(timestamp: number | null) {
  if (timestamp) {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD 格式
    await store.updateTodo(props.todo.id, { dueDate: dateStr });
  }
  showDatePicker.value = false;
}

// 清除到期日
async function clearDueDate() {
  await store.updateTodo(props.todo.id, { dueDate: null });
  showDatePicker.value = false;
}

// 展開/收合
function toggleExpand() {
  store.toggleExpand(props.todo.id);
}

// 切換完成狀態
async function toggleComplete() {
  await store.updateTodo(props.todo.id, {
    completed: !props.todo.completed,
  });
}

// 開始編輯
function startEdit() {
  isEditing.value = true;
  editingTitle.value = props.todo.title;
  nextTick(() => {
    editInputRef.value?.focus();
    editInputRef.value?.select();
  });
}

// 完成編輯
async function finishEdit() {
  if (editingTitle.value.trim() && editingTitle.value !== props.todo.title) {
    await store.updateTodo(props.todo.id, {
      title: editingTitle.value.trim(),
    });
  }
  isEditing.value = false;
  editingTitle.value = '';
}

// 取消編輯
function cancelEdit() {
  isEditing.value = false;
  editingTitle.value = '';
}

// 刪除主任務
function handleDelete() {
  const hasChildren = props.todo.children.length > 0;
  if (hasChildren) {
    dialog.warning({
      title: '刪除任務',
      content: `確定要刪除「${props.todo.title}」嗎？此任務下的 ${props.todo.children.length} 個子任務也會被刪除。`,
      positiveText: '刪除',
      negativeText: '取消',
      onPositiveClick: async () => {
        await store.deleteTodo(props.todo.id);
        message.success('已刪除任務');
      },
    });
  } else {
    store.deleteTodo(props.todo.id);
  }
}

// === 子任務相關 ===

// 切換子任務完成狀態
async function toggleChildComplete(child: SubTodo) {
  const wasCompleted = child.completed;
  await store.updateTodo(child.id, {
    completed: !child.completed,
  });
  // 顯示完成動畫
  if (!wasCompleted) {
    recentlyCompleted.value = child.id;
    setTimeout(() => {
      recentlyCompleted.value = null;
    }, 600);
  }
}

// 開始編輯子任務
function startChildEdit(child: SubTodo) {
  editingChildId.value = child.id;
  editingChildTitle.value = child.title;
  nextTick(() => {
    editChildInputRef.value?.focus();
    editChildInputRef.value?.select();
  });
}

// 完成子任務編輯
async function finishChildEdit() {
  if (editingChildId.value && editingChildTitle.value.trim()) {
    await store.updateTodo(editingChildId.value, {
      title: editingChildTitle.value.trim(),
    });
  }
  editingChildId.value = null;
  editingChildTitle.value = '';
}

// 取消子任務編輯
function cancelChildEdit() {
  editingChildId.value = null;
  editingChildTitle.value = '';
}

// 刪除子任務
async function handleChildDelete(child: SubTodo) {
  await store.deleteTodo(child.id);
}

// 新增子任務
async function addChild() {
  if (newChildTitle.value.trim()) {
    await store.addTodo(newChildTitle.value.trim(), props.todo.id);
    newChildTitle.value = '';
  }
}
</script>

<style scoped>
.todo-item-wrapper {
  margin-bottom: var(--spacing-xs);
}

.todo-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-surface);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  gap: var(--spacing-sm);
}

.todo-item:hover {
  background-color: var(--bg-elevated);
}

.todo-item.expanded {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

/* 拖曳把手 */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  cursor: grab;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.todo-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.expand-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-elevated);
}

.expand-btn.has-children {
  color: var(--text-secondary);
}

.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  min-width: 22px;
  border: 2px solid var(--border);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.checkbox:hover {
  border-color: var(--accent);
}

.checkbox.checked {
  background-color: var(--accent);
  border-color: var(--accent);
}

.checkmark {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-deep);
  animation: checkmark-pop 0.3s ease;
}

.todo-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.todo-title {
  display: block;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all var(--transition-fast);
}

.todo-title.completed {
  color: var(--text-muted);
  text-decoration: line-through;
}

.created-at {
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.7;
}

.edit-input {
  width: 100%;
  padding: 4px 8px;
  background-color: var(--bg-elevated);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

/* 到期日按鈕 */
.due-date-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-muted);
  background-color: transparent;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.due-date-btn:hover {
  background-color: var(--bg-elevated);
  color: var(--text-secondary);
}

.due-date-btn.overdue {
  color: var(--danger);
}

.due-date-btn.today {
  color: var(--accent);
}

.due-date-btn.soon {
  color: #3b82f6;
}

.date-picker-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.clear-date-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 12px;
  color: var(--text-secondary);
  background-color: var(--bg-elevated);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.clear-date-btn:hover {
  color: var(--danger);
}

.children-count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  padding: 2px 6px;
  background-color: var(--bg-elevated);
  border-radius: var(--radius-sm);
}

.delete-btn {
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.todo-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--danger);
  background-color: rgba(248, 81, 73, 0.1);
}

/* ========================================
   子任務容器 - 精緻巢狀卡片設計
   ======================================== */
.children-container {
  position: relative;
  margin-top: 2px;
  margin-left: 0;
  margin-right: 0;
  padding: var(--spacing-md);
  background: linear-gradient(
    135deg,
    rgba(46, 54, 64, 0.6) 0%,
    rgba(36, 42, 51, 0.8) 100%
  );
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  border: 1px solid rgba(61, 69, 80, 0.5);
  border-top: none;
  backdrop-filter: blur(8px);
}


/* 進度區塊 */
.children-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid rgba(61, 69, 80, 0.4);
}

.progress-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.progress-bar {
  flex: 1;
  max-width: 120px;
  height: 4px;
  background-color: rgba(61, 69, 80, 0.6);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent) 0%, #f7c95a 100%);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px rgba(242, 184, 48, 0.4);
}

.progress-text {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  white-space: nowrap;
}

.connector-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--border) 0%, transparent 100%);
  margin-left: var(--spacing-md);
}

/* 子任務列表 */
.children-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 單一子任務項目 */
.child-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: rgba(36, 42, 51, 0.5);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  gap: var(--spacing-sm);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  animation: child-fade-in 0.3s ease forwards;
  animation-delay: calc(var(--item-index) * 50ms);
  opacity: 0;
}

@keyframes child-fade-in {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.child-item:hover {
  background: rgba(46, 54, 64, 0.8);
  border-color: rgba(242, 184, 48, 0.2);
  transform: translateX(4px);
}

.child-item.completed {
  opacity: 0.7;
}

.child-item.completed:hover {
  opacity: 0.85;
}

/* 完成動畫效果 */
.child-item.just-completed {
  animation: complete-flash 0.6s ease;
}

@keyframes complete-flash {
  0% {
    background: rgba(242, 184, 48, 0.3);
    box-shadow: 0 0 20px rgba(242, 184, 48, 0.4);
  }
  100% {
    background: rgba(36, 42, 51, 0.5);
    box-shadow: none;
  }
}

/* 連接線裝飾 */
.child-connector {
  display: flex;
  align-items: center;
  width: 16px;
  min-width: 16px;
}

.connector-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
  transition: all 0.2s ease;
}

.child-item:hover .connector-dot {
  background: var(--accent);
  box-shadow: 0 0 6px rgba(242, 184, 48, 0.5);
}

.child-item.completed .connector-dot {
  background: var(--success);
}

/* 子任務 Checkbox */
.child-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.checkbox-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-radius: 5px;
  background: transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.child-checkbox:hover .checkbox-inner {
  border-color: var(--accent);
  background: rgba(242, 184, 48, 0.1);
}

.child-checkbox.checked .checkbox-inner {
  border-color: var(--accent);
  background: var(--accent);
}

.check-icon {
  width: 12px;
  height: 12px;
  color: var(--bg-deep);
  stroke-dasharray: 24;
  stroke-dashoffset: 0;
  animation: check-draw 0.3s ease forwards;
}

@keyframes check-draw {
  from {
    stroke-dashoffset: 24;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* 子任務內容區 */
.child-content {
  flex: 1;
  min-width: 0;
}

.child-title {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  transition: all 0.2s ease;
}

.child-title.completed {
  color: var(--text-muted);
  text-decoration: line-through;
  text-decoration-color: var(--text-muted);
}

.child-edit-input {
  width: 100%;
  padding: 4px 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

/* 子任務刪除按鈕 */
.child-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--text-muted);
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;
}

.child-item:hover .child-delete-btn {
  opacity: 1;
  transform: scale(1);
}

.child-delete-btn:hover {
  color: var(--danger);
  background: rgba(248, 81, 73, 0.15);
}

/* 空狀態 */
.empty-children {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg) var(--spacing-md);
  gap: var(--spacing-xs);
}

.empty-icon {
  color: var(--text-muted);
  opacity: 0.5;
  margin-bottom: var(--spacing-xs);
}

.empty-text {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.empty-hint {
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.7;
}

/* 新增子任務區塊 */
.add-child-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding: 10px 12px;
  background: rgba(30, 35, 42, 0.5);
  border: 1px dashed rgba(61, 69, 80, 0.6);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.add-child-section:focus-within {
  border-color: var(--accent);
  border-style: solid;
  background: rgba(36, 42, 51, 0.7);
  box-shadow: 0 0 0 3px rgba(242, 184, 48, 0.1);
}

.add-child-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.add-child-section:focus-within .add-child-icon {
  color: var(--accent);
}

.add-child-input {
  flex: 1;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  outline: none;
}

.add-child-input::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

/* 子任務列表動畫 */
.child-item-enter-active {
  animation: child-slide-in 0.3s ease;
}

.child-item-leave-active {
  animation: child-slide-out 0.25s ease;
}

@keyframes child-slide-in {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes child-slide-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(20px) scale(0.95);
  }
}

/* 展開/收合動畫 */
.children-expand-enter-active {
  animation: expand-in 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top;
}

.children-expand-leave-active {
  animation: expand-out 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top;
}

@keyframes expand-in {
  from {
    opacity: 0;
    transform: scaleY(0.8);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: scaleY(1);
    max-height: 600px;
  }
}

@keyframes expand-out {
  from {
    opacity: 1;
    transform: scaleY(1);
    max-height: 600px;
  }
  to {
    opacity: 0;
    transform: scaleY(0.8);
    max-height: 0;
  }
}
</style>
