/**
 * Date utility helpers for LifeTrack Pro.
 * Provides custom parsing, timelines calculations, and formatters.
 */

export function daysFromNow(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function deadlineFromTimeline(timeline: string): string {
  const today = new Date();
  let days = 90;
  const normalized = timeline.trim().toLowerCase();

  if (normalized.includes('3m') || normalized.includes('3 month')) {
    days = 90;
  } else if (normalized.includes('6m') || normalized.includes('6 month')) {
    days = 180;
  } else if (normalized.includes('1y') || normalized.includes('1 year')) {
    days = 365;
  } else if (normalized.includes('2y') || normalized.includes('2 year')) {
    days = 730;
  } else if (normalized.includes('5y') || normalized.includes('5 year')) {
    days = 1825;
  }

  today.setDate(today.getDate() + days);
  return today.toISOString().split('T')[0];
}

export function formatDeadline(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  
  return date.toLocaleDateString('en-US', options);
}

export function getTodayLocal(): string {
  return new Date().toLocaleDateString('en-CA');
}

