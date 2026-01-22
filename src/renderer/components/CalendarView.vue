<!--
  CalendarView.vue - 日曆視圖元件
  使用 Naive UI NCalendar 顯示任務分布
  支援日期點擊展開任務列表

  UI/UX 優化：
  - 更大的點擊區域
  - 更明顯的任務指示點
  - 今日日期高亮顯示
  - 滑鼠懸停效果
  - 選中日期面板動畫
-->
<template>
  <div class="calendar-view">
    <!-- 日曆主體 -->
    <div class="calendar-container">
      <n-calendar
        v-model:value="calendarValue"
        #="{ year, month, date }"
        @update:value="handleDateSelect"
      >
        <!-- 可點擊的日期內容區域 -->
        <div
          class="calendar-cell-content"
          :class="{
            'is-selected': isSelected(year, month, date),
            'has-todos': hasTodos(year, month, date),
            'is-today': isToday(year, month, date),
          }"
          @click.stop="handleCellClick(year, month, date)"
        >
          <!-- 任務指示區 -->
          <div class="todo-indicator-area">
            <template v-if="hasTodos(year, month, date)">
              <div class="todo-indicators">
                <span
                  v-for="(indicator, index) in getIndicators(year, month, date)"
                  :key="index"
                  class="indicator-dot"
                  :class="indicator.status"
                ></span>
              </div>
              <span class="todo-count">{{ getTodoCount(year, month, date) }}</span>
            </template>
          </div>
        </div>
      </n-calendar>
    </div>

    <!-- 選中日期的任務列表 -->
    <Transition name="panel-slide">
      <div v-if="store.selectedDate" class="selected-date-panel">
        <div class="panel-header">
          <div class="panel-header-left">
            <div class="date-badge" :class="{ 'is-today': isSelectedDateToday }">
              <span class="date-day">{{ selectedDateDay }}</span>
              <span class="date-weekday">{{ selectedDateWeekday }}</span>
            </div>
            <div class="panel-title-area">
              <h3 class="panel-title">{{ selectedDateMonth }}月</h3>
              <span class="task-summary">{{ store.selectedDateTodos.length }} 個任務</span>
            </div>
          </div>
          <button class="close-panel-btn" @click="closePanel" title="關閉">
            <n-icon :component="CloseOutline" size="18" />
          </button>
        </div>

        <n-scrollbar class="panel-content">
          <div v-if="store.selectedDateTodos.length === 0" class="empty-state">
            <div class="empty-icon">
              <n-icon :component="CalendarOutline" size="40" />
            </div>
            <span class="empty-text">此日期沒有任務</span>
            <span class="empty-hint">點擊其他有標記的日期查看任務</span>
          </div>

          <div v-else class="task-list">
            <div
              v-for="todo in store.selectedDateTodos"
              :key="todo.id"
              class="task-item"
              :class="{
                completed: todo.completed,
                overdue: isOverdue(todo),
              }"
            >
              <!-- Checkbox -->
              <button
                class="task-checkbox"
                :class="{ checked: todo.completed }"
                @click="toggleComplete(todo)"
              >
                <span v-if="todo.completed" class="checkmark">
                  <n-icon :component="CheckmarkOutline" size="14" />
                </span>
              </button>

              <!-- 任務內容 -->
              <div class="task-content">
                <span class="task-title" :class="{ completed: todo.completed }">
                  {{ todo.title }}
                </span>
                <span class="task-category">{{ getCategoryName(todo.categoryId) }}</span>
              </div>

              <!-- 狀態標籤 -->
              <span v-if="isOverdue(todo) && !todo.completed" class="status-tag overdue">
                已過期
              </span>
              <span v-else-if="isTodayDue(todo) && !todo.completed" class="status-tag today">
                今天
              </span>
            </div>
          </div>
        </n-scrollbar>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * CalendarView 日曆視圖元件
 * 顯示月曆並標示有任務的日期
 *
 * 改進功能：
 * - 更好的日期點擊處理
 * - 今日日期判斷
 * - 任務數量顯示
 * - 更詳細的面板資訊
 */
