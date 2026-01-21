<!--
  Sidebar.vue - 左側分類欄
  包含智慧清單（所有任務、已完成）與自訂分類
  支援分類拖曳排序、子分類功能
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

    <!-- 自訂分類（樹狀結構） -->
    <div class="categories-section">
      <n-scrollbar style="max-height: calc(100vh - 280px)">
        <div class="category-list">
          <!-- 根分類（可拖曳排序） -->
          <draggable
            v-model="localRootCategories"
            item-key="id"
            ghost-class="ghost"
            handle=".drag-handle"
            @end="onRootCategoryDragEnd"
          >
            <template #item="{ element: category }">
              <div class="category-group">
                <!-- 父分類 -->
                <div
                  class="nav-item category-item parent-category"
                  :class="{
                    active: store.selectedCategoryId === category.id,
                    expanded: store.isCategoryExpanded(category.id),
                  }"
                  @click="store.selectCategory(category.id)"
                  @dblclick="startEdit(category)"
                >
                  <!-- 拖曳把手 -->
                  <span class="drag-handle">
                    <n-icon :component="ReorderTwoOutline" size="14" />
                  </span>

                  <!-- 展開/收合按鈕 -->
                  <button
                    class="expand-btn"
                    :class="{ 'has-children': store.hasChildCategories(category.id) }"
                    @click.stop="store.toggleCategoryExpand(category.id)"
                  >
                    <n-icon
                      :component="store.isCategoryExpanded(category.id) ? ChevronDownOutline : ChevronForwardOutline"
                      size="14"
                    />
                  </button>

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

                  <!-- 新增子分類按鈕 -->
                  <button
                    v-if="editingId !== category.id"
                    class="add-child-btn"
                    title="新增子分類"
                    @click.stop="startAddChild(category.id)"
                  >
                    <n-icon :component="AddOutline" size="14" />
                  </button>

                  <!-- 刪除按鈕 -->
                  <button
                    v-if="editingId !== category.id"
                    class="delete-btn"
                    @click.stop="confirmDelete(category)"
                  >
                    <n-icon :component="TrashOutline" size="14" />
                  </button>
                </div>

                <!-- 子分類列表（展開時顯示） -->
                <Transition name="slide">
                  <div v-if="store.isCategoryExpanded(category.id)" class="child-categories">
                    <!-- 新增子分類輸入框 -->
                    <div v-if="addingChildParentId === category.id" class="add-child-input-wrapper">
                      <input
                        ref="addChildInputRef"
                        v-model="newChildCategoryName"
                        class="add-child-input"
                        placeholder="子分類名稱..."
                        @blur="finishAddChild"
                        @keyup.enter="finishAddChild"
                        @keyup.escape="cancelAddChild"
                      />
                    </div>

                    <!-- 子分類（可在同一父分類內拖曳排序） -->
                    <draggable
                      :model-value="getLocalChildCategories(category.id)"
                      item-key="id"
                      ghost-class="ghost"
                      handle=".drag-handle"
                      @end="(evt) => onChildCategoryDragEnd(category.id, evt)"
                      @update:model-value="(val) => updateLocalChildCategories(category.id, val)"
                    >
                      <template #item="{ element: childCategory }">
                        <div
                          class="nav-item category-item child-category"
                          :class="{ active: store.selectedCategoryId === childCategory.id }"
                          @click="store.selectCategory(childCategory.id)"
                          @dblclick="startEdit(childCategory)"
                        >
                          <!-- 拖曳把手 -->
                          <span class="drag-handle">
                            <n-icon :component="ReorderTwoOutline" size="14" />
                          </span>

                          <span class="child-indent"></span>

                          <span class="nav-icon child-icon">
                            <n-icon :component="DocumentOutline" size="16" />
                          </span>

                          <!-- 編輯模式 -->
                          <input
                            v-if="editingId === childCategory.id"
                            ref="editInputRef"
                            v-model="editingName"
                            class="edit-input"
                            @blur="finishEdit"
                            @keyup.enter="finishEdit"
                            @keyup.escape="cancelEdit"
                            @click.stop
                          />
                          <span v-else class="nav-label">{{ childCategory.name }}</span>

                          <span class="nav-count">{{ store.categoryTodoCounts[childCategory.id] || 0 }}</span>

                          <!-- 刪除按鈕 -->
                          <button
                            v-if="editingId !== childCategory.id"
                            class="delete-btn"
                            @click.stop="confirmDelete(childCategory)"
                          >
                            <n-icon :component="TrashOutline" size="14" />
                          </button>
                        </div>
                      </template>
                    </draggable>

                    <!-- 空子分類提示 -->
                    <div
                      v-if="!store.hasChildCategories(category.id) && addingChildParentId !== category.id"
                      class="empty-children"
                    >
                      <span>尚無子分類</span>
                    </div>
                  </div>
                </Transition>
              </div>
            </template>
          </draggable>
        </div>
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
import { ref, nextTick, watch, computed } from 'vue';
import { NIcon, NScrollbar, useDialog, useMessage } from 'naive-ui';
import draggable from 'vuedraggable';
import {
  ListOutline,
  CheckmarkCircleOutline,
  FolderOutline,
  DocumentOutline,
  AddOutline,
  TrashOutline,
  ReorderTwoOutline,
  ChevronForwardOutline,
  ChevronDownOutline,
} from '@vicons/ionicons5';
import { useTodoStore, SMART_LIST } from '../stores/todoStore';
import type { Category } from '../types/electron';

const store = useTodoStore();
const dialog = useDialog();
const message = useMessage();

