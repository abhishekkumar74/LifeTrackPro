/**
 * Utility functions for consistent subject color mapping across LifeTrack Pro.
 */

const COLOR_MAP: Record<string, string> = {
  'physics': '#5B4FE8',
  'chemistry': '#00B894',
  'biology': '#E8A020',
  'mathematics': '#E85858',
  'math': '#E85858',
  'english': '#0EA5E9',
  'history': '#8B6FE8',
  'geography': '#14B8A6',
  'economics': '#F59E0B',
  'computer science': '#6366F1',
  'general studies': '#10B981',
  'reasoning': '#EC4899',

  // CSE Subjects
  'data structures & algorithms': '#5B4FE8',
  'dsa': '#5B4FE8',
  'java programming': '#E85858',
  'java': '#E85858',
  'object oriented design': '#00B894',
  'ood': '#00B894',
  'oops': '#00B894',
  'system design': '#E8A020',
  'backend development': '#6C5CE7',
  'backend': '#6C5CE7',
  'computer science fundamentals': '#0984E3',
  'cs fundamentals': '#0984E3',
  'operating systems': '#0984E3',
  'computer networks': '#0984E3',
  'interview preparation': '#00B894',
  'web development': '#E17055',
  'react': '#E17055',
  'cloud & devops': '#74B9FF',
  'aws': '#74B9FF',
  'docker': '#74B9FF',
};

const DEFAULT_COLOR = '#9B9BAF';

/**
 * Returns a hex color string for the given subject.
 * Matches case-insensitively.
 */
export function getSubjectColor(subject: string | null | undefined): string {
  if (!subject) return DEFAULT_COLOR;
  const normalized = subject.trim().toLowerCase();
  
  // Direct matches
  if (COLOR_MAP[normalized]) {
    return COLOR_MAP[normalized];
  }
  
  // Partial matches for convenience
  if (normalized.includes('phys')) return COLOR_MAP.physics;
  if (normalized.includes('chem')) return COLOR_MAP.chemistry;
  if (normalized.includes('biol')) return COLOR_MAP.biology;
  if (normalized.includes('math')) return COLOR_MAP.math;
  if (normalized.includes('english')) return COLOR_MAP.english;
  if (normalized.includes('history')) return COLOR_MAP.history;
  if (normalized.includes('geogr')) return COLOR_MAP.geography;
  if (normalized.includes('econ')) return COLOR_MAP.economics;
  if (normalized.includes('comp') && !normalized.includes('networks') && !normalized.includes('fundamentals')) return COLOR_MAP['computer science'];
  if (normalized.includes('general')) return COLOR_MAP['general studies'];
  if (normalized.includes('reason')) return COLOR_MAP.reasoning;

  // CSE partial matches
  if (normalized.includes('data structures') || normalized.includes('dsa')) return COLOR_MAP.dsa;
  if (normalized.includes('java')) return COLOR_MAP.java;
  if (normalized.includes('object oriented') || normalized.includes('ood') || normalized.includes('oops')) return COLOR_MAP.ood;
  if (normalized.includes('system design')) return COLOR_MAP['system design'];
  if (normalized.includes('backend')) return COLOR_MAP.backend;
  if (normalized.includes('operating system')) return COLOR_MAP['operating systems'];
  if (normalized.includes('network')) return COLOR_MAP['computer networks'];
  if (normalized.includes('fundamentals') || normalized.includes('cs fund')) return COLOR_MAP['computer science fundamentals'];
  if (normalized.includes('interview')) return COLOR_MAP['interview preparation'];
  if (normalized.includes('web dev') || normalized.includes('react')) return COLOR_MAP['web development'];
  if (normalized.includes('cloud') || normalized.includes('devops') || normalized.includes('aws') || normalized.includes('docker')) return COLOR_MAP['cloud & devops'];
  
  return DEFAULT_COLOR;
}

/**
 * Generates a soft translucent version (typically 8% opacity) of the subject color.
 * Used for badge backgrounds.
 */
export function getSubjectBgColor(color: string): string {
  if (color.startsWith('#') && color.length === 7) {
    return color + '15'; // Append '15' for ~8% opacity
  }
  return 'rgba(155, 155, 175, 0.08)';
}
