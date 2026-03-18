<template>
  <div class="timeline-editor" :style="cssVars">
    <div class="timeline-header" ref="headerRef">
      <TimelineScale>
        <template #scale-render="{ scale, text }">
          <slot name="scale" :scale="scale" :text="text"></slot>
        </template>
      </TimelineScale>
    </div>

    <div class="timeline-body" ref="bodyRef" @scroll="onScroll">
      <div class="timeline-content" :style="{ width: totalWidth + 'px' }">
        <div v-for="row in modelValue" :key="row.id" class="timeline-row-wrapper">
          <TimelineRow :rowData="row">
            <template #action="{ action }">
              <slot name="action" :action="action"></slot>
            </template>
          </TimelineRow>
        </div>

        <div
          v-if="!mergedOptions.hideCursor"
          class="timeline-cursor"
          :style="{ left: cursorLeft + 'px' }"
        >
          <div class="cursor-head" @mousedown="startDragCursor"></div>
          <div class="cursor-line"></div>
        </div>

        <div
          v-for="lineTime in snapLines"
          :key="lineTime"
          class="timeline-snap-line"
          :style="{ left: timeToPixel(lineTime, mergedOptions) + 'px' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref, toRefs } from 'vue';
import { useElementSize } from '@vueuse/core';
import type { TimelineAction, TimelineEffect, TimelineOptions, TimelineRow as TimelineRowData } from '../../interface/common';
import { DEFAULT_OPTIONS, getDurationByWidth, getMaxActionEnd, pixelToTime, timeToPixel } from '../../utils/time';
import { useTimelineEngine } from '../../composables/useTimelineEngine';
import TimelineScale from './TimelineScale.vue';
import TimelineRow from './TimelineRow.vue';

interface UpdateActionPayload {
  action: TimelineAction;
  fromRowId: string;
  toRowId?: string;
  commit: boolean;
}

const props = withDefaults(defineProps<{
  modelValue: TimelineRowData[];
  effects?: Record<string, TimelineEffect>;
  options?: TimelineOptions;
  autoScroll?: boolean;
}>(), {
  modelValue: () => [],
  effects: () => ({}),
  options: () => ({}),
  autoScroll: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: TimelineRowData[]): void;
  (e: 'change', value: TimelineRowData[]): void;
  (e: 'play'): void;
  (e: 'pause'): void;
  (e: 'time-update', time: number): void;
  (e: 'scroll', params: { scrollLeft: number; scrollTop: number }): void;
  (e: 'click-time-area', time: number): void;
  (e: 'action-move-start', params: { action: TimelineAction; row: TimelineRowData }): void;
  (e: 'action-moving', params: { action: TimelineAction; row: TimelineRowData; start: number; end: number }): void;
  (e: 'action-move-end', params: { action: TimelineAction; row: TimelineRowData; start: number; end: number }): void;
  (e: 'action-resize-start', params: { action: TimelineAction; row: TimelineRowData; dir: 'left' | 'right' }): void;
  (e: 'action-resizing', params: { action: TimelineAction; row: TimelineRowData; start: number; end: number; dir: 'left' | 'right' }): void;
  (e: 'action-resize-end', params: { action: TimelineAction; row: TimelineRowData; start: number; end: number; dir: 'left' | 'right' }): void;
  (e: 'click-action', event: MouseEvent, params: { action: TimelineAction; row: TimelineRowData; time: number }): void;
  (e: 'double-click-action', event: MouseEvent, params: { action: TimelineAction; row: TimelineRowData; time: number }): void;
  (e: 'context-menu-action', event: MouseEvent, params: { action: TimelineAction; row: TimelineRowData; time: number }): void;
  (e: 'click-row', event: MouseEvent, params: { row: TimelineRowData; time: number }): void;
  (e: 'double-click-row', event: MouseEvent, params: { row: TimelineRowData; time: number }): void;
  (e: 'context-menu-row', event: MouseEvent, params: { row: TimelineRowData; time: number }): void;
}>();

const { options, modelValue, autoScroll } = toRefs(props);

const mergedOptions = computed(() => ({ ...DEFAULT_OPTIONS, ...options.value }));

const bodyRef = ref<HTMLElement | null>(null);
const headerRef = ref<HTMLElement | null>(null);

provide('timelineOptions', mergedOptions);
provide('timelineRows', modelValue);
provide('timelineBody', bodyRef);
provide('autoScroll', autoScroll);

const { width: bodyWidth } = useElementSize(bodyRef);

const maxActionEnd = computed(() => getMaxActionEnd(modelValue.value));
const minScaleDuration = computed(() => mergedOptions.value.minScaleCount * mergedOptions.value.scale);
const viewportDuration = computed(() => getDurationByWidth(bodyWidth.value, mergedOptions.value));

