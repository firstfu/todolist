# TodoList 桌面應用設計文件

> 建立日期：2026-01-21
> 技術棧：Electron + Vue 3 + Naive UI + TypeScript
> 資料儲存：本機 JSON 檔案

---

## 1. 整體架構

### 技術架構

```
todolist/
├── src/
│   ├── main/                # Electron 主進程
│   │   ├── main.ts          # 應用入口
│   │   └── store.ts         # JSON 檔案讀寫
│   ├── preload/             # 預載腳本
│   │   └── preload.ts       # 暴露 API 給渲染進程
│   └── renderer/            # Vue 前端
│       ├── App.vue
│       ├── components/
│       │   ├── Sidebar.vue      # 左側分類欄
│       │   ├── TodoList.vue     # 待辦清單
│       │   └── TodoItem.vue     # 單一項目（含子任務）
│       └── stores/
│           └── todoStore.ts     # Pinia 狀態管理
├── data/
│   └── todos.json           # 資料檔案（自動建立）
```

### 資料流

1. **啟動時**：主進程讀取 `todos.json` → 傳給渲染進程
2. **操作時**：Vue 更新狀態 → 通知主進程 → 寫入 JSON 檔案
3. **使用 IPC 通訊**：渲染進程透過 `contextBridge` 呼叫主進程的檔案操作

---

## 2. 資料結構

### JSON 檔案格式 (`todos.json`)

```json
{
  "categories": [
    {
      "id": "cat-1",
      "name": "工作",
      "order": 0
    },
    {
      "id": "cat-2",
      "name": "個人",
      "order": 1
    }
  ],
  "todos": [
    {
      "id": "todo-1",
      "categoryId": "cat-1",
      "title": "完成報告",
      "completed": false,
      "createdAt": "2026-01-21T10:00:00Z",
      "completedAt": null,
      "order": 0,
      "children": [
        {
          "id": "todo-1-1",
          "title": "收集資料",
          "completed": true,
          "completedAt": "2026-01-21T11:00:00Z",
          "order": 0
        },
        {
          "id": "todo-1-2",
          "title": "撰寫初稿",
          "completed": false,
          "completedAt": null,
          "order": 1
        }
      ]
    }
  ]
}
```

### 欄位說明

- **id**：使用時間戳 + 隨機數產生唯一識別碼
- **order**：用於自訂排序，數字越小越前面
- **children**：子任務陣列，最多一層（不會有 children 的 children）
- **completedAt**：記錄完成時間，方便「已完成」排序

---

## 3. UI 介面設計

### 設計理念：「墨夜書房」

靈感來自日式文具與夜間閱讀的氛圍，結合：
- **深邃墨色背景**：不是純黑，而是帶有微妙藍調的墨色
- **暖琥珀強調色**：完成狀態與互動反饋使用琥珀金
- **柔和的層次感**：卡片使用深灰，懸浮時微微發光

### 色彩系統

```css
:root {
  /* 背景層次 */
  --bg-deep: #0d1117;        /* 最底層 - 墨夜 */
  --bg-surface: #161b22;     /* 卡片/側邊欄 */
  --bg-elevated: #21262d;    /* 懸浮/選中狀態 */

  /* 文字層次 */
  --text-primary: #e6edf3;   /* 主要文字 */
  --text-secondary: #7d8590; /* 次要文字 */
  --text-muted: #484f58;     /* 禁用/提示 */

  /* 強調色 */
  --accent: #f0b429;         /* 琥珀金 - 完成、重點 */
  --accent-soft: rgba(240, 180, 41, 0.15);

  /* 狀態色 */
  --border: #30363d;
  --hover-glow: rgba(240, 180, 41, 0.08);
}
```

### 字體選擇

```css
/* 標題 - 使用 Noto Serif TC 帶出書房質感 */
font-family: 'Noto Serif TC', serif;

/* 內文 - 使用 Noto Sans TC 保持可讀性 */
font-family: 'Noto Sans TC', sans-serif;

/* 數字/計數 - 使用等寬字體 */
font-family: 'JetBrains Mono', monospace;
```

### 佈局設計

```
┌────────────────────────────────────────────────────────────┐
│ ▫▫▫                                                        │
├─────────────────┬──────────────────────────────────────────┤
│                 │                                          │
│   所 有 任 務   │    工 作                      排序 ▾    │
│        ⁵       │   ─────────────────────────────────────  │
│                 │                                          │
│   ✓ 已 完 成   │    ▸ ○ 完成專案報告                      │
│        ³       │        ○ 收集數據資料                    │
│                 │        ● 撰寫分析結論 ─────── ✓         │
│  ───────────── │                                          │
│                 │    ○ 準備週會簡報                        │
│   ▪ 工作    ³  │                                          │
│   ▪ 個人    ²  │    ○ 回覆客戶郵件                        │
│                 │                                          │
│                 │   ┌──────────────────────────────────┐  │
│                 │   │  ＋ 新增待辦事項...               │  │
│  ＋ 新增分類   │   └──────────────────────────────────┘  │
│                 │                                          │
└─────────────────┴──────────────────────────────────────────┘
```

### 互動設計

