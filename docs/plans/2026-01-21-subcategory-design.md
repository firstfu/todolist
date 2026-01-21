# 子分類功能設計方案

## 概述
為 TodoList 應用新增子分類功能，讓使用者能更好地組織分類，支援最多 2 層的樹狀結構。

## 資料結構

### Category 介面變更
```typescript
export interface Category {
  id: string;
  name: string;
  order: number;
  parentId: string | null;  // 新增：null = 根分類，有值 = 子分類
}
```

### 範例資料
```json
[
  { "id": "cat-1", "name": "工作", "parentId": null, "order": 0 },
  { "id": "cat-2", "name": "專案 A", "parentId": "cat-1", "order": 0 },
  { "id": "cat-3", "name": "專案 B", "parentId": "cat-1", "order": 1 },
  { "id": "cat-4", "name": "個人", "parentId": null, "order": 1 }
]
```

## UI 設計

### 側邊欄顯示
```
智慧清單
  所有任務 (12)
  已完成 (5)
──────────────
▼ 工作                    (8)   ← 父分類，可展開/收合
    專案 A                (3)   ← 子分類，縮排顯示
    專案 B                (5)
▶ 個人                    (4)   ← 收合狀態
購物清單                  (2)   ← 無子分類的根分類
```

### 互動行為
- 點擊 ▼/▶ 圖示 → 展開/收合子分類
- 點擊父分類名稱 → 顯示該分類及所有子分類的任務
- 點擊子分類名稱 → 只顯示該子分類的任務
- 父分類旁的數字 = 所有子分類任務數量總和

## 業務邏輯

### 任務篩選
| 選擇的分類 | 顯示的任務 |
|-----------|-----------|
| 所有任務 | 全部未完成任務 |
| 父分類（工作） | 工作 + 專案A + 專案B 的任務 |
| 子分類（專案A） | 只有專案A 的任務 |

### 新增任務
- 選中子分類 → 任務加入該子分類
- 選中父分類 → 任務加入父分類本身
- 選中智慧清單 → 加入第一個根分類

### 刪除分類
- 刪除子分類 → 該子分類的任務一併刪除
- 刪除父分類 → 子分類和所有任務都會刪除

### 拖曳排序
- 根分類之間可互相拖曳排序
- 子分類只能在同一父分類內排序

## 需要修改的檔案
1. `src/store.ts` - 資料結構、新增/刪除邏輯
2. `src/preload.ts` - API 參數調整
3. `src/main.ts` - IPC handler 調整
4. `src/renderer/types/electron.d.ts` - 型別定義
5. `src/renderer/stores/todoStore.ts` - 篩選邏輯、計算屬性
6. `src/renderer/components/Sidebar.vue` - UI 大幅修改
