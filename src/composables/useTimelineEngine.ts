import { ref, computed, onUnmounted } from 'vue';

export interface TimelineEngineOptions {
  onTimeUpdate?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

export function useTimelineEngine(options: TimelineEngineOptions = {}) {
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const playbackRate = ref(1);
  
  let animationFrameId: number | null = null;
  let lastFrameTime = 0;

  const togglePlay = () => {
    if (isPlaying.value) {
      pause();
    } else {
      play();
    }
  };

  const play = (params?: { toTime?: number; autoEnd?: boolean }) => {
    if (isPlaying.value) return true;
    
    // Use params if needed, currently unused but kept for API compatibility
    if (params?.toTime !== undefined) {
      currentTime.value = params.toTime;
    }
    
    isPlaying.value = true;
    lastFrameTime = performance.now();
    
    if (options.onPlay) options.onPlay();
    
    _loop();
    return true;
  };

  const pause = () => {
    if (!isPlaying.value) return;
    
    isPlaying.value = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    if (options.onPause) options.onPause();
  };

  const setTime = (time: number) => {
    currentTime.value = Math.max(0, time);
    if (options.onTimeUpdate) options.onTimeUpdate(currentTime.value);
  };

  const setPlayRate = (rate: number) => {
    playbackRate.value = rate;
  };

  const _loop = () => {
    if (!isPlaying.value) return;

    const now = performance.now();
    const deltaTime = (now - lastFrameTime) / 1000; // seconds
    lastFrameTime = now;

    const newTime = currentTime.value + deltaTime * playbackRate.value;
    setTime(newTime);

    animationFrameId = requestAnimationFrame(_loop);
  };

  onUnmounted(() => {
    pause();
  });

  return {
    isPlaying: computed(() => isPlaying.value),
    currentTime: computed(() => currentTime.value),
    playbackRate: computed(() => playbackRate.value),
    play,
    pause,
    togglePlay,
    setTime,
    setPlayRate,
  };
}
