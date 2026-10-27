import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFlashcards } from '@/lib/hooks/use-flashcards';
import * as Haptics from 'expo-haptics';

export const DailyReviewBanner = React.memo(() => {
  const router = useRouter();
  const { dueCards, isLoading } = useFlashcards();

  // Only show the banner if there are genuine flashcards due today
  if (isLoading || !dueCards || dueCards.length === 0) {
    return null;
  }

  const dueCount = dueCards.length;
  const estimatedMins = Math.max(1, Math.round(dueCount * 0.5));

  const handlePressReview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push({
      pathname: '/(tabs)/learn',
      params: { tab: 'flashcards' },
    });
  };

  return (
    <TouchableOpacity
      style={styles.bannerContainer}
      onPress={handlePressReview}
      activeOpacity={0.88}
      accessibilityLabel={`${dueCount} flashcards due today. Tap to start review.`}
    >
      {/* Left Playing Card Icon (🃏 Joker / Playing card) */}
      <View style={styles.cardEmojiWrapper}>
        <Text style={styles.cardEmoji}>🃏</Text>
      </View>

      {/* Middle Text Details — strictly single-line to keep sleek capsule height */}
      <View style={styles.textContent}>
        <Text style={styles.headline} numberOfLines={1} ellipsizeMode="tail">
          {`${dueCount} flashcard${dueCount === 1 ? '' : 's'} due today`}
        </Text>
        <Text style={styles.subtext} numberOfLines={1} ellipsizeMode="tail">
          {`Spaced repetition review · ~${estimatedMins} min`}
        </Text>
      </View>

      {/* Right Violet Pill Button ("Review →") */}
      <View style={styles.reviewButton}>
        <Text style={styles.reviewButtonText}>Review →</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E8E5F8',
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    minHeight: 52,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardEmojiWrapper: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 21,
    lineHeight: 25,
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  headline: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14.5,
    color: '#151628',
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  subtext: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11.5,
    color: '#7E8098',
  },
  reviewButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 6,
    elevation: 3,
  },
  reviewButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
});
