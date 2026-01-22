<!--
  CalendarView.vue - 日曆視圖元件

  重新設計的雙欄佈局：
  - 左側：緊湊的月曆視圖
  - 右側：選中日期的任務面板

  設計風格：現代深色主題，精緻的視覺層次
-->
<template>
  <div class="calendar-layout">
    <!-- 左側：緊湊日曆 -->
    <div class="calendar-section">
      <n-calendar
        v-model:value="calendarValue"
        #="{ year, month, date }"
        @update:value="handleDateSelect"
      >
        <div
          class="date-cell"
          :class="{
            'is-selected': isSelected(year, month, date),
            'has-tasks': hasTodos(year, month, date),
            'is-today': isToday(year, month, date),
          }"
          @click.stop="handleCellClick(year, month, date)"
        >
          <div v-if="hasTodos(year, month, date)" class="task-dots">
            <span
              v-for="(indicator, index) in getIndicators(year, month, date)"
              :key="index"
              class="dot"
              :class="indicator.status"
            ></span>
          </div>
        </div>
      </n-calendar>
    </div>

    <!-- 右側：任務面板 -->
    <div class="task-section">
      <!-- 日期標題區 -->
      <div class="task-header">
        <div class="selected-date-info">
          <div class="date-display" :class="{ 'is-today': isSelectedDateToday }">
            <span class="date-number">{{ selectedDateDay || todayDay }}</span>
            <span class="date-label">{{ selectedDateWeekday || todayWeekday }}</span>
          </div>
          <div class="date-meta">
            <span class="month-year">{{ selectedDateMonth || todayMonth }}月</span>
            <span class="task-count" v-if="store.selectedDate">
              {{ store.selectedDateTodos.length }} 個任務
            </span>
            <span class="task-count" v-else>
              選擇日期查看任務
            </span>
          </div>
        </div>
      </div>

      <!-- 任務列表區 -->
      <n-scrollbar class="task-content">
        <!-- 未選擇日期的提示 -->
        <div v-if="!store.selectedDate" class="placeholder-state">
          <div class="placeholder-icon">
            <n-icon :component="CalendarOutline" size="48" />
          </div>
          <p class="placeholder-text">點擊日曆上的日期</p>
          <p class="placeholder-hint">查看該日期的待辦任務</p>
        </div>

        <!-- 空狀態 -->
        <div v-else-if="store.selectedDateTodos.length === 0" class="empty-state">
          <div class="empty-icon">
            <n-icon :component="CheckmarkDoneOutline" size="36" />
          </div>
          <p class="empty-text">沒有任務</p>
          <p class="empty-hint">這天很清閒</p>
        </div>

        <!-- 任務列表 -->
        <div v-else class="task-list">
          <div
            v-for="todo in store.selectedDateTodos"
            :key="todo.id"
            class="task-card"
            :class="{
              'is-completed': todo.completed,
              'is-overdue': isOverdue(todo),
            }"
          >
            <button
              class="task-check"
              :class="{ checked: todo.completed }"
              @click="toggleComplete(todo)"
            >
              <n-icon v-if="todo.completed" :component="CheckmarkOutline" size="12" />
            </button>

            <div class="task-info">
              <span class="task-name" :class="{ done: todo.completed }">
                {{ todo.title }}
              </span>
              <span class="task-meta">{{ getCategoryName(todo.categoryId) }}</span>
            </div>

            <span v-if="isOverdue(todo) && !todo.completed" class="task-badge overdue">
              過期
            </span>
            <span v-else-if="isTodayDue(todo) && !todo.completed" class="task-badge today">
              今天
            </span>
          </div>
        </div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * CalendarView 日曆視圖元件
 * 雙欄佈局：左側日曆 + 右側任務面板
 */
import { ref, computed } from 'vue';
import { NCalendar, NIcon, NScrollbar } from 'naive-ui';
import { CheckmarkOutline, CalendarOutline, CheckmarkDoneOutline } from '@vicons/ionicons5';
import { useTodoStore } from '../stores/todoStore';
import type { Todo } from '../types/electron';

const store = useTodoStore();
const calendarValue = ref<number>(Date.now());

// 工具函數
function formatDateKey(year: number, month: number, date: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
}

