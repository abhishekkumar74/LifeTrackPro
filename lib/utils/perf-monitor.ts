export function measureRender(
  componentName: string,
  fn: () => void
): void {
  if (!__DEV__) {
    fn();
    return;
  }
  
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  
  if (duration > 16) {
    // Longer than 1 frame (60fps = 16.67ms)
    console.warn(
      `Slow render: ${componentName} took ${duration.toFixed(1)}ms`
    );
  }
}
