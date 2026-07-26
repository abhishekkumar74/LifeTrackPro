import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Save, Sparkles, Calendar, Trash2, Award, ShieldAlert, TrendingUp, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  useJournalEntry,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
} from '@/lib/hooks/use-journal';

const PROMPTS = [
  'What made you feel proud or accomplished today?',
  'What is one lesson you learned today?',
  'Write 3 things you are deeply grateful for right now.',
  'What challenge did you overcome today?',
  'How are you feeling about your current goals?',
];

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
    return `📜 DIARY PAGE • ${dayName}, ${day} ${month} ${year} • ${time}`;
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

  const handlePromptSelect = (promptText: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!content) {
      setContent(`Prompt: ${promptText}\n\n`);
    } else {
      setContent((prev) => `${prev}\n\nPrompt: ${promptText}\n\n`);
    }
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
      // Error handled by mutation callback
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
      <StatusBar barStyle="light-content" backgroundColor="#13111C" />

      {/* TOP NAV BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#A8A2B5" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>{isNew ? 'New Diary Page' : 'Edit Diary Page'}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!isNew && (
            <TouchableOpacity style={styles.deleteIconButton} onPress={handleDelete}>
              <Trash2 size={18} color="#D97757" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            activeOpacity={0.85}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#13111C" />
            ) : (
              <>
                <Save size={16} color="#13111C" />
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* LEATHER BOOKMARK STAMP */}
          <View style={styles.diaryHeaderStampRow}>
            <View style={styles.dateStampBadge}>
              <Calendar size={14} color="#E5A93C" />
              <Text style={styles.dateStampText}>{formatHeaderDateStamp()}</Text>
            </View>
          </View>

          {/* ENTRY TITLE */}
          <View style={styles.titleContainer}>
            <TextInput
              style={styles.titleInput}
              placeholder="Diary Entry Title (e.g. Day 45 Reflection)..."
              placeholderTextColor="rgba(244,239,235,0.35)"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />
          </View>

          {/* INSPIRATION PROMPTS */}
          <View style={styles.sectionGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Sparkles size={13} color="#E5A93C" />
              <Text style={styles.sectionLabel}>DAILY INSPIRATION PROMPTS</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsRow}>
              {PROMPTS.map((prompt, pIdx) => (
                <TouchableOpacity
                  key={pIdx}
                  style={styles.promptChip}
                  onPress={() => handlePromptSelect(prompt)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.promptChipText}>"{prompt}"</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 1. DAILY DIARY & PERSONAL THOUGHTS (TOP CANVAS) */}
          <View style={styles.notebookSectionCard}>
            <View style={[styles.notebookCardHeader, { backgroundColor: 'rgba(162,155,254,0.12)' }]}>
              <BookOpen size={16} color="#A29BFE" />
              <Text style={[styles.notebookHeaderTitle, { color: '#A29BFE' }]}>✍️ DAILY DIARY & THOUGHTS</Text>
            </View>
            <View style={styles.ruledPaperContainerMain}>
              <TextInput
                style={styles.ruledInputMain}
                placeholder="Dear Diary, today was a productive day. I felt very calm working on my project and..."
                placeholderTextColor="rgba(244,239,235,0.3)"
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* 2. ACHIEVEMENTS OF THE DAY */}
          <View style={styles.notebookSectionCard}>
            <View style={[styles.notebookCardHeader, { backgroundColor: 'rgba(123,182,157,0.12)' }]}>
              <Award size={16} color="#7BB69D" />
              <Text style={[styles.notebookHeaderTitle, { color: '#7BB69D' }]}>🏆 ACHIEVEMENTS OF THE DAY</Text>
            </View>
            <View style={styles.ruledPaperContainerSuccess}>
              <TextInput
                style={styles.ruledInput}
                placeholder="• Completed 3 focus sessions&#10;• Woke up on time&#10;• Solved a difficult coding bug..."
                placeholderTextColor="rgba(244,239,235,0.3)"
                value={achievements}
                onChangeText={setAchievements}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* 3. NOT-TO-DO LIST */}
          <View style={styles.notebookSectionCard}>
            <View style={[styles.notebookCardHeader, { backgroundColor: 'rgba(217,119,87,0.12)' }]}>
              <ShieldAlert size={16} color="#D97757" />
              <Text style={[styles.notebookHeaderTitle, { color: '#D97757' }]}>🚫 NOT-TO-DO LIST</Text>
            </View>
            <View style={styles.ruledPaperContainerDanger}>
              <TextInput
                style={styles.ruledInput}
                placeholder="• Scrolling social media after waking up&#10;• Skipping evening study session&#10;• Multitasking while working..."
                placeholderTextColor="rgba(244,239,235,0.3)"
                value={notToDos}
                onChangeText={setNotToDos}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* 4. WHERE I CAN DO BETTER */}
          <View style={styles.notebookSectionCard}>
            <View style={[styles.notebookCardHeader, { backgroundColor: 'rgba(229,169,60,0.12)' }]}>
              <TrendingUp size={16} color="#E5A93C" />
              <Text style={[styles.notebookHeaderTitle, { color: '#E5A93C' }]}>📈 WHERE TO IMPROVE</Text>
            </View>
            <View style={styles.ruledPaperContainerWarning}>
              <TextInput
                style={styles.ruledInput}
                placeholder="• Plan my morning task queue the night before&#10;• Take short active breaks between 50-min study blocks..."
                placeholderTextColor="rgba(244,239,235,0.3)"
                value={improvements}
                onChangeText={setImprovements}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* TAGS CREATOR */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionLabel}>TAGS & CATEGORIES</Text>

            <View style={styles.tagsContainer}>
              {tags.map((t, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.activeTagPill}
                  onPress={() => handleRemoveTag(t)}
                >
                  <Text style={styles.activeTagText}>#{t}</Text>
                  <Text style={{ fontSize: 10, color: '#A29BFE', marginLeft: 4 }}>✕</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.addTagRow}>
              <TextInput
                style={styles.tagInput}
                placeholder="Add tag (e.g. growth)..."
                placeholderTextColor="rgba(244,239,235,0.35)"
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
              />
              <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
                <Text style={styles.addTagButtonText}>Add Tag</Text>
              </TouchableOpacity>
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
    backgroundColor: '#13111C',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#13111C',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229,169,60,0.1)',
    backgroundColor: '#1B1726',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#241F32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 17,
    color: '#F4EFEB',
    fontWeight: 'bold',
  },
  deleteIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(217,119,87,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,119,87,0.3)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E5A93C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#13111C',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  diaryHeaderStampRow: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateStampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#241F32',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(229,169,60,0.3)',
  },
  dateStampText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#E5A93C',
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  titleContainer: {
    marginBottom: 16,
  },
  titleInput: {
    fontFamily: 'DMSans-Bold',
    fontSize: 20,
    color: '#F4EFEB',
    fontWeight: 'bold',
    backgroundColor: '#1E1A29',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionGroup: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#A8A2B5',
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  promptsRow: {
    gap: 8,
  },
  promptChip: {
    backgroundColor: '#252033',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.25)',
    maxWidth: 260,
  },
  promptChipText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#A29BFE',
  },
  // PARCHMENT NOTEBOOK SECTION CARDS
  notebookSectionCard: {
    backgroundColor: '#1E1A29',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
    overflow: 'hidden',
  },
  notebookCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  notebookHeaderTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  ruledPaperContainerSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: '#7BB69D',
    backgroundColor: '#1E1A29',
  },
  ruledPaperContainerDanger: {
    borderLeftWidth: 3,
    borderLeftColor: '#D97757',
    backgroundColor: '#1E1A29',
  },
  ruledPaperContainerWarning: {
    borderLeftWidth: 3,
    borderLeftColor: '#E5A93C',
    backgroundColor: '#1E1A29',
  },
  ruledPaperContainerMain: {
    borderLeftWidth: 3,
    borderLeftColor: '#A29BFE',
    backgroundColor: '#1E1A29',
  },
  ruledInput: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#F4EFEB',
    padding: 14,
    minHeight: 90,
    lineHeight: 22,
  },
  ruledInputMain: {
    fontFamily: 'DMSans',
    fontSize: 15,
    color: '#F4EFEB',
    padding: 16,
    minHeight: 180,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  activeTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(162,155,254,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.3)',
  },
  activeTagText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#A29BFE',
    fontWeight: 'bold',
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tagInput: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#F4EFEB',
    backgroundColor: '#1E1A29',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addTagButton: {
    backgroundColor: '#252033',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addTagButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#A29BFE',
    fontWeight: 'bold',
  },
});
