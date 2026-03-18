<template>
  <div class="app-container">
    <div class="toolbar">
      <div class="toolbar-group">
        <button @click="handlePlayOrPause">{{ isPlaying ? '暂停' : '播放' }}</button>
        <button @click="handleStop">停止</button>
        <span>当前时间：{{ formatTime(currentTime) }}</span>
        <label class="inline-check">
          <input type="checkbox" v-model="autoScroll" />
          Auto Scroll
        </label>
      </div>

      <div class="toolbar-group grid">
        <label>Scale <input type="number" v-model.number="scale" min="0.1" step="0.1" /></label>
        <label>Scale Width <input type="number" v-model.number="scaleWidth" min="40" step="10" /></label>
        <label>Split Count <input type="number" v-model.number="scaleSplitCount" min="1" step="1" /></label>
        <label>Start Left <input type="number" v-model.number="startLeft" :min="enableRowDrag ? 24 : 0" step="1" /></label>
        <label>Row Height <input type="number" v-model.number="rowHeight" min="24" step="1" /></label>
        <label>Min Scale Count <input type="number" v-model.number="minScaleCount" min="1" step="1" /></label>
        <label>Max Scale Count(0=∞) <input type="number" v-model.number="maxScaleCountInput" min="0" step="1" /></label>
        <label>内容时长(0=自动) <input type="number" v-model.number="durationInput" min="0" step="0.1" /></label>
        <label class="inline-check">
          <input type="checkbox" v-model="gridSnap" />
          网格吸附
        </label>
        <label class="inline-check">
          <input type="checkbox" v-model="dragLine" />
          辅助线吸附
        </label>
      </div>

      <div class="toolbar-group grid">
        <label>背景色 <input type="color" v-model="backgroundColor" /></label>
        <label>内容背景色 <input type="color" v-model="contentBackgroundColor" /></label>
        <label>分割线颜色 <input type="color" v-model="borderColor" /></label>
        <label>刻度线颜色 <input type="color" v-model="gridColor" /></label>
        <label>TimeCursor 颜色 <input type="color" v-model="cursorColor" /></label>
        <label>辅助线颜色 <input type="color" v-model="snapLineColor" /></label>
        <label>Action 颜色 <input type="color" v-model="actionColor" /></label>
        <label class="inline-check">
          <input type="checkbox" v-model="enableRowDrag" />
          启用行拖拽
        </label>
      </div>

      <div class="toolbar-group">
        <button @click="openAddActionPanel">新增 Action</button>
        <button :disabled="!selectedAction" @click="deleteSelectedAction">删除选中 Action</button>
        <button @click="exportOptionsConfig">导出 options 配置</button>
        <span v-if="selectedAction">已选中：{{ selectedAction.rowId }}/{{ selectedAction.actionId }}</span>
        <span v-if="rowDragMessage" class="row-drag-status">{{ rowDragMessage }}</span>
      </div>
    </div>

    <div v-if="showAddPanel" class="add-panel">
      <h3>新增 TimelineAction</h3>
      <div class="panel-grid">
        <label>ID <input v-model="addForm.id" /></label>
        <label>轨道
          <select v-model="addForm.rowId">
            <option v-for="row in data" :key="row.id" :value="row.id">{{ row.id }}</option>
          </select>
        </label>
        <label>Effect
          <select v-model="addForm.effectId">
            <option v-for="effect in effectIds" :key="effect" :value="effect">{{ effect }}</option>
          </select>
        </label>
        <label>Start <input type="number" v-model.number="addForm.start" min="0" step="0.1" /></label>
        <label>Duration <input type="number" v-model.number="addForm.duration" min="0.1" step="0.1" /></label>
        <label>Label <input v-model="addForm.label" /></label>
      </div>
      <div class="panel-actions">
        <button @click="recalculateAddStart">自动计算空闲开始时间</button>
        <button @click="confirmAddAction">确认新增</button>
        <button @click="showAddPanel = false">取消</button>
      </div>
    </div>

    <div class="editor-wrapper">
      <TimelineEditor
        ref="timelineRef"
        v-model="data"
        :effects="effects"
        :options="options"
        :auto-scroll="autoScroll"
        @time-update="handleTimeUpdate"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @click-action="handleClickAction"
        @click-row="clearSelection"
        @row-drag-start="handleRowDragStart"
        @row-drag-end="handleRowDragEnd"
      >
        <template #action="{ action }">
          <div class="action-label">{{ action.data?.label || action.id }}</div>
        </template>
      </TimelineEditor>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import TimelineEditor from './components/Timeline/TimelineEditor.vue';
import type { TimelineAction, TimelineEffect, TimelineOptions, TimelineRow } from './interface/common';
import { formatTime } from './utils/time';

const timelineRef = ref<InstanceType<typeof TimelineEditor> | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const autoScroll = ref(true);

