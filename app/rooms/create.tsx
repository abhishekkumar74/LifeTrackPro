import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  InputAccessoryView,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Sparkles,
  Target,
  VolumeX,
  Headphones,
  Users,
  Layers,
  Clock,
  Sliders,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Plus,
} from 'lucide-react-native';
import { useCreateRoom } from '@/lib/hooks/use-study-rooms';
import { useSubjects } from '@/lib/hooks/use-subjects';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import { encodeRoomSubject } from '@/lib/utils/room-visibility';

type RoomType = 'silent' | 'music' | 'discussion';
type VisibilityOption = 'public' | 'friends' | 'private';

const QUICK_TOPICS = [
  'DSA Revision',
  'Mock Test',
  'Exam Prep',
  'Quick Revision',
  'Late Night Revision',
  'Silent Grind',
];

const PRESET_DURATIONS: { duration: number; badge: string }[] = [
  { duration: 15, badge: 'Quick Sprint' },
  { duration: 25, badge: 'Pomodoro' },
  { duration: 45, badge: 'Standard' },
  { duration: 50, badge: 'Deep Work' },
  { duration: 60, badge: '1 Hour' },
  { duration: 90, badge: 'Sprint' },
  { duration: 120, badge: 'Marathon' },
];

export default function CreateRoomScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const createRoomMutation = useCreateRoom();
  const { data: profileSubjects = [] } = useSubjects();

  // Form State
  const [roomName, setRoomName] = useState('Late Night Revision');
  const [selectedSubject, setSelectedSubject] = useState<string>('General Skills');
  const [roomType, setRoomType] = useState<RoomType>('music');
  const [timerMinutes, setTimerMinutes] = useState<number>(25);
  const [visibility, setVisibility] = useState<VisibilityOption>('public');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [openForEveryone, setOpenForEveryone] = useState(true);
  const [maxMembers, setMaxMembers] = useState(25);

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [isCustomSubjectActive, setIsCustomSubjectActive] = useState(false);

  // Duration Modal State
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState('');

  // Keyboard avoidance and auto-scroll state
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const subjectScrollRef = useRef<ScrollView>(null);
  const durationScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const subjectsToDisplay = useMemo(() => {
    const list = ['General', 'General Skills', ...profileSubjects];
    return Array.from(new Set(list));
  }, [profileSubjects]);

  const handleSelectSubject = (sub: string) => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    setIsCustomSubjectActive(false);
    setSelectedSubject(sub);
    setIsSubjectModalOpen(false);
  };

  const handleApplyCustomSubject = () => {
    const cleaned = customSubjectInput.replace(/[<>"';&]/g, '').trim();
    if (!cleaned) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
    setSelectedSubject(cleaned);
    setIsSubjectModalOpen(false);
    setCustomSubjectInput('');
    setIsCustomSubjectActive(false);
  };

  const handleSelectDuration = (duration: number) => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    setTimerMinutes(duration);
    setIsDurationModalOpen(false);
  };

  const handleApplyCustomDuration = () => {
    const parsed = parseInt(customDurationInput.trim(), 10);
    if (isNaN(parsed) || parsed < 5 || parsed > 300) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
    setTimerMinutes(parsed);
    setIsDurationModalOpen(false);
    setCustomDurationInput('');
  };

  const getDurationBadge = (mins: number) => {
    const found = PRESET_DURATIONS.find((d) => d.duration === mins);
    return found ? found.badge : 'Custom';
  };

  const handleCreateRoom = () => {
    const cleaned = roomName.replace(/[<>"';&]/g, '').trim();
    if (!cleaned || createRoomMutation.isPending) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    const rawSub = selectedSubject === 'General' ? '' : selectedSubject;
    const finalSubject = encodeRoomSubject(rawSub, visibility);

    createRoomMutation.mutate(
      {
        name: cleaned,
        subject: finalSubject,
        room_type: roomType,
        timer_minutes: timerMinutes,
        is_public: visibility === 'public',
      },
      {
        onSuccess: (data) => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
          router.replace(`/rooms/${data.id}`);
        },
      }
    );
  };

  const { auto } = useLocalSearchParams<{ auto?: string }>();
  const autoCreatedRef = React.useRef(false);

  React.useEffect(() => {
    if (auto === '1' && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      handleCreateRoom();
    }
  }, [auto]);

  const isFormValid = roomName.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F5FC" translucent={false} />

      {/* AMBIENT BACKGROUND GLOW CIRCLES */}
      <View style={styles.ambientGlowCircle1} />
      <View style={styles.ambientGlowCircle2} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* TOP BAR (BACK BUTTON ONLY) */}
          <View style={styles.navBar}>
            <TouchableOpacity
              style={styles.iconCircleButton}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) {}
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/rooms' as Href);
                }
              }}
              activeOpacity={0.7}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={19} color="#17172A" />
            </TouchableOpacity>
          </View>

          {/* SCREEN TITLE & SUBTITLE */}
          <View style={styles.titleSection}>
            <Text style={styles.screenHeading}>Create Study Room</Text>
            <Text style={styles.screenSubheading}>
              Set up your perfect study space and focus together with others.
            </Text>
            <View style={styles.headingIndicatorBar} />
          </View>

          {/* SECTION 1: WHAT ARE YOU STUDYING TODAY? */}
          <View style={styles.cardContainer}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.labelWithIcon}>
                <Target size={16} color="#5B4FE8" strokeWidth={2.3} style={{ marginRight: 8 }} />
                <Text style={styles.cardHeaderTitle}>What are you studying today?</Text>
              </View>
              <Text style={styles.charCountText}>{roomName.length}/50</Text>
            </View>

            <View style={styles.inputPillBox}>
              <TextInput
                style={styles.roomTextInput}
                placeholder="e.g. Late Night Revision"
                placeholderTextColor="#94A3B8"
                value={roomName}
                onChangeText={(val) => setRoomName(val.slice(0, 50))}
                maxLength={50}
                returnKeyType="done"
              />
              {roomName.length > 0 && (
                <TouchableOpacity
                  style={styles.inputClearBtn}
                  onPress={() => setRoomName('')}
                  activeOpacity={0.7}
                >
                  <X size={13} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* QUICK SUGGESTIONS CHIPS */}
            <View style={styles.quickChipsWrapper}>
              <Sparkles size={13} color="#5B4FE8" style={{ marginRight: 8 }} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickChipsScroll}
                style={{ flex: 1 }}
              >
                {QUICK_TOPICS.map((topic) => (
                  <TouchableOpacity
                    key={topic}
                    style={styles.topicChip}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch (e) {}
                      setRoomName(topic);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.topicChipText}>{topic}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* SECTION 2: STUDY VIBE (COMPACT LOW-HEIGHT CARDS) */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionTitleRow}>
              <Headphones size={16} color="#5B4FE8" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitleText}>Study Vibe</Text>
            </View>

            {/* 3 SLEEK COMPACT CARDS */}
            <View style={styles.compactVibeRow}>
              {/* SILENT */}
              <TouchableOpacity
                style={[
                  styles.compactVibeCard,
                  roomType === 'silent' && styles.compactVibeCardSelected,
                ]}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch (e) {}
                  setRoomType('silent');
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.compactVibeIconBubble,
                    roomType === 'silent' && styles.compactVibeIconBubbleSelected,
                  ]}
                >
                  <VolumeX
                    size={16}
                    color={roomType === 'silent' ? '#FFFFFF' : '#475569'}
                    strokeWidth={2.2}
                  />
                </View>
                <View style={styles.compactVibeMeta}>
                  <Text
                    style={[
                      styles.compactVibeTitle,
                      roomType === 'silent' && styles.compactVibeTitleSelected,
                    ]}
                  >
                    Silent Focus
                  </Text>
                  <Text
                    style={[
                      styles.compactVibeSub,
                      roomType === 'silent' && styles.compactVibeSubSelected,
                    ]}
                  >
                    No audio
                  </Text>
                </View>
                {roomType === 'silent' && (
                  <View style={styles.compactVibeCheck}>
                    <Check size={9} color="#5B4FE8" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              {/* LO-FI */}
              <TouchableOpacity
                style={[
                  styles.compactVibeCard,
                  roomType === 'music' && styles.compactVibeCardSelected,
                ]}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch (e) {}
                  setRoomType('music');
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.compactVibeIconBubble,
                    roomType === 'music' && styles.compactVibeIconBubbleSelected,
                  ]}
                >
                  <Headphones
                    size={16}
                    color={roomType === 'music' ? '#FFFFFF' : '#475569'}
                    strokeWidth={2.2}
                  />
                </View>
                <View style={styles.compactVibeMeta}>
                  <Text
                    style={[
                      styles.compactVibeTitle,
                      roomType === 'music' && styles.compactVibeTitleSelected,
                    ]}
                  >
                    Lo-Fi Vibe
                  </Text>
                  <Text
                    style={[
                      styles.compactVibeSub,
                      roomType === 'music' && styles.compactVibeSubSelected,
                    ]}
                  >
                    Ambient beats
                  </Text>
                </View>
                {roomType === 'music' && (
                  <View style={styles.compactVibeCheck}>
                    <Check size={9} color="#5B4FE8" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              {/* DISCUSSION */}
              <TouchableOpacity
                style={[
                  styles.compactVibeCard,
                  roomType === 'discussion' && styles.compactVibeCardSelected,
                ]}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch (e) {}
                  setRoomType('discussion');
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.compactVibeIconBubble,
                    roomType === 'discussion' && styles.compactVibeIconBubbleSelected,
                  ]}
                >
                  <Users
                    size={16}
                    color={roomType === 'discussion' ? '#FFFFFF' : '#475569'}
                    strokeWidth={2.2}
                  />
                </View>
                <View style={styles.compactVibeMeta}>
                  <Text
                    style={[
                      styles.compactVibeTitle,
                      roomType === 'discussion' && styles.compactVibeTitleSelected,
                    ]}
                  >
                    Discussion
                  </Text>
                  <Text
                    style={[
                      styles.compactVibeSub,
                      roomType === 'discussion' && styles.compactVibeSubSelected,
                    ]}
                  >
                    Peer chat
                  </Text>
                </View>
                {roomType === 'discussion' && (
                  <View style={styles.compactVibeCheck}>
                    <Check size={9} color="#5B4FE8" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 3: SUBJECT & DURATION (SIDE-BY-SIDE DROPDOWN CARDS) */}
          <View style={styles.sideBySideRow}>
            {/* SUBJECT CARD */}
            <TouchableOpacity
              style={styles.halfCard}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) {}
                setIsSubjectModalOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.halfCardHeaderRow}>
                <Layers size={16} color="#5B4FE8" strokeWidth={2.2} style={{ marginRight: 6 }} />
                <Text style={styles.halfCardTitle}>Subject</Text>
              </View>

              <View style={styles.halfCardPillBox}>
                <Text style={styles.halfCardPillValue} numberOfLines={1}>
                  {selectedSubject}
                </Text>
                <ChevronDown size={14} color="#64748B" />
              </View>
            </TouchableOpacity>

            {/* DURATION CARD */}
            <TouchableOpacity
              style={styles.halfCard}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) {}
                setIsDurationModalOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.halfCardHeaderRow}>
                <Clock size={16} color="#5B4FE8" strokeWidth={2.2} style={{ marginRight: 6 }} />
                <Text style={styles.halfCardTitle}>Duration</Text>
              </View>

              <View style={styles.halfCardPillBox}>
                <View style={styles.durationPillContent}>
                  <Text style={styles.durationMainText}>{timerMinutes} min</Text>
                  <Text style={styles.durationBadgeText}>{getDurationBadge(timerMinutes)}</Text>
                </View>
                <ChevronDown size={14} color="#64748B" />
              </View>
            </TouchableOpacity>
          </View>

          {/* SECTION 4: ROOM VISIBILITY */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionTitleRow}>
              <Users size={16} color="#5B4FE8" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitleText}>Room Visibility</Text>
            </View>

            <View style={styles.visibilityRow}>
              {/* PUBLIC */}
              <TouchableOpacity
                style={[
                  styles.visibilityCard,
                  visibility === 'public' && styles.visibilityCardSelected,
                ]}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch (e) {}
                  setVisibility('public');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.visibilityIconCircle}>
                  <Globe size={15} color={visibility === 'public' ? '#5B4FE8' : '#64748B'} strokeWidth={2} />
                </View>
                <View style={styles.visibilityTextCol}>
                  <Text
                    style={[
                      styles.visibilityTitle,
                      visibility === 'public' && styles.visibilityTitleSelected,
                    ]}
                  >
                    Public
                  </Text>
                  <Text style={styles.visibilitySub}>Anyone can join</Text>
                </View>
                {visibility === 'public' && (
                  <View style={styles.visibilityCheckBadge}>
                    <Check size={8} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              {/* FRIENDS */}
              <TouchableOpacity
                style={[
                  styles.visibilityCard,
                  visibility === 'friends' && styles.visibilityCardSelected,
                ]}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch (e) {}
                  setVisibility('friends');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.visibilityIconCircle}>
                  <Users size={15} color={visibility === 'friends' ? '#5B4FE8' : '#64748B'} strokeWidth={2} />
                </View>
                <View style={styles.visibilityTextCol}>
                  <Text
                    style={[
                      styles.visibilityTitle,
                      visibility === 'friends' && styles.visibilityTitleSelected,
                    ]}
                  >
                    Friends
                  </Text>
                  <Text style={styles.visibilitySub}>Only friends</Text>
                </View>
                {visibility === 'friends' && (
                  <View style={styles.visibilityCheckBadge}>
                    <Check size={8} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              {/* PRIVATE */}
              <TouchableOpacity
                style={[
                  styles.visibilityCard,
                  visibility === 'private' && styles.visibilityCardSelected,
                ]}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch (e) {}
                  setVisibility('private');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.visibilityIconCircle}>
                  <Lock size={15} color={visibility === 'private' ? '#5B4FE8' : '#64748B'} strokeWidth={2} />
                </View>
                <View style={styles.visibilityTextCol}>
                  <Text
                    style={[
                      styles.visibilityTitle,
                      visibility === 'private' && styles.visibilityTitleSelected,
                    ]}
                  >
                    Private
                  </Text>
                  <Text style={styles.visibilitySub}>Invite only</Text>
                </View>
                {visibility === 'private' && (
                  <View style={styles.visibilityCheckBadge}>
                    <Check size={8} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 5: ADVANCED SETTINGS (ACCORDION) */}
          <TouchableOpacity
            style={styles.advancedSettingsCard}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch (e) {}
              setIsAdvancedOpen(!isAdvancedOpen);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.advancedLeftRow}>
              <View style={styles.advancedIconBox}>
                <Sliders size={15} color="#64748B" strokeWidth={2} />
              </View>
              <View style={styles.advancedTextCol}>
                <Text style={styles.advancedTitleText}>Advanced Settings</Text>
                <Text style={styles.advancedSubText}>Participants, chat, and join limits</Text>
              </View>
            </View>
            {isAdvancedOpen ? (
              <ChevronUp size={16} color="#64748B" />
            ) : (
              <ChevronDown size={16} color="#64748B" />
            )}
          </TouchableOpacity>

          {isAdvancedOpen && (
            <View style={styles.advancedExpandedBox}>
              {/* PUBLIC SPECIFIC: OPEN FOR EVERYONE TOGGLE */}
              {visibility === 'public' && (
                <View style={styles.openForEveryoneRow}>
                  <View style={styles.openForEveryoneTextCol}>
                    <Text style={styles.openForEveryoneTitle}>Open for Everyone</Text>
                    <Text style={styles.openForEveryoneSub}>
                      Allow unlimited participants to join the public live session
                    </Text>
                  </View>
                  <Switch
                    value={openForEveryone}
                    onValueChange={(val) => {
                      try {
                        Haptics.selectionAsync();
                      } catch (e) {}
                      setOpenForEveryone(val);
                    }}
                    trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
                    thumbColor={openForEveryone ? '#5B4FE8' : '#64748B'}
                  />
                </View>
              )}

              {/* PARTICIPANT LIMIT (FOR FRIENDS/PRIVATE OR IF OPEN FOR EVERYONE IS DISABLED) */}
              {(!openForEveryone || visibility !== 'public') && (
                <View style={{ marginTop: visibility === 'public' ? 12 : 0 }}>
                  <Text style={styles.advancedFieldLabel}>
                    PARTICIPANT LIMIT ({visibility.toUpperCase()})
                  </Text>
                  <View style={styles.maxParticipantsRow}>
                    {[5, 10, 25, 50].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.maxMemberBtn,
                          maxMembers === num && styles.maxMemberBtnSelected,
                        ]}
                        onPress={() => setMaxMembers(num)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.maxMemberText,
                            maxMembers === num && styles.maxMemberTextSelected,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* BOTTOM FIXED CTA BUTTON */}
        <View style={[styles.floatingBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[
              styles.launchButton,
              !isFormValid && styles.launchButtonDisabled,
            ]}
            onPress={handleCreateRoom}
            disabled={!isFormValid || createRoomMutation.isPending}
            activeOpacity={0.88}
          >
            {createRoomMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.launchButtonContent}>
                <Sparkles size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.launchButtonText}>Start Live Study Room</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL 1: SUBJECT SELECTOR & CUSTOM "OTHER" */}
      <Modal
        visible={isSubjectModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSubjectModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsSubjectModalOpen(false)}
          >
            <View
              style={[styles.modalSheet, { paddingBottom: isKeyboardOpen ? 12 : insets.bottom + 20 }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalSheetTopRow}>
                <Text style={styles.modalSheetTitle}>Select Subject</Text>
                <TouchableOpacity
                  style={styles.modalCloseCircle}
                  onPress={() => setIsSubjectModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <X size={15} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={subjectScrollRef}
                style={styles.modalListScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {subjectsToDisplay.map((sub) => {
                  const isSelected = selectedSubject === sub && !isCustomSubjectActive;
                  const dotColor = getSubjectColor(sub);
                  return (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.modalOptionRow, isSelected && styles.modalOptionRowSelected]}
                      onPress={() => handleSelectSubject(sub)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.subjectRowLeft}>
                        <View style={[styles.subjectDotIndicator, { backgroundColor: dotColor }]} />
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected && styles.modalOptionTextSelected,
                          ]}
                        >
                          {sub}
                        </Text>
                      </View>
                      {isSelected && <Check size={16} color="#5B4FE8" strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}

                {/* OTHER / CUSTOM SUBJECT OPTION */}
                <TouchableOpacity
                  style={[
                    styles.modalOptionRow,
                    isCustomSubjectActive && styles.modalOptionRowSelected,
                  ]}
                  onPress={() => {
                    setIsCustomSubjectActive(true);
                    setTimeout(() => {
                      subjectScrollRef.current?.scrollToEnd({ animated: true });
                    }, 120);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.otherOptionTitleRow}>
                    <Plus size={16} color="#5B4FE8" style={{ marginRight: 8 }} />
                    <Text
                      style={[
                        styles.modalOptionText,
                        isCustomSubjectActive && styles.modalOptionTextSelected,
                      ]}
                    >
                      Other (Custom Subject)
                    </Text>
                  </View>
                  {isCustomSubjectActive && <Check size={16} color="#5B4FE8" strokeWidth={2.5} />}
                </TouchableOpacity>

                {/* INLINE CUSTOM SUBJECT INPUT WITH CHARACTER LIMIT */}
                {isCustomSubjectActive && (
                  <View style={styles.customBoxWrapper}>
                    <View style={styles.customInputContainer}>
                      <TextInput
                        style={styles.customInputField}
                        placeholder="e.g. Inorganic Chemistry"
                        placeholderTextColor="#94A3B8"
                        value={customSubjectInput}
                        onChangeText={(val) => {
                          const cleaned = val.replace(/[<>"';&]/g, '');
                          setCustomSubjectInput(cleaned.slice(0, 30));
                        }}
                        maxLength={30}
                        autoFocus={true}
                        returnKeyType="done"
                        onFocus={() => {
                          setTimeout(() => {
                            subjectScrollRef.current?.scrollToEnd({ animated: true });
                          }, 120);
                        }}
                        onSubmitEditing={handleApplyCustomSubject}
                      />
                      <TouchableOpacity
                        style={[
                          styles.customApplyBtn,
                          !customSubjectInput.trim() && styles.customApplyBtnDisabled,
                        ]}
                        onPress={handleApplyCustomSubject}
                        disabled={!customSubjectInput.trim()}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.customApplyBtnText}>Apply</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.customInputCharCount}>
                      {customSubjectInput.length}/30 characters
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: DURATION SELECTOR (STRICT NUMBERS IN MINUTES ONLY) */}
      <Modal
        visible={isDurationModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDurationModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsDurationModalOpen(false)}
          >
            <View
              style={[styles.modalSheet, { paddingBottom: isKeyboardOpen ? 12 : insets.bottom + 20 }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalSheetTopRow}>
                <Text style={styles.modalSheetTitle}>Focus Duration</Text>
                <TouchableOpacity
                  style={styles.modalCloseCircle}
                  onPress={() => setIsDurationModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <X size={15} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={durationScrollRef}
                style={styles.modalListScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {PRESET_DURATIONS.map((item) => {
                  const isSelected = timerMinutes === item.duration;
                  return (
                    <TouchableOpacity
                      key={item.duration}
                      style={[styles.modalOptionRow, isSelected && styles.modalOptionRowSelected]}
                      onPress={() => handleSelectDuration(item.duration)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.durationOptionInfo}>
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected && styles.modalOptionTextSelected,
                          ]}
                        >
                          {item.duration} min
                        </Text>
                        <Text style={styles.durationOptionBadge}>{item.badge}</Text>
                      </View>
                      {isSelected && <Check size={16} color="#5B4FE8" strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}

                {/* STRICT NUMERIC CUSTOM DURATION SECTION */}
                <View style={styles.customDurationSection}>
                  <Text style={styles.customDurationSectionLabel}>OR SET CUSTOM MINUTES (5 - 300)</Text>
                  <View style={styles.customDurationInputRow}>
                    <View style={styles.numericInputBox}>
                      <TextInput
                        style={styles.numericInputField}
                        placeholder="e.g. 45"
                        placeholderTextColor="#94A3B8"
                        value={customDurationInput}
                        onChangeText={(val) => {
                          // STRICTLY NUMBERS ONLY (NO LETTERS OR SPECIAL CHARACTERS)
                          const numericOnly = val.replace(/[^0-9]/g, '');
                          setCustomDurationInput(numericOnly.slice(0, 3));
                        }}
                        keyboardType="number-pad"
                        maxLength={3}
                        onFocus={() => {
                          setTimeout(() => {
                            durationScrollRef.current?.scrollToEnd({ animated: true });
                          }, 120);
                        }}
                        inputAccessoryViewID={Platform.OS === 'ios' ? 'emptyCustomDurationAccessory' : undefined}
                        onSubmitEditing={handleApplyCustomDuration}
                      />
                      <Text style={styles.minutesSuffix}>min</Text>
                    </View>

                    {Platform.OS === 'ios' && (
                      <InputAccessoryView nativeID="emptyCustomDurationAccessory">
                        <View />
                      </InputAccessoryView>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.customApplyBtn,
                        (!customDurationInput.trim() ||
                          parseInt(customDurationInput, 10) < 5 ||
                          parseInt(customDurationInput, 10) > 300) &&
                          styles.customApplyBtnDisabled,
                      ]}
                      onPress={handleApplyCustomDuration}
                      disabled={
                        !customDurationInput.trim() ||
                        parseInt(customDurationInput, 10) < 5 ||
                        parseInt(customDurationInput, 10) > 300
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.customApplyBtnText}>Set</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F5FC',
  },
  ambientGlowCircle1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(216, 180, 254, 0.35)',
  },
  ambientGlowCircle2: {
    position: 'absolute',
    top: 60,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(199, 210, 254, 0.3)',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 14,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    zIndex: 10,
  },
  iconCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDECE8',
  },
  titleSection: {
    marginTop: 2,
    marginBottom: 4,
  },
  screenHeading: {
    fontFamily: 'DMSans-Bold',
    fontSize: 25,
    color: '#17172A',
    letterSpacing: -0.5,
  },
  screenSubheading: {
    fontFamily: 'DMSans',
    fontSize: 13.5,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  headingIndicatorBar: {
    width: 34,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#5B4FE8',
    marginTop: 8,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDECE8',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13.5,
    color: '#17172A',
  },
  charCountText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#94A3B8',
  },
  inputPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#EDECE8',
  },
  roomTextInput: {
    flex: 1,
    fontFamily: 'DMSans-Bold',
    fontSize: 15.5,
    color: '#0F172A',
    padding: 0,
  },
  inputClearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  quickChipsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F2',
  },
  quickChipsScroll: {
    flexDirection: 'row',
    gap: 7,
  },
  topicChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDECE8',
  },
  topicChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11.5,
    color: '#475569',
  },
  sectionWrapper: {
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#17172A',
  },
  compactVibeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactVibeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EDECE8',
    position: 'relative',
    height: 66,
    justifyContent: 'center',
  },
  compactVibeCardSelected: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
    shadowColor: '#5B4FE8',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  compactVibeIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F0EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  compactVibeIconBubbleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  compactVibeMeta: {
    alignItems: 'center',
  },
  compactVibeTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11.5,
    color: '#17172A',
    textAlign: 'center',
  },
  compactVibeTitleSelected: {
    color: '#FFFFFF',
  },
  compactVibeSub: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
  },
  compactVibeSubSelected: {
    color: '#E0E7FF',
  },
  compactVibeCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDECE8',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  halfCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  halfCardTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13.5,
    color: '#17172A',
  },
  halfCardPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#EDECE8',
  },
  halfCardPillValue: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12.5,
    color: '#17172A',
    flex: 1,
    marginRight: 6,
  },
  durationPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  durationMainText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12.5,
    color: '#17172A',
  },
  durationBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10.5,
    color: '#64748B',
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: '#EDECE8',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    minHeight: 50,
  },
  visibilityCardSelected: {
    backgroundColor: '#F3F0FF',
    borderColor: '#5B4FE8',
  },
  visibilityIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F8F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  visibilityTextCol: {
    flex: 1,
  },
  visibilityTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11.5,
    color: '#17172A',
  },
  visibilityTitleSelected: {
    color: '#5B4FE8',
  },
  visibilitySub: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#94A3B8',
  },
  visibilityCheckBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#5B4FE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedSettingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDECE8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advancedLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  advancedIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F0EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  advancedTextCol: {
    flex: 1,
  },
  advancedTitleText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12.5,
    color: '#17172A',
  },
  advancedSubText: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#71718A',
  },
  advancedExpandedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDECE8',
    marginTop: -4,
  },
  openForEveryoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  openForEveryoneTextCol: {
    flex: 1,
    marginRight: 10,
  },
  openForEveryoneTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12.5,
    color: '#17172A',
    marginBottom: 2,
  },
  openForEveryoneSub: {
    fontFamily: 'DMSans',
    fontSize: 10.5,
    color: '#71718A',
    lineHeight: 14,
  },
  advancedFieldLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#64748B',
    marginBottom: 8,
  },
  maxParticipantsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  maxMemberBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EDECE8',
    alignItems: 'center',
  },
  maxMemberBtnSelected: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
  },
  maxMemberText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11.5,
    color: '#475569',
  },
  maxMemberTextSelected: {
    color: '#FFFFFF',
  },
  floatingBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDECE8',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  launchButton: {
    backgroundColor: '#5B4FE8',
    borderRadius: 16,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  launchButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  launchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 18,
    maxHeight: '82%',
  },
  modalSheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSheetTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 17,
    color: '#17172A',
  },
  modalListScroll: {
    maxHeight: 340,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalOptionRowSelected: {
    backgroundColor: '#F3F0FF',
  },
  subjectRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectDotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  modalOptionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#334155',
  },
  modalOptionTextSelected: {
    fontFamily: 'DMSans-Bold',
    color: '#5B4FE8',
  },
  otherOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customBoxWrapper: {
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInputField: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#5B4FE8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#17172A',
    fontFamily: 'DMSans-Medium',
  },
  customInputCharCount: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'right',
  },
  customApplyBtn: {
    backgroundColor: '#5B4FE8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  customApplyBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  customApplyBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  durationOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationOptionBadge: {
    fontFamily: 'DMSans',
    fontSize: 11.5,
    color: '#64748B',
  },
  customDurationSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F0EC',
  },
  customDurationSectionLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#64748B',
    marginBottom: 8,
  },
  customDurationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  numericInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#5B4FE8',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  numericInputField: {
    flex: 1,
    fontSize: 14,
    color: '#17172A',
    fontFamily: 'DMSans-Bold',
    padding: 0,
  },
  minutesSuffix: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
});
