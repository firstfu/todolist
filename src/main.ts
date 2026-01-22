/**
 * Electron 主進程
 * 處理視窗建立、IPC 通訊與檔案系統操作
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { TodoStore } from './store';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 建立資料儲存實例
const store = new TodoStore();

const createWindow = () => {
  // 建立瀏覽器視窗
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 800,
    minHeight: 500,
    frame: false, // 無邊框視窗
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#272e38',
      symbolColor: '#969da5',
      height: 36,
    },
    backgroundColor: '#272e38',
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 載入應用
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // 開發模式下開啟 DevTools（Vite dev server 運行時）
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// 註冊 IPC 處理器
function registerIpcHandlers() {
  // 讀取所有資料
  ipcMain.handle('store:getData', async () => {
    return store.getData();
  });

  // 儲存所有資料
  ipcMain.handle('store:saveData', async (_event, data) => {
    return store.saveData(data);
  });

  // 新增分類（支援子分類）
  ipcMain.handle('store:addCategory', async (_event, name: string, parentId?: string) => {
    return store.addCategory(name, parentId || null);
  });

  // 刪除分類
  ipcMain.handle('store:deleteCategory', async (_event, id: string) => {
    return store.deleteCategory(id);
  });

  // 更新分類
  ipcMain.handle('store:updateCategory', async (_event, id: string, name: string) => {
    return store.updateCategory(id, name);
  });

  // 新增待辦
  ipcMain.handle('store:addTodo', async (_event, categoryId: string, title: string, parentId?: string) => {
    return store.addTodo(categoryId, title, parentId);
  });

  // 更新待辦
  ipcMain.handle('store:updateTodo', async (_event, id: string, updates: Record<string, unknown>) => {
    return store.updateTodo(id, updates);
  });

  // 刪除待辦
  ipcMain.handle('store:deleteTodo', async (_event, id: string) => {
    return store.deleteTodo(id);
  });

  // 更新排序
  ipcMain.handle('store:updateOrder', async (_event, type: 'categories' | 'todos', items: Array<{id: string, order: number}>) => {
    return store.updateOrder(type, items);
  });

  // 移動任務到其他分類
  ipcMain.handle('store:moveTodoToCategory', async (_event, todoId: string, newCategoryId: string) => {
    return store.moveTodoToCategory(todoId, newCategoryId);
  });

  // 取得分類及其子分類的 ID 列表
  ipcMain.handle('store:getCategoryWithChildrenIds', async (_event, categoryId: string) => {
    return store.getCategoryWithChildrenIds(categoryId);
  });
}

// 應用準備就緒
app.on('ready', () => {
  registerIpcHandlers();
  createWindow();
});

// 所有視窗關閉時退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS 點擊 dock 圖示時重新建立視窗
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
