import React, { useState, useCallback, useImperativeHandle, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import BottomSheet, {
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useUiStore } from '@/lib/store/ui.store';
import { useCreateGoal } from '@/lib/hooks/use-goals';
import { deadlineFromTimeline } from '@/lib/utils/date';
 
// Constants
const LABEL_TITLE = "Goal Title";
const INPUT_PLACEHOLDER = "What do you want to achieve?";
const LABEL_TIMELINE = "Timeline";
const LABEL_PRIMARY = "Make this my primary goal";
const BTN_SUBMIT = "Create Goal";
const TIMELINES: ('3M' | '6M' | '1Y' | '2Y' | '5Y')[] = ['3M', '6M', '1Y', '2Y', '5Y'];
const BORDER_COLOR = '#E8E7E3';
 
interface CreateGoalSheetProps {
  onSuccess: () => void;
}
 
export const CreateGoalSheet = React.forwardRef<BottomSheet, CreateGoalSheetProps>(
  ({ onSuccess }, ref) => {
    const createGoalMutation = useCreateGoal();
 
    const [title, setTitle] = useState('');
    const [timeline, setTimeline] = useState<'3M' | '6M' | '1Y' | '2Y' | '5Y'>('6M');
    const [isPrimary, setIsPrimary] = useState(false);
 
    // Expose ref control
    const sheetRef = useRef<BottomSheet>(null);
    const inputRef = useRef<any>(null);

    useImperativeHandle(ref, () => sheetRef.current as BottomSheet);
 
    const handleSheetChange = useCallback((index: number) => {
      if (index >= 0) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      }
    }, []);

    const handleCreate = () => {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) return;
      if (trimmedTitle.length > 120) return;
 
      const deadline = deadlineFromTimeline(timeline);
      const sanitizedTitle = trimmedTitle.replace(/[<>"';&]/g, '').trim();
      if (sanitizedTitle.length === 0) return;
 
      createGoalMutation.mutate(
        {
          title: sanitizedTitle,
          timeline,
          deadline,
          is_primary: isPrimary,
          description: null,
        },
        {
          onSuccess: () => {
            useUiStore.getState().showToast('Goal created!', 'success');
            // Reset form
            setTitle('');
            setTimeline('6M');
            setIsPrimary(false);
            Keyboard.dismiss();
            onSuccess();
          },
        }
      );
    };
 
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      []
    );
 
    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['75%']}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        onChange={handleSheetChange}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sheetHeader}>New Goal</Text>
 
          {/* Goal Title Input */}
          <Text style={styles.fieldLabel}>{LABEL_TITLE}</Text>
          <BottomSheetTextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder={INPUT_PLACEHOLDER}
            placeholderTextColor="#9B9BAF"
            value={title}
            onChangeText={setTitle}
            multiline
            numberOfLines={2}
            maxLength={120}
          />
 
          {/* Timeline Selector */}
          <Text style={styles.fieldLabel}>{LABEL_TIMELINE}</Text>
          <View style={styles.timelineRow}>
            {TIMELINES.map((t) => {
              const active = timeline === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.timelineChip, active && styles.timelineChipActive]}
                  onPress={() => setTimeline(t)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timelineChipText,
                      active && styles.timelineChipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
 
          {/* Make Primary Switch */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>{LABEL_PRIMARY}</Text>
              <Text style={styles.switchSubLabel}>
                This goal will appear at the top of your dashboard.
              </Text>
            </View>
            <Switch
              value={isPrimary}
              onValueChange={setIsPrimary}
              trackColor={{ false: '#E8E7E3', true: '#EAE8FD' }}
              thumbColor={isPrimary ? '#5B4FE8' : '#F4F3F0'}
            />
          </View>
 
          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!title.trim() || createGoalMutation.isPending) && styles.submitButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!title.trim() || createGoalMutation.isPending}
            activeOpacity={0.8}
          >
            {createGoalMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{BTN_SUBMIT}</Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

CreateGoalSheet.displayName = 'CreateGoalSheet';

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
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
  },
  textInput: {
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    fontFamily: 'DMSans',
    fontSize: 16,
    color: '#17172A',
    textAlignVertical: 'top',
    height: 90,
    marginBottom: 24,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timelineChip: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  timelineChipActive: {
    borderColor: '#5B4FE8',
    backgroundColor: '#EAE8FD',
  },
  timelineChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '500',
  },
  timelineChipTextActive: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#17172A',
  },
  switchSubLabel: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#5B4FE8',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
