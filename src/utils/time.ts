import type { TimelineOptions, TimelineRow } from '../interface/common';

export const DEFAULT_OPTIONS: Required<TimelineOptions> = {
  scale: 1,
  scaleSplitCount: 10,
  scaleWidth: 160,
  startLeft: 20,
  enableRowDrag: false,
  rowHeight: 32,
  minScaleCount: 20,
  maxScaleCount: Infinity,
  duration: 0,
  gridSnap: false,
  dragLine: false,
  disableDrag: false,
  hideCursor: false,
  backgroundColor: '#1e1e1e',
  contentBackgroundColor: '#1a1a1a',
  borderColor: '#333',
  gridColor: '#2a2a2a',
  cursorColor: '#ff4d4f',
  actionColor: '#3e82f7',
  snapLineColor: '#fadb14',
};

/**
 * Convert time (seconds) to pixel position
 */
export function timeToPixel(time: number, options: TimelineOptions): number {
  const { scale = 1, scaleWidth = 160, startLeft = 20 } = options;
  return (time / scale) * scaleWidth + startLeft;
}

/**
 * Convert pixel position to time (seconds)
 */
export function pixelToTime(pixel: number, options: TimelineOptions): number {
  const { scale = 1, scaleWidth = 160, startLeft = 20 } = options;
  const time = ((pixel - startLeft) / scaleWidth) * scale;
  return Math.max(0, time);
}

/**
 * Snap time to the nearest grid subdivision
 */
export function snapTime(time: number, options: TimelineOptions): number {
  const { scale = 1, scaleSplitCount = 10, gridSnap = false } = options;
  if (!gridSnap) return time;
  
  const unit = scale / scaleSplitCount;
  return Math.round(time / unit) * unit;
}

/**
 * Format time to string (e.g. 00:00.00)
 * Simple implementation, can be enhanced
 */
export function formatTime(time: number): string {
  const absTime = Math.abs(time);
  const minutes = Math.floor(absTime / 60);
  const seconds = Math.floor(absTime % 60);
  const milliseconds = Math.floor((absTime % 1) * 100);
  
  const m = minutes.toString().padStart(2, '0');
  const s = seconds.toString().padStart(2, '0');
  const ms = milliseconds.toString().padStart(2, '0');
  
  return `${m}:${s}.${ms}`;
}

export function getMaxActionEnd(rows: TimelineRow[]): number {
  let maxEnd = 0;

  for (const row of rows) {
    for (const action of row.actions) {
      if (action.end > maxEnd) {
        maxEnd = action.end;
      }
    }
  }

  return maxEnd;
}

export function getDurationByWidth(width: number, options: TimelineOptions): number {
  const safeWidth = Math.max(width, 0);
  return pixelToTime(safeWidth, options);
}
