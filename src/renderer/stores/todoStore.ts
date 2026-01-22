/**
 * Pinia 狀態管理
 * 管理待辦事項與分類的狀態
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Category, Todo, SubTodo, StoreData } from '../types/electron';

// 排序類型
export type SortType = 'createdAt-desc' | 'createdAt-asc' | 'title' | 'completed' | 'dueDate' | 'custom';

// 視圖類型
export type ViewType = 'list' | 'calendar';

// 特殊視圖 ID
export const SMART_LIST = {
  ALL: '__all__',
  COMPLETED: '__completed__',
} as const;

/**
 * 格式化到期日顯示
 * 7 天內：「今天」、「明天」、「後天」、「週X」
 * 7 天後：「1/25」或「1月25日」
 * 過期：紅色標示
 */
export function formatDueDate(dueDate: string | null): { text: string; status: 'overdue' | 'today' | 'soon' | 'normal' | null } {
  if (!dueDate) return { text: '', status: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  if (diffDays < 0) {
    // 已過期
    const overdueDays = Math.abs(diffDays);
    return { text: `已過期 ${overdueDays} 天`, status: 'overdue' };
  } else if (diffDays === 0) {
    return { text: '今天', status: 'today' };
  } else if (diffDays === 1) {
    return { text: '明天', status: 'soon' };
  } else if (diffDays === 2) {
    return { text: '後天', status: 'soon' };
  } else if (diffDays <= 7) {
    return { text: weekdays[due.getDay()], status: 'normal' };
  } else {
    // 超過 7 天
    const month = due.getMonth() + 1;
    const day = due.getDate();
    return { text: `${month}/${day}`, status: 'normal' };
  }
}

/**
 * 格式化建立時間顯示
 * 今天：「今天」
 * 昨天：「昨天」
 * 7 天內：「X 天前」
 * 超過 7 天：「1/15」
 */
export function formatCreatedAt(createdAt: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const created = new Date(createdAt);
  created.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays <= 7) {
    return `${diffDays} 天前`;
  } else {
    const month = created.getMonth() + 1;
    const day = created.getDate();
    return `${month}/${day}`;
  }
}

