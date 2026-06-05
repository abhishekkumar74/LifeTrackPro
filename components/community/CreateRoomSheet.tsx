import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useCreateRoom } from '@/lib/hooks/use-study-rooms';

interface CreateRoomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}

const SUBJECTS = ['None', 'Physics', 'Chemistry', 'Biology', 'Math', 'UPSC', 'Other'];
const ROOM_TYPES = [
  { value: 'silent', icon: '🔇', label: 'Silent', description: 'No chat, pure focus' },
  { value: 'music', icon: '🎵', label: 'Music', description: 'Shared ambient sound' },
  { value: 'discussion', icon: '💬', label: 'Discussion', description: 'Chat during breaks' },
];
const TIMERS: (25 | 50 | 90)[] = [25, 50, 90];

export const CreateRoomSheet: React.FC<CreateRoomSheetProps> = ({
  isVisible,
  onClose,
  onCreated,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const createRoomMutation = useCreateRoom();

  const [roomName, setRoomName] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<'silent' | 'music' | 'discussion'>('silent');
  const [timerMinutes, setTimerMinutes] = useState<25 | 50 | 90>(25);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const handleCreate = () => {
    const cleaned = roomName.replace(/[<>"';&]/g, '').trim();
    if (cleaned.length === 0) return;

    createRoomMutation.mutate(
      {
        name: cleaned,
        subject: subject === 'None' ? null : subject,
        room_type: roomType,
        timer_minutes: timerMinutes,
        is_public: isPublic,
      },
      {
        onSuccess: async (data) => {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            // silent on simulator
          }
          // Reset form
          setRoomName('');
          setSubject(null);
          setRoomType('silent');
          setTimerMinutes(25);
          setIsPublic(true);
          Keyboard.dismiss();
          onCreated(data.id);
          onClose();
        },
      }
    );
  };

  const handleSheetChange = (index: number) => {
    if (index === -1) {
      onClose();
    }
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
      onChange={handleSheetChange}
      keyboardBehavior="interactive"
    >
      <BottomSheetView style={styles.contentContainer}>
        <Text style={styles.sheetTitle}>Create Room</Text>

        {/* Room Name */}
        <Text style={styles.fieldLabel}>ROOM NAME</Text>
        <BottomSheetTextInput
          style={styles.textInput}
          placeholder="e.g. NEET Biology Session"
          placeholderTextColor="#9B9BAF"
          value={roomName}
          onChangeText={setRoomName}
          maxLength={50}
          autoFocus={isVisible}
        />

        {/* Subject Select */}
        <Text style={styles.fieldLabel}>SUBJECT</Text>
        <View style={styles.pillContainer}>
          {SUBJECTS.map((sub) => {
            const isSelected = (sub === 'None' && subject === null) || subject === sub;
            return (
              <TouchableOpacity
                key={sub}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setSubject(sub === 'None' ? null : sub)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Room Type */}
        <Text style={styles.fieldLabel}>ROOM TYPE</Text>
        <View style={styles.roomTypeContainer}>
          {ROOM_TYPES.map((rt) => {
            const isSelected = roomType === rt.value;
            return (
              <TouchableOpacity
                key={rt.value}
                style={[styles.roomTypeRow, isSelected && styles.roomTypeRowSelected]}
                onPress={() => setRoomType(rt.value as 'silent' | 'music' | 'discussion')}
                activeOpacity={0.7}
              >
                <Text style={styles.roomTypeIcon}>{rt.icon}</Text>
                <View style={styles.roomTypeTextContainer}>
                  <Text style={styles.roomTypeLabel}>{rt.label}</Text>
                  <Text style={styles.roomTypeDesc}>{rt.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timer Selection */}
        <Text style={styles.fieldLabel}>TIMER DURATION</Text>
        <View style={styles.timerChipContainer}>
          {TIMERS.map((t) => {
            const isSelected = timerMinutes === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.timerChip, isSelected && styles.timerChipSelected]}
                onPress={() => setTimerMinutes(t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.timerChipText, isSelected && styles.timerChipTextSelected]}>
                  {t} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Public Switch */}
        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Public Room</Text>
            <Text style={styles.switchDesc}>Anyone can join this study room</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: '#E8E7E3', true: '#EAE8FD' }}
            thumbColor={isPublic ? '#5B4FE8' : '#F4F3F0'}
          />
        </View>

        {/* Create Room Button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            (!roomName.trim() || createRoomMutation.isPending) && styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={!roomName.trim() || createRoomMutation.isPending}
          activeOpacity={0.8}
        >
          {createRoomMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.createButtonText}>Create Room</Text>
          )}
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 17,
    fontWeight: '600',
    color: '#17172A',
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '600',
    color: '#9B9BAF',
    letterSpacing: 0.5,
    marginBottom: 8,
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
    marginBottom: 20,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  pillSelected: {
    borderColor: '#5B4FE8',
    backgroundColor: '#EAE8FD',
  },
  pillText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#5C5C70',
  },
  pillTextSelected: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  roomTypeContainer: {
    gap: 8,
    marginBottom: 20,
  },
  roomTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  roomTypeRowSelected: {
    borderColor: '#5B4FE8',
    borderLeftWidth: 4,
    backgroundColor: '#F7F6FD',
  },
  roomTypeIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  roomTypeTextContainer: {
    flex: 1,
  },
  roomTypeLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#17172A',
  },
  roomTypeDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 2,
  },
  timerChipContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  timerChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  timerChipSelected: {
    borderColor: '#5B4FE8',
    backgroundColor: '#EAE8FD',
  },
  timerChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
  },
  timerChipTextSelected: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#17172A',
  },
  switchDesc: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 2,
  },
  createButton: {
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
  createButtonDisabled: {
    backgroundColor: '#9B9BAF',
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
  },
});
