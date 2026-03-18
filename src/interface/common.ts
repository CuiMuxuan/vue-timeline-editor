export interface TimelineAction {
  id: string;
  start: number; // Start time (s)
  end: number;   // End time (s)
  effectId: string; // References an effect
  selected?: boolean;
  flexible?: boolean; // Resizable
  movable?: boolean;  // Movable
  disable?: boolean;
  minStart?: number;
  maxEnd?: number;
  classNames?: string[];
  // Extra data for custom rendering
  data?: Record<string, any>; 
}

export interface TimelineRow {
  id: string;
  actions: TimelineAction[];
  rowHeight?: number; // Optional override
  selected?: boolean;
  classNames?: string[];
  // Extra data for custom rendering
  data?: Record<string, any>;
}

export interface TimelineEffect {
  id: string;
  name: string;
  source?: TimelineEffectSource;
}

export interface TimelineEffectSource {
  start?: (params: EffectSourceParam) => void;
  enter?: (params: EffectSourceParam) => void;
  update?: (params: EffectSourceParam) => void;
  leave?: (params: EffectSourceParam) => void;
  stop?: (params: EffectSourceParam) => void;
}

export interface EffectSourceParam {
  time: number;
  isPlaying: boolean;
  action: TimelineAction;
  engine: any; // TimelineEngine instance - we might want to define a tighter interface for this later
}

export interface TimelineOptions {
  scale?: number; // Scale factor (default 1)
  scaleSplitCount?: number; // Subdivisions (default 10)
  scaleWidth?: number; // Width of one scale unit in px (default 160)
  startLeft?: number; // Padding left (default 20)
  enableRowDrag?: boolean; // Enable row sorting by drag handle
  rowHeight?: number; // Default row height (default 32)
  minScaleCount?: number; // Min scales to render
  maxScaleCount?: number; // Max scales to render
  duration?: number; // Content duration (s)
  gridSnap?: boolean;
  dragLine?: boolean; // Auxiliary line snap
  disableDrag?: boolean;
  hideCursor?: boolean;
  backgroundColor?: string;
  contentBackgroundColor?: string;
  borderColor?: string;
  gridColor?: string;
  cursorColor?: string;
  actionColor?: string;
  snapLineColor?: string;
}

export interface TimelineState {
  target?: HTMLElement;
  // listener?: Emitter; // We might use a different event system
  isPlaying: boolean;
  isPaused: boolean;
  setTime: (time: number) => void;
  getTime: () => number;
  setPlayRate: (rate: number) => void;
  getPlayRate: () => number;
  reRender: () => void;
  play: (param?: { toTime?: number; autoEnd?: boolean }) => boolean;
  pause: () => void;
  setScrollLeft: (val: number) => void;
  setScrollTop: (val: number) => void;
}
