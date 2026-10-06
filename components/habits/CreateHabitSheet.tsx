import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';
import { useCreateHabit, useUpdateHabit, HabitWithStatus } from '@/lib/hooks/use-habits';
import * as Haptics from 'expo-haptics';

const PRESET_EMOJIS = ['⏰', '💧', '📚', '🧘', '🏃', '😴', '🚫', '✍️', '🎯', '💊'];

interface CreateHabitSheetProps {
  isVisible: boolean;
  onClose: () => void;
  editHabit?: HabitWithStatus;
}

const DAYS_OF_WEEK = [
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
  { label: 'S', value: 0 },
];

export const CreateHabitSheet: React.FC<CreateHabitSheetProps> = ({
  isVisible,
  onClose,
  editHabit,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const createMutation = useCreateHabit();
  const updateMutation = useUpdateHabit();

  const [title, setTitle] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⏰');
  const [customEmoji, setCustomEmoji] = useState('');
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'custom'>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);

  // Open/close based on isVisible prop
  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
      // Auto-populate edit details if editing
      if (editHabit) {
        setTitle(editHabit.title);
        setSelectedEmoji(editHabit.emoji);
        setFrequency(editHabit.frequency);
        setCustomDays(editHabit.custom_days || []);
        if (!PRESET_EMOJIS.includes(editHabit.emoji)) {
          setCustomEmoji(editHabit.emoji);
          setShowCustomEmojiInput(true);
        } else {
          setCustomEmoji('');
          setShowCustomEmojiInput(false);
        }
      } else {
        // Reset to default
        setTitle('');
        setSelectedEmoji('⏰');
        setCustomEmoji('');
        setShowCustomEmojiInput(false);
        setFrequency('daily');
        setCustomDays([]);
      }
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible, editHabit]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const handleSelectEmoji = (emoji: string) => {
    setSelectedEmoji(emoji);
    setShowCustomEmojiInput(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleSelectCustomEmojiOption = () => {
    setShowCustomEmojiInput(true);
    if (customEmoji) {
      setSelectedEmoji(customEmoji);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleCustomEmojiChange = (text: string) => {
    // Only take the first emoji/character
    const cleanText = Array.from(text)[0] || '';
    setCustomEmoji(cleanText);
    if (cleanText) {
      setSelectedEmoji(cleanText);
    }
  };

  const handleToggleDay = (dayValue: number) => {
    setCustomDays((prev) => {
      const next = prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue];
      return next.sort();
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) return;
    if (trimmedTitle.length > 40) return;

    const sanitizedTitle = trimmedTitle.replace(/[<>"';&]/g, '').trim();
    if (sanitizedTitle.length === 0) return;

    let finalFrequency = frequency;
    let finalCustomDays: number[] | null = null;

    if (frequency === 'weekdays') {
      finalCustomDays = [1, 2, 3, 4, 5]; // Mon to Fri
    } else if (frequency === 'custom') {
      finalCustomDays = customDays.length > 0 ? customDays : [1, 2, 3, 4, 5, 6, 0];
    }

    const payload = {
      title: sanitizedTitle,
      emoji: selectedEmoji,
      frequency: finalFrequency,
      custom_days: finalCustomDays,
    };

    if (editHabit) {
      updateMutation.mutate(
        {
          id: editHabit.id,
          updates: payload,
        },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            Keyboard.dismiss();
            onClose();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          ...payload,
          best_time: null,
        },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            Keyboard.dismiss();
            onClose();
          },
        }
      );
    }
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={['70%']}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      onChange={handleSheetChange}
      keyboardBehavior="interactive"
    >
      <BottomSheetView style={styles.sheetContent}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          <Text style={styles.sheetHeader}>
            {editHabit ? 'Edit Habit' : 'New Habit'}
          </Text>

          {/* Emoji Picker Row */}
          <Text style={styles.sectionLabel}>Habit Icon</Text>
          <View style={styles.emojiRow}>
            {PRESET_EMOJIS.map((emoji) => {
              const isSelected = selectedEmoji === emoji && !showCustomEmojiInput;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiPill, isSelected && styles.emojiPillSelected]}
                  onPress={() => handleSelectEmoji(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[
                styles.emojiPill,
                showCustomEmojiInput && styles.emojiPillSelected,
              ]}
              onPress={handleSelectCustomEmojiOption}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiText}>{customEmoji || '✨'}</Text>
            </TouchableOpacity>
          </View>

          {showCustomEmojiInput && (
            <View style={styles.customEmojiContainer}>
              <Text style={styles.customEmojiLabel}>Type custom emoji / symbol:</Text>
              <BottomSheetTextInput
                style={styles.customEmojiInput}
                placeholder="Type one emoji (e.g. 🏃)"
                placeholderTextColor="#9B9BAF"
                value={customEmoji}
                onChangeText={handleCustomEmojiChange}
                maxLength={2}
              />
            </View>
          )}

          {/* Habit Name Input */}
          <Text style={styles.sectionLabel}>Habit Name</Text>
          <BottomSheetTextInput
            style={styles.nameInput}
            placeholder="e.g. Drink 8 glasses of water"
            placeholderTextColor="#9B9BAF"
            value={title}
            onChangeText={setTitle}
            maxLength={40}
            autoFocus={isVisible && !editHabit}
          />

          {/* Frequency pills */}
          <Text style={styles.sectionLabel}>Frequency</Text>
          <View style={styles.freqRow}>
            {(['daily', 'weekdays', 'custom'] as const).map((mode) => {
              const isSelected = frequency === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.freqPill, isSelected && styles.freqPillSelected]}
                  onPress={() => {
                    setFrequency(mode);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.freqPillText,
                      isSelected && styles.freqPillTextSelected,
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Day selection checkboxes for Custom frequency */}
          {frequency === 'custom' && (
            <View style={styles.customDaysContainer}>
              <Text style={styles.customDaysLabel}>Select active days:</Text>
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map((day) => {
                  const isChecked = customDays.includes(day.value);
                  return (
                    <TouchableOpacity
                      key={day.label + day.value}
                      style={[
                        styles.dayCircle,
                        isChecked && styles.dayCircleChecked,
                      ]}
                      onPress={() => handleToggleDay(day.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayCircleText,
                          isChecked && styles.dayCircleTextChecked,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Save Action Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!title.trim() || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!title.trim() || isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editHabit ? 'Update Habit' : 'Save Habit'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  sheetHeader: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 24,
    color: COLORS.navy,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
  },
  sectionLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: COLORS.t2,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  emojiPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F5F5F7',
  },
  emojiPillSelected: {
    borderColor: COLORS.violet,
    backgroundColor: COLORS.violetSoft,
  },
  emojiText: {
    fontSize: 18,
  },
  customEmojiContainer: {
    marginBottom: 12,
    backgroundColor: '#F5F5F7',
    padding: 10,
    borderRadius: 8,
  },
  customEmojiLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.t2,
    marginBottom: 6,
  },
  customEmojiInput: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    height: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
    color: COLORS.t1,
  },
  nameInput: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.t1,
  },
  freqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  freqPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    marginRight: 8,
  },
  freqPillSelected: {
    backgroundColor: COLORS.violet,
  },
  freqPillText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: COLORS.t2,
    fontWeight: '500',
  },
  freqPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customDaysContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  customDaysLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: COLORS.t2,
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  dayCircleChecked: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  dayCircleText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: COLORS.t2,
    fontWeight: '500',
  },
  dayCircleTextChecked: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    width: '100%',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.violet,
    opacity: 0.4,
  },
  saveButtonText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