import { ref, computed } from 'vue';
import { NCalendar, NIcon, NScrollbar } from 'naive-ui';
import { CloseOutline, CheckmarkOutline, CalendarOutline } from '@vicons/ionicons5';
import { useTodoStore } from '../stores/todoStore';
import type { Todo } from '../types/electron';

const store = useTodoStore();

// 日曆值（時間戳）
const calendarValue = ref<number>(Date.now());

// 格式化日期為 YYYY-MM-DD
function formatDateKey(year: number, month: number, date: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(date).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// 判斷是否為今天
function isToday(year: number, month: number, date: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === date
  );
}

// 判斷是否為選中日期
function isSelected(year: number, month: number, date: number): boolean {
  const dateKey = formatDateKey(year, month, date);
  return store.selectedDate === dateKey;
}

// 判斷該日期是否有任務
function hasTodos(year: number, month: number, date: number): boolean {
  const dateKey = formatDateKey(year, month, date);
  return !!store.todosByDateMap[dateKey]?.length;
}

// 取得該日期的任務數量
function getTodoCount(year: number, month: number, date: number): number {
  const dateKey = formatDateKey(year, month, date);
  return store.todosByDateMap[dateKey]?.length || 0;
}

// 取得該日期的指示點資訊（最多顯示 4 個）
function getIndicators(year: number, month: number, date: number): Array<{ status: string }> {
  const dateKey = formatDateKey(year, month, date);
  const todos = store.todosByDateMap[dateKey] || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(year, month - 1, date);
  targetDate.setHours(0, 0, 0, 0);

  const indicators: Array<{ status: string }> = [];

  // 最多顯示 4 個指示點
  for (const todo of todos.slice(0, 4)) {
    if (todo.completed) {
      indicators.push({ status: 'completed' });
    } else if (targetDate < today) {
      indicators.push({ status: 'overdue' });
    } else {
      indicators.push({ status: 'pending' });
    }
  }

  return indicators;
}

// 處理格子點擊（直接處理，不依賴 NCalendar 的事件）
function handleCellClick(year: number, month: number, date: number) {
  const dateKey = formatDateKey(year, month, date);

  // 更新日曆顯示值
  calendarValue.value = new Date(year, month - 1, date).getTime();

  // 如果點擊相同日期，切換顯示
  if (store.selectedDate === dateKey) {
    store.selectDate(null);
  } else {
    store.selectDate(dateKey);
  }
}

// 處理日期選擇（NCalendar 原生事件）
function handleDateSelect(timestamp: number) {
  const date = new Date(timestamp);
  const dateKey = formatDateKey(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );

  // 如果點擊相同日期，切換顯示
  if (store.selectedDate === dateKey) {
    store.selectDate(null);
  } else {
    store.selectDate(dateKey);
  }
}

// 關閉面板
function closePanel() {
  store.selectDate(null);
}

// 選中日期是否為今天
const isSelectedDateToday = computed(() => {
  if (!store.selectedDate) return false;
  const [year, month, day] = store.selectedDate.split('-').map(Number);
  return isToday(year, month, day);
});

// 選中日期的日
const selectedDateDay = computed(() => {
  if (!store.selectedDate) return '';
  return store.selectedDate.split('-')[2].replace(/^0/, '');
});

// 選中日期的月
const selectedDateMonth = computed(() => {
  if (!store.selectedDate) return '';
  return store.selectedDate.split('-')[1].replace(/^0/, '');
});

// 選中日期的星期
const selectedDateWeekday = computed(() => {
  if (!store.selectedDate) return '';
  const [year, month, day] = store.selectedDate.split('-').map(Number);
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const date = new Date(year, month - 1, day);
  return weekdays[date.getDay()];
});

