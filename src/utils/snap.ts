import type { TimelineAction, TimelineOptions } from '../interface/common';
import { snapTime } from './time';

export interface SnapResult {
  time: number;
  snapped: boolean;
  snapLines: number[]; // Time points where snap occurred
}

/**
 * Calculate snapped time based on grid and other actions
 */
export function getSnapTime(
  time: number,
  actions: TimelineAction[],
  currentActionId: string,
  options: TimelineOptions,
  thresholdPx = 8
): SnapResult {
  const { scale = 1, scaleWidth = 160 } = options;
  const thresholdTime = (thresholdPx / scaleWidth) * scale;

  let bestTime = time;
  let snapped = false;
  const snapLines: number[] = [];
  let bestDiff = Number.POSITIVE_INFINITY;

  // 1. Grid Snap (always available when enabled)
  if (options.gridSnap) {
    const gridTime = snapTime(time, options);
    const gridDiff = Math.abs(gridTime - time);
    bestTime = gridTime;
    bestDiff = gridDiff;
    snapped = true;
  }

  // 2. Auxiliary Line Snap (priority over grid when closer and in threshold)
  if (options.dragLine) {
    let dragLineBestTime = time;
    let dragLineBestDiff = Number.POSITIVE_INFINITY;

    actions.forEach(action => {
      if (action.id === currentActionId) return;

      const checkPoints = [action.start, action.end];
      checkPoints.forEach(point => {
        const dist = Math.abs(point - time);
        if (dist <= thresholdTime && dist < dragLineBestDiff) {
          dragLineBestTime = point;
          dragLineBestDiff = dist;
        }
      });
    });

    if (dragLineBestDiff < Number.POSITIVE_INFINITY && dragLineBestDiff <= bestDiff) {
      bestTime = dragLineBestTime;
      bestDiff = dragLineBestDiff;
      snapped = true;
      snapLines.push(dragLineBestTime);
    }
  }

  return { time: bestTime, snapped, snapLines };
}
