import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/lib/store/auth.store';
import { supabase } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, X, CheckCircle, Volume2, Palette, Users } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function PaywallScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { profile, setProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data as any);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsSuccess(true);
    } catch (e) {
      if (__DEV__) console.warn('Upgrade failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDowngrade = async () => {
    setIsLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update({ is_premium: false })
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data as any);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.back();
    } catch (e) {
      if (__DEV__) console.warn('Downgrade failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <CheckCircle size={72} color="#E8A020" />
        <Text style={styles.successTitle}>Welcome to Gold ✨</Text>
        <Text style={styles.successSubtitle}>
          Your LifeTrack Gold subscription is now active. Enjoy all premium themes, soundscapes, and analytics!
        </Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#12121e" animated />
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LifeTrack Gold</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <X size={20} color="#9B9BAF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO BADGE */}
        <View style={styles.heroSection}>
          <View style={styles.sparkleIcon}>
            <Sparkles size={36} color="#E8A020" />
          </View>
          <Text style={styles.heroTitle}>Level Up Your Productivity</Text>
          <Text style={styles.heroSubtitle}>
            Unlock custom aesthetics and focus features designed to keep you in the zone.
          </Text>
        </View>

        {/* FEATURES LIST */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Palette size={20} color="#A89EF8" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>7 Premium Timer Themes</Text>
              <Text style={styles.featureDesc}>
                Aesthetic options like Rose Gold, Obsidian, Sunset Glow, and Nebula Space.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Volume2 size={20} color="#A89EF8" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Premium Soundscapes</Text>
              <Text style={styles.featureDesc}>
                Get full access to Café, Lo-fi, and Brown Noise to block out ambient distractions.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Users size={20} color="#A89EF8" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Unlimited Study Groups</Text>
              <Text style={styles.featureDesc}>
                Create private or public rooms with unlimited member capacity to study together.
              </Text>
            </View>
          </View>
        </View>

        {/* PLAN CARD */}
        <View style={styles.planCard}>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>POPULAR</Text>
          </View>
          <Text style={styles.planTitle}>Gold Access</Text>
          <Text style={styles.planPrice}>₹199 / month</Text>
          <Text style={styles.planOffer}>Cancel anytime. Cancel in settings instantly.</Text>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsContainer}>
          {profile?.is_premium ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.downgradeButton]}
              onPress={handleDowngrade}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#5B4FE8" size="small" />
              ) : (
                <Text style={styles.downgradeButtonText}>Cancel Subscription (Free Plan)</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleUpgrade}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Upgrade to Gold ✨</Text>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.footerLegal}>
            Secured checkout. By upgrading, you agree to our Terms of Use and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12121e', // Sleek ultra-dark navy
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  sparkleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232, 160, 32, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#9B9BAF',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  featuresList: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(91, 79, 232, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featureDesc: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 2,
    lineHeight: 16,
  },
  planCard: {
    width: '100%',
    backgroundColor: 'rgba(232, 160, 32, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 32, 0.3)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#E8A020',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    fontWeight: '700',
    color: '#12121e',
  },
  planTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  planPrice: {
    fontFamily: 'DMSans-Medium',
    fontSize: 24,
    fontWeight: '700',
    color: '#E8A020',
    marginBottom: 6,
  },
  planOffer: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#5B4FE8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  downgradeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#5B4FE8',
    shadowOpacity: 0,
    elevation: 0,
  },
  downgradeButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#5B4FE8',
  },
  footerLegal: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 20,
  },
  successContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
  },
  successSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#9B9BAF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: '#E8A020',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '700',
    color: '#12121e',
  },
});