// 本地根分類列表（用於拖曳）
const localRootCategories = ref<Category[]>([]);

// 本地子分類列表（用於拖曳，按父分類 ID 分組）
const localChildCategories = ref<Record<string, Category[]>>({});

// 同步 store 的根分類到本地
watch(
  () => store.rootCategories,
  (newCategories) => {
    localRootCategories.value = [...newCategories];
  },
  { immediate: true, deep: true }
);

// 同步 store 的子分類到本地
watch(
  () => store.categories,
  () => {
    // 重建子分類映射
    const newChildCategories: Record<string, Category[]> = {};
    for (const rootCat of store.rootCategories) {
      newChildCategories[rootCat.id] = store.getChildCategories(rootCat.id);
    }
    localChildCategories.value = newChildCategories;
  },
  { immediate: true, deep: true }
);

// 取得本地子分類
function getLocalChildCategories(parentId: string): Category[] {
  return localChildCategories.value[parentId] || [];
}

// 更新本地子分類
function updateLocalChildCategories(parentId: string, categories: Category[]) {
  localChildCategories.value[parentId] = categories;
}

// 編輯狀態
const editingId = ref<string | null>(null);
const editingName = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

// 新增根分類狀態
const isAdding = ref(false);
const newCategoryName = ref('');
const addInputRef = ref<HTMLInputElement | null>(null);

// 新增子分類狀態
const addingChildParentId = ref<string | null>(null);
const newChildCategoryName = ref('');
const addChildInputRef = ref<HTMLInputElement | null>(null);

// 根分類拖曳結束
async function onRootCategoryDragEnd() {
  const orderUpdates = localRootCategories.value.map((cat, index) => ({
    id: cat.id,
    order: index,
  }));
  await store.updateCategoryOrder(orderUpdates);
}

// 子分類拖曳結束
async function onChildCategoryDragEnd(parentId: string, evt: any) {
  const children = localChildCategories.value[parentId] || [];
  const orderUpdates = children.map((cat, index) => ({
    id: cat.id,
    order: index,
  }));
  await store.updateCategoryOrder(orderUpdates);
}

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
  const hasChildren = store.hasChildCategories(category.id);

  let content = '';
  if (hasChildren) {
    content = `確定要刪除「${category.name}」嗎？此分類下的所有子分類和 ${count} 個任務都會被刪除。`;
  } else if (count > 0) {
    content = `確定要刪除「${category.name}」嗎？此分類下的 ${count} 個任務也會被刪除。`;
  } else {
    content = `確定要刪除「${category.name}」嗎？`;
  }

  dialog.warning({
    title: '刪除分類',
    content,
    positiveText: '刪除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.deleteCategory(category.id);
      message.success('已刪除分類');
    },
  });
}

// 開始新增根分類
function startAdd() {
  isAdding.value = true;
  newCategoryName.value = '';
  nextTick(() => {
    addInputRef.value?.focus();
  });
}

// 完成新增根分類
async function finishAdd() {
  if (newCategoryName.value.trim()) {
    await store.addCategory(newCategoryName.value.trim());
    message.success('已新增分類');
  }
  isAdding.value = false;
  newCategoryName.value = '';
}

// 取消新增根分類
function cancelAdd() {
  isAdding.value = false;
  newCategoryName.value = '';
}

// 開始新增子分類
function startAddChild(parentId: string) {
  // 先展開父分類
  if (!store.isCategoryExpanded(parentId)) {
    store.toggleCategoryExpand(parentId);
  }
  addingChildParentId.value = parentId;
  newChildCategoryName.value = '';
  nextTick(() => {
    addChildInputRef.value?.focus();
  });
}

// 完成新增子分類
async function finishAddChild() {
  if (newChildCategoryName.value.trim() && addingChildParentId.value) {
    await store.addCategory(newChildCategoryName.value.trim(), addingChildParentId.value);
    message.success('已新增子分類');
  }
  addingChildParentId.value = null;
  newChildCategoryName.value = '';
}

// 取消新增子分類
function cancelAddChild() {
  addingChildParentId.value = null;
  newChildCategoryName.value = '';
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
  padding-top: 40px;
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

/* 展開/收合按鈕 */
.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 2px;
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

/* 拖曳把手 */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  color: var(--text-muted);
  cursor: grab;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.category-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

/* 拖曳中的幽靈樣式 */
.ghost {
  opacity: 0.5;
  background-color: var(--accent-soft);
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

/* 子分類容器 */
.child-categories {
  padding-left: var(--spacing-md);
}

.child-category {
  padding-left: var(--spacing-sm);
}

.child-indent {
  width: 8px;
  min-width: 8px;
}

.child-icon {
  width: 20px;
  height: 20px;
}

.empty-children {
  padding: var(--spacing-xs) var(--spacing-lg);
  color: var(--text-muted);
  font-size: 12px;
}

/* 新增子分類按鈕 */
.add-child-btn {
  opacity: 0;
  padding: 4px;
  margin-left: var(--spacing-xs);
  color: var(--text-muted);
  transition: all var(--transition-fast);
  border-radius: var(--radius-sm);
}

.category-item:hover .add-child-btn {
  opacity: 1;
}

.add-child-btn:hover {
  color: var(--accent);
  background-color: var(--accent-soft);
}

/* 刪除按鈕 */
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

/* 新增子分類輸入框 */
.add-child-input-wrapper {
  padding: var(--spacing-xs) var(--spacing-sm);
  padding-left: calc(var(--spacing-lg) + 8px);
}

.add-child-input {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--bg-elevated);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
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
