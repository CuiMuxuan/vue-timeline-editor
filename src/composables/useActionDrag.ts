import { ref, type Ref } from 'vue';
import type { TimelineAction, TimelineOptions, TimelineRow } from '../interface/common';
import { getSnapTime } from '../utils/snap';

interface DragCallbacks {
  onActionMoveStart?: (params: { action: TimelineAction; row: TimelineRow }) => void;
  onActionMoving?: (params: { action: TimelineAction; row: TimelineRow; start: number; end: number }) => void;
  onActionMoveEnd?: (params: { action: TimelineAction; row: TimelineRow; start: number; end: number }) => void;
  onActionResizeStart?: (params: { action: TimelineAction; row: TimelineRow; dir: 'left' | 'right' }) => void;
  onActionResizing?: (params: { action: TimelineAction; row: TimelineRow; start: number; end: number; dir: 'left' | 'right' }) => void;
  onActionResizeEnd?: (params: { action: TimelineAction; row: TimelineRow; start: number; end: number; dir: 'left' | 'right' }) => void;
}

interface ActionUpdatePayload {
  action: TimelineAction;
  fromRowId: string;
  toRowId?: string;
  commit: boolean;
}

const AUTO_SCROLL_EDGE = 18;
const AUTO_SCROLL_MAX_SPEED = 24;
const SNAP_THRESHOLD_PX = 8;

function getRowById(rows: TimelineRow[], rowId: string): TimelineRow | undefined {
  return rows.find((item) => item.id === rowId);
}

function getRowFromClientY(
  clientY: number,
  rows: TimelineRow[],
  rowHeight: number,
  container: HTMLElement | null,
  fallbackRowId: string
) {
  if (!container || rows.length === 0) return fallbackRowId;

  const rect = container.getBoundingClientRect();
  const relativeY = clientY - rect.top + container.scrollTop;
  if (Number.isNaN(relativeY)) return fallbackRowId;

  let cursor = 0;
  for (const row of rows) {
    const height = row.rowHeight ?? rowHeight;
    if (relativeY >= cursor && relativeY < cursor + height) {
      return row.id;
    }
    cursor += height;
  }

  if (relativeY < 0) return rows[0]?.id ?? fallbackRowId;
  return rows[rows.length - 1]?.id ?? fallbackRowId;
}

function getActionsWithoutSelf(rows: TimelineRow[], actionId: string) {
  return rows.flatMap((row) => row.actions).filter((item) => item.id !== actionId);
}

function getRowActionsWithoutSelf(rows: TimelineRow[], rowId: string, actionId: string) {
  const row = getRowById(rows, rowId);
  return (row?.actions ?? []).filter((item) => item.id !== actionId);
}

function hasOverlap(start: number, end: number, target: TimelineAction) {
  return start < target.end && end > target.start;
}

function clampMoveByOverlap(
  start: number,
  end: number,
  others: TimelineAction[],
  direction: number
) {
  const sorted = [...others].sort((a, b) => a.start - b.start);
  const duration = Math.max(end - start, 0);
  let moveDirection = direction === 0 ? 1 : direction;
  let nextStart = Math.max(0, start);

  for (let index = 0; index <= sorted.length + 1; index += 1) {
    const overlap = sorted.find((item) => hasOverlap(nextStart, nextStart + duration, item));
    if (!overlap) break;

    nextStart = moveDirection >= 0 ? overlap.end : overlap.start - duration;
    if (nextStart < 0) {
      nextStart = 0;
      moveDirection = 1;
    }
  }

  return {
    start: nextStart,
    end: nextStart + duration,
  };
}

function clampResizeLeftByOverlap(
  start: number,
  end: number,
  minDuration: number,
  others: TimelineAction[]
) {
  const sorted = [...others].sort((a, b) => a.start - b.start);
  let nextStart = Math.min(start, end - minDuration);
  nextStart = Math.max(0, nextStart);

  for (let index = 0; index <= sorted.length + 1; index += 1) {
    const overlap = sorted.find((item) => hasOverlap(nextStart, end, item));
    if (!overlap) break;
    nextStart = Math.min(Math.max(overlap.end, 0), end - minDuration);
  }

  return nextStart;
}

function clampResizeRightByOverlap(
  start: number,
  end: number,
  minDuration: number,
  others: TimelineAction[]
) {
  const sorted = [...others].sort((a, b) => a.start - b.start);
  let nextEnd = Math.max(end, start + minDuration);

  for (let index = 0; index <= sorted.length + 1; index += 1) {
    const overlap = sorted.find((item) => hasOverlap(start, nextEnd, item));
    if (!overlap) break;
    nextEnd = Math.max(overlap.start, start + minDuration);
  }

  return nextEnd;
}

