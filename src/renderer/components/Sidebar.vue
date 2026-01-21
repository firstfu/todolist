<!--
  Sidebar.vue - 左側分類欄
  包含智慧清單（所有任務、已完成）與自訂分類
-->
<template>
  <aside class="sidebar">
    <!-- 標題區域（拖曳區） -->
    <div class="sidebar-header">
      <h1 class="app-title">待辦事項</h1>
    </div>

    <!-- 智慧清單 -->
    <nav class="smart-lists">
      <div
        class="nav-item"
        :class="{ active: store.selectedCategoryId === SMART_LIST.ALL }"
        @click="store.selectCategory(SMART_LIST.ALL)"
      >
        <span class="nav-icon">
          <n-icon :component="ListOutline" />
        </span>
        <span class="nav-label">所有任務</span>
        <span class="nav-count">{{ store.allTodoCount }}</span>
      </div>

      <div
        class="nav-item"
        :class="{ active: store.selectedCategoryId === SMART_LIST.COMPLETED }"
        @click="store.selectCategory(SMART_LIST.COMPLETED)"
      >
        <span class="nav-icon completed-icon">
          <n-icon :component="CheckmarkCircleOutline" />
        </span>
        <span class="nav-label">已完成</span>
        <span class="nav-count">{{ store.completedTodoCount }}</span>
      </div>
    </nav>

    <div class="divider"></div>

    <!-- 自訂分類 -->
    <div class="categories-section">
      <n-scrollbar style="max-height: calc(100vh - 280px)">
        <nav class="category-list">
          <div
            v-for="category in store.sortedCategories"
            :key="category.id"
            class="nav-item category-item"
            :class="{ active: store.selectedCategoryId === category.id }"
            @click="store.selectCategory(category.id)"
            @dblclick="startEdit(category)"
          >
            <span class="nav-icon">
              <n-icon :component="FolderOutline" />
            </span>

            <!-- 編輯模式 -->
            <input
              v-if="editingId === category.id"
              ref="editInputRef"
              v-model="editingName"
              class="edit-input"
              @blur="finishEdit"
              @keyup.enter="finishEdit"
              @keyup.escape="cancelEdit"
              @click.stop
            />
            <span v-else class="nav-label">{{ category.name }}</span>

            <span class="nav-count">{{ store.categoryTodoCounts[category.id] || 0 }}</span>

            <!-- 刪除按鈕 -->
            <button
              v-if="editingId !== category.id"
              class="delete-btn"
              @click.stop="confirmDelete(category)"
            >
              <n-icon :component="TrashOutline" size="14" />
            </button>
          </div>
        </nav>
      </n-scrollbar>
    </div>

    <!-- 新增分類 -->
    <div class="add-category">
      <div v-if="isAdding" class="add-input-wrapper">
        <input
          ref="addInputRef"
          v-model="newCategoryName"
          class="add-input"
          placeholder="分類名稱..."
          @blur="finishAdd"
          @keyup.enter="finishAdd"
          @keyup.escape="cancelAdd"
        />
      </div>
      <button v-else class="add-btn" @click="startAdd">
        <n-icon :component="AddOutline" />
        <span>新增分類</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { NIcon, NScrollbar, useDialog, useMessage } from 'naive-ui';
import {
  ListOutline,
  CheckmarkCircleOutline,
  FolderOutline,
  AddOutline,
  TrashOutline,
} from '@vicons/ionicons5';
import { useTodoStore, SMART_LIST } from '../stores/todoStore';
import type { Category } from '../types/electron';

const store = useTodoStore();
const dialog = useDialog();
const message = useMessage();

// 編輯狀態
const editingId = ref<string | null>(null);
const editingName = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

// 新增狀態
const isAdding = ref(false);
const newCategoryName = ref('');
const addInputRef = ref<HTMLInputElement | null>(null);

// 開始編輯
function startEdit(category: Category) {
  editingId.value = category.id;
  editingName.value = category.name;
  nextTick(() => {
    editInputRef.value?.focus();
    editInputRef.value?.select();
  });
}

// 完成編輯
async function finishEdit() {
  if (editingId.value && editingName.value.trim()) {
    await store.updateCategory(editingId.value, editingName.value.trim());
  }
  editingId.value = null;
  editingName.value = '';
}

// 取消編輯
function cancelEdit() {
  editingId.value = null;
  editingName.value = '';
}

// 確認刪除
function confirmDelete(category: Category) {
  const count = store.categoryTodoCounts[category.id] || 0;
  dialog.warning({
    title: '刪除分類',
    content: count > 0
      ? `確定要刪除「${category.name}」嗎？此分類下的 ${count} 個任務也會被刪除。`
      : `確定要刪除「${category.name}」嗎？`,
    positiveText: '刪除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.deleteCategory(category.id);
      message.success('已刪除分類');
    },
  });
}

// 開始新增
function startAdd() {
  isAdding.value = true;
  newCategoryName.value = '';
  nextTick(() => {
    addInputRef.value?.focus();
  });
}

// 完成新增
async function finishAdd() {
  if (newCategoryName.value.trim()) {
    await store.addCategory(newCategoryName.value.trim());
    message.success('已新增分類');
  }
  isAdding.value = false;
  newCategoryName.value = '';
}

// 取消新增
function cancelAdd() {
  isAdding.value = false;
  newCategoryName.value = '';
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  height: 100%;
  background-color: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  -webkit-app-region: drag;
}

.sidebar-header {
  padding: var(--spacing-lg) var(--spacing-md);
  padding-top: 40px; /* 留空給視窗控制按鈕 */
}

.app-title {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  -webkit-app-region: no-drag;
}

.smart-lists,
.category-list {
  padding: 0 var(--spacing-sm);
  -webkit-app-region: no-drag;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  margin: 2px 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item:hover {
  background-color: var(--bg-elevated);
}

.nav-item.active {
  background-color: var(--accent-soft);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background-color: var(--accent);
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--text-secondary);
  margin-right: var(--spacing-sm);
}

.nav-item.active .nav-icon {
  color: var(--accent);
}

.completed-icon {
  color: var(--success);
}

.nav-item.active .completed-icon {
  color: var(--success);
}

.nav-label {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  min-width: 20px;
  text-align: right;
}

.divider {
  height: 1px;
  background-color: var(--border);
  margin: var(--spacing-md) var(--spacing-md);
}

.categories-section {
  flex: 1;
  overflow: hidden;
  -webkit-app-region: no-drag;
}

.category-item .delete-btn {
  opacity: 0;
  padding: 4px;
  margin-left: var(--spacing-xs);
  color: var(--text-muted);
  transition: all var(--transition-fast);
  border-radius: var(--radius-sm);
}

.category-item:hover .delete-btn {
  opacity: 1;
}

.category-item .delete-btn:hover {
  color: var(--danger);
  background-color: rgba(248, 81, 73, 0.1);
}

.edit-input {
  flex: 1;
  padding: 2px 6px;
  background-color: var(--bg-elevated);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.add-category {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border);
  -webkit-app-region: no-drag;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.add-btn:hover {
  color: var(--accent);
  background-color: var(--accent-soft);
}

.add-input-wrapper {
  padding: 0;
}

.add-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-elevated);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}
</style>
