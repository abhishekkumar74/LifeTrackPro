import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { ArrowLeft, MoreVertical, Plus, X, Sparkles, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubjectPicker } from '@/components/shared/SubjectPicker';
import { useUiStore } from '@/lib/store/ui.store';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';

import {
  useNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useNotes,
} from '@/lib/hooks/use-notes';
import { useSyllabus } from '@/lib/hooks/use-syllabus';
import { Note } from '@/types/app.types';

const FALLBACK_SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Math', 'Other'];

const NOTE_TEMPLATES = {
  lecture: {
    name: 'Lecture Notes',
    emoji: '📝',
    body: `## Topic: \n\n## Key Points:\n• \n• \n\n## Formulas / Definitions:\n\n## Doubts / Review Questions:\n`,
  },
  problem: {
    name: 'Problem Set',
    emoji: '📐',
    body: `## Problem Statement:\n\n## Solution Approach:\n\n## Code / Equations:\n\n## Key Learnings:\n`,
  },
  summary: {
    name: 'Concept Summary',
    emoji: '📌',
    body: `## Core Idea:\n\n## Key Takeaways:\n• \n• \n\n## Application / Real-world Examples:\n`,
  },
  revision: {
    name: 'Revision Deck',
    emoji: '💡',
    body: `## Summary Outline:\n\n## Q&A for Active Recall:\n- Q: \n  A: \n- Q: \n  A: \n\n## Retention Tracker:\n`,
  },
};

