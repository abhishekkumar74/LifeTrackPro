import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pin } from 'lucide-react-native';
import { Note } from '@/types/app.types';
import { getSubjectColor } from '@/lib/utils/subject-colors';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onPin: (id: string) => void;
  searchQuery?: string;
}

// Simple strip markdown function for previews
const getNotePreview = (content: string): string => {
  if (!content) return 'Empty note';
  
  let plainText = content;
  if (content.startsWith('{"front":')) {
    try {
      const parsed = JSON.parse(content);
      plainText = `Front: ${parsed.front} | Back: ${parsed.back}`;
    } catch (e) {
      // fallback
    }
  }

  return plainText
    .replace(/##\s/g, '')
    .replace(/•\s/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
};

// Calculate read time based on word count
const getReadTime = (content: string): string => {
  if (!content) return '1 min read';
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

// Format ISO date to a short representation
const formatNoteDate = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Simple escape regex helper
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Highlight matched text helper
const HighlightText = ({ text, query, style }: { text: string; query: string; style: any }) => {
  if (!query.trim()) return <Text style={style}>{text}</Text>;

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        const isMatch = part.toLowerCase() === query.trim().toLowerCase();
        return (
          <Text key={i} style={isMatch ? [style, styles.highlightTextMatched] : style}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
};

// Snippet extraction helper that centers on the query match
const getNoteSnippet = (content: string, query: string): string => {
  if (!content) return 'Empty note';
  
  let plainText = content;
  if (content.startsWith('{"front":')) {
    try {
      const parsed = JSON.parse(content);
      plainText = `Front: ${parsed.front} | Back: ${parsed.back}`;
    } catch (e) {
      // fallback
    }
  }

  const cleanContent = plainText
    .replace(/##\s/g, '')
    .replace(/•\s/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!query.trim()) return cleanContent.substring(0, 100);

  const idx = cleanContent.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return cleanContent.substring(0, 100);

  const start = Math.max(0, idx - 30);
  const end = Math.min(cleanContent.length, idx + query.length + 60);
  let snippet = cleanContent.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < cleanContent.length) snippet = snippet + '...';
  return snippet;
};

export const NoteCard = React.memo<NoteCardProps>(({ note, onPress, onPin, searchQuery = '' }) => {
  const subject = note.subject || 'General';
  const accentColor = getSubjectColor(subject);
  const softBgColor = `${accentColor}12`;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const isDue = note.next_review ? note.next_review <= todayStr : false;

  const dateText = formatNoteDate(note.updated_at || note.created_at);
  const readTimeText = getReadTime(note.content);

  // If a search query is active, extract a keyword-focused snippet, otherwise use default preview
  const previewText = useMemo(() => {
    return searchQuery.trim()
      ? getNoteSnippet(note.content, searchQuery)
      : getNotePreview(note.content);
  }, [note.content, searchQuery]);

  return (
    <TouchableOpacity
      style={[styles.container, isDue && styles.containerDue]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Subject accent left bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.cardContent}>
        {/* Header tag and pin icon */}
        <View style={styles.headerRow}>
          <Text style={styles.subjectTag}>{subject}</Text>
          <View style={styles.headerRight}>
            {isDue && (
              <View style={styles.dueBadge}>
                <Text style={styles.dueText}>📅 Due for revision</Text>
              </View>
            )}
            {note.is_pinned && (
              <TouchableOpacity
                onPress={() => onPin(note.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Pin size={12} color="#5B4FE8" fill="#5B4FE8" style={styles.pinIcon} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Note Title (Highlighted if matched) */}
        <HighlightText
          text={note.title || 'Untitled Note'}
          query={searchQuery}
          style={styles.titleText}
        />

        {/* Note Content Preview (Highlighted snippet if matched) */}
        <HighlightText
          text={previewText}
          query={searchQuery}
          style={styles.previewText}
        />

        {/* Footer info row */}
        <View style={styles.footerRow}>
          <Text style={styles.dateText}>{`${dateText} • ${readTimeText}`}</Text>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {note.tags.slice(0, 2).map((tag, index) => (
              <View key={`${tag}-${index}`} style={[styles.tagPill, { backgroundColor: softBgColor }]}>
                <Text style={[styles.tagText, { color: accentColor }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    marginBottom: 10,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  containerDue: {
    backgroundColor: '#FEF3DC',
    borderColor: '#F5E0C0',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 3,
    height: '100%',
  },
  cardContent: {
    paddingLeft: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectTag: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  dueBadge: {
    backgroundColor: 'rgba(232, 160, 32, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dueText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    color: '#E8A020',
    fontWeight: '600',
  },
  pinIcon: {
    marginLeft: 4,
  },
  titleText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
    marginTop: 4,
  },
  previewText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 4,
    lineHeight: 16,
  },
  highlightTextMatched: {
    backgroundColor: '#FFEB3B',
    color: '#17172A',
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dateText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    fontWeight: '600',
  },
});
export default NoteCard;
