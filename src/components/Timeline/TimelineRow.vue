<template>
  <div
    class="timeline-row"
    :class="rowClass"
    :style="{ height: (rowData.rowHeight || options.rowHeight) + 'px', width: totalWidth + 'px' }"
    @click="onClick"
    @dblclick="onDoubleClick"
    @contextmenu="onContextMenu"
  >
    <button
      v-if="showRowDragHandle"
      class="row-drag-handle"
      type="button"
      title="拖拽调整轨道顺序"
      @mousedown.stop.prevent="onRowDragHandleMouseDown"
      @click.stop
    >
      <span class="row-drag-handle-icon"></span>
    </button>

    <TimelineAction
      v-for="action in rowData.actions"
      :key="action.id"
      :action="action"
      :rowId="rowData.id"
    >
      <template #action="{ action }">
        <slot name="action" :action="action"></slot>
      </template>
    </TimelineAction>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, type Ref } from 'vue';
import type { TimelineOptions, TimelineRow } from '../../interface/common';
import { DEFAULT_OPTIONS, pixelToTime } from '../../utils/time';
import TimelineAction from './TimelineAction.vue';

const props = withDefaults(defineProps<{
  rowData: TimelineRow;
  ghost?: boolean;
}>(), {
  ghost: false,
});

const options = inject<Ref<Required<TimelineOptions>>>('timelineOptions', { value: DEFAULT_OPTIONS } as any);
const rowEvents = inject<any>('rowEvents', {});
const totalWidth = inject<any>('timelineTotalWidth', { value: '100%' });
const startRowDrag = inject<(rowId: string, e: MouseEvent) => void>('startRowDrag', () => {});

const showRowDragHandle = computed(() => options.value.enableRowDrag && !props.ghost);

const rowClass = computed(() => [
  ...(props.rowData.classNames || []),
  {
    selected: props.rowData.selected,
    ghost: props.ghost,
  },
]);

function getTime(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = e.clientX - rect.left;
  return pixelToTime(x, options.value);
}

function onRowDragHandleMouseDown(e: MouseEvent) {
  startRowDrag(props.rowData.id, e);
}

function onClick(e: MouseEvent) {
  if (props.ghost) return;
  if ((e.target as HTMLElement).closest('.timeline-action')) return;
  rowEvents.onClick?.(e, { row: props.rowData, time: getTime(e) });
}

function onDoubleClick(e: MouseEvent) {
  if (props.ghost) return;
  if ((e.target as HTMLElement).closest('.timeline-action')) return;
  rowEvents.onDoubleClick?.(e, { row: props.rowData, time: getTime(e) });
}

function onContextMenu(e: MouseEvent) {
  if (props.ghost) return;
  if ((e.target as HTMLElement).closest('.timeline-action')) return;
  rowEvents.onContextMenu?.(e, { row: props.rowData, time: getTime(e) });
}
</script>

<style scoped>
.timeline-row {
  position: relative;
  width: 100%;
  border-bottom: 1px solid var(--timeline-border-color);
  background-color: transparent;
  box-sizing: border-box;
}

.timeline-row.selected {
  background-color: rgba(255, 255, 255, 0.05);
}

.timeline-row.ghost {
  opacity: 0.9;
}

.row-drag-handle {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: var(--timeline-start-left);
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  cursor: grab;
  z-index: 15;
}

.row-drag-handle:active {
  cursor: grabbing;
}

.row-drag-handle-icon {
  width: 12px;
  height: 12px;
  opacity: 0.85;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 12px 12px;
  background-image:
    linear-gradient(#919191 0 0),
    linear-gradient(#919191 0 0),
    linear-gradient(#919191 0 0),
    linear-gradient(#919191 0 0),
    linear-gradient(#919191 0 0),
    linear-gradient(#919191 0 0);
  background-size: 3px 3px;
  background-position:
    1px 1px,
    8px 1px,
    1px 5px,
    8px 5px,
    1px 9px,
    8px 9px;
}
</style>