const totalDuration = computed(() => {
  const optionDuration = mergedOptions.value.duration > 0 ? mergedOptions.value.duration : 0;
  const contentDuration = maxActionEnd.value > 0 ? maxActionEnd.value : 0;

  let duration = Math.max(viewportDuration.value, minScaleDuration.value, optionDuration, contentDuration);
  if (Number.isFinite(mergedOptions.value.maxScaleCount)) {
    const maxDuration = mergedOptions.value.maxScaleCount * mergedOptions.value.scale;
    duration = Math.min(duration, maxDuration);
  }

  return Math.max(duration, 0);
});

const totalWidth = computed(() => {
  const widthByDuration = timeToPixel(totalDuration.value, mergedOptions.value);
  return Math.max(bodyWidth.value, widthByDuration);
});

provide('timelineTotalWidth', totalWidth);

const engine = useTimelineEngine({
  onTimeUpdate: (time) => emit('time-update', time),
  onPlay: () => emit('play'),
  onPause: () => emit('pause'),
});

function setTimelineTime(time: number) {
  const clamped = Math.max(0, Math.min(time, totalDuration.value));
  engine.setTime(clamped);
  emit('click-time-area', clamped);
}

provide('setTimelineTime', setTimelineTime);

function pauseIfPlaying() {
  if (engine.isPlaying.value) {
    engine.pause();
  }
}

const onActionMoveStart = (params: { action: TimelineAction; row: TimelineRowData }) => {
  pauseIfPlaying();
  emit('action-move-start', params);
};
const onActionMoving = (params: { action: TimelineAction; row: TimelineRowData; start: number; end: number }) => emit('action-moving', params);
const onActionMoveEnd = (params: { action: TimelineAction; row: TimelineRowData; start: number; end: number }) => emit('action-move-end', params);
const onActionResizeStart = (params: { action: TimelineAction; row: TimelineRowData; dir: 'left' | 'right' }) => {
  pauseIfPlaying();
  emit('action-resize-start', params);
};
const onActionResizing = (params: { action: TimelineAction; row: TimelineRowData; start: number; end: number; dir: 'left' | 'right' }) => emit('action-resizing', params);
const onActionResizeEnd = (params: { action: TimelineAction; row: TimelineRowData; start: number; end: number; dir: 'left' | 'right' }) => emit('action-resize-end', params);

provide('dragCallbacks', {
  onActionMoveStart,
  onActionMoving,
  onActionMoveEnd,
  onActionResizeStart,
  onActionResizing,
  onActionResizeEnd,
});

function getTimeFromClientX(clientX: number) {
  if (!bodyRef.value) return engine.currentTime.value;
  const rect = bodyRef.value.getBoundingClientRect();
  const pixel = clientX - rect.left + bodyRef.value.scrollLeft;
  return Math.max(0, pixelToTime(pixel, mergedOptions.value));
}

provide('actionEvents', {
  onClick: (event: MouseEvent, params: { action: TimelineAction; row: TimelineRowData }) => {
    emit('click-action', event, { ...params, time: getTimeFromClientX(event.clientX) });
  },
  onDoubleClick: (event: MouseEvent, params: { action: TimelineAction; row: TimelineRowData }) => {
    emit('double-click-action', event, { ...params, time: getTimeFromClientX(event.clientX) });
  },
  onContextMenu: (event: MouseEvent, params: { action: TimelineAction; row: TimelineRowData }) => {
    emit('context-menu-action', event, { ...params, time: getTimeFromClientX(event.clientX) });
  },
});

provide('rowEvents', {
  onClick: (event: MouseEvent, params: { row: TimelineRowData; time: number }) => emit('click-row', event, params),
  onDoubleClick: (event: MouseEvent, params: { row: TimelineRowData; time: number }) => emit('double-click-row', event, params),
  onContextMenu: (event: MouseEvent, params: { row: TimelineRowData; time: number }) => emit('context-menu-row', event, params),
});

function sortActionsByStart<T extends TimelineAction>(actions: T[]) {
  return [...actions].sort((a, b) => a.start - b.start);
}

