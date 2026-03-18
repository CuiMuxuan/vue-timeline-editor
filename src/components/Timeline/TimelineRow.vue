<template>
  <div 
    class="timeline-row" 
    :class="rowClass"
    :style="{ height: (rowData.rowHeight || options.rowHeight) + 'px', width: totalWidth + 'px' }"
    @click="onClick"
    @dblclick="onDoubleClick"
    @contextmenu="onContextMenu"
  >
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
import type { TimelineRow, TimelineOptions } from '../../interface/common';
import { DEFAULT_OPTIONS, pixelToTime } from '../../utils/time';
import TimelineAction from './TimelineAction.vue';

const props = defineProps<{
  rowData: TimelineRow;
}>();

const options = inject<Ref<Required<TimelineOptions>>>('timelineOptions', { value: DEFAULT_OPTIONS } as any);
const rowEvents = inject<any>('rowEvents', {});
const totalWidth = inject<any>('timelineTotalWidth', { value: '100%' }); // Fallback

const rowClass = computed(() => [
  ...(props.rowData.classNames || []),
  {
    selected: props.rowData.selected,
  },
]);

function getTime(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = e.clientX - rect.left; // Relative to row
  // We need to account for startLeft? 
  // timeToPixel adds startLeft.
  // pixelToTime subtracts startLeft.
  // If x is relative to row container (which starts at 0?), wait.
  // The row is inside timeline-content.
  // If we click, e.clientX is screen. rect.left is screen.
  // x is pixel offset inside the row div.
  // The row div width is totalWidth.
  // So x corresponds to the pixel position on the timeline scale.
  return pixelToTime(x, options.value);
}

function onClick(e: MouseEvent) {
  // Only trigger if target is the row itself, not an action (bubbling handled by stopPropagation in action if needed, or check target)
  // But Action has @mousedown.stop, so click might not reach here?
  // Action handles mousedown, but click event fires on mouseup.
  // We should check if default prevented or target.
  if ((e.target as HTMLElement).closest('.timeline-action')) return;
  
  rowEvents.onClick?.(e, { row: props.rowData, time: getTime(e) });
}

function onDoubleClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.timeline-action')) return;
  rowEvents.onDoubleClick?.(e, { row: props.rowData, time: getTime(e) });
}

function onContextMenu(e: MouseEvent) {
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
</style>
