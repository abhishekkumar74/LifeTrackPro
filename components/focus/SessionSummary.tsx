import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { Frown, Meh, Smile, SmilePlus, Zap, LucideIcon } from 'lucide-react-native';

interface SessionSummaryProps {
  isVisible: boolean;
  duration: number; // in minutes
  subject: string | null;
  pomodoroCount: number;
  onSave: (mood: number, note: string, focusAccuracy?: 'fully_focused' | 'partially_distracted' | 'off_track' | null, seedsEarned?: number) => void;
  onDiscard: () => void;
  isStrictMode?: boolean;
  isPlantWilted?: boolean;
  selectedPlantId?: string;
}

const MOOD_ICONS: { Icon: LucideIcon; val: number }[] = [
  { Icon: Frown, val: 1 },
  { Icon: Meh, val: 2 },
  { Icon: Smile, val: 3 },
  { Icon: SmilePlus, val: 4 },
  { Icon: Zap, val: 5 },
];

// Sub-component for an animated mood selector
const MoodEmoji: React.FC<{
  Icon: LucideIcon;
  active: boolean;
  onPress: () => void;
}> = ({ Icon, active, onPress }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(active ? 1.3 : 1, { duration: 150 });
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.moodWrapper}>
      <Animated.View style={animatedStyle}>
        <Icon size={24} color={active ? '#5B4FE8' : '#9B9BAF'} />
      </Animated.View>
      {active && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
};

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  isVisible,
  duration,
  subject,
  pomodoroCount,
  onSave,
  onDiscard,
  isStrictMode = false,
  isPlantWilted = false,
  selectedPlantId = 'sprout',
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedAccuracy, setSelectedAccuracy] = useState<'fully_focused' | 'partially_distracted' | 'off_track' | null>(null);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Open or close bottom sheet when isVisible changes
  useEffect(() => {
    if (isVisible) {
      // Default to mood 4 (focused) and fully_focused accuracy so Save Session button is active
      setSelectedMood(4);
      setSelectedAccuracy('fully_focused');
      setNote('');
      setIsSaving(false);
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  // Award Seeds: Base 5 seeds + 1 seed per 5 min + strict mode bonus
  const durationBonus = Math.floor(duration / 5);
  const strictBonus = isStrictMode ? (isPlantWilted ? 2 : 5) : 0;
  const calculatedSeeds = 5 + durationBonus + strictBonus;

  const handleSave = async () => {
    if (isSaving) return;
    Keyboard.dismiss();

    const moodVal = isStrictMode
      ? selectedAccuracy === 'fully_focused'
        ? 5
        : selectedAccuracy === 'partially_distracted'
        ? 3
        : 1
      : selectedMood || 4;

    setIsSaving(true);
    try {
      await onSave(moodVal, note, isStrictMode ? selectedAccuracy : null, calculatedSeeds);
    } catch (e) {
      setIsSaving(false);
    }
  };

  const handleDiscardPress = () => {
    if (isSaving) return;
    Keyboard.dismiss();
    onDiscard();
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
      snapPoints={isStrictMode ? ['62%'] : ['55%']}
      enablePanDownToClose={false} // Force action choice
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handleIndicator}
      keyboardBehavior="interactive"
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <Text style={styles.headerTitle}>Session Complete!</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1}>
              {`${duration} min`}
            </Text>
            <Text style={styles.statLabel}>DURATION</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1}>
              {subject || 'General'}
            </Text>
            <Text style={styles.statLabel}>SUBJECT</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#E8A020' }]} numberOfLines={1}>
              {`+${calculatedSeeds}`}
            </Text>
            <Text style={[styles.statLabel, { color: '#E8A020' }]}>SEEDS EARNED</Text>
          </View>
        </View>

        {/* Mood Label */}
        <Text style={styles.fieldLabel}>
          {isStrictMode ? 'Mindfulness Reflection: How focused were you?' : 'How was your focus?'}
        </Text>

        {isStrictMode ? (
          <View style={styles.reflectionRow}>
            {[
              { id: 'fully_focused', label: 'Fully Focused', color: '#00B894' },
              { id: 'partially_distracted', label: 'Distracted', color: '#E8A020' },
              { id: 'off_track', label: 'Off Track', color: '#E85858' },
            ].map((refObj) => {
              const active = selectedAccuracy === refObj.id;
              return (
                <TouchableOpacity
                  key={refObj.id}
                  style={[
                    styles.reflectionBtn,
                    active && { backgroundColor: refObj.color + '15', borderColor: refObj.color },
                  ]}
                  onPress={() => setSelectedAccuracy(refObj.id as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reflectionBtnText, active && { color: refObj.color, fontWeight: '700' }]}>
                    {refObj.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* Mood Icon Selectors */
          <View style={styles.moodRow}>
            {MOOD_ICONS.map((m) => (
              <MoodEmoji
                key={m.val}
                Icon={m.Icon}
                active={selectedMood === m.val}
                onPress={() => setSelectedMood(m.val)}
              />
            ))}
          </View>
        )}

        {/* Optional Note Accomplishments */}
        <BottomSheetTextInput
          style={styles.textInput}
          placeholder="What did you accomplish?"
          placeholderTextColor="#9B9BAF"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={2}
        />

        {/* Save Session CTA */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (isSaving || (!isStrictMode && selectedMood === null)) && styles.saveButtonDisabled,
            (isSaving || (isStrictMode && selectedAccuracy === null)) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving || (isStrictMode ? selectedAccuracy === null : selectedMood === null)}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Session</Text>
          )}
        </TouchableOpacity>

        {/* Discard Session Link */}
        <TouchableOpacity
          onPress={handleDiscardPress}
          activeOpacity={0.7}
          style={styles.discardButton}
        >
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    flex: 1,
  },
  handleIndicator: {
    backgroundColor: '#E8E7E3',
    width: 40,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#17172A',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'DMMono',
    fontSize: 16,
    color: '#17172A',
    fontWeight: '600',
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    color: '#9B9BAF',
    marginTop: 4,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  fieldLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '600',
    marginBottom: 12,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  moodWrapper: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 28,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5B4FE8',
    marginTop: 4,
    position: 'absolute',
    bottom: 0,
  },
  textInput: {
    backgroundColor: '#F7F6F3',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 12,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
    textAlignVertical: 'top',
    height: 68,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#5B4FE8',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#9B9BAF',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
  },
  discardButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  discardButtonText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    fontWeight: '500',
  },
  reflectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  reflectionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectionBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5C5C70',
    textAlign: 'center',
  },
});
export default SessionSummary;