export const useTodoStore = defineStore('todo', () => {
  // 狀態
  const categories = ref<Category[]>([]);
  const todos = ref<Todo[]>([]);
  const selectedCategoryId = ref<string>(SMART_LIST.ALL);
  const sortType = ref<SortType>('custom');
  const isLoading = ref(true);
  const expandedTodos = ref<Set<string>>(new Set());
  const expandedCategories = ref<Set<string>>(new Set());  // 展開的分類
  const sidebarVisible = ref(true);  // 側邊欄是否顯示
  const viewType = ref<ViewType>('list');  // 視圖類型：列表或日曆
  const selectedDate = ref<string | null>(null);  // 日曆選中的日期

  // 計算屬性：根分類（已排序）
  const rootCategories = computed(() => {
    return categories.value
      .filter(c => c.parentId === null)
      .sort((a, b) => a.order - b.order);
  });

  // 計算屬性：取得某分類的子分類（已排序）
  function getChildCategories(parentId: string): Category[] {
    return categories.value
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  // 計算屬性：已排序的分類（扁平化，用於向後兼容）
  const sortedCategories = computed(() => {
    return [...categories.value].sort((a, b) => a.order - b.order);
  });

  // 計算屬性：取得分類及其子分類的所有 ID
  function getCategoryWithChildrenIds(categoryId: string): string[] {
    const ids = [categoryId];
    const children = categories.value.filter(c => c.parentId === categoryId);
    for (const child of children) {
      ids.push(child.id);
    }
    return ids;
  }

  // 計算屬性：當前顯示的待辦
  const currentTodos = computed(() => {
    let filtered: Todo[];

    if (selectedCategoryId.value === SMART_LIST.ALL) {
      // 所有未完成的任務
      filtered = todos.value.filter(t => !t.completed);
    } else if (selectedCategoryId.value === SMART_LIST.COMPLETED) {
      // 所有已完成的任務
      filtered = todos.value.filter(t => t.completed);
    } else {
      // 特定分類的任務（包含子分類）
      const categoryIds = getCategoryWithChildrenIds(selectedCategoryId.value);
      filtered = todos.value.filter(t => categoryIds.includes(t.categoryId));
    }

    // 排序
    return sortTodos(filtered, sortType.value);
  });

  // 計算屬性：各分類的任務數量（父分類包含子分類的數量）
  const categoryTodoCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const category of categories.value) {
      if (category.parentId === null) {
        // 父分類：計算自己 + 所有子分類的任務
        const categoryIds = getCategoryWithChildrenIds(category.id);
        counts[category.id] = todos.value.filter(
          t => categoryIds.includes(t.categoryId) && !t.completed
        ).length;
      } else {
        // 子分類：只計算自己的任務
        counts[category.id] = todos.value.filter(
          t => t.categoryId === category.id && !t.completed
        ).length;
      }
    }
    return counts;
  });

  // 計算屬性：所有未完成任務數量
  const allTodoCount = computed(() => {
    return todos.value.filter(t => !t.completed).length;
  });

  // 計算屬性：已完成任務數量
  const completedTodoCount = computed(() => {
    return todos.value.filter(t => t.completed).length;
  });

  // 計算屬性：按日期分組任務（用於日曆視圖）
  const todosByDateMap = computed(() => {
    const map: Record<string, Todo[]> = {};

    // 根據當前選擇的分類篩選任務
    let filtered: Todo[];
    if (selectedCategoryId.value === SMART_LIST.ALL) {
      filtered = todos.value;
    } else if (selectedCategoryId.value === SMART_LIST.COMPLETED) {
      filtered = todos.value.filter(t => t.completed);
    } else {
      const categoryIds = getCategoryWithChildrenIds(selectedCategoryId.value);
      filtered = todos.value.filter(t => categoryIds.includes(t.categoryId));
    }

    // 只處理有到期日的任務
    for (const todo of filtered) {
      if (todo.dueDate) {
        const dateKey = todo.dueDate.split('T')[0];  // 取得 YYYY-MM-DD
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push(todo);
      }
    }

    return map;
  });

  // 計算屬性：選中日期的任務
  const selectedDateTodos = computed(() => {
    if (!selectedDate.value) return [];
    return todosByDateMap.value[selectedDate.value] || [];
  });

  // 排序函數
  function sortTodos(list: Todo[], type: SortType): Todo[] {
    const sorted = [...list];
    switch (type) {
      case 'createdAt-desc':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'createdAt-asc':
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'));
        break;
      case 'completed':
        sorted.sort((a, b) => {
          if (a.completed === b.completed) return a.order - b.order;
          return a.completed ? 1 : -1;
        });
        break;
      case 'dueDate':
        sorted.sort((a, b) => {
          // 沒有到期日的排最後
          if (!a.dueDate && !b.dueDate) return a.order - b.order;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case 'custom':
      default:
        sorted.sort((a, b) => a.order - b.order);
    }
    return sorted;
  }

  // 載入資料
  async function loadData() {
    isLoading.value = true;
    try {
      const data: StoreData = await window.electronAPI.getData();
      categories.value = data.categories;
      todos.value = data.todos;
    } catch (error) {
      console.error('載入資料失敗:', error);
    } finally {
      isLoading.value = false;
    }
  }

  // 選擇分類
  function selectCategory(id: string) {
    selectedCategoryId.value = id;
  }

  // 設定排序類型
  function setSortType(type: SortType) {
    sortType.value = type;
  }

  // 新增分類（支援子分類）
  async function addCategory(name: string, parentId?: string) {
    const result = await window.electronAPI.addCategory(name, parentId);
    if (result) {
      categories.value.push(result);
    }
    return result;
  }

  // 刪除分類（包含子分類）
  async function deleteCategory(id: string) {
    const success = await window.electronAPI.deleteCategory(id);
    if (success) {
      // 收集要刪除的分類 ID（包含子分類）
      const categoryIdsToDelete = getCategoryWithChildrenIds(id);

      categories.value = categories.value.filter(
        c => !categoryIdsToDelete.includes(c.id)
      );
      todos.value = todos.value.filter(
        t => !categoryIdsToDelete.includes(t.categoryId)
      );
      if (categoryIdsToDelete.includes(selectedCategoryId.value)) {
        selectedCategoryId.value = SMART_LIST.ALL;
      }
    }
    return success;
  }

  // 更新分類
  async function updateCategory(id: string, name: string) {
    const success = await window.electronAPI.updateCategory(id, name);
    if (success) {
      const category = categories.value.find(c => c.id === id);
      if (category) {
        category.name = name;
      }
    }
    return success;
  }

  // 更新分類排序
  async function updateCategoryOrder(items: Array<{id: string, order: number}>) {
    const success = await window.electronAPI.updateOrder('categories', items);
    if (success) {
      // 更新本地狀態
      for (const item of items) {
        const category = categories.value.find(c => c.id === item.id);
        if (category) {
          category.order = item.order;
        }
      }
    }
    return success;
  }

  // 更新任務排序
  async function updateTodoOrder(items: Array<{id: string, order: number}>) {
    const success = await window.electronAPI.updateOrder('todos', items);
    if (success) {
      // 更新本地狀態
      for (const item of items) {
        const todo = todos.value.find(t => t.id === item.id);
        if (todo) {
          todo.order = item.order;
        }
      }
    }
    return success;
  }

  // 移動任務到其他分類
  async function moveTodoToCategory(todoId: string, newCategoryId: string) {
    const success = await window.electronAPI.moveTodoToCategory(todoId, newCategoryId);
    if (success) {
      const todo = todos.value.find(t => t.id === todoId);
      if (todo) {
        todo.categoryId = newCategoryId;
      }
    }
    return success;
  }

  // 新增待辦
  async function addTodo(title: string, parentId?: string) {
    try {
      // 決定要加入哪個分類
      let categoryId = selectedCategoryId.value;
      if (categoryId === SMART_LIST.ALL || categoryId === SMART_LIST.COMPLETED) {
        // 如果在智慧清單，加入第一個分類
        categoryId = categories.value[0]?.id || '';
      }

      if (!categoryId) {
        console.error('無法新增任務：找不到分類');
        return null;
      }

      console.log('新增任務:', { categoryId, title, parentId });
      const result = await window.electronAPI.addTodo(categoryId, title, parentId);
      console.log('新增結果:', result);

      if (result) {
        if (parentId) {
          // 子任務
          const parentTodo = todos.value.find(t => t.id === parentId);
          if (parentTodo) {
            parentTodo.children.push(result as SubTodo);
          }
        } else {
          // 主任務
          todos.value.push(result as Todo);
        }
      }
      return result;
    } catch (error) {
      console.error('新增任務失敗:', error);
      return null;
    }
  }

  // 更新待辦
  async function updateTodo(id: string, updates: Partial<Todo | SubTodo>) {
    const success = await window.electronAPI.updateTodo(id, updates);
    if (success) {
      // 更新本地狀態
      const todo = todos.value.find(t => t.id === id);
      if (todo) {
        Object.assign(todo, updates);
        if (updates.completed === true && !todo.completedAt) {
          todo.completedAt = new Date().toISOString();
        } else if (updates.completed === false) {
          todo.completedAt = null;
        }
      } else {
        // 找子任務
        for (const parentTodo of todos.value) {
          const subTodo = parentTodo.children.find(c => c.id === id);
          if (subTodo) {
            Object.assign(subTodo, updates);
            if (updates.completed === true && !subTodo.completedAt) {
              subTodo.completedAt = new Date().toISOString();
            } else if (updates.completed === false) {
              subTodo.completedAt = null;
            }
            break;
          }
        }
      }
    }
    return success;
  }

  // 刪除待辦
  async function deleteTodo(id: string) {
    const success = await window.electronAPI.deleteTodo(id);
    if (success) {
      // 先檢查是否為主任務
      const index = todos.value.findIndex(t => t.id === id);
      if (index !== -1) {
        todos.value.splice(index, 1);
      } else {
        // 檢查子任務
        for (const parentTodo of todos.value) {
          const subIndex = parentTodo.children.findIndex(c => c.id === id);
          if (subIndex !== -1) {
            parentTodo.children.splice(subIndex, 1);
            break;
          }
        }
      }
    }
    return success;
  }

  // 切換展開/收合
  function toggleExpand(todoId: string) {
    if (expandedTodos.value.has(todoId)) {
      expandedTodos.value.delete(todoId);
    } else {
      expandedTodos.value.add(todoId);
    }
  }

  // 檢查是否展開
  function isExpanded(todoId: string): boolean {
    return expandedTodos.value.has(todoId);
  }

  // 切換分類展開/收合
  function toggleCategoryExpand(categoryId: string) {
    if (expandedCategories.value.has(categoryId)) {
      expandedCategories.value.delete(categoryId);
    } else {
      expandedCategories.value.add(categoryId);
    }
  }

  // 檢查分類是否展開
  function isCategoryExpanded(categoryId: string): boolean {
    return expandedCategories.value.has(categoryId);
  }

  // 檢查分類是否有子分類
  function hasChildCategories(categoryId: string): boolean {
    return categories.value.some(c => c.parentId === categoryId);
  }

  // 切換側邊欄顯示
  function toggleSidebar() {
    sidebarVisible.value = !sidebarVisible.value;
  }

  // 設定視圖類型
  function setViewType(type: ViewType) {
    viewType.value = type;
    // 切換視圖時清除選中日期
    if (type === 'list') {
      selectedDate.value = null;
    }
  }

  // 選擇日期（日曆視圖用）
  function selectDate(date: string | null) {
    selectedDate.value = date;
  }

  return {
    // 狀態
    categories,
    todos,
    selectedCategoryId,
    sortType,
    isLoading,
    viewType,
    selectedDate,

    // 計算屬性
    sortedCategories,
    rootCategories,
    currentTodos,
    categoryTodoCounts,
    allTodoCount,
    completedTodoCount,
    todosByDateMap,
    selectedDateTodos,

    // 方法
    loadData,
    selectCategory,
    setSortType,
    addCategory,
    deleteCategory,
    updateCategory,
    updateCategoryOrder,
    updateTodoOrder,
    moveTodoToCategory,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleExpand,
    isExpanded,
    getChildCategories,
    toggleCategoryExpand,
    isCategoryExpanded,
    hasChildCategories,
    sidebarVisible,
    toggleSidebar,
    setViewType,
    selectDate,
  };
});
