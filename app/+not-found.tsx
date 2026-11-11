import React from 'react';
import { StyleSheet, Text, View, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Compass } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '@/constants/theme';

export default function NotFoundScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} translucent={false} />

      <View style={styles.contentContainer}>
        <View style={styles.iconCircle}>
          <Compass size={48} color={COLORS.violet} strokeWidth={1.8} />
        </View>

        <Text style={styles.statusCode}>404</Text>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.description}>
          The link you followed may be broken, or the screen may have been moved.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.homeButton,
            pressed && styles.homeButtonPressed,
          ]}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  statusCode: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.violet,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  title: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 28,
    fontWeight: 'normal',
    color: COLORS.t1,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.t3,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  homeButton: {
    backgroundColor: COLORS.violet,
    borderRadius: RADIUS.md + 2,
    height: 52,
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  homeButtonPressed: {
    opacity: 0.9,
  },
  homeButtonText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
});