const scale = ref(1);
const scaleWidth = ref(160);
const scaleSplitCount = ref(10);
const startLeft = ref(20);
const rowHeight = ref(32);
const minScaleCount = ref(20);
const maxScaleCountInput = ref(0);
const durationInput = ref(0);
const gridSnap = ref(true);
const dragLine = ref(true);
const enableRowDrag = ref(false);

const backgroundColor = ref('#1e1e1e');
const contentBackgroundColor = ref('#1a1a1a');
const borderColor = ref('#333333');
const gridColor = ref('#2a2a2a');
const cursorColor = ref('#ff4d4f');
const snapLineColor = ref('#fadb14');
const actionColor = ref('#3e82f7');

const rowDragMessage = ref('');

const data = ref<TimelineRow[]>([
  {
    id: '0',
    actions: [
      { id: 'action00', start: 0, end: 2, effectId: 'effect0', data: { label: 'Audio 1' } },
      { id: 'action01', start: 3, end: 5, effectId: 'effect0', data: { label: 'Audio 2' } },
    ],
  },
  {
    id: '1',
    actions: [
      { id: 'action10', start: 1.5, end: 5, effectId: 'effect1', data: { label: 'Video Effect' } },
    ],
  },
  { id: '2', actions: [] },
  { id: '3', actions: [{ id: 'action30', start: 6, end: 8, effectId: 'effect1', data: { label: 'End Credits' } }] },
  { id: '4', actions: [] },
  { id: '5', actions: [] },
]);

const effects: Record<string, TimelineEffect> = {
  effect0: { id: 'effect0', name: 'Audio' },
  effect1: { id: 'effect1', name: 'Video' },
};

const effectIds = computed(() => Object.keys(effects));

watch(enableRowDrag, (enabled) => {
  if (enabled && startLeft.value < 24) {
    startLeft.value = 24;
  }
});

const options = computed<TimelineOptions>(() => ({
  scale: scale.value,
  scaleWidth: scaleWidth.value,
  scaleSplitCount: scaleSplitCount.value,
  startLeft: startLeft.value,
  rowHeight: rowHeight.value,
  minScaleCount: minScaleCount.value,
  maxScaleCount: maxScaleCountInput.value > 0 ? maxScaleCountInput.value : Number.POSITIVE_INFINITY,
  duration: durationInput.value > 0 ? durationInput.value : 0,
  gridSnap: gridSnap.value,
  dragLine: dragLine.value,
  enableRowDrag: enableRowDrag.value,
  backgroundColor: backgroundColor.value,
  contentBackgroundColor: contentBackgroundColor.value,
  borderColor: borderColor.value,
  gridColor: gridColor.value,
  cursorColor: cursorColor.value,
  snapLineColor: snapLineColor.value,
  actionColor: actionColor.value,
}));

const selectedAction = ref<{ rowId: string; actionId: string } | null>(null);

function clearSelection() {
  selectedAction.value = null;
  data.value = data.value.map((row) => ({
    ...row,
    actions: row.actions.map((action) => ({ ...action, selected: false })),
  }));
}

function handleClickAction(_event: MouseEvent, params: { action: TimelineAction; row: TimelineRow }) {
  selectedAction.value = { rowId: params.row.id, actionId: params.action.id };
  data.value = data.value.map((row) => ({
    ...row,
    actions: row.actions.map((action) => ({
      ...action,
      selected: row.id === params.row.id && action.id === params.action.id,
    })),
  }));
}

function handleTimeUpdate(time: number) {
  currentTime.value = time;
}

function handlePlayOrPause() {
  timelineRef.value?.togglePlay();
}

function handleStop() {
  timelineRef.value?.pause();
  timelineRef.value?.setTime(0);
}

function handleRowDragStart(params: { row: TimelineRow }) {
  rowDragMessage.value = `开始拖拽轨道 ${params.row.id}`;
}

function handleRowDragEnd(params: { row: TimelineRow; editorData: TimelineRow[] }) {
  rowDragMessage.value = `轨道 ${params.row.id} 拖拽结束，当前轨道数：${params.editorData.length}`;
}

