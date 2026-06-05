import React, { useState, useCallback, useImperativeHandle, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCreateMilestone } from '@/lib/hooks/use-milestones';
import { formatDeadline } from '@/lib/utils/date';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface CreateMilestoneSheetProps {
  isVisible: boolean;
  goalId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateMilestoneSheet = React.forwardRef<BottomSheet, CreateMilestoneSheetProps>(
  ({ isVisible, goalId, onClose, onSuccess }, ref) => {
    const createMilestoneMutation = useCreateMilestone();

    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Sync visibility state with bottom sheet expand/close
    const sheetRef = React.useRef<BottomSheet>(null);
    useImperativeHandle(ref, () => sheetRef.current as BottomSheet);

    useEffect(() => {
      if (isVisible) {
        sheetRef.current?.expand();
        setTitle('');
        setDueDate(null);
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

    const handleCreate = () => {
      if (!title.trim() || !dueDate || !goalId) return;

      const formattedDueDate = dueDate.toISOString().split('T')[0];

      createMilestoneMutation.mutate(
        {
          goal_id: goalId,
          title: title.trim(),
          due_date: formattedDueDate,
          status: 'pending',
          order_index: 0, // Appended by default
        },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setTitle('');
            setDueDate(null);
            Keyboard.dismiss();
            onClose();
            if (onSuccess) {
              onSuccess();
            }
          },
        }
      );
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowDatePicker(false);
      if (selectedDate) {
        setDueDate(selectedDate);
      }
    };

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const isSaving = createMilestoneMutation.isPending;
    const isValid = title.trim().length > 0 && dueDate !== null;

    // Minimum date: tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        onChange={handleSheetChange}
        keyboardBehavior="interactive"
      >
        <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetHeader}>New Milestone</Text>

          {/* Milestone Title */}
          <Text style={styles.fieldLabel}>Milestone Title</Text>
          <BottomSheetTextInput
            style={styles.textInput}
            placeholder="e.g. Complete Physics syllabus"
            placeholderTextColor="#9B9BAF"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
            autoFocus={isVisible}
          />

          {/* Due Date Selector */}
          <Text style={styles.fieldLabel}>Due Date</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => {
              Keyboard.dismiss();
              setShowDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.datePickerText}>
              {dueDate ? formatDeadline(dueDate.toISOString()) : 'Select due date'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate || tomorrow}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={tomorrow}
            />
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!isValid || isSaving) && styles.submitButtonDisabled]}
            onPress={handleCreate}
            disabled={!isValid || isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Add Milestone</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    );
  }
);

CreateMilestoneSheet.displayName = 'CreateMilestoneSheet';

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 60,
  },
  sheetHeader: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#17172A',
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    color: '#9B9BAF',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 14,
    fontFamily: 'DMSans',
    fontSize: 15,
    color: '#17172A',
    height: 48,
  },
  multilineInput: {
    height: 72,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 14,
    height: 48,
    justifyContent: 'center',
  },
  datePickerText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
  },
  submitButton: {
    backgroundColor: '#5B4FE8',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 32,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#9B9BAF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
  },
});
