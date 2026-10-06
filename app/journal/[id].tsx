import { useJournalEntry, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry } from '@/lib/hooks/use-journal';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Trash2,
  Check,
  Tag as TagIcon,
  Palette,
  X,
} from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';

const DIARY_FONT_KEY = 'diary_font_theme_preference';

export interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  description: string;
  category: 'Casual Scrawl' | 'Loose / Expressive' | 'Elegant Cursive' | 'Bold & Playful' | 'Serif';
}

const FONT_OPTIONS: FontOption[] = [
  {
    id: 'newsreader',
    name: 'Newsreader',
    fontFamily: Platform.OS === 'ios' ? 'Newsreader' : 'InstrumentSerif',
    description: 'Classic book serif — crisp and elegant',
    category: 'Serif',
  },
  {
    id: 'caveat',
    name: 'Caveat',
    fontFamily: 'Caveat',
    description: 'Bouncy, casual scrawl — natural daily diary feel',
    category: 'Casual Scrawl',
  },
  {
    id: 'caveat_brush',
    name: 'Caveat Brush',
    fontFamily: 'CaveatBrush',
    description: 'Bolder, marker-tip sibling of Caveat',
    category: 'Bold & Playful',
  },
  {
    id: 'kalam',
    name: 'Kalam',
    fontFamily: 'Kalam',
    description: 'Warm, natural pen handwriting — holds up great for long paragraphs',
    category: 'Casual Scrawl',
  },
  {
    id: 'patrick_hand',
    name: 'Patrick Hand',
    fontFamily: 'PatrickHand',
    description: 'Neat, rounded, very readable — clean default option',
    category: 'Casual Scrawl',
  },
  {
    id: 'architects_daughter',
    name: 'Architects Daughter',
    fontFamily: 'ArchitectsDaughter',
    description: 'Tidy, deliberate print handwriting',
    category: 'Casual Scrawl',
  },
  {
    id: 'indie_flower',
    name: 'Indie Flower',
    fontFamily: 'IndieFlower',
    description: 'Round, bubbly, friendly scrawl',
    category: 'Casual Scrawl',
  },
  {
    id: 'nanum_pen',
    name: 'Nanum Pen Script',
    fontFamily: 'NanumPenScript',
    description: 'Loose, compact letterforms with fast pen energy',
    category: 'Loose / Expressive',
  },
  {
    id: 'handlee',
    name: 'Handlee',
    fontFamily: 'Handlee',
    description: 'Rounder, friendlier, casual print',
    category: 'Casual Scrawl',
  },
  {
    id: 'gaegu',
    name: 'Gaegu',
    fontFamily: 'Gaegu',
    description: 'Playful, bubbly, rounded scrawl',
    category: 'Bold & Playful',
  },
  {
    id: 'marck_script',
    name: 'Marck Script',
    fontFamily: 'MarckScript',
    description: 'Elegant, flowing connected strokes with romantic charm',
    category: 'Elegant Cursive',
  },
  {
    id: 'nothing_you_could_do',
    name: 'Nothing You Could Do',
    fontFamily: 'NothingYouCouldDo',
    description: 'Relaxed slant scrawl with authentic pen energy',
    category: 'Loose / Expressive',
  },
  {
    id: 'neucha',
    name: 'Neucha',
    fontFamily: 'Neucha',
    description: 'Thicker strokes, warm, grounded scrawl',
    category: 'Bold & Playful',
  },
  {
    id: 'dancing_script',
    name: 'Dancing Script',
    fontFamily: 'DancingScript',
    description: 'Flowing, connected cursive',
    category: 'Elegant Cursive',
  },
  {
    id: 'pacifico',
    name: 'Pacifico',
    fontFamily: 'Pacifico',
    description: 'Retro brush-pen feel — bold & statement',
    category: 'Bold & Playful',
  },
  {
    id: 'amatic_sc',
    name: 'Amatic SC',
    fontFamily: 'AmaticSC',
    description: 'Tall, condensed handwritten caps',
    category: 'Bold & Playful',
  },
];