| 元素 | 預設狀態 | Hover 狀態 | Active 狀態 |
|------|---------|-----------|-------------|
| 待辦項目 | `bg-surface` | 左側出現 2px 琥珀邊框 + 微光 | 背景變 `bg-elevated` |
| Checkbox | 空心圓 `border` | 圓圈變亮 | 填滿琥珀 + 打勾動畫 |
| 分類項目 | 普通文字 | 背景淡入 | 左側琥珀條 |
| 展開箭頭 | `▸` 灰色 | 變亮 | 旋轉 90° 變 `▾` |

### 動畫設計

```css
/* 完成任務時的滿足感動畫 */
@keyframes checkmark-pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 子任務展開 */
@keyframes slide-down {
  from { opacity: 0; height: 0; }
  to { opacity: 1; height: auto; }
}

/* 項目懸浮時的微光效果 */
.todo-item:hover {
  box-shadow: inset 3px 0 0 var(--accent),
              0 0 20px var(--hover-glow);
}
```

---

## 4. 元件結構

### Vue 元件樹

```
App.vue
├── Sidebar.vue          # 左側分類欄
│   ├── SmartList        # 智慧清單（所有任務、已完成）
│   └── CategoryList     # 自訂分類列表
│       └── CategoryItem # 單一分類項目
│
└── MainPanel.vue        # 右側主面板
    ├── PanelHeader      # 標題 + 排序下拉
    ├── TodoList.vue     # 待辦清單容器
    │   └── TodoItem.vue # 單一待辦項目（遞迴渲染子任務）
    └── TodoInput.vue    # 新增待辦輸入框
```

### 核心元件說明

**1. TodoItem.vue** - 最複雜的元件

```vue
<template>
  <div class="todo-item" :class="{ completed: todo.completed }">
    <!-- 展開/收合箭頭（有子任務時顯示） -->
    <span v-if="hasChildren" class="expand-toggle" @click="toggleExpand">
      {{ expanded ? '▾' : '▸' }}
    </span>
    <span v-else class="expand-placeholder"></span>

    <!-- Checkbox -->
    <div class="checkbox" @click="toggleComplete">
      <span v-if="todo.completed" class="checkmark">✓</span>
    </div>

    <!-- 標題（可雙擊編輯） -->
    <span class="title" @dblclick="startEdit">{{ todo.title }}</span>

    <!-- 刪除按鈕（hover 時顯示） -->
    <button class="delete-btn">✕</button>
  </div>

  <!-- 子任務（展開時顯示） -->
  <div v-if="expanded && hasChildren" class="children">
    <TodoItem v-for="child in todo.children" :key="child.id" :todo="child" />
    <TodoInput placeholder="新增子任務..." :parent-id="todo.id" />
  </div>
</template>
```

**2. Sidebar.vue** - 分類管理

- 頂部：固定的「所有任務」和「已完成」
- 分隔線
- 下方：可拖曳排序的自訂分類
- 底部：「+ 新增分類」按鈕

**3. TodoInput.vue** - 新增輸入框

- 按 Enter 新增
- 按 Escape 取消
- 支援在子任務層級新增

---

## 5. 功能流程與錯誤處理

### 主要操作流程

**1. 新增待辦**

```
用戶輸入文字 → 按 Enter
    ↓
產生唯一 ID (時間戳 + 隨機數)
    ↓
加入 todoStore 狀態
    ↓
透過 IPC 通知主進程
    ↓
主進程寫入 todos.json
    ↓
顯示新項目（淡入動畫）
```

**2. 標記完成**

```
點擊 Checkbox
    ↓
更新 completed = true, completedAt = now
    ↓
播放打勾動畫
    ↓
如有子任務，詢問是否一併完成
    ↓
同步到 JSON 檔案
```

**3. 排序功能**

| 排序選項 | 邏輯 |
|---------|------|
| 建立時間（新→舊） | `createdAt` 降序 |
| 建立時間（舊→新） | `createdAt` 升序 |
| 名稱（A→Z） | `title` 字母排序 |
| 完成狀態 | 未完成優先，已完成置底 |
| 自訂排序 | 依 `order` 欄位（支援拖曳） |

### 錯誤處理

| 情境 | 處理方式 |
|------|---------|
| JSON 檔案不存在 | 自動建立預設結構 |
| JSON 格式損壞 | 備份損壞檔案，建立新檔案，提示用戶 |
| 寫入失敗 | 顯示錯誤通知，保留記憶體狀態，稍後重試 |
| 分類名稱重複 | 輸入框標紅，提示「分類名稱已存在」 |
| 刪除有任務的分類 | 彈出確認對話框，詢問是否一併刪除任務 |

### 快捷鍵

| 快捷鍵 | 功能 |
|-------|------|
| `Ctrl + N` | 新增待辦 |
| `Ctrl + Enter` | 快速完成當前項目 |
| `Delete` | 刪除選中項目 |
| `Esc` | 取消編輯 |

---

## 6. 功能清單總覽

### 核心功能

- [x] 分類清單（左側邊欄，可新增/刪除分類）
- [x] 新增待辦事項
- [x] 標記完成/未完成
- [x] 已完成項目可查看
- [x] 排序功能（依日期、名稱等）
- [x] 樹狀子任務（最多 2 層）

### 不包含的功能（簡化版）

- 星號標記（重要）
- 到期日設定
- 「我的一天」智慧清單
- 雲端同步
- 多裝置共用
