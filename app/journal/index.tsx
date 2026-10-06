import { JournalEntry, useDeleteJournalEntry, useJournalEntries, useVaultPin } from '@/lib/hooks/use-journal';
import { supabase } from '@/lib/supabase/client';
import * as Haptics from 'expo-haptics';
import { Href, router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Calendar, ChevronRight, KeyRound, Lock, Plus, ShieldCheck, Sparkles, Trash2, Unlock, Flame, Trophy } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CozyJournalVaultScreen(): React.JSX.Element {
  const { hasPin, isUnlocked, loading: pinLoading, savePin, verifyPin, lockVault, resetPin } = useVaultPin();
  const { data: entries = [], isLoading: entriesLoading } = useJournalEntries();
  const deleteMutation = useDeleteJournalEntry();

  // Re-lock vault immediately on losing focus (navigating away, back button, tab switch)
  useFocusEffect(
    useCallback(() => {
      return () => {
        lockVault();
      };
    }, [lockVault])
  );

  // PIN Keypad State
  const [inputPin, setInputPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isSettingUpPin, setIsSettingUpPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');

  // Forgot PIN Recovery Modal State
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [recoveryPassword, setRecoveryPassword] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState<boolean>(false);

  // Calculate Streak
  const calculateStreak = () => {
    if (entries.length === 0) return 0;
    const uniqueDates = Array.from(new Set(entries.map((e) => e.entry_date))).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      streak = 1;
      let checkDate = new Date(uniqueDates[0]);
      for (let i = 1; i < uniqueDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const expectedStr = checkDate.toISOString().split('T')[0];
        if (uniqueDates[i] === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
    }
    return streak;
  };

  const handleKeyPress = (num: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPinError('');
    if (inputPin.length < 4) {
      const nextPin = inputPin + num;
      setInputPin(nextPin);

      if (nextPin.length === 4) {
        if (hasPin && !isUnlocked) {
          verifyPin(nextPin).then((success) => {
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setInputPin('');
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setPinError('Incorrect PIN. Try again.');
              setInputPin('');
            }
          });
        } else if (!hasPin && isSettingUpPin) {
          if (!confirmPin) {
            setConfirmPin(nextPin);
            setInputPin('');
          } else if (confirmPin === nextPin) {
            savePin(nextPin).then(() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Vault Secured', 'Your 4-Digit PIN has been set successfully!');
              setInputPin('');
              setConfirmPin('');
              setIsSettingUpPin(false);
            });
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setPinError('PINs do not match. Restarting.');
            setInputPin('');
            setConfirmPin('');
          }
        }
      }
    }
  };

  const handleDeleteKeyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inputPin.length > 0) {
      setInputPin(inputPin.slice(0, -1));
    }
  };

  const handleVerifySecurityPassword = async () => {
    if (!recoveryPassword.trim()) {
      setRecoveryError('Please enter your account password.');
      return;
    }

    setIsVerifyingPassword(true);
    setRecoveryError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setRecoveryError('Account session invalid. Please log in again.');
        setIsVerifyingPassword(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: recoveryPassword.trim(),
      });

      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setRecoveryError('Incorrect password. Security check failed.');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await resetPin();
        setShowForgotModal(false);
        setRecoveryPassword('');
        setInputPin('');
        setConfirmPin('');
        setIsSettingUpPin(true);
        Alert.alert('PIN Reset Verified', 'Identity verified! You can now enter a new 4-digit PIN.');
      }
    } catch (err) {
      setRecoveryError('Verification error. Try again.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleDeleteEntry = (entry: JournalEntry) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to permanently delete this secret diary reflection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(entry.id),
        },
      ]
    );
  };

  const formatUniqueDate = (dateStr: string, createdTime?: string) => {
    try {
      const dateObj = new Date(dateStr);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const dayNum = dateObj.getDate();
      const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

      let timeFormatted = '';
      if (createdTime) {
        const timeObj = new Date(createdTime);
        timeFormatted = timeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }

      return timeFormatted
        ? `${dayName}, ${dayNum} ${month} • ${timeFormatted}`
        : `${dayName}, ${dayNum} ${month}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (pinLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#AD8A54" />
      </View>
    );
  }

  // PIN LOCK SCREEN (PARCHMENT PHYSICAL DESK THEME MATCHING REFERENCE IMAGE)
  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.stageContainer} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#EFE6CE" />

        <View style={styles.paperTopBar}>
          <TouchableOpacity
            style={styles.paperBackButton}
            onPress={() => {
              lockVault();
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
          >
            <ArrowLeft size={16} color="#6B6154" />
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.paperTopBarTitle}>Secret Vault</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.lockContent}>
          <View style={styles.lockIconCircle}>
            <Lock size={30} color="#AD8A54" />
          </View>

          <Text style={styles.lockTitle}>
            {!hasPin
              ? !confirmPin
                ? 'Set 4-Digit Security PIN'
                : 'Confirm Your 4-Digit PIN'
              : 'Enter Vault PIN'}
          </Text>

          <Text style={styles.lockSubtitle}>
            {!hasPin
              ? 'Protect your private daily diary entries with a secure PIN'
              : 'Enter your 4-digit PIN to access your secret diary'}
          </Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = inputPin.length > idx;
              return (
                <View
                  key={idx}
                  style={[styles.pinDot, isFilled && styles.pinDotFilled]}
                />
              );
            })}
          </View>

          {!!pinError && <Text style={styles.errorText}>{pinError}</Text>}

          <View style={styles.keypadGrid}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', 'del'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((btn) => {
                  if (btn === '') {
                    return <View key="empty" style={styles.keypadButtonPlaceholder} />;
                  }
                  if (btn === 'del') {
                    return (
                      <TouchableOpacity
                        key="del"
                        style={styles.keypadButton}
                        onPress={handleDeleteKeyPress}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.keypadDeleteText}>⌫</Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={btn}
                      style={styles.keypadButton}
                      onPress={() => {
                        if (!hasPin) setIsSettingUpPin(true);
                        handleKeyPress(btn);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keypadText}>{btn}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {hasPin && (
            <TouchableOpacity
              style={styles.forgotPinButton}
              onPress={() => setShowForgotModal(true)}
              activeOpacity={0.7}
            >
              <KeyRound size={13} color="#3F5A44" />
              <Text style={styles.forgotPinText}>Forgot PIN? Verify Password</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FORGOT PIN RECOVERY MODAL */}
        <Modal
          visible={showForgotModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowForgotModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircle}>
                <ShieldCheck size={26} color="#AD8A54" />
              </View>

              <Text style={styles.modalTitle}>Security Verification</Text>
              <Text style={styles.modalSub}>
                To reset your 4-digit PIN, please confirm your registered account password.
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Enter account password..."
                placeholderTextColor="#9C9382"
                secureTextEntry
                value={recoveryPassword}
                onChangeText={setRecoveryPassword}
              />

              {!!recoveryError && <Text style={styles.modalErrorText}>{recoveryError}</Text>}

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowForgotModal(false);
                    setRecoveryPassword('');
                    setRecoveryError('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalVerifyButton}
                  onPress={handleVerifySecurityPassword}
                  disabled={isVerifyingPassword}
                >
                  {isVerifyingPassword ? (
                    <ActivityIndicator size="small" color="#F3ECDA" />
                  ) : (
                    <Text style={styles.modalVerifyText}>Verify & Reset</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // UNLOCKED SECRET VAULT DASHBOARD (MATCHING secret-vault-ui.html)
  return (
    <SafeAreaView style={styles.stageContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#EFE6CE" />

      {/* HEADER */}
      <View style={styles.paperTopBar}>
        <TouchableOpacity
          style={styles.paperBackButton}
          onPress={() => {
            lockVault();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
        >
          <ArrowLeft size={16} color="#6B6154" />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.paperTopBarTitle}>Secret Vault</Text>
          <View style={styles.unlockedBadge}>
            <Unlock size={10} color="#3F5A44" />
            <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.resetPinHeaderButton}
            onPress={() => {
              Alert.alert('Reset Vault PIN', 'Do you want to reset your 4-digit PIN?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset PIN',
                  style: 'destructive',
                  onPress: async () => {
                    await resetPin();
                    setIsSettingUpPin(true);
                  },
                },
              ]);
            }}
          >
            <KeyRound size={15} color="#3F5A44" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.lockButton} onPress={lockVault}>
            <Lock size={15} color="#9C4A3C" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SUBHEADER CAVEAT ACCENT */}
      <Text style={styles.subHeaderAccent}>for your eyes only ✏️</Text>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* STREAK & SUMMARY PARCHMENT CARD */}
            <View style={styles.streakCard}>
              <View style={styles.streakLeft}>
                <Flame size={20} color="#E8A020" fill="#E8A020" />
                <View>
                  <Text style={styles.streakNumber}>{calculateStreak()} Day Streak</Text>
                  <Text style={styles.streakSub}>CONSISTENT DAILY REFLECTIONS & DIARY LOGS</Text>
                </View>
              </View>

              <View style={styles.totalEntriesBadge}>
                <Text style={styles.totalEntriesNum}>{entries.length}</Text>
                <Text style={styles.totalEntriesLabel}>ENTRIES</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>SECRET DIARY TIMELINE</Text>
          </>
        }
        ListEmptyComponent={
          entriesLoading ? (
            <ActivityIndicator size="large" color="#AD8A54" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Sparkles size={36} color="rgba(173,138,84,0.5)" />
              <Text style={styles.emptyTitle}>Your Vault is Empty</Text>
              <Text style={styles.emptySub}>
                Start your daily reflection journey. Write your first secret diary entry today.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.entryCard}
            onPress={() => router.push(`/journal/${item.id}` as Href)}
            activeOpacity={0.85}
          >
            {/* MINI LEATHER SPINE STRIPE */}
            <View style={styles.miniLeatherSpine}>
              <View style={styles.miniStitchLine} />
            </View>

            <View style={styles.entryContentInner}>
              <View style={styles.entryHeaderRow}>
                <View style={styles.uniqueDateBadge}>
                  <Calendar size={11} color="#AD8A54" />
                  <Text style={styles.uniqueDateText}>
                    {formatUniqueDate(item.entry_date, item.created_at)}
                  </Text>
                </View>
              </View>

              <Text style={styles.entryTitle} numberOfLines={1}>
                {item.title}
              </Text>

              {item.achievements ? (
                <View style={styles.winBadgeContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Trophy size={11} color="#E8A020" />
                    <Text style={styles.winBadgeText} numberOfLines={1}>
                      <Text style={{ fontWeight: 'bold' }}>Win:</Text> {item.achievements}
                    </Text>
                  </View>
                </View>
              ) : null}

              {item.content ? (
                <Text style={styles.entrySnippet} numberOfLines={2}>
                  <Text style={styles.dearDiarySnippet}>Dear diary, </Text>
                  {item.content}
                </Text>
              ) : null}

              <View style={styles.entryDivider} />

              <View style={styles.entryFooterRow}>
                {item.tags && item.tags.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {item.tags.map((t, idx) => (
                      <View key={idx} style={styles.tagPill}>
                        <Text style={styles.tagPillText}>#{t.replace(/^#/, '')}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View />
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleDeleteEntry(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={15} color="#9C4A3C" />
                  </TouchableOpacity>
                  <ChevronRight size={16} color="#9C9382" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB CREATE / EDIT TODAY'S DIARY PAGE BUTTON */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayEntry = entries.find((e) => e.entry_date === todayStr);
          if (todayEntry) {
            router.push(`/journal/${todayEntry.id}` as Href);
          } else {
            router.push('/journal/new' as Href);
          }
        }}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#F3ECDA" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stageContainer: {
    flex: 1,
    backgroundColor: '#EFE6CE',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFE6CE',
  },
  paperTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EFE6CE',
  },
  paperBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    backgroundColor: '#F3ECDA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  paperTopBarTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif',
    fontStyle: 'italic',
    fontSize: 22,
    color: '#2B2620',
    fontWeight: 'bold',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  unlockedBadgeText: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: '#3F5A44',
    letterSpacing: 1,
    fontWeight: '700',
  },
  resetPinHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    backgroundColor: 'rgba(63,90,68,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(156,74,60,0.3)',
    backgroundColor: 'rgba(156,74,60,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subHeaderAccent: {
    fontFamily: 'Caveat',
    fontSize: 16,
    color: '#AD8A54',
    textAlign: 'center',
    marginBottom: 8,
  },
  // LOCK SCREEN
  lockContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  lockIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3ECDA',
    borderWidth: 1.5,
    borderColor: '#E2D3AC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#18120A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lockTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif',
    fontSize: 24,
    color: '#2B2620',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lockSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'Newsreader' : 'InstrumentSerif',
    fontStyle: 'italic',
    fontSize: 13.5,
    color: '#6B6154',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 250,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 18,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#6B6154',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#3F5A44',
    borderColor: '#3F5A44',
  },
  errorText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#9C4A3C',
    marginBottom: 8,
  },
  keypadGrid: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  keypadButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3ECDA',
    borderWidth: 1,
    borderColor: '#E2D3AC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#18120A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  keypadButtonPlaceholder: {
    width: 68,
    height: 68,
  },
  keypadText: {
    fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif',
    fontSize: 26,
    color: '#2B2620',
    fontWeight: 'bold',
  },
  keypadDeleteText: {
    fontSize: 20,
    color: '#9C4A3C',
    fontWeight: 'bold',
  },
  forgotPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: 'rgba(63,90,68,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(63,90,68,0.25)',
  },
  forgotPinText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#3F5A44',
    fontWeight: '600',
  },
  // RECOVERY MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43,38,32,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#F3ECDA',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    padding: 22,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(173,138,84,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(173,138,84,0.3)',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif',
    fontSize: 20,
    color: '#2B2620',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6154',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },
  modalInput: {
    width: '100%',
    fontFamily: 'SpaceMono',
    fontSize: 13,
    color: '#2B2620',
    backgroundColor: '#EFE6CE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    marginBottom: 10,
  },
  modalErrorText: {
    fontFamily: 'SpaceMono',
    fontSize: 10.5,
    color: '#9C4A3C',
    marginBottom: 8,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 6,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#EFE6CE',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2D3AC',
  },
  modalCancelText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#6B6154',
  },
  modalVerifyButton: {
    flex: 1,
    backgroundColor: '#3F5A44',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalVerifyText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#F3ECDA',
    fontWeight: '700',
  },
  // TIMELINE LIST
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 90,
  },
  streakCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3ECDA',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    marginBottom: 16,
    shadowColor: '#18120A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  streakFlame: {
    fontSize: 26,
  },
  streakNumber: {
    fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif',
    fontSize: 19,
    color: '#2B2620',
    fontWeight: 'bold',
  },
  streakSub: {
    fontFamily: 'SpaceMono',
    fontSize: 9.5,
    color: '#6B6154',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  totalEntriesBadge: {
    alignItems: 'center',
    backgroundColor: '#EFE6CE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D3AC',
  },
  totalEntriesNum: {
    fontFamily: 'SpaceMono',
    fontSize: 16,
    color: '#AD8A54',
    fontWeight: '700',
  },
  totalEntriesLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 8,
    color: '#AD8A54',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#6B6154',
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif',
    fontSize: 18,
    color: '#2B2620',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySub: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#6B6154',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
    lineHeight: 16,
  },
  // ENTRY TIMELINE CARD
  entryCard: {
    backgroundColor: '#F3ECDA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2D3AC',
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#18120A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  miniLeatherSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#383025',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStitchLine: {
    height: '90%',
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(215, 190, 140, 0.55)',
  },
  entryContentInner: {
    paddingLeft: 22,
    paddingRight: 14,
    paddingVertical: 14,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uniqueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFE6CE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D3AC',
  },
  uniqueDateText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#AD8A54',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  entryTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Fraunces' : 'InstrumentSerif',
    fontSize: 19,
    color: '#2B2620',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  winBadgeContainer: {
    backgroundColor: '#EFE6CE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  winBadgeText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#3F5A44',
  },
  entrySnippet: {
    fontFamily: Platform.OS === 'ios' ? 'Newsreader' : 'InstrumentSerif',
    fontSize: 14.5,
    color: '#2B2620',
    lineHeight: 21,
    marginBottom: 10,
  },
  dearDiarySnippet: {
    fontFamily: 'Caveat',
    fontStyle: 'italic',
    color: '#3F5A44',
    fontSize: 16,
  },
  entryDivider: {
    height: 1,
    borderStyle: 'dotted',
    borderWidth: 1,
    borderColor: '#E2D3AC',
    marginVertical: 8,
  },
  entryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagPill: {
    backgroundColor: '#EFE6CE',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D3AC',
  },
  tagPillText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#3F5A44',
    fontWeight: '600',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3F5A44',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#3F5A44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
