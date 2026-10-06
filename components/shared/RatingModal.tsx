import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Star, X, Heart, MessageSquare, Check, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase/client';

const STORAGE_KEY_HAS_RATED = 'lifetrack_has_rated_app';
const STORAGE_KEY_PROMPT_COUNT = 'lifetrack_rating_prompt_count';
const STORAGE_KEY_LAST_PROMPT = 'lifetrack_last_rating_prompt_date';

interface RatingModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [step, setStep] = useState<'stars' | 'store_prompt' | 'feedback_form' | 'thank_you'>('stars');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isVisible) {
      setRating(0);
      setFeedback('');
      setStep('stars');
      setIsSubmitting(false);
    }
  }, [isVisible]);

  const handleStarPress = async (selectedRating: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setRating(selectedRating);

    if (selectedRating >= 4) {
      // 4 or 5 stars -> Route to App Store / Play Store prompt
      setStep('store_prompt');
    } else {
      // 1 to 3 stars -> Route to feedback form
      setStep('feedback_form');
    }
  };

  const handleOpenStore = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await AsyncStorage.setItem(STORAGE_KEY_HAS_RATED, 'true');

    const appStoreUrl = 'itms-apps://itunes.apple.com/app/id6740000000?action=write-review';
    const playStoreUrl = 'market://details?id=com.lifetrackpro.app';
    const fallbackWebUrl = 'https://lifetrackpro.com';

    try {
      if (Platform.OS === 'ios') {
        const canOpen = await Linking.canOpenURL(appStoreUrl);
        if (canOpen) {
          await Linking.openURL(appStoreUrl);
        } else {
          await Linking.openURL(fallbackWebUrl);
        }
      } else {
        const canOpen = await Linking.canOpenURL(playStoreUrl);
        if (canOpen) {
          await Linking.openURL(playStoreUrl);
        } else {
          await Linking.openURL(`https://play.google.com/store/apps/details?id=com.lifetrackpro.app`);
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('Could not open store review URL:', e);
    }

    setStep('thank_you');
    setTimeout(() => {
      onClose();
      onSuccess?.();
    }, 1200);
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      handleDismissLater();
      return;
    }

    setIsSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('daily_checkins').insert({
          user_id: session.user.id,
          date: new Date().toISOString().split('T')[0],
          mood: rating,
          note: `[App Rating Feedback - ${rating} Stars]: ${feedback.trim()}`,
        });
      }
      await AsyncStorage.setItem(STORAGE_KEY_HAS_RATED, 'true');
    } catch (e) {
      if (__DEV__) console.warn('Failed to submit feedback:', e);
    } finally {
      setIsSubmitting(false);
      setStep('thank_you');
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1200);
    }
  };

  const handleDismissLater = async () => {
    await AsyncStorage.setItem(STORAGE_KEY_LAST_PROMPT, new Date().toISOString());
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleDismissLater}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close X Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismissLater} activeOpacity={0.7}>
            <X size={18} color="#9B9BAF" />
          </TouchableOpacity>

          {/* STEP 1: STAR SELECTION */}
          {step === 'stars' && (
            <View style={styles.contentContainer}>
              <View style={styles.iconBadgeContainer}>
                <Sparkles size={28} color="#E8A020" />
              </View>

              <Text style={styles.title}>Enjoying LifeTrack Pro?</Text>
              <Text style={styles.subtitle}>
                Tap a star to rate your experience with our study tools & habit tracker!
              </Text>

              {/* 5-Star Row */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((starNum) => {
                  const isFilled = rating >= starNum;
                  return (
                    <TouchableOpacity
                      key={starNum}
                      onPress={() => handleStarPress(starNum)}
                      activeOpacity={0.7}
                      style={styles.starTouch}
                    >
                      <Star
                        size={32}
                        color={isFilled ? '#E8A020' : '#E8E7E3'}
                        fill={isFilled ? '#E8A020' : 'transparent'}
                        strokeWidth={1.5}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.laterBtn} onPress={handleDismissLater} activeOpacity={0.7}>
                <Text style={styles.laterBtnText}>Remind Me Later</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2A: HIGH RATING PROMPT (4-5 Stars) */}
          {step === 'store_prompt' && (
            <View style={styles.contentContainer}>
              <View style={[styles.iconBadgeContainer, { backgroundColor: '#FEF3DC' }]}>
                <Heart size={28} color="#E8A020" fill="#E8A020" />
              </View>

              <Text style={styles.title}>Thank You So Much! 🎉</Text>
              <Text style={styles.subtitle}>
                Would you mind taking 5 seconds to rate LifeTrack Pro on the App Store? It means the world to us!
              </Text>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenStore} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Star size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Rate 5 Stars on Store</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.laterBtn} onPress={handleDismissLater} activeOpacity={0.7}>
                <Text style={styles.laterBtnText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2B: LOW RATING FEEDBACK FORM (1-3 Stars) */}
          {step === 'feedback_form' && (
            <View style={styles.contentContainer}>
              <View style={[styles.iconBadgeContainer, { backgroundColor: '#EAE8FD' }]}>
                <MessageSquare size={26} color="#5B4FE8" />
              </View>

              <Text style={styles.title}>How Can We Improve?</Text>
              <Text style={styles.subtitle}>
                Tell us what feature is missing or what we can fix to make LifeTrack Pro 5-stars for you:
              </Text>

              <TextInput
                style={styles.feedbackInput}
                placeholder="Share your thoughts or feature requests..."
                placeholderTextColor="#9B9BAF"
                multiline
                numberOfLines={3}
                value={feedback}
                onChangeText={setFeedback}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSubmitFeedback}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Feedback</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.laterBtn} onPress={handleDismissLater} activeOpacity={0.7}>
                <Text style={styles.laterBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: THANK YOU CONFIRMATION */}
          {step === 'thank_you' && (
            <View style={styles.contentContainer}>
              <View style={[styles.iconBadgeContainer, { backgroundColor: '#E6F9F3' }]}>
                <Check size={28} color="#00B894" />
              </View>

              <Text style={styles.title}>Feedback Saved!</Text>
              <Text style={styles.subtitle}>
                Thank you for helping us make LifeTrack Pro better every day.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Helper utilities for triggering rating modal intelligently
export async function shouldPromptRating(): Promise<boolean> {
  try {
    const hasRated = await AsyncStorage.getItem(STORAGE_KEY_HAS_RATED);
    if (hasRated === 'true') return false;

    const lastPromptStr = await AsyncStorage.getItem(STORAGE_KEY_LAST_PROMPT);
    if (lastPromptStr) {
      const lastPromptDate = new Date(lastPromptStr);
      const daysDiff = (Date.now() - lastPromptDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7) return false; // Don't prompt more than once every 7 days
    }

    const countStr = await AsyncStorage.getItem(STORAGE_KEY_PROMPT_COUNT);
    const count = countStr ? parseInt(countStr, 10) : 0;

    await AsyncStorage.setItem(STORAGE_KEY_PROMPT_COUNT, String(count + 1));
    return true;
  } catch (e) {
    return false;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },
  iconBadgeContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'InstrumentSerif',
    fontSize: 24,
    color: '#17172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  starTouch: {
    padding: 4,
  },
  feedbackInput: {
    width: '100%',
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 12,
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#17172A',
    minHeight: 70,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#5B4FE8',
    height: 48,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  laterBtn: {
    marginTop: 12,
    paddingVertical: 6,
  },
  laterBtnText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
  },
});
