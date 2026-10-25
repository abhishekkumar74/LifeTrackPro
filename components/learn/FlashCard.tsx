import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Note } from '@/types/app.types';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import { RotateCw, CheckCircle2, RotateCcw } from 'lucide-react-native';

interface FlashCardProps {
  note: Note;
  onGotIt: () => void;
  onReviewAgain: () => void;
  totalRemaining: number;
}

export const FlashCard = React.memo<FlashCardProps>(({
  note,
  onGotIt,
  onReviewAgain,
  totalRemaining,
}) => {
  const subject = note.subject || 'General';
  const accentColor = getSubjectColor(subject);
  const [isFlippedState, setIsFlippedState] = useState(false);

  // Parse JSON content if it is a flashcard
  const { frontText, backText } = useMemo(() => {
    const isFlashcardTag = note.tags && note.tags.includes('flashcard');
    let front = note.title || 'Untitled';
    let back = note.content || 'No answer provided.';

    if (note.content && (isFlashcardTag || note.content.trim().startsWith('{'))) {
      try {
        const parsed = JSON.parse(note.content.trim());
        if (parsed && typeof parsed === 'object') {
          front = parsed.front || front;
          back = parsed.back || back;
        }
      } catch (e) {
        // Fallback
      }
    }
    return { frontText: front, backText: back };
  }, [note]);

  // Rotation value for Y-axis flipping
  const rotatedVal = useSharedValue(0);

  // Pan values for swipe gesture
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Reset flips when a new note is loaded
  useEffect(() => {
    rotatedVal.value = 0;
    translateX.value = 0;
    translateY.value = 0;
    setIsFlippedState(false);
  }, [note.id]);

  const handleFlip = () => {
    Haptics.selectionAsync().catch(() => {});
    const willBeFlipped = !isFlippedState;
    setIsFlippedState(willBeFlipped);
    rotatedVal.value = withTiming(willBeFlipped ? 180 : 0, {
      duration: 350,
      easing: Easing.out(Easing.quad),
    });
  };

  // Modern Gesture.Pan() configuration
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const swipeThreshold = 120;
      if (event.translationX > swipeThreshold) {
        // Swipe Right -> Got It
        translateX.value = withTiming(500, { duration: 150 }, () => {
          runOnJS(onGotIt)();
        });
      } else if (event.translationX < -swipeThreshold) {
        // Swipe Left -> Review Again
        translateX.value = withTiming(-500, { duration: 150 }, () => {
          runOnJS(onReviewAgain)();
        });
      } else {
        // Spring back to center
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  // Animated styles for card flipping (backface hidden)
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const spin = rotatedVal.value;
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${spin}deg` },
      ],
      opacity: spin >= 90 ? 0 : 1,
      zIndex: spin >= 90 ? 0 : 1,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const spin = rotatedVal.value - 180;
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${spin}deg` },
      ],
      opacity: rotatedVal.value >= 90 ? 1 : 0,
      zIndex: rotatedVal.value >= 90 ? 1 : 0,
    };
  });

  // Combine drag translation and rotate with flipping styles
  const dragAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${translateX.value / 14}deg` },
      ],
    };
  });

  const hintAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(rotatedVal.value < 90 ? 1 : 0, { duration: 200 }),
    };
  });

  const actionButtonsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(rotatedVal.value >= 90 ? 1 : 0, { duration: 200 }),
    };
  });

  return (
    <View style={styles.outerContainer}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.swipeContainer, dragAnimatedStyle]}>
          <TouchableOpacity
            style={styles.cardPressable}
            onPress={handleFlip}
            activeOpacity={0.95}
          >
            {/* Front Side: Question */}
            <Animated.View
              style={[styles.cardSide, frontAnimatedStyle]}
              pointerEvents={isFlippedState ? 'none' : 'auto'}
            >
              <View style={[styles.accentBorder, { backgroundColor: accentColor }]} />
              <View style={styles.sideContent}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.badgePill, { backgroundColor: `${accentColor}18` }]}>
                    <Text style={[styles.badgeText, { color: accentColor }]}>{subject}</Text>
                  </View>
                  <View style={styles.questionLabelWrap}>
                    <Text style={styles.questionLabelText}>QUESTION</Text>
                  </View>
                </View>

                <View style={styles.mainTextContainer}>
                  <Text style={styles.frontQuestionText} numberOfLines={6}>
                    {frontText}
                  </Text>
                </View>

                <View style={styles.tapPromptRow}>
                  <RotateCw size={13} color="#9B9BAF" />
                  <Text style={styles.tapPromptText}>Tap to reveal answer</Text>
                </View>
              </View>
            </Animated.View>

            {/* Back Side: Answer */}
            <Animated.View
              style={[styles.cardSide, styles.cardSideBack, backAnimatedStyle]}
              pointerEvents={isFlippedState ? 'auto' : 'none'}
            >
              <View style={[styles.accentBorder, { backgroundColor: '#00B894' }]} />
              <View style={styles.sideContent}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.badgePill, { backgroundColor: '#E2F9F3' }]}>
                    <Text style={[styles.badgeText, { color: '#00B894' }]}>{subject}</Text>
                  </View>
                  <View style={[styles.questionLabelWrap, { backgroundColor: '#E2F9F3' }]}>
                    <Text style={[styles.questionLabelText, { color: '#00B894' }]}>ANSWER</Text>
                  </View>
                </View>

                <ScrollView
                  style={styles.backScrollArea}
                  contentContainerStyle={styles.backScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.backAnswerText}>
                    {backText}
                  </Text>
                </ScrollView>

                <View style={styles.tapPromptRow}>
                  <RotateCcw size={13} color="#9B9BAF" />
                  <Text style={styles.tapPromptText}>Tap to flip back</Text>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>

      {/* Action Section */}
      <View style={styles.actionSection}>
        {/* Unflipped state hint */}
        <Animated.View
          style={[styles.hintWrapper, hintAnimatedStyle]}
          pointerEvents={isFlippedState ? 'none' : 'auto'}
        >
          <TouchableOpacity onPress={handleFlip} style={styles.hintTouchBtn} activeOpacity={0.7}>
            <Text style={styles.hintText}>👆 Tap card or button to flip</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Flipped state buttons */}
        <Animated.View
          style={[styles.buttonsWrapper, actionButtonsAnimatedStyle]}
          pointerEvents={isFlippedState ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.actionBtn, styles.againBtn]}
            onPress={onReviewAgain}
            activeOpacity={0.7}
          >
            <RotateCcw size={16} color="#E85858" />
            <Text style={styles.againBtnText}>Review Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.gotItBtn]}
            onPress={onGotIt}
            activeOpacity={0.7}
          >
            <CheckCircle2 size={16} color="#FFFFFF" />
            <Text style={styles.gotItBtnText}>Got it!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Bottom counter */}
      <Text style={styles.counterText}>
        {`${totalRemaining} card${totalRemaining === 1 ? '' : 's'} remaining`}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  swipeContainer: {
    width: '100%',
    height: 270,
    position: 'relative',
    zIndex: 1,
  },
  cardPressable: {
    width: '100%',
    height: '100%',
  },
  cardSide: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 22,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    flexDirection: 'row',
    backfaceVisibility: 'hidden',
  },
  cardSideBack: {
    backgroundColor: '#FFFFFF',
  },
  accentBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 6,
    height: '100%',
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  sideContent: {
    flex: 1,
    paddingLeft: 10,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  questionLabelWrap: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F2F1EE',
  },
  questionLabelText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    fontWeight: '700',
    color: '#5C5C70',
    letterSpacing: 1,
  },
  mainTextContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  frontQuestionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 17,
    color: '#17172A',
    fontWeight: '600',
    lineHeight: 25,
  },
  backScrollArea: {
    flex: 1,
  },
  backScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  backAnswerText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#17172A',
    lineHeight: 24,
  },
  tapPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F4F0',
  },
  tapPromptText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  actionSection: {
    height: 60,
    width: '100%',
    justifyContent: 'center',
    marginTop: 18,
    position: 'relative',
  },
  hintWrapper: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },
  hintTouchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F4F0',
  },
  hintText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
    fontWeight: '600',
  },
  buttonsWrapper: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 4,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  againBtn: {
    borderWidth: 1,
    borderColor: '#FCDAD7',
    backgroundColor: '#FFF5F4',
  },
  againBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#E85858',
    fontWeight: '700',
  },
  gotItBtn: {
    backgroundColor: '#00B894',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  gotItBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  counterText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 14,
  },
});

export default FlashCard;