function isToday(year: number, month: number, date: number): boolean {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === date;
}

function isSelected(year: number, month: number, date: number): boolean {
  return store.selectedDate === formatDateKey(year, month, date);
}

function hasTodos(year: number, month: number, date: number): boolean {
  return !!store.todosByDateMap[formatDateKey(year, month, date)]?.length;
}

function getIndicators(year: number, month: number, date: number): Array<{ status: string }> {
  const todos = store.todosByDateMap[formatDateKey(year, month, date)] || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(year, month - 1, date);
  targetDate.setHours(0, 0, 0, 0);

  return todos.slice(0, 3).map(todo => ({
    status: todo.completed ? 'completed' : targetDate < today ? 'overdue' : 'pending'
  }));
}

function handleCellClick(year: number, month: number, date: number) {
  const dateKey = formatDateKey(year, month, date);
  calendarValue.value = new Date(year, month - 1, date).getTime();
  store.selectDate(store.selectedDate === dateKey ? null : dateKey);
}

function handleDateSelect(timestamp: number) {
  const date = new Date(timestamp);
  const dateKey = formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
  store.selectDate(store.selectedDate === dateKey ? null : dateKey);
}

// 今天的資訊
const todayDay = computed(() => new Date().getDate().toString());
const todayMonth = computed(() => (new Date().getMonth() + 1).toString());
const todayWeekday = computed(() => {
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return weekdays[new Date().getDay()];
});

// 選中日期資訊
const isSelectedDateToday = computed(() => {
  if (!store.selectedDate) return true;
  const [year, month, day] = store.selectedDate.split('-').map(Number);
  return isToday(year, month, day);
});

const selectedDateDay = computed(() => {
  if (!store.selectedDate) return '';
  return store.selectedDate.split('-')[2].replace(/^0/, '');
});

const selectedDateMonth = computed(() => {
  if (!store.selectedDate) return '';
  return store.selectedDate.split('-')[1].replace(/^0/, '');
});

const selectedDateWeekday = computed(() => {
  if (!store.selectedDate) return '';
  const [year, month, day] = store.selectedDate.split('-').map(Number);
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return weekdays[new Date(year, month - 1, day).getDay()];
});

// 任務狀態判斷
function isOverdue(todo: Todo): boolean {
  if (!todo.dueDate || todo.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(todo.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function isTodayDue(todo: Todo): boolean {
  if (!todo.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(todo.dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

async function toggleComplete(todo: Todo) {
  await store.updateTodo(todo.id, { completed: !todo.completed });
}

function getCategoryName(categoryId: string): string {
  return store.categories.find(c => c.id === categoryId)?.name || '';
}
</script>

<style scoped>
/* ========================================
   雙欄佈局
   ======================================== */
.calendar-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 0;
  height: 100%;
  overflow: hidden;
}

/* ========================================
   左側日曆區
   ======================================== */
.calendar-section {
  padding: var(--spacing-sm);
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.date-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 16px;
  padding: 2px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.date-cell:hover {
  background-color: var(--bg-elevated);
}

.date-cell.is-selected {
  background-color: var(--accent-soft);
}

.date-cell.has-tasks {
  background-color: rgba(229, 192, 123, 0.1);
}

.date-cell.has-tasks.is-selected {
  background-color: var(--accent-soft);
}

/* 任務指示點 */
.task-dots {
  display: flex;
  gap: 3px;
  align-items: center;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.dot.pending {
  background-color: var(--accent);
}

.dot.completed {
  background-color: var(--success);
  opacity: 0.6;
}

.dot.overdue {
  background-color: var(--danger);
}

/* ========================================
   右側任務區
   ======================================== */
.task-section {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-surface);
  overflow: hidden;
}

/* 日期標題 */
.task-header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-surface) 100%);
}

.selected-date-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.date-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background-color: var(--bg-deep);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.date-display.is-today {
  background: linear-gradient(135deg, var(--accent) 0%, #d4a84c 100%);
  border-color: var(--accent);
}

.date-number {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.date-display.is-today .date-number {
  color: var(--bg-deep);
}

.date-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 500;
  margin-top: 2px;
}

.date-display.is-today .date-label {
  color: var(--bg-deep);
  opacity: 0.8;
}

.date-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.month-year {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.task-count {
  font-size: 12px;
  color: var(--text-muted);
}

/* 任務內容區 */
.task-content {
  flex: 1;
  padding: var(--spacing-sm);
}

/* 佔位狀態 */
.placeholder-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-xl);
  text-align: center;
}

.placeholder-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-elevated);
  border-radius: 50%;
  color: var(--text-muted);
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.placeholder-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 4px 0;
}

.placeholder-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

/* 空狀態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  text-align: center;
}

.empty-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(152, 195, 121, 0.15);
  border-radius: 50%;
  color: var(--success);
  margin-bottom: var(--spacing-md);
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
  margin: 0 0 4px 0;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

/* 任務列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background-color: var(--bg-elevated);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.task-card:hover {
  background-color: var(--bg-deep);
  border-color: var(--border);
}

.task-card.is-completed {
  opacity: 0.55;
}

.task-card.is-overdue:not(.is-completed) {
  border-left: 3px solid var(--danger);
  background-color: rgba(248, 81, 73, 0.05);
}

/* 勾選框 */
.task-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  min-width: 18px;
  border: 2px solid var(--border);
  border-radius: 50%;
  transition: all 0.15s ease;
  color: var(--bg-deep);
}

