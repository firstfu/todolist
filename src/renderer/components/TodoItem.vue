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
        <span v-else class="todo-title" :class="{ completed: todo.completed }">
          {{ todo.title }}
        </span>
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
    <Transition name="slide">
      <div v-if="isExpanded" class="children-list">
        <div
          v-for="child in todo.children"
          :key="child.id"
          class="todo-item child-item"
          :class="{ completed: child.completed }"
        >
          <span class="child-indent"></span>

          <!-- Checkbox -->
          <button
            class="checkbox"
            :class="{ checked: child.completed }"
            @click="toggleChildComplete(child)"
          >
            <span v-if="child.completed" class="checkmark">
              <n-icon :component="CheckmarkOutline" size="14" />
            </span>
          </button>

          <!-- 標題 -->
          <div class="todo-content" @dblclick="startChildEdit(child)">
            <input
              v-if="editingChildId === child.id"
              ref="editChildInputRef"
              v-model="editingChildTitle"
              class="edit-input"
              @blur="finishChildEdit"
              @keyup.enter="finishChildEdit"
              @keyup.escape="cancelChildEdit"
            />
            <span v-else class="todo-title" :class="{ completed: child.completed }">
              {{ child.title }}
            </span>
          </div>

          <!-- 刪除按鈕 -->
          <button class="delete-btn" @click="handleChildDelete(child)">
            <n-icon :component="TrashOutline" size="14" />
          </button>
        </div>

        <!-- 空狀態提示 -->
        <div v-if="!hasChildren" class="empty-children">
          <span>尚無子任務</span>
        </div>

        <!-- 新增子任務 -->
        <div class="add-child-wrapper">
          <input
            ref="addChildInputRef"
            v-model="newChildTitle"
            class="add-child-input"
            placeholder="+ 新增子任務..."
            @keyup.enter="addChild"
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
} from '@vicons/ionicons5';
import { useTodoStore, formatDueDate } from '../stores/todoStore';
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
const dueDateInfo = computed(() => formatDueDate(props.todo.dueDate));

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
  await store.updateTodo(child.id, {
    completed: !child.completed,
  });
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
  box-shadow: inset 3px 0 0 var(--accent),
              0 0 20px var(--hover-glow);
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

/* 子任務列表 */
.children-list {
  background-color: var(--bg-surface);
  border-top: 1px solid var(--border);
  border-bottom-left-radius: var(--radius-md);
  border-bottom-right-radius: var(--radius-md);
  padding: var(--spacing-sm);
  padding-left: calc(var(--spacing-md) + 20px);
}

.child-item {
  background-color: transparent;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
}

.child-item:hover {
  background-color: var(--bg-elevated);
  box-shadow: none;
}

.child-item .checkbox {
  width: 18px;
  height: 18px;
  min-width: 18px;
}

.child-item .todo-title {
  font-size: 13px;
}

.child-indent {
  width: 8px;
  min-width: 8px;
}

.add-child-wrapper {
  margin-top: var(--spacing-xs);
  padding-left: 16px;
}

.add-child-input {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: transparent;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all var(--transition-fast);
}

.add-child-input:focus {
  border-color: var(--accent);
  border-style: solid;
  background-color: var(--bg-elevated);
}

.empty-children {
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

/* 展開動畫 */
.slide-enter-active {
  animation: slide-down 0.25s ease;
  overflow: hidden;
}

.slide-leave-active {
  animation: slide-down 0.2s ease reverse;
  overflow: hidden;
}
</style>