function updateAction(payload: UpdateActionPayload) {
  const { action, fromRowId, commit } = payload;
  const toRowId = payload.toRowId ?? fromRowId;
  const nextRows = modelValue.value.map((row) => ({
    ...row,
    actions: [...row.actions],
  }));

  const sourceRow = nextRows.find((row) => row.id === fromRowId);
  if (!sourceRow) return;

  if (!commit || fromRowId === toRowId) {
    const actionIndex = sourceRow.actions.findIndex((item) => item.id === action.id);
    if (actionIndex === -1) return;
    sourceRow.actions[actionIndex] = { ...action };
    sourceRow.actions = sortActionsByStart(sourceRow.actions);
  } else {
    const actionIndex = sourceRow.actions.findIndex((item) => item.id === action.id);
    if (actionIndex === -1) return;
    sourceRow.actions.splice(actionIndex, 1);

    const targetRow = nextRows.find((row) => row.id === toRowId);
    if (!targetRow) {
      sourceRow.actions.push({ ...action });
      sourceRow.actions = sortActionsByStart(sourceRow.actions);
    } else {
      targetRow.actions = sortActionsByStart([
        ...targetRow.actions.filter((item) => item.id !== action.id),
        { ...action },
      ]);
    }
  }

  emit('update:modelValue', nextRows);
  emit('change', nextRows);
}

provide('updateAction', updateAction);

const cursorLeft = computed(() => {
  const clampedTime = Math.max(0, Math.min(engine.currentTime.value, totalDuration.value));
  return timeToPixel(clampedTime, mergedOptions.value);
});

const snapLines = ref<number[]>([]);
provide('snapLines', snapLines);

const cssVars = computed(() => ({
  '--timeline-row-height': `${mergedOptions.value.rowHeight}px`,
  '--timeline-scale-width': `${mergedOptions.value.scaleWidth}px`,
  '--timeline-start-left': `${mergedOptions.value.startLeft}px`,
  '--timeline-bg': mergedOptions.value.backgroundColor,
  '--timeline-content-bg': mergedOptions.value.contentBackgroundColor,
  '--timeline-border-color': mergedOptions.value.borderColor,
  '--timeline-grid-color': mergedOptions.value.gridColor,
  '--timeline-cursor-color': mergedOptions.value.cursorColor,
  '--timeline-action-color': mergedOptions.value.actionColor,
  '--timeline-snap-line-color': mergedOptions.value.snapLineColor,
}));

function onScroll(e: Event) {
  const target = e.target as HTMLElement;
  if (headerRef.value) {
    headerRef.value.scrollLeft = target.scrollLeft;
  }

  emit('scroll', {
    scrollLeft: target.scrollLeft,
    scrollTop: target.scrollTop,
  });
}

function startDragCursor(e: MouseEvent) {
  if (mergedOptions.value.hideCursor) return;

  e.preventDefault();
  const initialX = e.clientX;
  const initialLeft = cursorLeft.value;

  const onMove = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.clientX - initialX;
    const nextLeft = Math.max(mergedOptions.value.startLeft, initialLeft + deltaX);
    const nextTime = pixelToTime(nextLeft, mergedOptions.value);
    setTimelineTime(nextTime);
  };

  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

defineExpose({
  ...engine,
  setScrollLeft: (value: number) => {
    if (bodyRef.value) {
      bodyRef.value.scrollLeft = Math.max(0, value);
    }
  },
  setScrollTop: (value: number) => {
    if (bodyRef.value) {
      bodyRef.value.scrollTop = Math.max(0, value);
    }
  },
});
</script>

<style scoped>
.timeline-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--timeline-bg);
  color: #e0e0e0;
  position: relative;
  user-select: none;

  --timeline-header-height: 30px;
}

.timeline-header {
  height: var(--timeline-header-height);
  border-bottom: 1px solid var(--timeline-border-color);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--timeline-bg);
}

.timeline-body {
  flex: 1;
  overflow: auto;
  position: relative;
  background-color: var(--timeline-content-bg);
}

.timeline-body::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.timeline-body::-webkit-scrollbar-track {
  background-color: var(--timeline-content-bg);
}

.timeline-body::-webkit-scrollbar-thumb {
  background-color: #454545;
  border-radius: 8px;
}

.timeline-body::-webkit-scrollbar-corner {
  background-color: var(--timeline-content-bg);
}

.timeline-content {
  position: relative;
  min-height: 100%;
  background-color: var(--timeline-content-bg);
}

.timeline-row-wrapper {
  border-bottom: 1px solid var(--timeline-border-color);
  position: relative;
}

.timeline-cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  z-index: 100;
  pointer-events: none;
}

.cursor-head {
  position: absolute;
  top: 0;
  left: -5px;
  width: 10px;
  height: 10px;
  background-color: var(--timeline-cursor-color);
  cursor: ew-resize;
  pointer-events: auto;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

.cursor-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background-color: var(--timeline-cursor-color);
}

.timeline-snap-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: var(--timeline-snap-line-color);
  z-index: 90;
  pointer-events: none;
}
</style>
