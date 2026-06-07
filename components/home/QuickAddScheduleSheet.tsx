import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCreateScheduleBlock } from '@/lib/hooks/use-schedule';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';
import { getTodayLocal } from '@/lib/utils/date';
import * as Haptics from 'expo-haptics';

interface QuickAddScheduleSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SUBJECT_OPTIONS = [
  { label: '📚 Study', value: 'Study' },
  { label: '💼 Work', value: 'Work' },
  { label: '🏃 Personal', value: 'Personal' },
  { label: '🎯 Goal', value: 'Goal' },
  { label: 'Other', value: 'Other' },
];

const DURATION_OPTIONS = [
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h', value: 120 },
  { label: 'Custom', value: -1 },
];

const REPEAT_OPTIONS = [
  { label: 'Today only', value: 'today' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
];

export const QuickAddScheduleSheet: React.FC<QuickAddScheduleSheetProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const sheetRef = useRef<BottomSheet>(null);

  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [startTimeDate, setStartTimeDate] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [customDurationStr, setCustomDurationStr] = useState('');
  const [selectedRepeat, setSelectedRepeat] = useState<'today' | 'daily' | 'weekdays'>('today');

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
      setTitle('');
      setSelectedSubject(null);
      setStartTimeDate(new Date());
      setSelectedDuration(60);
      setCustomDurationStr('');
      setSelectedRepeat('today');
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const createBlockMutation = useCreateScheduleBlock();

  const getSubjectColor = (subject: string | null) => {
    if (!subject) return '#9B9BAF';
    const normalized = subject.trim().toLowerCase();
    if (normalized.includes('phys')) return '#5B4FE8';
    if (normalized.includes('chem')) return '#00B894';
    if (normalized.includes('biol')) return '#E8A020';
    if (normalized.includes('math')) return '#E85858';
    return '#9B9BAF';
  };

  const handleAddBlock = () => {
    if (!title.trim()) return;

    // Calculate duration in minutes
    let durationMins = selectedDuration;
    if (selectedDuration === -1) {
      const parsed = parseInt(customDurationStr, 10);
      durationMins = isNaN(parsed) || parsed <= 0 ? 60 : parsed;
    }

    // Format start time
    const startHour = String(startTimeDate.getHours()).padStart(2, '0');
    const startMin = String(startTimeDate.getMinutes()).padStart(2, '0');
    const startTimeStr = `${startHour}:${startMin}:00`;

    // Calculate end time
    const endTimeObj = new Date(startTimeDate.getTime() + durationMins * 60 * 1000);
    const endHour = String(endTimeObj.getHours()).padStart(2, '0');
    const endMin = String(endTimeObj.getMinutes()).padStart(2, '0');
    const endTimeStr = `${endHour}:${endMin}:00`;

    // Determine repeating attributes
    let days: number[] = [];
    let specificDate: string | null = null;

    if (selectedRepeat === 'today') {
      days = [new Date().getDay()];
      specificDate = getTodayLocal();
    } else if (selectedRepeat === 'daily') {
      days = [0, 1, 2, 3, 4, 5, 6];
      specificDate = null;
    } else if (selectedRepeat === 'weekdays') {
      days = [1, 2, 3, 4, 5];
      specificDate = null;
    }

    const color = getSubjectColor(selectedSubject);

    createBlockMutation.mutate(
      {
        title: title.trim(),
        subject: selectedSubject,
        color,
        start_time: startTimeStr,
        end_time: endTimeStr,
        days,
        specific_date: specificDate,
        is_active: true,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Keyboard.dismiss();
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        },
      }
    );
  };

  const formatTimeDisplay = (date: Date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const isSaving = createBlockMutation.isPending;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['65%']}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      onChange={handleSheetChange}
      keyboardBehavior="interactive"
    >
      <BottomSheetView style={styles.sheetContent}>
        <Text style={styles.sheetHeader}>Quick Add Schedule Block</Text>

        {/* Title */}
        <BottomSheetTextInput
          style={styles.textInput}
          placeholder="Block title (e.g. Chemistry Homework)"
          placeholderTextColor="#9B9BAF"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          autoFocus={isVisible}
        />

        {/* Subject Select */}
        <Text style={styles.sectionLabel}>Subject (Optional)</Text>
        <View style={styles.pillsRow}>
          {SUBJECT_OPTIONS.map((opt) => {
            const isSelected = selectedSubject === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => {
                  setSelectedSubject(opt.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Time & Duration row */}
        <View style={styles.timeRowContainer}>
          <View style={styles.timePickerContainer}>
            <Text style={styles.sectionLabel}>Start Time</Text>
            <TouchableOpacity
              style={styles.timeSelectBtn}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.timeSelectBtnText}>
                {formatTimeDisplay(startTimeDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedDuration === -1 && (
            <View style={styles.customDurationContainer}>
              <Text style={styles.sectionLabel}>Mins</Text>
              <BottomSheetTextInput
                style={[styles.textInput, styles.durationInput]}
                placeholder="Mins"
                placeholderTextColor="#9B9BAF"
                value={customDurationStr}
                onChangeText={setCustomDurationStr}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          )}
        </View>

        {showTimePicker && (
          <View style={styles.nativePickerContainer}>
            <DateTimePicker
              value={startTimeDate}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              textColor="#000000"
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowTimePicker(false);
                }
                if (selectedDate) {
                  setStartTimeDate(selectedDate);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.closePickerBtn}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.closePickerBtnText}>Set Time</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Duration selector */}
        <Text style={styles.sectionLabel}>Duration</Text>
        <View style={styles.pillsRow}>
          {DURATION_OPTIONS.map((opt) => {
            const isSelected = selectedDuration === opt.value;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => {
                  setSelectedDuration(opt.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Repeat selector */}
        <Text style={styles.sectionLabel}>Repeat</Text>
        <View style={styles.pillsRow}>
          {REPEAT_OPTIONS.map((opt) => {
            const isSelected = selectedRepeat === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => {
                  setSelectedRepeat(opt.value as 'today' | 'daily' | 'weekdays');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add Block button */}
        <TouchableOpacity
          style={[styles.addButton, (!title.trim() || isSaving) && styles.addButtonDisabled]}
          onPress={handleAddBlock}
          disabled={!title.trim() || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>Add Block</Text>
          )}
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHeader: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 22,
    color: COLORS.navy,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  textInput: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.t1,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: COLORS.t2,
    fontWeight: '600',
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: COLORS.violetSoft,
    borderColor: COLORS.violet,
  },
  pillText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.t2,
  },
  pillTextSelected: {
    color: COLORS.violet,
    fontWeight: '600',
  },
  timeRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 12,
  },
  timePickerContainer: {
    flex: 1.5,
  },
  customDurationContainer: {
    flex: 1,
  },
  timeSelectBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
  },
  timeSelectBtnText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.t1,
    fontWeight: '500',
  },
  durationInput: {
    marginBottom: 0,
  },
  nativePickerContainer: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  closePickerBtn: {
    alignSelf: 'flex-end',
    padding: 8,
    backgroundColor: COLORS.violet,
    borderRadius: 6,
    marginTop: 4,
  },
  closePickerBtnText: {
    color: '#FFFFFF',
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  addButtonText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
