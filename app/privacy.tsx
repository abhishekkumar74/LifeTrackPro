import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { LEGAL_CONFIG } from '@/lib/constants/legal';

export default function PrivacyScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6F3" translucent={false} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Shield size={20} color="#5B4FE8" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.lastUpdated}>Last Updated: {LEGAL_CONFIG.lastUpdated}</Text>
          
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.bodyText}>
            Welcome to {LEGAL_CONFIG.appName}. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice or our practices with regard to your personal info, please contact us at {LEGAL_CONFIG.supportEmail}.
          </Text>

          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.bodyText}>
            We collect personal information that you voluntarily provide to us when you register on the App, express an interest in obtaining information about us or our products and services, or otherwise when you contact us.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.boldText}>Account Data</Text>: We collect emails and profile usernames via Supabase Authentication to create and secure your user profile.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.boldText}>Productivity & Usage Data</Text>: We save focus sessions, habit logs, task descriptions, and scheduled daily routine blocks that you create. This information is required for the application's core functionality.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.boldText}>Daily Check-ins</Text>: Mood indicators and ratings you submit are stored to draw weekly reports and productivity insights.
          </Text>

          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.bodyText}>
            We use personal information collected via our App for a variety of business purposes described below:
          </Text>
          <Text style={styles.bulletItem}>
            • To facilitate account creation and logon process.
          </Text>
          <Text style={styles.bulletItem}>
            • To display and calculate personalized stats, streaks, averages, and achievement indicators on your dashboard.
          </Text>
          <Text style={styles.bulletItem}>
            • To send administrative information or push alerts for daily habits and reminders.
          </Text>

          <Text style={styles.sectionTitle}>4. Sharing Your Information</Text>
          <Text style={styles.bodyText}>
            We only share information with your consent, to comply with laws, to provide you with services, or to protect your rights. We do not sell your personal data to advertisers.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.boldText}>Hosting & Cloud Sync</Text>: Your data is stored securely in our database managed by Supabase.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.boldText}>Crash Logs</Text>: Sentry is used for telemetry, error detection, and improving app stability.
          </Text>

          <Text style={styles.sectionTitle}>5. Data Security & Storage</Text>
          <Text style={styles.bodyText}>
            We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure. Although we will do our best to protect your personal info, transmission of personal data to and from our App is at your own risk.
          </Text>

          <Text style={styles.sectionTitle}>6. Your Rights & Account Deletion</Text>
          <Text style={styles.bodyText}>
            You have the right to review, change, or terminate your account at any time. You can request the complete deletion of your account and all associated focus history, tasks, and habit logs by emailing us at {LEGAL_CONFIG.supportEmail}. We will process your deletion request within 30 days.
          </Text>

          <Text style={styles.sectionTitle}>7. Contact Us</Text>
          <Text style={styles.bodyText}>
            If you have questions or comments about this notice, you may email us at {LEGAL_CONFIG.supportEmail} or contact the developer, {LEGAL_CONFIG.developerName}.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#F7F6F3',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#17172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#17172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  lastUpdated: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#17172A',
    fontWeight: '600',
    marginTop: 22,
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
    lineHeight: 20,
    marginBottom: 10,
  },
  bulletItem: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
    lineHeight: 18,
    marginLeft: 12,
    marginBottom: 6,
  },
  boldText: {
    fontWeight: '700',
    color: '#17172A',
  },
});