function exportOptionsConfig() {
  const content = JSON.stringify(options.value, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  link.href = url;
  link.download = `vue-timeline-editor-options-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function findFirstAvailableStart(actions: TimelineAction[], duration: number) {
  const sorted = [...actions].sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const action of sorted) {
    if (cursor + duration <= action.start) {
      return Number(cursor.toFixed(3));
    }
    cursor = Math.max(cursor, action.end);
  }
  return Number(cursor.toFixed(3));
}

function getDefaultRowId() {
  if (data.value.length === 0) return '';

  const numericRows = data.value
    .map((row) => ({ row, value: Number(row.id) }))
    .filter((item) => Number.isFinite(item.value));

  if (numericRows.length === data.value.length) {
    const target = numericRows.reduce((prev, current) => (current.value > prev.value ? current : prev));
    return target.row.id;
  }

  return data.value[data.value.length - 1].id;
}

function createActionId() {
  const ids = data.value.flatMap((row) => row.actions).map((action) => action.id);
  let index = ids.length + 1;
  let nextId = `action${index.toString().padStart(2, '0')}`;
  while (ids.includes(nextId)) {
    index += 1;
    nextId = `action${index.toString().padStart(2, '0')}`;
  }
  return nextId;
}

const showAddPanel = ref(false);
const addForm = reactive({
  id: '',
  rowId: '',
  effectId: '',
  start: 0,
  duration: 1,
  label: 'New Action',
});

function openAddActionPanel() {
  const rowId = getDefaultRowId();
  const row = data.value.find((item) => item.id === rowId);
  const duration = 1;

  addForm.id = createActionId();
  addForm.rowId = rowId;
  addForm.effectId = effectIds.value[0] || '';
  addForm.duration = duration;
  addForm.start = findFirstAvailableStart(row?.actions || [], duration);
  addForm.label = 'New Action';
  showAddPanel.value = true;
}

function recalculateAddStart() {
  const row = data.value.find((item) => item.id === addForm.rowId);
  if (!row) return;
  addForm.start = findFirstAvailableStart(row.actions, Math.max(addForm.duration, 0.1));
}

watch(
  [() => addForm.rowId, () => addForm.duration],
  () => {
    if (!showAddPanel.value) return;
    recalculateAddStart();
  },
);

function confirmAddAction() {
  const targetRow = data.value.find((item) => item.id === addForm.rowId);
  if (!targetRow) return;

  const duration = Math.max(addForm.duration, 0.1);
  const start = Math.max(0, addForm.start);
  let id = addForm.id.trim();
  if (!id) {
    id = createActionId();
  }

  const allIds = data.value.flatMap((row) => row.actions.map((action) => action.id));
  if (allIds.includes(id)) {
    id = `${id}-${Date.now()}`;
  }

  const end = start + duration;
  const hasOverlap = targetRow.actions.some((action) => start < action.end && end > action.start);
  const safeStart = hasOverlap ? findFirstAvailableStart(targetRow.actions, duration) : start;

  const newAction: TimelineAction = {
    id,
    start: safeStart,
    end: safeStart + duration,
    effectId: addForm.effectId || effectIds.value[0] || '',
    movable: true,
    flexible: true,
    data: { label: addForm.label || id },
    selected: true,
  };

  data.value = data.value.map((row) => {
    if (row.id !== targetRow.id) {
      return {
        ...row,
        actions: row.actions.map((action) => ({ ...action, selected: false })),
      };
    }

    return {
      ...row,
      actions: [...row.actions.map((action) => ({ ...action, selected: false })), newAction]
        .sort((a, b) => a.start - b.start),
    };
  });

  selectedAction.value = { rowId: targetRow.id, actionId: newAction.id };
  showAddPanel.value = false;
}

function deleteSelectedAction() {
  if (!selectedAction.value) return;
  const { rowId, actionId } = selectedAction.value;

  data.value = data.value.map((row) => {
    if (row.id !== rowId) return row;
    return {
      ...row,
      actions: row.actions.filter((action) => action.id !== actionId),
    };
  });

  selectedAction.value = null;
}
</script>

<style scoped>
.app-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #1b1b1b;
  border: 1px solid #2f2f2f;
  border-radius: 8px;
  padding: 10px;
}

.toolbar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  align-items: center;
}

.toolbar-group.grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 8px 12px;
}

.toolbar label {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
}

.toolbar input,
.toolbar select,
.toolbar button {
  background: #262626;
  color: #e6e6e6;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px 8px;
}

.toolbar input[type='color'] {
  width: 32px;
  padding: 1px;
  border: 0;
  background: transparent;
}

.inline-check {
  gap: 4px;
}

.row-drag-status {
  color: #9ad6ff;
}

.add-panel {
  background: #191919;
  border: 1px solid #2f2f2f;
  border-radius: 8px;
  padding: 10px;
}

.add-panel h3 {
  margin: 0 0 10px;
  font-size: 14px;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 8px 12px;
}

.panel-grid label {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
}

.panel-grid input,
.panel-grid select {
  flex: 1;
  background: #262626;
  color: #e6e6e6;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px 8px;
}

.panel-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.panel-actions button {
  background: #262626;
  color: #e6e6e6;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px 10px;
}

.editor-wrapper {
  flex: 1;
  min-height: 0;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
}

.action-label {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

@media (max-width: 1280px) {
  .toolbar-group.grid {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }

  .panel-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}
</style>
