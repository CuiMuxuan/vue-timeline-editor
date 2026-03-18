<template>
  <div 
    class="timeline-action"
    :class="classNames"
    :style="style"
    @mousedown="onMouseDown"
    @click.stop="onClick"
    @dblclick.stop="onDoubleClick"
    @contextmenu.prevent.stop="onContextMenu"
  >
    <div class="timeline-action-content">
      <slot name="action" :action="action">
        <div class="action-label">{{ action.id }}</div>
      </slot>
    </div>
    
    <!-- Resize Handles -->
    <div 
      v-if="action.flexible !== false" 
      class="resize-handle left" 
      @mousedown.stop="onResizeStart('left', $event)"
    ></div>
    <div 
      v-if="action.flexible !== false" 
      class="resize-handle right" 
      @mousedown.stop="onResizeStart('right', $event)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, toRef, type Ref } from 'vue';
import type { TimelineAction, TimelineOptions, TimelineRow } from '../../interface/common';
import { timeToPixel, DEFAULT_OPTIONS } from '../../utils/time';
import { useActionDrag } from '../../composables/useActionDrag';

const props = defineProps<{
  action: TimelineAction;
  rowId: string;
}>();

const options = inject<Ref<Required<TimelineOptions>>>('timelineOptions', { value: DEFAULT_OPTIONS } as any);
const timelineBody = inject<Ref<HTMLElement | null>>('timelineBody', { value: null } as any);
const autoScroll = inject<Ref<boolean>>('autoScroll', { value: false } as any);
const dragCallbacks = inject<any>('dragCallbacks', {});
const actionEvents = inject<any>('actionEvents', {});
const snapLines = inject<Ref<number[]>>('snapLines', { value: [] } as any);
const timelineRows = inject<Ref<TimelineRow[]>>('timelineRows', { value: [] } as any);
const updateAction = inject<
  (payload: { action: TimelineAction; fromRowId: string; toRowId?: string; commit: boolean }) => void
>('updateAction', () => {});

const { handleMouseDown, isDragging } = useActionDrag(
  toRef(props, 'action'),
  options,
  timelineRows,
  timelineBody,
  autoScroll,
  snapLines,
  dragCallbacks,
  props.rowId,
  (payload) => updateAction(payload)
);

const style = computed(() => {
  const left = timeToPixel(props.action.start, options.value);
  const width = timeToPixel(props.action.end, options.value) - left;
  
  return {
    left: `${left}px`,
    width: `${width}px`,
    backgroundColor: props.action.data?.color || 'var(--timeline-action-color)',
  };
});

const classNames = computed(() => [
  ...(props.action.classNames || []),
  `effect-${props.action.effectId}`,
  {
    selected: props.action.selected,
    flexible: props.action.flexible !== false,
    movable: props.action.movable !== false,
    dragging: isDragging.value,
  },
]);

function onMouseDown(e: MouseEvent) {
  handleMouseDown(e, 'move');
}

function onResizeStart(direction: 'left' | 'right', e: MouseEvent) {
  handleMouseDown(e, direction);
}

function onClick(e: MouseEvent) {
  const row = timelineRows.value.find((item) => item.id === props.rowId);
  if (!row) return;
  actionEvents.onClick?.(e, { action: props.action, row });
}

function onDoubleClick(e: MouseEvent) {
  const row = timelineRows.value.find((item) => item.id === props.rowId);
  if (!row) return;
  actionEvents.onDoubleClick?.(e, { action: props.action, row });
}

function onContextMenu(e: MouseEvent) {
  const row = timelineRows.value.find((item) => item.id === props.rowId);
  if (!row) return;
  actionEvents.onContextMenu?.(e, { action: props.action, row });
}
</script>

<style scoped>
.timeline-action {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  background-color: var(--timeline-action-color);
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  overflow: hidden;
  transition: background-color 0.2s, box-shadow 0.2s;
  user-select: none;
}

.timeline-action.selected {
  border: 1px solid #fff;
  background-color: #5d9afc;
  z-index: 11;
}

.timeline-action.movable {
  cursor: grab;
}

.timeline-action.movable:active, .timeline-action.dragging {
  cursor: grabbing;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  z-index: 20;
}

.timeline-action-content {
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: white;
  width: 100%;
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px; /* Wider hit area */
  cursor: col-resize;
  background-color: rgba(0, 0, 0, 0);
  z-index: 5;
}

.timeline-action:hover .resize-handle {
  background-color: rgba(0, 0, 0, 0.1);
}

.resize-handle.left {
  left: 0;
}

.resize-handle.right {
  right: 0;
}
</style>