export default function NoteEditorScreen(): React.JSX.Element {
  useAndroidBackHandler();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Queries & Mutations
  const { data: note, isLoading } = useNote(id);
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const syllabusQuery = useSyllabus();
  
  // Query all notes for related notes logic
  const allNotesQuery = useNotes();

  // Local Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // Focus & Selection tracking for formatting toolbar
  const [isBodyFocused, setIsBodyFocused] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Tag insertion state
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Auto-save states
  const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING...'>('SAVED');
  const isInitialLoad = useRef(true);
  const isCreating = useRef(false);

  // Bottom Sheet Refs
  const pickerSheetRef = useRef<BottomSheet>(null);
  const flashcardSheetRef = useRef<BottomSheet>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Picker search filter state
  const [pickerMode, setPickerMode] = useState<'subject' | 'chapter' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Flashcard Sheet states
  const [fcFront, setFcFront] = useState('');
  const [fcBack, setFcBack] = useState('');
  const [isCreatingFlashcard, setIsCreatingFlashcard] = useState(false);

  // Synchronize local states when note is retrieved
  useEffect(() => {
    if (note && note.id !== 'new') {
      setTitle(note.title || '');
      setContent(note.content || '');
      setSubject(note.subject);
      setChapter(note.chapter);
      setTags(note.tags || []);
      isInitialLoad.current = true;
    }
  }, [note]);

  // Check if a newer draft exists on AsyncStorage on mount/note fetch
  useEffect(() => {
    async function checkDraft() {
      if (!id) return;
      try {
        const draftStr = await AsyncStorage.getItem(`note_draft_${id}`);
        if (!draftStr) return;
        const draft = JSON.parse(draftStr);
        if (draft && draft.timestamp) {
          const noteUpdatedAt = note?.updated_at ? new Date(note.updated_at).getTime() : 0;
          if (draft.timestamp > noteUpdatedAt) {
            Alert.alert(
              'Recover Draft?',
              'An unsaved local draft was found for this note that is newer than the saved version. Would you like to recover it?',
              [
                {
                  text: 'Discard',
                  style: 'destructive',
                  onPress: async () => {
                    await AsyncStorage.removeItem(`note_draft_${id}`).catch(() => {});
                  },
                },
                {
                  text: 'Recover',
                  onPress: () => {
                    setTitle(draft.title || '');
                    setContent(draft.content || '');
                    setSubject(draft.subject);
                    setChapter(draft.chapter);
                    setTags(draft.tags || []);
                  },
                },
              ]
            );
          }
        }
      } catch (err) {
        if (__DEV__) console.warn('Failed to recover note draft:', err);
      }
    }

    if (note && note.id !== 'new') {
      checkDraft();
    } else if (id === 'new') {
      checkDraft();
    }
  }, [note, id]);

  // Handle auto-save trigger on input edits + Local Draft saving
  useEffect(() => {
    // Skip saving on initial query mount load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Save draft locally immediately
    const draftData = {
      title,
      content,
      subject,
      chapter,
      tags,
      timestamp: Date.now(),
    };
    AsyncStorage.setItem(`note_draft_${id}`, JSON.stringify(draftData)).catch(() => {});

    // Auto-generate title if empty
    let computedTitle = title.trim();
    if (!computedTitle && content.trim()) {
      const bodyClean = content
        .replace(/[#*_\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (bodyClean.length <= 60) {
        computedTitle = bodyClean;
      } else {
        const slice = bodyClean.slice(0, 60);
        const lastSpace = slice.lastIndexOf(' ');
        computedTitle = lastSpace > 0 ? slice.slice(0, lastSpace) + '...' : slice + '...';
      }
    }
    if (!computedTitle) {
      computedTitle = 'Untitled Note';
    }

    if (id === 'new') {
      if ((title.trim() || content.trim()) && !isCreating.current) {
        isCreating.current = true;
        setSaveStatus('SAVING...');
        createNoteMutation.mutate(
          {
            title: computedTitle,
            content: content,
            subject: subject,
            chapter: chapter,
            tags: tags,
          },
          {
            onSuccess: async (newNote) => {
              await AsyncStorage.removeItem('note_draft_new').catch(() => {});
              router.setParams({ id: newNote.id });
              setSaveStatus('SAVED');
              isCreating.current = false;
            },
            onError: () => {
              setSaveStatus('SAVED');
              isCreating.current = false;
              useUiStore.getState().showToast('Save failed', 'error');
            },
          }
        );
      }
    } else {
      setSaveStatus('SAVING...');
      updateNoteMutation.mutate(
        {
          id: id,
          updates: {
            title: computedTitle,
            content: content,
            subject: subject,
            chapter: chapter,
            tags: tags,
          },
        },
        {
          onSuccess: async () => {
            await AsyncStorage.removeItem(`note_draft_${id}`).catch(() => {});
            setSaveStatus('SAVED');
          },
          onError: () => {
            setSaveStatus('SAVED');
            useUiStore.getState().showToast('Save failed', 'error');
          },
        }
      );
    }
  }, [title, content, subject, chapter, tags]);

  // Extract subjects and chapters from syllabus topics
  const syllabusData = syllabusQuery.data || {};
  const subjectsList = useMemo(() => {
    const list = new Set<string>(FALLBACK_SUBJECTS);
    Object.keys(syllabusData).forEach((sub) => list.add(sub));
    return Array.from(list);
  }, [syllabusData]);

  const chaptersList = useMemo(() => {
    if (!subject || !syllabusData[subject]) return [];
    return Object.keys(syllabusData[subject].chapters);
  }, [subject, syllabusData]);

  // Filter options inside Picker Sheet
  const filteredPickerOptions = useMemo(() => {
    const list = pickerMode === 'subject' ? subjectsList : chaptersList;
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return list;
    return list.filter((item) => item.toLowerCase().includes(query));
  }, [pickerSearch, pickerMode, subjectsList, chaptersList]);

  // Check if we should offer custom option adding
  const showCustomAddOption = useMemo(() => {
    const query = pickerSearch.trim();
    if (!query) return false;
    return !filteredPickerOptions.some(
      (opt) => opt.toLowerCase() === query.toLowerCase()
    );
  }, [pickerSearch, filteredPickerOptions]);

  const handleOpenPicker = (mode: 'subject' | 'chapter') => {
    Keyboard.dismiss();
    setPickerMode(mode);
    setPickerSearch('');
    pickerSheetRef.current?.expand();
  };

  const handleSelectOption = (option: string) => {
    if (pickerMode === 'subject') {
      setSubject(option);
      setChapter(null); // Reset chapter if subject updates
    } else if (pickerMode === 'chapter') {
      setChapter(option);
    }
    pickerSheetRef.current?.close();
  };

  const handleAddTagSubmit = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && trimmed.length <= 30 && tags.length < 10 && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setNewTag('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: title || 'LifeTrack Pro Note',
        message: `${title}\n\n${content}`,
      });
    } catch (err) {
      if (__DEV__) console.error('Share failed:', err);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to permanently delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (id !== 'new') {
              deleteNoteMutation.mutate(id, {
                onSuccess: () => {
                  router.back();
                },
              });
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleTogglePin = () => {
    if (id !== 'new' && note) {
      updateNoteMutation.mutate({
        id: id,
        updates: { is_pinned: !note.is_pinned },
      });
    }
  };

  const handleMoreOptions = () => {
    if (id === 'new') return;

    Alert.alert('Note Options', 'Choose an action:', [
      { text: note?.is_pinned ? '📌 Unpin Note' : '📌 Pin Note', onPress: handleTogglePin },
      { text: '📤 Share Note', onPress: handleShare },
      { text: '🗑 Delete Note', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Pre-fill note template
  const handleApplyTemplate = (key: keyof typeof NOTE_TEMPLATES) => {
    setContent(NOTE_TEMPLATES[key].body);
  };

  // formatting toolbar text transformations
  const handleFormatText = (type: 'bold' | 'italic' | 'bullet' | 'number' | 'idea') => {
    const { start, end } = selection;
    let prefix = '';
    let suffix = '';
    let newContent = content;

    if (type === 'bold') {
      prefix = '**';
      suffix = '**';
      const selectedText = content.slice(start, end);
      newContent = content.slice(0, start) + prefix + selectedText + suffix + content.slice(end);
    } else if (type === 'italic') {
      prefix = '_';
      suffix = '_';
      const selectedText = content.slice(start, end);
      newContent = content.slice(0, start) + prefix + selectedText + suffix + content.slice(end);
    } else {
      // Prepend at line level
      const beforeCursor = content.slice(0, start);
      const lastNewline = beforeCursor.lastIndexOf('\n');
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

      if (type === 'bullet') prefix = '• ';
      else if (type === 'number') prefix = '1. ';
      else if (type === 'idea') prefix = '💡 ';

      newContent = content.slice(0, lineStart) + prefix + content.slice(lineStart);
    }

    setContent(newContent);
  };

  const handleSelectionChange = (e: any) => {
    const sel = e.nativeEvent.selection;
    setSelection(sel);
    
    // Scroll to cursor position
    const textBeforeCursor = content.substring(0, sel.start);
    const lineCount = textBeforeCursor.split('\n').length;
    // Estimated offset from top of ScrollView: 24px per line + ~180px for offset
    const estimatedCursorY = lineCount * 24 + 180;
    
    scrollRef.current?.scrollTo({
      y: Math.max(0, estimatedCursorY - 200),
      animated: true,
    });
  };

  // Open Flashcard Sheet
  const handleOpenFlashcardSheet = () => {
    if (id === 'new') return;
    setFcFront(title || '');
    setFcBack(content ? content.substring(0, 100) : '');
    flashcardSheetRef.current?.expand();
  };

  // Create Linked Flashcard
  const handleCreateFlashcardSubmit = () => {
    const front = fcFront.trim();
    const back = fcBack.trim();
    if (!front || !back) {
      Alert.alert('Missing Info', 'Please provide text for both Front and Back sides.');
      return;
    }

    setIsCreatingFlashcard(true);
    createNoteMutation.mutate(
      {
        title: front,
        content: JSON.stringify({ front, back }),
        subject: subject,
        chapter: chapter,
        tags: ['flashcard', `parent:${id}`],
      },
      {
        onSuccess: () => {
          setIsCreatingFlashcard(false);
          flashcardSheetRef.current?.close();
          Alert.alert('Success', 'Flashcard created successfully! Linked to this note.');
        },
        onError: () => {
          setIsCreatingFlashcard(false);
          Alert.alert('Error', 'Failed to create flashcard. Please try again.');
        },
      }
    );
  };

  // Query related notes matching the same subject and chapter (excluding active note)
  const relatedNotes = useMemo((): Note[] => {
    if (id === 'new' || !subject || !chapter) return [];
    const list = allNotesQuery.data || [];
    return list.filter(
      (n) => n.id !== id && n.subject === subject && n.chapter === chapter
    );
  }, [allNotesQuery.data, id, subject, chapter]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Editor Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <ArrowLeft size={22} color="#17172A" />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <Text style={styles.saveStatusText}>{saveStatus}</Text>
              {id !== 'new' && (
                <TouchableOpacity onPress={handleMoreOptions} style={styles.moreBtn} activeOpacity={0.7}>
                  <MoreVertical size={20} color="#17172A" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Inputs View */}
          <ScrollView
            ref={scrollRef}
            style={styles.editorScroll}
            contentContainerStyle={styles.editorContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Note Title Input */}
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Note title..."
              placeholderTextColor="#9B9BAF"
              multiline={false}
              maxLength={200}
              autoFocus={id === 'new'}
            />

            {/* Subject & Chapter Link Selector Row */}
            <View style={styles.pillsRow}>
              <SubjectPicker
                selectedSubject={subject}
                onSelect={(s) => {
                  setSubject(s);
                  setChapter(null); // Reset chapter if subject updates
                }}
                placeholder="+ Subject"
                style={styles.subjectPickerPill}
                textStyle={styles.subjectPickerPillText}
              />

              {subject && (
                <TouchableOpacity
                  onPress={() => handleOpenPicker('chapter')}
                  style={[styles.linkPill, chapter && styles.linkPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.linkPillText, chapter && styles.linkPillTextActive]}>
                    {chapter ? `📖 ${chapter}` : '+ Chapter'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Templates Selector Row (Only for brand new notes) */}
            {id === 'new' && content.trim() === '' && (
              <View style={styles.templatesContainer}>
                <Text style={styles.templatesLabel}>START WITH A TEMPLATE:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.templatesScroll}
                >
                  {(Object.keys(NOTE_TEMPLATES) as Array<keyof typeof NOTE_TEMPLATES>).map(
                    (key) => {
                      const tmpl = NOTE_TEMPLATES[key];
                      return (
                        <TouchableOpacity
                          key={key}
                          style={styles.templateCard}
                          onPress={() => handleApplyTemplate(key)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.templateEmoji}>{tmpl.emoji}</Text>
                          <Text style={styles.templateName}>{tmpl.name}</Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Body Content Input */}
            <TextInput
              style={styles.bodyInput}
              value={content}
              onChangeText={setContent}
              placeholder="Start writing note body... (Markdown tags supported)"
              placeholderTextColor="#9B9BAF"
              multiline
              scrollEnabled={false} // Grow dynamically
              textAlignVertical="top"
              onFocus={() => setIsBodyFocused(true)}
              onBlur={() => setIsBodyFocused(false)}
              onSelectionChange={handleSelectionChange}
            />

            {/* Tags Badge strip (inside ScrollView) */}
            <View style={styles.tagsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScroll}
              >
                {tags.map((tag) => (
                  <View key={tag} style={styles.tagBadge}>
                    <Text style={styles.tagText}>#{tag}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveTag(tag)}
                      style={styles.tagCloseBtn}
                      activeOpacity={0.7}
                    >
                      <X size={10} color="#5C5C70" />
                    </TouchableOpacity>
                  </View>
                ))}

                {isAddingTag ? (
                  <TextInput
                    style={styles.addTagInput}
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="Tag..."
                    placeholderTextColor="#9B9BAF"
                    onSubmitEditing={handleAddTagSubmit}
                    onBlur={handleAddTagSubmit}
                    autoFocus
                    maxLength={30}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => setIsAddingTag(true)}
                    style={styles.addTagBtn}
                    activeOpacity={0.7}
                  >
                    <Plus size={12} color="#5C5C70" />
                    <Text style={styles.addTagText}>Add tag</Text>
                  </TouchableOpacity>
                )}

                {/* Linked Flashcard Creator Button */}
                {id !== 'new' && (
                  <TouchableOpacity
                    onPress={handleOpenFlashcardSheet}
                    style={styles.createFlashcardBtn}
                    activeOpacity={0.7}
                  >
                    <Sparkles size={11} color="#5B4FE8" />
                    <Text style={styles.createFlashcardBtnText}>Create Card</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* Related Notes Section */}
            {relatedNotes.length > 0 && (
              <View style={styles.relatedSection}>
                <View style={styles.relatedHeader}>
                  <Sparkles size={12} color="#5B4FE8" />
                  <Text style={styles.relatedTitle}>Related Notes</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.relatedScroll}
                >
                  {relatedNotes.map((rNote) => (
                    <TouchableOpacity
                      key={rNote.id}
                      style={styles.relatedCard}
                      onPress={() => {
                        Keyboard.dismiss();
                        router.push(`/note/${rNote.id}`);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.relatedCardTitle} numberOfLines={2}>
                        {rNote.title}
                      </Text>
                      <Text style={styles.relatedCardSub}>
                        {rNote.chapter || 'General'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Empty space below content to dismiss keyboard on touch */}
            <View
              style={{ minHeight: Dimensions.get('window').height * 0.3 }}
              onTouchStart={Keyboard.dismiss}
            />
          </ScrollView>

          {/* Formatting Toolbar (shown when body input focused - outside ScrollView) */}
          {isBodyFocused && (
            <View style={styles.toolbar}>
              <TouchableOpacity style={styles.toolbarBtn} onPress={() => handleFormatText('bold')}>
                <Text style={[styles.toolbarText, { fontWeight: 'bold' }]}>B</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={() => handleFormatText('italic')}
              >
                <Text style={[styles.toolbarText, { fontStyle: 'italic' }]}>I</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={() => handleFormatText('bullet')}
              >
                <Text style={styles.toolbarText}>• Bullet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={() => handleFormatText('number')}
              >
                <Text style={styles.toolbarText}>1. List</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={() => handleFormatText('idea')}
              >
                <Text style={styles.toolbarText}>💡 Highlight</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Selector Bottom Sheet (Subject/Chapter Autocomplete Dropdown) */}
      <BottomSheet
        ref={pickerSheetRef}
        index={-1}
        snapPoints={['52%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
      >
        <BottomSheetView style={styles.pickerSheet}>
          <Text style={styles.pickerSheetTitle}>
            {pickerMode === 'subject' ? 'Select Subject' : 'Select Chapter'}
          </Text>

          {/* Autocomplete Input Search */}
          <BottomSheetTextInput
            style={styles.pickerSearchInput}
            value={pickerSearch}
            onChangeText={setPickerSearch}
            placeholder={`Search or enter custom ${pickerMode}...`}
            placeholderTextColor="#9B9BAF"
          />

          <ScrollView contentContainerStyle={styles.pickerOptionsScroll} keyboardShouldPersistTaps="handled">
            {/* Custom add item option if search string doesn't match */}
            {showCustomAddOption && (
              <TouchableOpacity
                style={[styles.pickerOptionItem, styles.pickerOptionCustom]}
                onPress={() => handleSelectOption(pickerSearch.trim())}
                activeOpacity={0.7}
              >
                <Plus size={14} color="#5B4FE8" />
                <Text style={styles.pickerOptionCustomText}>
                  Use Custom: "{pickerSearch.trim()}"
                </Text>
              </TouchableOpacity>
            )}

            {filteredPickerOptions.length > 0 ? (
              filteredPickerOptions.map((opt) => {
                const active = pickerMode === 'subject' ? subject === opt : chapter === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pickerOptionItem, active && styles.pickerOptionActive]}
                    onPress={() => handleSelectOption(opt)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        active && styles.pickerOptionTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                    {active && <Check size={14} color="#5B4FE8" />}
                  </TouchableOpacity>
                );
              })
            ) : (
              !showCustomAddOption && (
                <View style={styles.emptyChaptersContainer}>
                  <Text style={styles.emptyChaptersText}>No matches found.</Text>
                </View>
              )
            )}
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>

      {/* Linked Flashcard Creator Sheet */}
      <BottomSheet
        ref={flashcardSheetRef}
        index={-1}
        snapPoints={['50%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
      >
        <BottomSheetView style={styles.pickerSheet}>
          <Text style={styles.pickerSheetTitle}>Create Linked Flashcard</Text>
          <Text style={styles.sheetInstructions}>
            Add a study card. Answers are stored in a serialized JSON structure under notes.
          </Text>

          <Text style={styles.inputLabel}>CARD FRONT (QUESTION)</Text>
          <BottomSheetTextInput
            style={styles.fcInput}
            value={fcFront}
            onChangeText={setFcFront}
            placeholder="e.g. What is gravity?"
            placeholderTextColor="#9B9BAF"
            maxLength={100}
          />

          <Text style={styles.inputLabel}>CARD BACK (ANSWER)</Text>
          <BottomSheetTextInput
            style={[styles.fcInput, styles.fcInputMultiline]}
            value={fcBack}
            onChangeText={setFcBack}
            placeholder="e.g. Fundamental force that attracts objects of mass."
            placeholderTextColor="#9B9BAF"
            multiline
            numberOfLines={3}
            maxLength={300}
          />

          <TouchableOpacity
            style={[styles.fcSubmitBtn, isCreatingFlashcard && styles.saveBtnDisabled]}
            onPress={handleCreateFlashcardSubmit}
            disabled={isCreatingFlashcard}
            activeOpacity={0.8}
          >
            {isCreatingFlashcard ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.fcSubmitBtnText}>Create Card</Text>
            )}
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 54,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  saveStatusText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#9B9BAF',
    fontWeight: '600',
  },
  moreBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorScroll: {
    flex: 1,
  },
  editorContent: {
    paddingBottom: 200,
  },
  titleInput: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#17172A',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 8,
  },
  linkPill: {
    backgroundColor: '#F7F6F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  linkPillActive: {
    backgroundColor: '#EAE8FD',
    borderColor: '#5B4FE8',
  },
  linkPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
    fontWeight: '500',
  },
  linkPillTextActive: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  subjectPickerPill: {
    backgroundColor: '#F7F6F3',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: undefined,
    alignSelf: 'flex-start',
  },
  subjectPickerPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E7E3',
    marginHorizontal: 20,
    marginVertical: 12,
  },
  // Templates
  templatesContainer: {
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  templatesLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    color: '#9B9BAF',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 8,
  },
  templatesScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  templateEmoji: {
    fontSize: 14,
  },
  templateName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#17172A',
    fontWeight: '600',
  },
  bodyInput: {
    fontFamily: 'DMSans',
    fontSize: 15,
    color: '#17172A',
    lineHeight: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 200,
  },
  // Related Notes
  relatedSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F7F6F3',
    paddingHorizontal: 20,
  },
  relatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  relatedTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  relatedScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  relatedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 12,
    width: 140,
    minHeight: 74,
    justifyContent: 'space-between',
  },
  relatedCardTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#17172A',
    fontWeight: '600',
    lineHeight: 16,
  },
  relatedCardSub: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#9B9BAF',
    marginTop: 4,
  },
  // Formatting Toolbar
  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#F7F6F3',
    borderTopWidth: 1,
    borderTopColor: '#E8E7E3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  toolbarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  toolbarText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#17172A',
    fontWeight: '500',
  },
  // Tags Strip
  tagsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F7F6F3',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  tagsScroll: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F3',
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 4,
  },
  tagText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5C5C70',
    fontWeight: '500',
  },
  tagCloseBtn: {
    padding: 2,
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderStyle: 'dashed',
  },
  addTagText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5C5C70',
  },
  addTagInput: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#17172A',
    width: 60,
    height: 24,
    padding: 0,
  },
  createFlashcardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EAE8FD',
    borderWidth: 1,
    borderColor: '#5B4FE8',
  },
  createFlashcardBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  // Picker sheet
  pickerSheet: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    flex: 1,
  },
  pickerSheetTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: '#17172A',
    marginBottom: 12,
  },
  pickerSearchInput: {
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 14,
    height: 44,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
    marginBottom: 14,
  },
  pickerOptionsScroll: {
    gap: 4,
  },
  pickerOptionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F7F6F3',
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#EAE8FD',
  },
  pickerOptionCustom: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#5B4FE8',
    borderStyle: 'dashed',
  },
  pickerOptionCustomText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '600',
    marginLeft: 6,
  },
  pickerOptionText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#5C5C70',
  },
  pickerOptionTextActive: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  emptyChaptersContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyChaptersText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    textAlign: 'center',
  },
  // Flashcard Sheet
  sheetInstructions: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    color: '#9B9BAF',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  fcInput: {
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 14,
    height: 44,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
  },
  fcInputMultiline: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  fcSubmitBtn: {
    backgroundColor: '#5B4FE8',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fcSubmitBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtnDisabled: {
    backgroundColor: '#9B9BAF',
    shadowOpacity: 0,
    elevation: 0,
  },
});
