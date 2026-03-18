# vue-timeline-editor

一个基于 Vue 3 的时间轴编辑器组件，适用于视频剪辑、动画编排、轨道式内容编辑等场景。

## 在线演示

- GitHub Pages: https://cuimuxuan.github.io/vue-timeline-editor/

## 功能特性

- 支持多轨道（Row）+ 多片段（Action）编辑
- 支持 Action 拖拽移动、左右缩放、跨轨道移动
- 支持播放、暂停、时间游标拖拽
- 支持网格吸附（`gridSnap`）和辅助线吸附（`dragLine`）
- 支持轨道行拖拽排序（`enableRowDrag`）
- 支持通过插槽自定义刻度与 Action 渲染
- 支持丰富事件回调（移动、缩放、点击、滚动、时间更新等）
- 内置 TypeScript 类型

## 安装

```bash
npm install vue-timeline-editor
```

## 快速开始

```vue
<template>
  <TimelineEditor
    ref="timelineRef"
    v-model="rows"
    :effects="effects"
    :options="options"
    :auto-scroll="true"
    @time-update="onTimeUpdate"
  >
    <template #action="{ action }">
      <div class="action-label">{{ action.data?.label ?? action.id }}</div>
    </template>
  </TimelineEditor>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TimelineEditor, {
  type TimelineRow,
  type TimelineEffect,
  type TimelineOptions,
} from 'vue-timeline-editor'
import 'vue-timeline-editor/dist/vue-timeline-editor.css'

const timelineRef = ref<InstanceType<typeof TimelineEditor> | null>(null)

const rows = ref<TimelineRow[]>([
  {
    id: 'row-1',
    actions: [
      { id: 'a1', start: 0, end: 2, effectId: 'effect-audio', data: { label: '片段 A' } },
      { id: 'a2', start: 3, end: 5, effectId: 'effect-audio', data: { label: '片段 B' } },
    ],
  },
])

const effects: Record<string, TimelineEffect> = {
  'effect-audio': { id: 'effect-audio', name: 'Audio' },
}

const options: TimelineOptions = {
  scale: 1,
  scaleWidth: 160,
  scaleSplitCount: 10,
  startLeft: 20,
  rowHeight: 32,
  gridSnap: true,
  dragLine: true,
}

function onTimeUpdate(time: number) {
  console.log('current time:', time)
}
</script>
```

## 样式引入

推荐在入口文件引入：

```ts
import 'vue-timeline-editor/dist/vue-timeline-editor.css'
```

也支持：

```ts
import 'vue-timeline-editor/style.css'
```

## 核心类型

### `TimelineAction`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | Action 唯一标识 |
| `start` | `number` | 开始时间（秒） |
| `end` | `number` | 结束时间（秒） |
| `effectId` | `string` | 关联 effect ID |
| `selected` | `boolean` | 是否选中 |
| `flexible` | `boolean` | 是否允许缩放 |
| `movable` | `boolean` | 是否允许移动 |
| `disable` | `boolean` | 是否禁用交互 |
| `minStart` | `number` | 最小开始时间 |
| `maxEnd` | `number` | 最大结束时间 |
| `classNames` | `string[]` | 自定义类名 |
| `data` | `Record<string, any>` | 业务扩展数据 |

### `TimelineRow`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 轨道 ID |
| `actions` | `TimelineAction[]` | 轨道内 Action 列表 |
| `rowHeight` | `number` | 行高覆盖 |
| `selected` | `boolean` | 是否选中 |
| `classNames` | `string[]` | 自定义类名 |
| `data` | `Record<string, any>` | 业务扩展数据 |

### `TimelineOptions`

常用字段：`scale`、`scaleWidth`、`scaleSplitCount`、`startLeft`、`enableRowDrag`、`rowHeight`、`minScaleCount`、`maxScaleCount`、`duration`、`gridSnap`、`dragLine`、`hideCursor`，以及颜色配置项。

## 组件 Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `TimelineRow[]` | `[]` | 时间轴数据（`v-model`） |
| `effects` | `Record<string, TimelineEffect>` | `{}` | Effect 映射 |
| `options` | `TimelineOptions` | `{}` | 编辑器配置 |
| `autoScroll` | `boolean` | `false` | 拖拽到边缘时是否自动滚动 |

## 组件事件

- `update:modelValue`
- `change`
- `play`
- `pause`
- `time-update`
- `scroll`
- `click-time-area`
- `action-move-start`
- `action-moving`
- `action-move-end`
- `action-resize-start`
- `action-resizing`
- `action-resize-end`
- `click-action`
- `double-click-action`
- `context-menu-action`
- `click-row`
- `double-click-row`
- `context-menu-row`
- `row-drag-start`
- `row-drag-end`

## 暴露方法（通过 `ref`）

- `play(params?)`
- `pause()`
- `togglePlay()`
- `setTime(time)`
- `setPlayRate(rate)`
- `setScrollLeft(value)`
- `setScrollTop(value)`

## 本地开发

```bash
npm install
npm run dev
```


## 开源协议

[MIT](./LICENSE)