// 判斷任務是否過期
function isOverdue(todo: Todo): boolean {
  if (!todo.dueDate || todo.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(todo.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

// 判斷任務是否今天到期
function isTodayDue(todo: Todo): boolean {
  if (!todo.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(todo.dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

// 切換任務完成狀態
async function toggleComplete(todo: Todo) {
  await store.updateTodo(todo.id, {
    completed: !todo.completed,
  });
}

// 取得分類名稱
function getCategoryName(categoryId: string): string {
  const category = store.categories.find(c => c.id === categoryId);
  return category?.name || '';
}
</script>

<style scoped>
/* ========================================
   日曆視圖主要樣式
   ======================================== */
.calendar-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--spacing-sm);
  overflow: hidden;
}

.calendar-container {
  padding: var(--spacing-sm) var(--spacing-md);
  flex-shrink: 0;
}

/* ========================================
   日曆格子內容區域
   ======================================== */
.calendar-cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: 20px;
  padding: 2px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.calendar-cell-content:hover {
  background-color: var(--bg-elevated);
}

.calendar-cell-content.is-selected {
  background-color: var(--accent-soft);
}

.calendar-cell-content.is-today {
  position: relative;
}

.calendar-cell-content.is-today::after {
  content: '今';
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 8px;
  color: var(--accent);
  font-weight: 600;
  opacity: 0.7;
}

.calendar-cell-content.has-todos {
  background-color: rgba(229, 192, 123, 0.08);
}

.calendar-cell-content.has-todos:hover {
  background-color: rgba(229, 192, 123, 0.15);
}

.calendar-cell-content.has-todos.is-selected {
  background-color: var(--accent-soft);
}

/* 任務指示區域 */
.todo-indicator-area {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  min-height: 14px;
}

/* 任務指示點 */
.todo-indicators {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 100%;
}

.indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.indicator-dot.pending {
  background: linear-gradient(135deg, var(--accent) 0%, #d4a84c 100%);
}

.indicator-dot.completed {
  background: linear-gradient(135deg, var(--success) 0%, #3a9d5c 100%);
  opacity: 0.7;
}

.indicator-dot.overdue {
  background: linear-gradient(135deg, var(--danger) 0%, #d63031 100%);
  animation: pulse 1.5s ease-in-out infinite;
}

.todo-count {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.15);
  }
}

/* ========================================
   選中日期面板
   ======================================== */
.selected-date-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 var(--spacing-md) var(--spacing-md);
  background-color: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  min-height: 120px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border);
  background-color: var(--bg-elevated);
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

/* 日期徽章 */
.date-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--bg-deep);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.date-badge.is-today {
  background-color: var(--accent-soft);
  border-color: var(--accent);
}

.date-badge .date-day {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.date-badge.is-today .date-day {
  color: var(--accent);
}

.date-badge .date-weekday {
  font-size: 9px;
  color: var(--text-muted);
  font-weight: 500;
}

.date-badge.is-today .date-weekday {
  color: var(--accent);
}

/* 面板標題區 */
.panel-title-area {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.task-summary {
  font-size: 12px;
  color: var(--text-muted);
}

.close-panel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.close-panel-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-surface);
}

.panel-content {
  flex: 1;
  padding: var(--spacing-md);
}

/* ========================================
   空狀態
   ======================================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl) var(--spacing-lg);
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-elevated);
  border-radius: 50%;
  color: var(--text-muted);
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
}

/* ========================================
   任務列表
   ======================================== */
.task-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.task-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-elevated);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.task-item:hover {
  background-color: var(--bg-deep);
  border-color: var(--border);
}

.task-item.completed {
  opacity: 0.6;
}

.task-item.overdue:not(.completed) {
  border-left: 3px solid var(--danger);
  background-color: rgba(248, 81, 73, 0.05);
}

/* 任務 Checkbox */
.task-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  min-width: 22px;
  border: 2px solid var(--border);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.task-checkbox:hover {
  border-color: var(--accent);
  background-color: var(--accent-soft);
}

.task-checkbox.checked {
  background-color: var(--accent);
  border-color: var(--accent);
}

.checkmark {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-deep);
}

/* 任務內容 */
.task-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-title {
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-title.completed {
  color: var(--text-muted);
  text-decoration: line-through;
}

.task-category {
  font-size: 11px;
  color: var(--text-muted);
}

/* 狀態標籤 */
.status-tag {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  font-weight: 600;
}

.status-tag.overdue {
  background-color: rgba(248, 81, 73, 0.15);
  color: var(--danger);
}

.status-tag.today {
  background-color: var(--accent-soft);
  color: var(--accent);
}

/* ========================================
   面板展開動畫
   ======================================== */
.panel-slide-enter-active {
  animation: panel-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.panel-slide-leave-active {
  animation: panel-out 0.2s ease;
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(-15px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes panel-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
}

/* ========================================
   覆蓋 Naive UI 日曆樣式
   ======================================== */
:deep(.n-calendar) {
  --n-bar-color: var(--accent);
  background-color: transparent;
}

:deep(.n-calendar-header) {
  padding: 4px var(--spacing-md);
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

:deep(.n-calendar-header__title) {
  color: var(--text-primary);
  font-family: var(--font-title);
  font-weight: 600;
  font-size: 15px;
}

:deep(.n-calendar-header__extra button) {
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

:deep(.n-calendar-header__extra button:hover) {
  color: var(--text-primary);
  background-color: var(--bg-elevated);
}

/* 日曆網格 - 添加外框 */
:deep(.n-calendar-dates) {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* 週標題 */
:deep(.n-calendar-weekdays) {
  border: none;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0;
}

:deep(.n-calendar-weekdays__day) {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

/* 日曆格子 - 添加格子線 */
:deep(.n-calendar-cell) {
  border-right: 1px solid var(--border) !important;
  border-bottom: 1px solid var(--border) !important;
  padding: 0;
}

/* 移除最右邊一列的右邊框 */
:deep(.n-calendar-cell:nth-child(7n)) {
  border-right: none !important;
}

/* 移除最後一行的底邊框 */
:deep(.n-calendar-dates > div:last-child .n-calendar-cell) {
  border-bottom: none !important;
}

/* 日期區域 */
:deep(.n-calendar-date) {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: none !important;
  background-color: transparent !important;
  border-radius: 0;
  padding: 4px 2px;
  min-height: 50px;
  transition: all var(--transition-fast);
  cursor: pointer;
}

:deep(.n-calendar-date:hover) {
  background-color: var(--bg-surface) !important;
}

/* 日期數字 */
:deep(.n-calendar-date__date) {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 2px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

/* 今天日期 - 金色加粗 + 背景 */
:deep(.n-calendar-date--current .n-calendar-date__date) {
  color: var(--bg-deep) !important;
  font-weight: 700 !important;
  background-color: var(--accent) !important;
}

:deep(.n-calendar-date--current) {
  background-color: transparent !important;
  border: none !important;
}

/* 隱藏原本的選中樣式 bar */
:deep(.n-calendar-cell__bar) {
  display: none !important;
}

/* 非當月日期變淡 */
:deep(.n-calendar-date--disabled .n-calendar-date__date) {
  color: var(--text-muted) !important;
  opacity: 0.35;
}

:deep(.n-calendar-date--disabled) {
  opacity: 0.5;
}

/* 選中狀態 */
:deep(.n-calendar-date--selected) {
  background-color: var(--accent-soft) !important;
}

:deep(.n-calendar-date--selected .n-calendar-date__date) {
  color: var(--accent) !important;
  font-weight: 600;
}

/* 確保今天日期在選中時保持樣式 */
:deep(.n-calendar-date--current.n-calendar-date--selected .n-calendar-date__date) {
  color: var(--bg-deep) !important;
  background-color: var(--accent) !important;
}
</style>