export function useActionDrag(
  action: Ref<TimelineAction>,
  options: Ref<Required<TimelineOptions>>,
  allRows: Ref<TimelineRow[]>,
  container: Ref<HTMLElement | null>,
  autoScroll: Ref<boolean>,
  snapLines: Ref<number[]>,
  dragCallbacks: DragCallbacks,
  rowId: string,
  emitChange: (payload: ActionUpdatePayload) => void
) {
  const isDragging = ref(false);
  const dragType = ref<'move' | 'left' | 'right' | null>(null);

  const startX = ref(0);
  const startScrollLeft = ref(0);
  const originalStart = ref(0);
  const originalEnd = ref(0);
  const targetRowId = ref(rowId);

  const draftAction = ref<TimelineAction | null>(null);

  let lastMouseEvent: MouseEvent | null = null;
  let autoScrollFrame: number | null = null;
  let autoScrollDelta = 0;

  function stopAutoScroll() {
    autoScrollDelta = 0;
    if (autoScrollFrame !== null) {
      cancelAnimationFrame(autoScrollFrame);
      autoScrollFrame = null;
    }
  }

  function runAutoScroll() {
    if (autoScrollFrame !== null) return;

    const loop = () => {
      if (!container.value || autoScrollDelta === 0 || !lastMouseEvent) {
        autoScrollFrame = null;
        return;
      }

      const preScrollLeft = container.value.scrollLeft;
      container.value.scrollLeft = Math.max(0, preScrollLeft + autoScrollDelta);
      if (container.value.scrollLeft !== preScrollLeft) {
        updateActionPosition();
      }

      autoScrollFrame = requestAnimationFrame(loop);
    };

    autoScrollFrame = requestAnimationFrame(loop);
  }

  function updateAutoScroll(e: MouseEvent) {
    if (!autoScroll.value || !container.value) {
      stopAutoScroll();
      return;
    }

    const rect = container.value.getBoundingClientRect();
    const leftEdge = rect.left + AUTO_SCROLL_EDGE;
    const rightEdge = rect.right - AUTO_SCROLL_EDGE;

    if (e.clientX < leftEdge) {
      const over = leftEdge - e.clientX;
      autoScrollDelta = -Math.min(AUTO_SCROLL_MAX_SPEED, Math.max(2, over / 5));
      runAutoScroll();
      return;
    }

    if (e.clientX > rightEdge) {
      const over = e.clientX - rightEdge;
      autoScrollDelta = Math.min(AUTO_SCROLL_MAX_SPEED, Math.max(2, over / 5));
      runAutoScroll();
      return;
    }

    stopAutoScroll();
  }

  function handleMouseDown(e: MouseEvent, type: 'move' | 'left' | 'right') {
    if (
      options.value.disableDrag ||
      action.value.disable ||
      (type === 'move' && action.value.movable === false) ||
      (type !== 'move' && action.value.flexible === false)
    ) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    isDragging.value = true;
    dragType.value = type;
    targetRowId.value = rowId;
    startX.value = e.clientX;
    startScrollLeft.value = container.value?.scrollLeft || 0;
    originalStart.value = action.value.start;
    originalEnd.value = action.value.end;
    draftAction.value = { ...action.value };
    lastMouseEvent = e;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const row = getRowById(allRows.value, rowId);
    if (row) {
      if (type === 'move') {
        dragCallbacks.onActionMoveStart?.({ action: action.value, row });
      } else {
        dragCallbacks.onActionResizeStart?.({ action: action.value, row, dir: type });
      }
    }
  }

  function applyActionLimits(nextStart: number, nextEnd: number) {
    const duration = Math.max(nextEnd - nextStart, 0);
    let start = Math.max(0, nextStart);
    let end = start + duration;

    if (action.value.minStart !== undefined && start < action.value.minStart) {
      start = action.value.minStart;
      end = start + duration;
    }

    if (action.value.maxEnd !== undefined && end > action.value.maxEnd) {
      end = action.value.maxEnd;
      start = end - duration;
      if (action.value.minStart !== undefined) {
        start = Math.max(start, action.value.minStart);
        end = start + duration;
      }
    }

    return { start, end };
  }

  function updateActionPosition() {
    if (!isDragging.value || !lastMouseEvent || !container.value || !dragType.value) return;

    const currentX = lastMouseEvent.clientX;
    const currentScrollLeft = container.value.scrollLeft;
    const pixelDelta = (currentX - startX.value) + (currentScrollLeft - startScrollLeft.value);
    const deltaTime = (pixelDelta / options.value.scaleWidth) * options.value.scale;
    const minDuration = options.value.scale / options.value.scaleSplitCount;

    let newStart = originalStart.value;
    let newEnd = originalEnd.value;
    const moveDirection = Math.sign(deltaTime);

    const allOtherActions = getActionsWithoutSelf(allRows.value, action.value.id);
    const rowForMove = dragType.value === 'move'
      ? getRowFromClientY(
          lastMouseEvent.clientY,
          allRows.value,
          options.value.rowHeight,
          container.value,
          rowId
        )
      : rowId;
    targetRowId.value = rowForMove;
    const targetRowActions = getRowActionsWithoutSelf(allRows.value, rowForMove, action.value.id);

    snapLines.value = [];

    if (dragType.value === 'move') {
      newStart += deltaTime;
      newEnd += deltaTime;

      ({ start: newStart, end: newEnd } = applyActionLimits(newStart, newEnd));

      const snapStart = getSnapTime(newStart, allOtherActions, action.value.id, options.value, SNAP_THRESHOLD_PX);
      const snapEnd = getSnapTime(newEnd, allOtherActions, action.value.id, options.value, SNAP_THRESHOLD_PX);

      const startDiff = Math.abs(snapStart.time - newStart);
      const endDiff = Math.abs(snapEnd.time - newEnd);
      if (snapStart.snapped || snapEnd.snapped) {
        if (startDiff <= endDiff) {
          const delta = snapStart.time - newStart;
          newStart = snapStart.time;
          newEnd += delta;
          if (options.value.dragLine) snapLines.value = snapStart.snapLines;
        } else {
          const delta = snapEnd.time - newEnd;
          newEnd = snapEnd.time;
          newStart += delta;
          if (options.value.dragLine) snapLines.value = snapEnd.snapLines;
        }
      }

      ({ start: newStart, end: newEnd } = clampMoveByOverlap(newStart, newEnd, targetRowActions, moveDirection));
      ({ start: newStart, end: newEnd } = applyActionLimits(newStart, newEnd));
    } else if (dragType.value === 'left') {
      newStart += deltaTime;
      newStart = Math.min(newStart, newEnd - minDuration);
      newStart = Math.max(newStart, action.value.minStart ?? 0);

      const snap = getSnapTime(newStart, allOtherActions, action.value.id, options.value, SNAP_THRESHOLD_PX);
      if (snap.snapped) {
        newStart = snap.time;
        if (options.value.dragLine) snapLines.value = snap.snapLines;
      }

      newStart = clampResizeLeftByOverlap(newStart, newEnd, minDuration, targetRowActions);
      newStart = Math.max(newStart, action.value.minStart ?? 0);
      newStart = Math.min(newStart, newEnd - minDuration);
    } else if (dragType.value === 'right') {
      newEnd += deltaTime;
      newEnd = Math.max(newEnd, newStart + minDuration);
      if (action.value.maxEnd !== undefined) {
        newEnd = Math.min(newEnd, action.value.maxEnd);
      }

      const snap = getSnapTime(newEnd, allOtherActions, action.value.id, options.value, SNAP_THRESHOLD_PX);
      if (snap.snapped) {
        newEnd = snap.time;
        if (options.value.dragLine) snapLines.value = snap.snapLines;
      }

      newEnd = clampResizeRightByOverlap(newStart, newEnd, minDuration, targetRowActions);
      newEnd = Math.max(newEnd, newStart + minDuration);
      if (action.value.maxEnd !== undefined) {
        newEnd = Math.min(newEnd, action.value.maxEnd);
      }
    }

    const nextAction = {
      ...action.value,
      start: Math.max(0, newStart),
      end: Math.max(newStart, newEnd),
    };
    draftAction.value = nextAction;

    const callbackRow = getRowById(allRows.value, rowForMove) ?? getRowById(allRows.value, rowId);
    if (callbackRow) {
      if (dragType.value === 'move') {
        dragCallbacks.onActionMoving?.({
          action: nextAction,
          row: callbackRow,
          start: nextAction.start,
          end: nextAction.end,
        });
      } else {
        dragCallbacks.onActionResizing?.({
          action: nextAction,
          row: callbackRow,
          start: nextAction.start,
          end: nextAction.end,
          dir: dragType.value,
        });
      }
    }

    emitChange({
      action: nextAction,
      fromRowId: rowId,
      toRowId: rowId,
      commit: false,
    });
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging.value) return;

    lastMouseEvent = e;
    updateAutoScroll(e);
    updateActionPosition();
  }

  function handleMouseUp() {
    if (isDragging.value) {
      updateActionPosition();
    }

    const finalAction = draftAction.value ?? action.value;
    const finalRowId = dragType.value === 'move' ? targetRowId.value : rowId;
    const callbackRow = getRowById(allRows.value, finalRowId) ?? getRowById(allRows.value, rowId);

    if (callbackRow && dragType.value) {
      if (dragType.value === 'move') {
        dragCallbacks.onActionMoveEnd?.({
          action: finalAction,
          row: callbackRow,
          start: finalAction.start,
          end: finalAction.end,
        });
      } else {
        dragCallbacks.onActionResizeEnd?.({
          action: finalAction,
          row: callbackRow,
          start: finalAction.start,
          end: finalAction.end,
          dir: dragType.value,
        });
      }
    }

    if (dragType.value) {
      emitChange({
        action: finalAction,
        fromRowId: rowId,
        toRowId: finalRowId,
        commit: true,
      });
    }

    isDragging.value = false;
    dragType.value = null;
    draftAction.value = null;
    snapLines.value = [];
    stopAutoScroll();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  return {
    handleMouseDown,
    isDragging,
  };
}