.task-check:hover {
  border-color: var(--accent);
  background-color: var(--accent-soft);
}

.task-check.checked {
  background-color: var(--accent);
  border-color: var(--accent);
}

/* 任務資訊 */
.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-name {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-name.done {
  color: var(--text-muted);
  text-decoration: line-through;
}

.task-meta {
  font-size: 11px;
  color: var(--text-muted);
}

/* 狀態標籤 */
.task-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.task-badge.overdue {
  background-color: rgba(248, 81, 73, 0.15);
  color: var(--danger);
}

.task-badge.today {
  background-color: var(--accent-soft);
  color: var(--accent);
}

/* ========================================
   Naive UI 日曆覆寫
   ======================================== */
:deep(.n-calendar) {
  --n-bar-color: var(--accent);
  background-color: transparent;
}

:deep(.n-calendar-header) {
  padding: 6px var(--spacing-sm);
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

:deep(.n-calendar-header__title) {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 14px;
}

:deep(.n-calendar-header__extra button) {
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
}

:deep(.n-calendar-header__extra button:hover) {
  color: var(--text-primary);
  background-color: var(--bg-elevated);
}

:deep(.n-calendar-dates) {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

:deep(.n-calendar-weekdays) {
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}

:deep(.n-calendar-weekdays__day) {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 600;
}

:deep(.n-calendar-cell) {
  border-right: 1px solid var(--border) !important;
  border-bottom: 1px solid var(--border) !important;
  padding: 0;
}

:deep(.n-calendar-cell:nth-child(7n)) {
  border-right: none !important;
}

:deep(.n-calendar-dates > div:last-child .n-calendar-cell) {
  border-bottom: none !important;
}

:deep(.n-calendar-date) {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: none !important;
  background-color: transparent !important;
  border-radius: 0;
  padding: 4px 2px;
  min-height: 44px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

:deep(.n-calendar-date:hover) {
  background-color: var(--bg-surface) !important;
}

:deep(.n-calendar-date__date) {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 2px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

:deep(.n-calendar-date--current .n-calendar-date__date) {
  color: var(--bg-deep) !important;
  font-weight: 700 !important;
  background-color: var(--accent) !important;
}

:deep(.n-calendar-cell__bar) {
  display: none !important;
}

:deep(.n-calendar-date--disabled .n-calendar-date__date) {
  color: var(--text-muted) !important;
  opacity: 0.35;
}

:deep(.n-calendar-date--disabled) {
  opacity: 0.5;
}

:deep(.n-calendar-date--selected) {
  background-color: var(--accent-soft) !important;
}

:deep(.n-calendar-date--selected .n-calendar-date__date) {
  color: var(--accent) !important;
  font-weight: 600;
}

:deep(.n-calendar-date--current.n-calendar-date--selected .n-calendar-date__date) {
  color: var(--bg-deep) !important;
  background-color: var(--accent) !important;
}
</style>
