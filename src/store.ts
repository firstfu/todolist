/**
 * 資料儲存模組
 * 處理 JSON 檔案的讀寫操作
 */
import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

// 型別定義
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
  parentId: string | null;  // null = 根分類，有值 = 子分類
}

export interface StoreData {
  categories: Category[];
  todos: Todo[];
}

// 預設資料
const defaultData: StoreData = {
  categories: [
    { id: 'cat-default-1', name: '工作', order: 0, parentId: null },
    { id: 'cat-default-2', name: '個人', order: 1, parentId: null },
  ],
  todos: [],
};

/**
 * 產生唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * TodoStore 類別
 * 負責管理待辦事項的持久化儲存
 */
export class TodoStore {
  private dataPath: string;
  private data: StoreData;

  constructor() {
    // 資料檔案路徑：使用者資料目錄/todolist/todos.json
    const userDataPath = app.getPath('userData');
    this.dataPath = path.join(userDataPath, 'todos.json');
    this.data = this.loadData();
  }

  /**
   * 載入資料
   */
  private loadData(): StoreData {
    try {
      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf-8');
        const data = JSON.parse(content) as StoreData;
        // 驗證資料結構
        if (Array.isArray(data.categories) && Array.isArray(data.todos)) {
          return data;
        }
      }
    } catch (error) {
      console.error('載入資料失敗，使用預設值:', error);
      // 備份損壞的檔案
      if (fs.existsSync(this.dataPath)) {
        const backupPath = this.dataPath.replace('.json', `-backup-${Date.now()}.json`);
        fs.copyFileSync(this.dataPath, backupPath);
      }
    }
    // 回傳預設資料並儲存
    this.saveToFile(defaultData);
    return { ...defaultData };
  }

  /**
   * 儲存到檔案
   */
  private saveToFile(data: StoreData): boolean {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('儲存資料失敗:', error);
      return false;
    }
  }

  /**
   * 取得所有資料
   */
  getData(): StoreData {
    return { ...this.data };
  }

  /**
   * 儲存所有資料
   */
  saveData(data: StoreData): boolean {
    this.data = data;
    return this.saveToFile(data);
  }

  /**
   * 新增分類
   * @param name 分類名稱
   * @param parentId 父分類 ID（null 表示根分類）
   */
  addCategory(name: string, parentId: string | null = null): Category | null {
    // 檢查父分類是否存在（如果指定了 parentId）
    if (parentId) {
      const parentCategory = this.data.categories.find(c => c.id === parentId);
      if (!parentCategory) return null;
      // 檢查父分類本身不能是子分類（限制 2 層）
      if (parentCategory.parentId !== null) return null;
    }

    // 計算同層級的 order
    const siblings = this.data.categories.filter(c => c.parentId === parentId);
    const newCategory: Category = {
      id: generateId('cat'),
      name,
      order: siblings.length,
      parentId,
    };
    this.data.categories.push(newCategory);
    this.saveToFile(this.data);
    return newCategory;
  }

  /**
   * 刪除分類（包含子分類和相關任務）
   */
  deleteCategory(id: string): boolean {
    const category = this.data.categories.find(c => c.id === id);
    if (!category) return false;

    // 收集要刪除的分類 ID（包含自己和所有子分類）
    const categoryIdsToDelete = [id];
    const childCategories = this.data.categories.filter(c => c.parentId === id);
    for (const child of childCategories) {
      categoryIdsToDelete.push(child.id);
    }

    // 刪除分類
    this.data.categories = this.data.categories.filter(
      c => !categoryIdsToDelete.includes(c.id)
    );
    // 刪除相關任務
    this.data.todos = this.data.todos.filter(
      t => !categoryIdsToDelete.includes(t.categoryId)
    );

    this.saveToFile(this.data);
    return true;
  }

  /**
   * 更新分類
   */
  updateCategory(id: string, name: string): boolean {
    const category = this.data.categories.find(c => c.id === id);
    if (!category) return false;

    category.name = name;
    this.saveToFile(this.data);
    return true;
  }

  /**
   * 新增待辦
   */
  addTodo(categoryId: string, title: string, parentId?: string): Todo | SubTodo | null {
    if (parentId) {
      // 新增子任務
      const parentTodo = this.data.todos.find(t => t.id === parentId);
      if (!parentTodo) return null;

      const newSubTodo: SubTodo = {
        id: generateId('sub'),
        title,
        completed: false,
        completedAt: null,
        order: parentTodo.children.length,
      };
      parentTodo.children.push(newSubTodo);
      this.saveToFile(this.data);
      return newSubTodo;
    }

    // 新增主任務
    const newTodo: Todo = {
      id: generateId('todo'),
      categoryId,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      dueDate: null,
      order: this.data.todos.filter(t => t.categoryId === categoryId).length,
      children: [],
    };
    this.data.todos.push(newTodo);
    this.saveToFile(this.data);
    return newTodo;
  }

  /**
   * 更新待辦
   */
  updateTodo(id: string, updates: Partial<Todo | SubTodo>): boolean {
    // 先找主任務
    const todo = this.data.todos.find(t => t.id === id);
    if (todo) {
      Object.assign(todo, updates);
      if (updates.completed === true && !todo.completedAt) {
        todo.completedAt = new Date().toISOString();
      } else if (updates.completed === false) {
        todo.completedAt = null;
      }
      this.saveToFile(this.data);
      return true;
    }

    // 找子任務
    for (const parentTodo of this.data.todos) {
      const subTodo = parentTodo.children.find(c => c.id === id);
      if (subTodo) {
        Object.assign(subTodo, updates);
        if (updates.completed === true && !subTodo.completedAt) {
          subTodo.completedAt = new Date().toISOString();
        } else if (updates.completed === false) {
          subTodo.completedAt = null;
        }
        this.saveToFile(this.data);
        return true;
      }
    }

    return false;
  }

  /**
   * 刪除待辦
   */
  deleteTodo(id: string): boolean {
    // 先找主任務
    const index = this.data.todos.findIndex(t => t.id === id);
    if (index !== -1) {
      this.data.todos.splice(index, 1);
      this.saveToFile(this.data);
      return true;
    }

    // 找子任務
    for (const parentTodo of this.data.todos) {
      const subIndex = parentTodo.children.findIndex(c => c.id === id);
      if (subIndex !== -1) {
        parentTodo.children.splice(subIndex, 1);
        this.saveToFile(this.data);
        return true;
      }
    }

    return false;
  }

  /**
   * 移動任務到其他分類
   */
  moveTodoToCategory(todoId: string, newCategoryId: string): boolean {
    const todo = this.data.todos.find(t => t.id === todoId);
    if (!todo) return false;

    // 更新分類 ID
    todo.categoryId = newCategoryId;
    // 重新計算 order（放到新分類的最後面）
    todo.order = this.data.todos.filter(t => t.categoryId === newCategoryId && t.id !== todoId).length;

    this.saveToFile(this.data);
    return true;
  }

  /**
   * 更新排序
   */
  updateOrder(type: 'categories' | 'todos', items: Array<{id: string, order: number}>): boolean {
    if (type === 'categories') {
      for (const item of items) {
        const category = this.data.categories.find(c => c.id === item.id);
        if (category) {
          category.order = item.order;
        }
      }
    } else {
      for (const item of items) {
        const todo = this.data.todos.find(t => t.id === item.id);
        if (todo) {
          todo.order = item.order;
        }
      }
    }
    this.saveToFile(this.data);
    return true;
  }

  /**
   * 取得分類及其所有子分類的 ID 列表
   * 用於任務篩選（選擇父分類時要顯示所有子分類的任務）
   */
  getCategoryWithChildrenIds(categoryId: string): string[] {
    const ids = [categoryId];
    const children = this.data.categories.filter(c => c.parentId === categoryId);
    for (const child of children) {
      ids.push(child.id);
    }
    return ids;
  }
}
