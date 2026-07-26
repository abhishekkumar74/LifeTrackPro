import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { router, Href } from 'expo-router';
import { ArrowLeft, Plus, Lock, Unlock, Sparkles, Calendar, Trash2, ChevronRight, ShieldCheck, KeyRound } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useJournalEntries, useVaultPin, useDeleteJournalEntry, JournalEntry } from '@/lib/hooks/use-journal';
import { supabase } from '@/lib/supabase/client';

export default function CozyJournalVaultScreen(): React.JSX.Element {
  const { hasPin, isUnlocked, loading: pinLoading, savePin, verifyPin, lockVault, resetPin } = useVaultPin();
  const { data: entries = [], isLoading: entriesLoading } = useJournalEntries();
  const deleteMutation = useDeleteJournalEntry();

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
        <ActivityIndicator size="large" color="#E5A93C" />
      </View>
    );
  }

  // PIN LOCK SCREEN
  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#13111C" />

        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#A8A2B5" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Secret Vault</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockContent}>
          <View style={styles.lockIconCircle}>
            <Lock size={32} color="#E5A93C" />
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
                        <Text style={styles.keypadText}>⌫</Text>
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
              <KeyRound size={14} color="#A29BFE" />
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
                <ShieldCheck size={28} color="#E5A93C" />
              </View>

              <Text style={styles.modalTitle}>Security Verification</Text>
              <Text style={styles.modalSub}>
                To reset your 4-digit PIN, please confirm your registered account password.
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Enter account password..."
                placeholderTextColor="rgba(244,239,235,0.35)"
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
                    <ActivityIndicator size="small" color="#13111C" />
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

  // UNLOCKED SECRET VAULT DASHBOARD
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#13111C" />

      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#A8A2B5" />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.topBarTitle}>Secret Vault</Text>
          <View style={styles.unlockedBadge}>
            <Unlock size={10} color="#7BB69D" />
            <Text style={styles.unlockedBadgeText}>Unlocked</Text>
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
            <KeyRound size={16} color="#A29BFE" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.lockButton} onPress={lockVault}>
            <Lock size={18} color="#D97757" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* STREAK & SUMMARY CARD */}
            <View style={styles.streakCard}>
              <View style={styles.streakLeft}>
                <Text style={styles.streakFlame}>🔥</Text>
                <View>
                  <Text style={styles.streakNumber}>{calculateStreak()} Day Streak</Text>
                  <Text style={styles.streakSub}>Consistent daily reflections & diary logs</Text>
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
            <ActivityIndicator size="large" color="#E5A93C" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Sparkles size={40} color="rgba(229,169,60,0.4)" />
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
            activeOpacity={0.8}
          >
            <View style={styles.entryHeaderRow}>
              <View style={styles.uniqueDateBadge}>
                <Calendar size={12} color="#E5A93C" />
                <Text style={styles.uniqueDateText}>
                  {formatUniqueDate(item.entry_date, item.created_at)}
                </Text>
              </View>
            </View>

            <Text style={styles.entryTitle} numberOfLines={1}>
              {item.title}
            </Text>

            {item.achievements ? (
              <Text style={styles.entrySectionPreview} numberOfLines={1}>
                <Text style={{ color: '#7BB69D', fontWeight: 'bold' }}>🏆 Win: </Text>
                {item.achievements}
              </Text>
            ) : null}

            {item.content ? (
              <Text style={styles.entrySnippet} numberOfLines={2}>
                {item.content}
              </Text>
            ) : null}

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
                  <Trash2 size={16} color="#D97757" />
                </TouchableOpacity>
                <ChevronRight size={18} color="#A8A2B5" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB CREATE BUTTON */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push('/journal/new' as Href)}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#13111C" />
      </TouchableOpacity>
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
  headerTitleGroup: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: '#F4EFEB',
    fontWeight: 'bold',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  unlockedBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#7BB69D',
    fontWeight: '600',
  },
  resetPinHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(162,155,254,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.3)',
  },
  lockButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(217,119,87,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,119,87,0.3)',
  },
  // LOCK SCREEN
  lockContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  lockIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(229,169,60,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(229,169,60,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lockTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 22,
    color: '#F4EFEB',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lockSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#A8A2B5',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 28,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(244,239,235,0.3)',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#E5A93C',
    borderColor: '#E5A93C',
  },
  errorText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#D97757',
    marginBottom: 10,
  },
  keypadGrid: {
    width: '100%',
    maxWidth: 280,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keypadButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#241F32',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonPlaceholder: {
    width: 64,
    height: 64,
  },
  keypadText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 22,
    color: '#F4EFEB',
    fontWeight: 'bold',
  },
  forgotPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(162,155,254,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.25)',
  },
  forgotPinText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#A29BFE',
    fontWeight: '600',
  },
  // RECOVERY MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(19,17,28,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E1A29',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(229,169,60,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229,169,60,0.3)',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: '#F4EFEB',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#A8A2B5',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    width: '100%',
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#F4EFEB',
    backgroundColor: '#241F32',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  modalErrorText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#D97757',
    marginBottom: 10,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#241F32',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalCancelText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#A8A2B5',
  },
  modalVerifyButton: {
    flex: 1,
    backgroundColor: '#E5A93C',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalVerifyText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#13111C',
    fontWeight: 'bold',
  },
  // TIMELINE
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  streakCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1A29',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  streakFlame: {
    fontSize: 28,
  },
  streakNumber: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#F4EFEB',
    fontWeight: 'bold',
  },
  streakSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#A8A2B5',
    marginTop: 2,
  },
  totalEntriesBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(229,169,60,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229,169,60,0.3)',
  },
  totalEntriesNum: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#E5A93C',
    fontWeight: 'bold',
  },
  totalEntriesLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 8,
    color: '#E5A93C',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#A8A2B5',
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#F4EFEB',
    marginTop: 14,
    fontWeight: 'bold',
  },
  emptySub: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#A8A2B5',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 240,
    lineHeight: 18,
  },
  entryCard: {
    backgroundColor: '#1E1A29',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  uniqueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(229,169,60,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229,169,60,0.25)',
  },
  uniqueDateText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#E5A93C',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  entryTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 20,
    color: '#E5A93C',
    marginBottom: 4,
  },
  entrySnippet: {
    fontFamily: 'InstrumentSerif',
    fontSize: 17,
    color: '#F4EFEB',
    lineHeight: 23,
    marginBottom: 10,
  },
  entrySectionPreview: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: 'rgba(244,239,235,0.9)',
    marginBottom: 8,
    backgroundColor: 'rgba(123,182,157,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagPill: {
    backgroundColor: 'rgba(162,155,254,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.3)',
  },
  tagPillText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#A29BFE',
    fontWeight: 'bold',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5A93C',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#E5A93C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
