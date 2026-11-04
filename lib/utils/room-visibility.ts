export type RoomVisibility = 'public' | 'friends' | 'private';

export interface ParsedRoomSubject {
  displaySubject: string | null;
  visibility: RoomVisibility;
}

/**
 * Parses raw room subject string and determines clean subject & visibility.
 * Backward-compatible: if rawSubject does not have a suffix, it defaults to:
 * - 'public' if isPublic is true
 * - 'private' if isPublic is false
 */
export function parseRoomSubject(
  rawSubject?: string | null,
  isPublic: boolean = true
): ParsedRoomSubject {
  if (!rawSubject || !rawSubject.trim()) {
    return {
      displaySubject: null,
      visibility: isPublic ? 'public' : 'private',
    };
  }

  const s = rawSubject.trim();
  if (s.endsWith('::friends')) {
    const clean = s.replace(/::friends$/, '').trim();
    return {
      displaySubject: clean || null,
      visibility: 'friends',
    };
  }
  if (s.endsWith('::private')) {
    const clean = s.replace(/::private$/, '').trim();
    return {
      displaySubject: clean || null,
      visibility: 'private',
    };
  }
  if (s.endsWith('::public')) {
    const clean = s.replace(/::public$/, '').trim();
    return {
      displaySubject: clean || null,
      visibility: 'public',
    };
  }

  return {
    displaySubject: s || null,
    visibility: isPublic ? 'public' : 'private',
  };
}

/**
 * Encodes visibility metadata into the subject string if necessary.
 */
export function encodeRoomSubject(
  subject: string | null | undefined,
  visibility: RoomVisibility
): string | null {
  const clean = (subject || '').replace(/[<>"';&]/g, '').trim();
  if (visibility === 'public') {
    return clean || null;
  }
  return clean ? `${clean}::${visibility}` : `::${visibility}`;
}
