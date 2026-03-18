<template>
  <div class="timeline-scale" :style="{ width: componentWidth + 'px' }" @click="onClickScale">
    <div 
      v-for="i in scaleCount" 
      :key="i" 
      class="timeline-scale-unit"
      :style="{ left: getLeft(i - 1) + 'px', width: options.scaleWidth + 'px' }"
    >
      <div class="timeline-scale-text">
        <slot name="scale-render" :scale="i - 1" :text="formatTimeText(i - 1)">
          {{ formatTimeText(i - 1) }}
        </slot>
      </div>
      <div class="timeline-scale-lines">
        <div 
          v-for="j in options.scaleSplitCount" 
          :key="j" 
          class="timeline-scale-line"
          :class="{ 'is-major': j === options.scaleSplitCount }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, type Ref } from 'vue';
import type { TimelineOptions } from '../../interface/common';
import { formatTime, DEFAULT_OPTIONS, pixelToTime } from '../../utils/time';

const optionsRef = inject<Ref<Required<TimelineOptions>>>('timelineOptions', { value: DEFAULT_OPTIONS } as any);
const timelineBody = inject<Ref<HTMLElement | null>>('timelineBody', { value: null } as any);
const setTimelineTime = inject<(time: number) => void>('setTimelineTime', () => {});
const options = computed<Required<TimelineOptions>>(() => ({ ...DEFAULT_OPTIONS, ...optionsRef.value }));

// Calculate how many scales to render
const scaleCount = computed(() => {
  // If we have a totalWidth provided by parent, use that to determine count?
  // Or simpler: TimelineEditor calculates totalWidth based on content, and passes it down.
  // We should just render enough scales to cover totalWidth.
  // But wait, TimelineEditor's totalWidth is dependent on content.
  // Let's use the injected totalWidth if available, or fallback.
  // Actually, scale logic is:
  // We need to cover the max(minScaleCount, contentDuration).
  
  // Let's rely on parent passing the width constraint or calculating it ourselves.
  // For now, let's just make sure we render enough scales to fill the parent container's scroll width.
  // But TimelineScale is in the header, which scrolls with body.
  
  // If we simply use the totalWidth computed in Editor, we can derive scaleCount.
  if (totalWidth?.value) {
    const count = Math.ceil((totalWidth.value - options.value.startLeft) / options.value.scaleWidth);
    return Math.min(options.value.maxScaleCount, Math.max(options.value.minScaleCount, count));
  }
  
  return Math.max(options.value.minScaleCount, 20);
});

const totalWidth = inject<any>('timelineTotalWidth', null);

const componentWidth = computed(() => {
  if (totalWidth?.value) return totalWidth.value;
  return scaleCount.value * options.value.scaleWidth + options.value.startLeft;
});

function getLeft(index: number) {
  return index * options.value.scaleWidth + options.value.startLeft;
}

function formatTimeText(index: number) {
  const time = index * options.value.scale;
  return formatTime(time);
}

function onClickScale(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement | null;
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left + (timelineBody.value?.scrollLeft || 0);
  const time = pixelToTime(x, options.value);
  setTimelineTime(time);
}
</script>

<style scoped>
.timeline-scale {
  height: 100%;
  position: relative;
  /* background-color: #222; */
}

.timeline-scale-unit {
  position: absolute;
  height: 100%;
  top: 0;
  border-left: 1px solid var(--timeline-grid-color);
  display: flex;
  flex-direction: column;
}

.timeline-scale-text {
  position: absolute; /* Changed to absolute to position freely */
  top: 0;
  left: 2px;
  font-size: 10px;
  color: #a5a5a5;
  height: 16px;
  line-height: 16px;
  user-select: none;
  white-space: nowrap; /* Prevent wrap */
}

.timeline-scale-lines {
  flex: 1;
  display: flex;
  align-items: flex-end;
}

.timeline-scale-line {
  flex: 1;
  height: 4px;
  border-right: 1px solid var(--timeline-border-color);
}

.timeline-scale-line.is-major {
  height: 8px;
  border-right: none; /* The unit border handles this */
}
</style>
