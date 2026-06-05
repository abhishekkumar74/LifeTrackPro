import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Note } from '@/types/app.types';
import { getSubjectColor } from '@/lib/utils/subject-colors';

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

  // Parse JSON content if it is a flashcard
  const isFlashcardTag = note.tags && note.tags.includes('flashcard');
  let frontText = note.title || 'Untitled Note';
  let backText = note.content || 'No content';

  if (isFlashcardTag && note.content) {
    try {
      const parsed = JSON.parse(note.content);
      if (parsed && typeof parsed === 'object') {
        frontText = parsed.front || frontText;
        backText = parsed.back || backText;
      }
    } catch (e) {
      // Fallback
    }
  }

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
  }, [note.id]);

  const handleFlip = () => {
    rotatedVal.value = withTiming(rotatedVal.value === 0 ? 180 : 0, {
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
    const rotateValue = rotatedVal.value;
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
      opacity: rotateValue > 90 ? 0 : 1,
      zIndex: rotateValue > 90 ? 0 : 1,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = rotatedVal.value + 180;
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
      opacity: rotateValue > 270 || rotateValue < 90 ? 0 : 1,
      zIndex: rotateValue > 270 || rotateValue < 90 ? 1 : 0,
    };
  });

  // Combine drag translation and rotate with flipping styles
  const dragAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${translateX.value / 12}deg` },
      ],
    };
  });

  // Reveal text hint/buttons depending on flip state
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
            {/* Front Side */}
            <Animated.View style={[styles.cardSide, frontAnimatedStyle]}>
              <View style={[styles.accentBorder, { backgroundColor: accentColor }]} />
              <View style={styles.sideContent}>
                <Text style={[styles.subjectTag, { color: accentColor }]}>
                  {subject}
                </Text>
                <Text style={styles.titleText}>
                  {frontText}
                </Text>
              </View>
            </Animated.View>

            {/* Back Side */}
            <Animated.View style={[styles.cardSide, styles.cardSideBack, backAnimatedStyle]}>
              <View style={[styles.accentBorder, { backgroundColor: accentColor }]} />
              <View style={styles.sideContent}>
                <Text style={styles.backLabelText}>ANSWER / CONTENT</Text>
                <Text style={styles.backContentText} numberOfLines={8}>
                  {backText.substring(0, 220) + (backText.length > 220 ? '...' : '')}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>

      {/* Reveal hints or action buttons */}
      <View style={styles.actionSection}>
        {/* Unflipped state hint */}
        <Animated.View style={[styles.hintWrapper, hintAnimatedStyle]} pointerEvents="none">
          <Text style={styles.hintText}>Tap card to reveal answer</Text>
        </Animated.View>

        {/* Flipped state buttons */}
        <Animated.View style={[styles.buttonsWrapper, actionButtonsAnimatedStyle]}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.againBtn]}
            onPress={onReviewAgain}
            activeOpacity={0.7}
          >
            <Text style={styles.againBtnText}>🔄 Review Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.gotItBtn]}
            onPress={onGotIt}
            activeOpacity={0.7}
          >
            <Text style={styles.gotItBtnText}>✅ Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Bottom remaining card count */}
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
    height: 220,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 24,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
  },
  cardSideBack: {
    transform: [{ rotateY: '180deg' }],
  },
  accentBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 6,
    height: '100%',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  sideContent: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  subjectTag: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
  },
  titleText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 18,
    color: '#17172A',
    fontWeight: '600',
    lineHeight: 24,
  },
  backLabelText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    color: '#9B9BAF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  backContentText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
    lineHeight: 20,
  },
  actionSection: {
    height: 60,
    width: '100%',
    justifyContent: 'center',
    marginTop: 20,
    position: 'relative',
  },
  hintWrapper: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },
  hintText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    letterSpacing: 0.5,
  },
  buttonsWrapper: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 4,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  againBtn: {
    borderWidth: 1,
    borderColor: '#E8E7E3',
    backgroundColor: '#FFFFFF',
  },
  againBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '600',
  },
  gotItBtn: {
    backgroundColor: '#00B894',
  },
  gotItBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  counterText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 16,
  },
});
export default FlashCard;
