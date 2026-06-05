import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong',
  onRetry,
}) => {
  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onRetry();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>😕</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleRetry}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F7F6F3',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  message: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#E85858',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    borderWidth: 1,
    borderColor: '#5B4FE8',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  buttonText: {
    color: '#5B4FE8',
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    fontWeight: '600',
  },
});
