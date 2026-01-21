/**
 * Electron API 型別定義
 * 定義 window.electronAPI 的介面
 */

export interface SubTodo {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  order: number;
}

export interface Todo {
  id: string;
  categoryId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  dueDate: string | null;  // 到期日，格式：YYYY-MM-DD
  order: number;
  children: SubTodo[];
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface StoreData {
  categories: Category[];
  todos: Todo[];
}

export interface ElectronAPI {
  // 資料操作
  getData: () => Promise<StoreData>;
  saveData: (data: StoreData) => Promise<boolean>;

  // 分類操作
  addCategory: (name: string) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  updateCategory: (id: string, name: string) => Promise<boolean>;

  // 待辦操作
  addTodo: (categoryId: string, title: string, parentId?: string) => Promise<Todo | SubTodo | null>;
  updateTodo: (id: string, updates: Partial<Todo | SubTodo>) => Promise<boolean>;
  deleteTodo: (id: string) => Promise<boolean>;

  // 排序操作
  updateOrder: (type: 'categories' | 'todos', items: Array<{id: string, order: number}>) => Promise<boolean>;

  // 移動任務
  moveTodoToCategory: (todoId: string, newCategoryId: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