export default function CozyJournalDetailPage(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const { data: existingEntry, isLoading: entryLoading } = useJournalEntry(id as string);
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  // State
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [achievements, setHighlights] = useState<string>('');
  const [notToDos, setNotToDos] = useState<string>('');

  // 3 Gratitude Lines
  const [gratitude1, setGratitude1] = useState<string>('');
  const [gratitude2, setGratitude2] = useState<string>('');
  const [gratitude3, setGratitude3] = useState<string>('');

  const [mood, setMood] = useState<number>(3);
  const [tags, setTags] = useState<string[]>(['reflections']);
  const [tagInput, setTagInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Font Theme State
  const [activeFontFamily, setActiveFontFamily] = useState<string>(
    Platform.OS === 'ios' ? 'Newsreader' : 'InstrumentSerif'
  );
  const [showFontModal, setShowFontModal] = useState<boolean>(false);

  // Load saved font theme preference
  useEffect(() => {
    AsyncStorage.getItem(DIARY_FONT_KEY).then((savedFont) => {
      if (savedFont) {
        setActiveFontFamily(savedFont);
      }
    });
  }, []);

  const handleSelectFontTheme = async (fontFamily: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFontFamily(fontFamily);
    setShowFontModal(false);
    await AsyncStorage.setItem(DIARY_FONT_KEY, fontFamily);
  };

  // Determine if viewing today's entry
  const todayStr = new Date().toISOString().split('T')[0];
  const entryDateStr = existingEntry?.entry_date || todayStr;
  const isToday = isNew || entryDateStr === todayStr;

  // Formatting date for stamp
  const displayDate = existingEntry?.entry_date ? new Date(existingEntry.entry_date) : new Date();
  const dayName = displayDate.toLocaleDateString('en-US', { weekday: 'long' });
  const monthAbbr = displayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayNum = displayDate.getDate();
  const yearNum = displayDate.getFullYear();

  const stampText = `${monthAbbr}  ·  ${String(dayNum).padStart(2, '0')}  ·  ${yearNum}`;
  const fullDateText = `${displayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}  ·  Entry 224`;

  useEffect(() => {
    if (existingEntry) {
      setTitle(existingEntry.title || dayName);
      setContent(existingEntry.content || '');
      setHighlights(existingEntry.achievements || '');
      setNotToDos(existingEntry.not_to_dos || '');

      const rawGratitude = existingEntry.improvements || '';
      const parts = rawGratitude.split('\n');
      setGratitude1(parts[0] || '');
      setGratitude2(parts[1] || '');
      setGratitude3(parts[2] || '');

      setMood(existingEntry.mood || 3);
      setTags(existingEntry.tags || ['reflections']);
    } else if (isNew) {
      setTitle(dayName);
    }
  }, [existingEntry, isNew, dayName]);

  const getCombinedGratitude = (g1 = gratitude1, g2 = gratitude2, g3 = gratitude3) => {
    return [g1.trim(), g2.trim(), g3.trim()].join('\n').trim();
  };

  // Debounced auto-save for today's entries
  const saveTimeoutRef = useRef<any>(null);

  const handleContentChange = (text: string) => {
    setContent(text);
    if (!isToday) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(() => {
      handleSaveSilent(text);
    }, 1500);
  };

  const handleSaveSilent = async (currentContent?: string) => {
    if (!isToday) return;
    try {
      const textToSave = currentContent !== undefined ? currentContent : content;
      if (!textToSave.trim() && !title.trim()) {
        setIsSaving(false);
        return;
      }

      const combinedGratitude = getCombinedGratitude();

      if (isNew) {
        const res = await createMutation.mutateAsync({
          title: title.trim() || dayName,
          content: textToSave.trim(),
          achievements: achievements.trim(),
          not_to_dos: notToDos.trim(),
          improvements: combinedGratitude,
          mood,
          tags,
        });
        if (res?.id) {
          router.replace(`/journal/${res.id}`);
        }
      } else {
        await updateMutation.mutateAsync({
          id: id as string,
          title: title.trim() || dayName,
          content: textToSave.trim(),
          achievements: achievements.trim(),
          not_to_dos: notToDos.trim(),
          improvements: combinedGratitude,
          mood,
          tags,
        });
      }

      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      if (__DEV__) console.warn('Autosave error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!isToday) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    await handleSaveSilent();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/journal');
    }
  };

  const handleDelete = () => {
    if (isNew || !id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Delete Entry', 'Are you sure you want to permanently delete this diary page?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMutation.mutateAsync(id as string);
          router.replace('/journal');
        },
      },
    ]);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!isToday) return;
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const MOOD_OPTIONS = [
    { value: 1, emoji: '😔', label: 'Low' },
    { value: 2, emoji: '😐', label: 'Flat' },
    { value: 3, emoji: '🙂', label: 'Good' },
    { value: 4, emoji: '😄', label: 'Bright' },
    { value: 5, emoji: '🤩', label: 'Radiant' },
  ];

  if (!isNew && entryLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#AD8A54" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.outerStage} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#C9BEA9" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* THE PHYSICAL PAGE */}
          <View style={styles.pageCard}>
            {/* STITCHED LEATHER SPINE */}
            <View style={styles.leatherSpine}>
              <View style={styles.spineStitchLine} />
            </View>

            {/* SILK RIBBON BOOKMARK */}
            <View style={styles.silkRibbon}>
              <Svg width="18" height="70" viewBox="0 0 18 70">
                <Polygon points="0,0 18,0 18,58 9,70 0,58" fill="#9C4A3C" />
              </Svg>
            </View>

            {/* VINTAGE EMBOSSED GOLD DATE STAMP */}
            <View style={styles.cornerStamp}>
              <View style={styles.cornerStampInner}>
                <Text style={styles.cornerStampText}>{stampText}</Text>
              </View>
            </View>

            {/* PAGE INNER CONTENT */}
            <View style={styles.pageInner}>
              {/* TOP HEADER CONTROLS (Zero collision with date stamp) */}
              <View style={styles.topBar}>
                <View style={styles.leftControlsGroup}>
                  <TouchableOpacity
                    style={styles.paperBackButton}
                    onPress={() => {
                      if (router.canGoBack()) {
                        router.back();
                      } else {
                        router.replace('/journal');
                      }
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ChevronLeft size={18} color="#3F5A44" />
                  </TouchableOpacity>

                  {/* FONT THEME SELECTOR BUTTON */}
                  <TouchableOpacity
                    style={styles.paperFontButton}
                    onPress={() => setShowFontModal(true)}
                    activeOpacity={0.7}
                  >
                    <Palette size={14} color="#3F5A44" />
                  </TouchableOpacity>

                  {!isNew && (
                    <TouchableOpacity
                      style={styles.paperDeleteButton}
                      onPress={handleDelete}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color="#9C4A3C" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* DATE BLOCK */}
              <View style={styles.dateBlock}>
                <TextInput
                  style={[styles.weekdayInput, { fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif' }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Monday"
                  placeholderTextColor="#9C9382"
                  editable={isToday}
                />
                <Text style={styles.fullDateText}>{fullDateText}</Text>
              </View>

              {/* DEAR DIARY GREETING */}
              <Text style={styles.dearDiary}>Dear Diary,</Text>

              {/* MAIN WRITING AREA WITH SELECTED HANDWRITING FONT */}
              <View style={styles.writingArea}>
                <TextInput
                  style={[styles.entryTextArea, { fontFamily: activeFontFamily }]}
                  placeholder={
                    isToday
                      ? 'Start writing about your day…'
                      : 'No entry written for this day.'
                  }
                  placeholderTextColor="#9C9382"
                  value={content}
                  onChangeText={handleContentChange}
                  multiline
                  textAlignVertical="top"
                  editable={isToday}
                />

                <View style={styles.metaRow}>
                  <Text style={styles.wordCountText}>{wordCount} words</Text>
                </View>
              </View>

              {/* DIVIDER */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>TODAY, IN A FEW WORDS</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* PROMPTS */}
              <View style={styles.promptsContainer}>
                {/* 1. MOOD */}
                <View style={styles.promptItem}>
                  <Text style={styles.promptLabel}>How was today, really?</Text>
                  <Text style={styles.promptSub}>MOOD</Text>

                  <View style={styles.moodSelectRow}>
                    {MOOD_OPTIONS.map((opt) => {
                      const isActive = mood === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.moodOpt, isActive && styles.moodOptActive]}
                          onPress={() => {
                            if (!isToday) return;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setMood(opt.value);
                          }}
                          activeOpacity={isToday ? 0.7 : 1}
                        >
                          <Text
                            style={[styles.moodEmoji, isActive && styles.moodEmojiActive]}
                          >
                            {opt.emoji}
                          </Text>
                          <Text
                            style={[styles.moodLabel, isActive && styles.moodLabelActive]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 2. HIGHLIGHTS */}
                <View style={styles.promptItem}>
                  <Text style={styles.promptLabel}>What made today special?</Text>
                  <Text style={styles.promptSub}>HIGHLIGHTS</Text>
                  <TextInput
                    style={[styles.promptLineInput, { fontFamily: activeFontFamily }]}
                    placeholder="A moment worth remembering…"
                    placeholderTextColor="#9C9382"
                    value={achievements}
                    onChangeText={setHighlights}
                    editable={isToday}
                  />
                </View>

                {/* 3. GRATITUDE - 3 SEPARATE NUMBERED LINES */}
                <View style={styles.promptItem}>
                  <Text style={styles.promptLabel}>Three things I'm grateful for</Text>
                  <Text style={styles.promptSub}>GRATITUDE</Text>

                  <View style={styles.numberedInputRow}>
                    <Text style={styles.numberPrefix}>1.</Text>
                    <TextInput
                      style={[styles.promptLineInputNumbered, { fontFamily: activeFontFamily }]}
                      placeholder="First thing you're grateful for…"
                      placeholderTextColor="#9C9382"
                      value={gratitude1}
                      onChangeText={(val) => {
                        setGratitude1(val);
                        handleContentChange(content);
                      }}
                      editable={isToday}
                    />
                  </View>

                  <View style={styles.numberedInputRow}>
                    <Text style={styles.numberPrefix}>2.</Text>
                    <TextInput
                      style={[styles.promptLineInputNumbered, { fontFamily: activeFontFamily }]}
                      placeholder="Second thing you're grateful for…"
                      placeholderTextColor="#9C9382"
                      value={gratitude2}
                      onChangeText={(val) => {
                        setGratitude2(val);
                        handleContentChange(content);
                      }}
                      editable={isToday}
                    />
                  </View>

                  <View style={styles.numberedInputRow}>
                    <Text style={styles.numberPrefix}>3.</Text>
                    <TextInput
                      style={[styles.promptLineInputNumbered, { fontFamily: activeFontFamily }]}
                      placeholder="Third thing you're grateful for…"
                      placeholderTextColor="#9C9382"
                      value={gratitude3}
                      onChangeText={(val) => {
                        setGratitude3(val);
                        handleContentChange(content);
                      }}
                      editable={isToday}
                    />
                  </View>
                </View>

                {/* 4. NOT TO DO */}
                <View style={styles.promptItem}>
                  <Text style={styles.promptLabel}>What to avoid tomorrow?</Text>
                  <Text style={styles.promptSub}>REFLECTIONS & BOUNDARIES</Text>

                  <TextInput
                    style={[styles.promptLineInput, { fontFamily: activeFontFamily }]}
                    placeholder="One habit to step away from…"
                    placeholderTextColor="#9C9382"
                    value={notToDos}
                    onChangeText={setNotToDos}
                    editable={isToday}
                  />
                </View>

                {/* 5. TAGS */}
                <View style={styles.promptItem}>
                  <Text style={styles.promptLabel}>Tags</Text>
                  <Text style={styles.promptSub}>CATEGORIES</Text>

                  <View style={styles.tagsContainer}>
                    {tags.map((tag, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.tagChip}
                        onPress={() => handleRemoveTag(tag)}
                        disabled={!isToday}
                      >
                        <Text style={styles.tagChipText}>#{tag}</Text>
                        {isToday && <Text style={styles.tagRemoveX}> ×</Text>}
                      </TouchableOpacity>
                    ))}

                    {isToday && (
                      <View style={styles.tagInputWrapper}>
                        <TagIcon size={12} color="#9C9382" />
                        <TextInput
                          style={styles.tagTextInput}
                          placeholder="Add tag…"
                          placeholderTextColor="#9C9382"
                          value={tagInput}
                          onChangeText={setTagInput}
                          onSubmitEditing={handleAddTag}
                          returnKeyType="done"
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* BOTTOM PROMINENT FOUNTAIN-INK GREEN SAVE BUTTON */}
              {isToday && (
                <TouchableOpacity
                  style={styles.bottomSaveButton}
                  onPress={handleSave}
                  activeOpacity={0.85}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#F3ECDA" />
                  ) : (
                    <>
                      <Check size={18} color="#F3ECDA" />
                      <Text style={styles.bottomSaveButtonText}>Save Diary Page</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* HANDWRITING FONT THEME SELECTOR MODAL */}
      <Modal
        visible={showFontModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFontModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Palette size={20} color="#3F5A44" />
                <Text style={styles.modalTitle}>Diary Font Theme</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFontModal(false)}>
                <X size={20} color="#6B6154" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Choose your personal handwriting or typography style for writing your daily diary:
            </Text>

            <ScrollView style={{ maxHeight: 400, width: '100%' }} showsVerticalScrollIndicator={false}>
              <View style={styles.fontList}>
                {FONT_OPTIONS.map((opt) => {
                  const isSelected = activeFontFamily === opt.fontFamily;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.fontOptionCard, isSelected && styles.fontOptionCardActive]}
                      onPress={() => handleSelectFontTheme(opt.fontFamily)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.fontOptionHeader}>
                        <Text style={styles.fontOptionName}>{opt.name}</Text>
                        <Text style={styles.fontOptionCategory}>{opt.category}</Text>
                      </View>

                      <Text style={styles.fontOptionDesc}>{opt.description}</Text>

                      <Text
                        style={[
                          styles.fontOptionPreview,
                          { fontFamily: opt.fontFamily },
                          isSelected && styles.fontOptionPreviewActive,
                        ]}
                      >
                        Dear Diary, today was a peaceful and memorable day.
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outerStage: {
    flex: 1,
    backgroundColor: '#C9BEA9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C9BEA9',
  },
  scrollContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 40,
  },
  pageCard: {
    backgroundColor: '#F3ECDA',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#18120A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  leatherSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 22,
    backgroundColor: '#383025',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spineStitchLine: {
    height: '94%',
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(215, 190, 140, 0.55)',
  },
  silkRibbon: {
    position: 'absolute',
    right: 28,
    top: 0,
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cornerStamp: {
    position: 'absolute',
    right: 34,
    top: 10,
    zIndex: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(173, 138, 84, 0.65)',
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#F3ECDA',
    transform: [{ rotate: '2.5deg' }],
    shadowColor: '#18120A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  cornerStampInner: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(173, 138, 84, 0.5)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
  },
  cornerStampText: {
    fontFamily: 'SpaceMono',
    fontSize: 9.5,
    color: '#AD8A54',
    letterSpacing: 1.2,
    fontWeight: 'bold',
  },
  pageInner: {
    paddingLeft: 34,
    paddingRight: 18,
    paddingTop: 16,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  leftControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paperBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    backgroundColor: '#EFE6CE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paperFontButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    backgroundColor: 'rgba(63,90,68,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paperDeleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(156,74,60,0.3)',
    backgroundColor: 'rgba(156,74,60,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFE6CE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    marginRight: 110,
  },
  saveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  saveStateText: {
    fontFamily: 'SpaceMono',
    fontSize: 9.5,
    color: '#3F5A44',
    letterSpacing: 0.6,
    fontWeight: 'bold',
  },
  dateBlock: {
    marginBottom: 8,
  },
  weekdayInput: {
    fontSize: 32,
    color: '#2B2620',
    fontWeight: 'bold',
    padding: 0,
    margin: 0,
  },
  fullDateText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6154',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  dearDiary: {
    fontFamily: 'Caveat',
    fontSize: 26,
    color: '#3F5A44',
    marginVertical: 10,
    transform: [{ rotate: '-0.6deg' }],
  },
  writingArea: {
    position: 'relative',
    marginBottom: 16,
  },
  entryTextArea: {
    fontSize: 17,
    lineHeight: 30,
    color: '#2B2620',
    minHeight: 160,
    paddingTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 84, 46, 0.12)',
    marginTop: 8,
  },
  wordCountText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#9C9382',
    letterSpacing: 0.4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dotted',
    borderWidth: 1,
    borderColor: '#E2D3AC',
  },
  dividerLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 9.5,
    color: '#9C9382',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  promptsContainer: {
    gap: 20,
  },
  promptItem: {},
  promptLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif',
    fontStyle: 'italic',
    fontSize: 16,
    color: '#3F5A44',
    marginBottom: 2,
  },
  promptSub: {
    fontFamily: 'SpaceMono',
    fontSize: 9.5,
    color: '#9C9382',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  promptLineInput: {
    fontSize: 15,
    color: '#2B2620',
    borderBottomWidth: 1,
    borderBottomColor: '#E2D3AC',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  numberedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  numberPrefix: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    color: '#AD8A54',
    fontWeight: 'bold',
    width: 18,
  },
  promptLineInputNumbered: {
    flex: 1,
    fontSize: 15,
    color: '#2B2620',
    borderBottomWidth: 1,
    borderBottomColor: '#E2D3AC',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  moodSelectRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  moodOpt: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#EFE6CE',
    borderWidth: 1,
    borderColor: '#E2D3AC',
  },
  moodOptActive: {
    backgroundColor: 'rgba(63,90,68,0.12)',
    borderColor: '#3F5A44',
  },
  moodEmoji: {
    fontSize: 20,
    opacity: 0.7,
  },
  moodEmojiActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  moodLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: '#6B6154',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  moodLabelActive: {
    color: '#3F5A44',
    fontWeight: '700',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFE6CE',
    borderWidth: 1,
    borderColor: '#E2D3AC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagChipText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#3F5A44',
  },
  tagRemoveX: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#9C4A3C',
    fontWeight: 'bold',
  },
  tagInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFE6CE',
    borderWidth: 1,
    borderColor: '#E2D3AC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagTextInput: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#2B2620',
    minWidth: 70,
    padding: 0,
  },
  bottomSaveButton: {
    backgroundColor: '#3F5A44',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 26,
    shadowColor: '#3F5A44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSaveButtonText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    color: '#F3ECDA',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // FONT MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43,38,32,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#F3ECDA',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif',
    fontSize: 20,
    color: '#2B2620',
    fontWeight: 'bold',
  },
  modalSub: {
    fontFamily: 'SpaceMono',
    fontSize: 10.5,
    color: '#6B6154',
    marginBottom: 14,
    lineHeight: 15,
  },
  fontList: {
    gap: 10,
  },
  fontOptionCard: {
    backgroundColor: '#EFE6CE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    padding: 12,
  },
  fontOptionCardActive: {
    borderColor: '#3F5A44',
    borderWidth: 1.5,
    backgroundColor: 'rgba(63,90,68,0.08)',
  },
  fontOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  fontOptionName: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    color: '#2B2620',
    fontWeight: 'bold',
  },
  fontOptionCategory: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: '#AD8A54',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fontOptionDesc: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#6B6154',
    marginBottom: 6,
  },
  fontOptionPreview: {
    fontSize: 16,
    color: '#3F5A44',
    marginTop: 2,
  },
  fontOptionPreviewActive: {
    color: '#3F5A44',
    fontWeight: 'bold',
  },
});
