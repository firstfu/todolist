/**
 * Pinia 狀態管理
 * 管理待辦事項與分類的狀態
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Category, Todo, SubTodo, StoreData } from '../types/electron';

// 排序類型
export type SortType = 'createdAt-desc' | 'createdAt-asc' | 'title' | 'completed' | 'custom';

// 特殊視圖 ID
export const SMART_LIST = {
  ALL: '__all__',
  COMPLETED: '__completed__',
} as const;

export const useTodoStore = defineStore('todo', () => {
  // 狀態
  const categories = ref<Category[]>([]);
  const todos = ref<Todo[]>([]);
  const selectedCategoryId = ref<string>(SMART_LIST.ALL);
  const sortType = ref<SortType>('custom');
  const isLoading = ref(true);
  const expandedTodos = ref<Set<string>>(new Set());

  // 計算屬性：已排序的分類
  const sortedCategories = computed(() => {
    return [...categories.value].sort((a, b) => a.order - b.order);
  });

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
      // 特定分類的任務
      filtered = todos.value.filter(t => t.categoryId === selectedCategoryId.value);
    }

    // 排序
    return sortTodos(filtered, sortType.value);
  });

  // 計算屬性：各分類的任務數量
  const categoryTodoCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const category of categories.value) {
      counts[category.id] = todos.value.filter(
        t => t.categoryId === category.id && !t.completed
      ).length;
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

  // 新增分類
  async function addCategory(name: string) {
    const result = await window.electronAPI.addCategory(name);
    if (result) {
      categories.value.push(result);
    }
    return result;
  }

  // 刪除分類
  async function deleteCategory(id: string) {
    const success = await window.electronAPI.deleteCategory(id);
    if (success) {
      categories.value = categories.value.filter(c => c.id !== id);
      todos.value = todos.value.filter(t => t.categoryId !== id);
      if (selectedCategoryId.value === id) {
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

  return {
    // 狀態
    categories,
    todos,
    selectedCategoryId,
    sortType,
    isLoading,

    // 計算屬性
    sortedCategories,
    currentTodos,
    categoryTodoCounts,
    allTodoCount,
    completedTodoCount,

    // 方法
    loadData,
    selectCategory,
    setSortType,
    addCategory,
    deleteCategory,
    updateCategory,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleExpand,
    isExpanded,
  };
});
