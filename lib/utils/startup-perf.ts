import { captureError } from '../sentry';

const marks: Record<string, number> = {};

export function markStart(label: string) {
  marks[label] = Date.now();
}

export function markEnd(label: string) {
  const start = marks[label];
  if (!start) return;
  const duration = Date.now() - start;
  
  if (__DEV__) {
    console.log(
      `[Perf] ${label}: ${duration}ms`
    );
  }
  
  // Warn if critical path is slow (only in production — tunnel/dev builds are always slow)
  if (!__DEV__ && duration > 5000 && label === 'app_boot') {
    captureError(
      new Error(`Slow startup: ${duration}ms`),
      { context: 'startup_perf', duration: String(duration) }
    );
  }
  
  delete marks[label];
  return duration;
}
