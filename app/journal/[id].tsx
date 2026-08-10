import {
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useJournalEntry,
  useUpdateJournalEntry,
} from '@/lib/hooks/use-journal';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Save,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type JournalSection = 'reflections' | 'wins' | 'avoid' | 'growth';

export default function CozyJournalEditorScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = !id || id === 'new';

  const { data: existingEntry, isLoading: entryLoading } = useJournalEntry(id || 'new');
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [achievements, setAchievements] = useState<string>('');
  const [notToDos, setNotToDos] = useState<string>('');
  const [improvements, setImprovements] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(['reflections']);
  const [activeSection, setActiveSection] = useState<JournalSection>('reflections');

  useEffect(() => {
    if (existingEntry) {
      setTitle(existingEntry.title || '');
      setContent(existingEntry.content || '');
      setAchievements(existingEntry.achievements || '');
      setNotToDos(existingEntry.not_to_dos || '');
      setImprovements(existingEntry.improvements || '');
      setTags(existingEntry.tags || []);
    } else if (isNew) {
      setTitle(`Diary Entry — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    }
  }, [existingEntry, isNew]);

  const formatHeaderDateStamp = () => {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const day = now.getDate();
    const month = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const year = now.getFullYear();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${dayName}, ${day} ${month} ${year} • ${time}`;
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your diary page.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (isNew) {
        await createMutation.mutateAsync({
          title: title.trim(),
          content: content.trim(),
          achievements: achievements.trim(),
          not_to_dos: notToDos.trim(),
          improvements: improvements.trim(),
          tags,
        });
      } else {
        await updateMutation.mutateAsync({
          id: id!,
          title: title.trim(),
          content: content.trim(),
          achievements: achievements.trim(),
          not_to_dos: notToDos.trim(),
          improvements: improvements.trim(),
          tags,
        });
      }
      router.back();
    } catch (e) {
      // Handled by mutation callback
    }
  };

  const handleDelete = () => {
    if (isNew || !id) return;
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this diary page?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMutation.mutateAsync(id);
            router.back();
          },
        },
      ]
    );
  };

  if (!isNew && entryLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E5A93C" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0C1B" />

      {/* TOP ELEGANT HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#C4BFCF" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>{isNew ? 'New Journal Entry' : 'Edit Journal Entry'}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!isNew && (
            <TouchableOpacity style={styles.deleteIconButton} onPress={handleDelete}>
              <Trash2 size={16} color="#E07A5F" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            activeOpacity={0.85}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#0F0C1B" />
            ) : (
              <>
                <Check size={15} color="#0F0C1B" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* UNIFIED LUXURY JOURNAL SHEET */}
          <View style={styles.journalCanvas}>
            {/* Top Red Margin Line (Notebook Margin Accent) */}
            <View style={styles.notebookMarginAccent} />

            {/* Date & Time Stamp */}
            <View style={styles.dateStampRow}>
              <View style={styles.dateStampBadge}>
                <Calendar size={12} color="#E5A93C" />
                <Text style={styles.dateStampText}>{formatHeaderDateStamp()}</Text>
              </View>
            </View>

            {/* Seamless Title Input */}
            <TextInput
              style={styles.titleInput}
              placeholder="Title your entry..."
              placeholderTextColor="rgba(247, 244, 239, 0.3)"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            {/* SECTION TABS (Sleek Segmented Switcher to keep layout clean & uncluttered) */}
            <View style={styles.segmentedTabContainer}>
              <TouchableOpacity
                style={[styles.segmentTab, activeSection === 'reflections' && styles.segmentTabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSection('reflections');
                }}
              >
                <BookOpen size={13} color={activeSection === 'reflections' ? '#A29BFE' : '#9B94AA'} />
                <Text style={[styles.segmentTabText, activeSection === 'reflections' && { color: '#A29BFE' }]}>
                  Thoughts
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeSection === 'wins' && styles.segmentTabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSection('wins');
                }}
              >
                <Award size={13} color={activeSection === 'wins' ? '#4EBA8E' : '#9B94AA'} />
                <Text style={[styles.segmentTabText, activeSection === 'wins' && { color: '#4EBA8E' }]}>
                  Wins
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeSection === 'avoid' && styles.segmentTabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSection('avoid');
                }}
              >
                <ShieldAlert size={13} color={activeSection === 'avoid' ? '#E07A5F' : '#9B94AA'} />
                <Text style={[styles.segmentTabText, activeSection === 'avoid' && { color: '#E07A5F' }]}>
                  Avoid
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeSection === 'growth' && styles.segmentTabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSection('growth');
                }}
              >
                <TrendingUp size={13} color={activeSection === 'growth' ? '#E5A93C' : '#9B94AA'} />
                <Text style={[styles.segmentTabText, activeSection === 'growth' && { color: '#E5A93C' }]}>
                  Growth
                </Text>
              </TouchableOpacity>
            </View>

            {/* EXPANSIVE JOURNAL CANVAS FOR ACTIVE SECTION */}
            <View style={styles.activeSectionArea}>
              {activeSection === 'reflections' && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <BookOpen size={15} color="#A29BFE" />
                    <Text style={[styles.sectionTitle, { color: '#A29BFE' }]}>DAILY THOUGHTS & REFLECTIONS</Text>
                  </View>
                  <TextInput
                    style={styles.journalTextArea}
                    placeholder="Dear Diary, today was a productive day. I felt focused working on my goals and..."
                    placeholderTextColor="rgba(247, 244, 239, 0.28)"
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              )}

              {activeSection === 'wins' && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <Award size={15} color="#4EBA8E" />
                    <Text style={[styles.sectionTitle, { color: '#4EBA8E' }]}>WINS & ACHIEVEMENTS</Text>
                  </View>
                  <TextInput
                    style={styles.journalTextArea}
                    placeholder="• Completed focus blocks&#10;• Solved a difficult problem&#10;• Woke up energized..."
                    placeholderTextColor="rgba(247, 244, 239, 0.28)"
                    value={achievements}
                    onChangeText={setAchievements}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              )}

              {activeSection === 'avoid' && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <ShieldAlert size={15} color="#E07A5F" />
                    <Text style={[styles.sectionTitle, { color: '#E07A5F' }]}>NOT-TO-DO LIST (MISTAKES TO AVOID)</Text>
                  </View>
                  <TextInput
                    style={styles.journalTextArea}
                    placeholder="• Scrolling social media in the morning&#10;• Procrastinating core tasks..."
                    placeholderTextColor="rgba(247, 244, 239, 0.28)"
                    value={notToDos}
                    onChangeText={setNotToDos}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              )}

              {activeSection === 'growth' && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <TrendingUp size={15} color="#E5A93C" />
                    <Text style={[styles.sectionTitle, { color: '#E5A93C' }]}>GROWTH & LEARNINGS</Text>
                  </View>
                  <TextInput
                    style={styles.journalTextArea}
                    placeholder="• Plan task list the night before&#10;• Take active 5-minute breaks..."
                    placeholderTextColor="rgba(247, 244, 239, 0.28)"
                    value={improvements}
                    onChangeText={setImprovements}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              )}
            </View>

            {/* SEAMLESS INLINE TAGS FOOTER */}
            <View style={styles.tagsFooterSection}>
              <View style={styles.tagsHeaderRow}>
                <Tag size={13} color="#9B94AA" />
                <Text style={styles.tagsHeaderLabel}>TAGS & CATEGORIES</Text>
              </View>

              <View style={styles.tagsContainer}>
                {tags.map((t, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.activeTagPill}
                    onPress={() => handleRemoveTag(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.activeTagText}>#{t}</Text>
                    <Text style={styles.removeTagCross}>✕</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.addTagRow}>
                <TextInput
                  style={styles.tagInput}
                  placeholder="Add tag (e.g. growth)..."
                  placeholderTextColor="rgba(247, 244, 239, 0.28)"
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag} activeOpacity={0.8}>
                  <Text style={styles.addTagButtonText}>Add Tag</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C1B',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0C1B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#141022',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E1830',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#F7F4EF',
    fontWeight: '700',
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(224, 122, 95, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(224, 122, 95, 0.25)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E5A93C',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#0F0C1B',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // UNIFIED LUXURY DIARY CANVAS
  journalCanvas: {
    backgroundColor: '#181427',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  notebookMarginAccent: {
    position: 'absolute',
    left: 16,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: 'rgba(229, 169, 60, 0.25)',
    borderRadius: 1,
  },
  dateStampRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 12,
  },
  dateStampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(229, 169, 60, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.25)',
  },
  dateStampText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#E5A93C',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleInput: {
    fontFamily: 'DMSans-Bold',
    fontSize: 22,
    color: '#F7F4EF',
    fontWeight: '700',
    paddingLeft: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  // SEGMENTED SECTION SWITCHER
  segmentedTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#120F1F',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    marginLeft: 12,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: '#1F1932',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentTabText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#9B94AA',
    fontWeight: '600',
  },
  // ACTIVE SECTION CANVAS
  activeSectionArea: {
    paddingLeft: 12,
    marginBottom: 16,
  },
  sectionBlock: {
    minHeight: 240,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  journalTextArea: {
    fontFamily: 'DMSans',
    fontSize: 15,
    color: '#F7F4EF',
    lineHeight: 25,
    minHeight: 200,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  // INLINE TAGS FOOTER
  tagsFooterSection: {
    paddingLeft: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  tagsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  tagsHeaderLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#9B94AA',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  activeTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(162, 155, 254, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(162, 155, 254, 0.3)',
  },
  activeTagText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#A29BFE',
    fontWeight: '600',
  },
  removeTagCross: {
    fontSize: 10,
    color: '#A29BFE',
    marginLeft: 6,
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#F7F4EF',
    backgroundColor: '#120F1F',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  addTagButton: {
    backgroundColor: '#241E38',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addTagButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#A29BFE',
    fontWeight: '600',
  },
});
