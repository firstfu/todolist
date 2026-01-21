/**
 * Preload 腳本
 * 透過 contextBridge 暴露安全的 API 給渲染進程
 */
import { contextBridge, ipcRenderer } from 'electron';

// 暴露 API 到 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // 資料操作
  getData: () => ipcRenderer.invoke('store:getData'),
  saveData: (data: unknown) => ipcRenderer.invoke('store:saveData', data),

  // 分類操作
  addCategory: (name: string) => ipcRenderer.invoke('store:addCategory', name),
  deleteCategory: (id: string) => ipcRenderer.invoke('store:deleteCategory', id),
  updateCategory: (id: string, name: string) => ipcRenderer.invoke('store:updateCategory', id, name),

  // 待辦操作
  addTodo: (categoryId: string, title: string, parentId?: string) =>
    ipcRenderer.invoke('store:addTodo', categoryId, title, parentId),
  updateTodo: (id: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke('store:updateTodo', id, updates),
  deleteTodo: (id: string) => ipcRenderer.invoke('store:deleteTodo', id),

  // 排序操作
  updateOrder: (type: 'categories' | 'todos', items: Array<{id: string, order: number}>) =>
    ipcRenderer.invoke('store:updateOrder', type, items),
});
