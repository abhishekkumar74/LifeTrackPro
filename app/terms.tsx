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
import { ArrowLeft, FileText } from 'lucide-react-native';
import { LEGAL_CONFIG } from '@/lib/constants/legal';

export default function TermsScreen(): React.JSX.Element {
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
          <FileText size={20} color="#5B4FE8" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Terms of Service</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.lastUpdated}>Last Updated: {LEGAL_CONFIG.lastUpdated}</Text>
          
          <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
          <Text style={styles.bodyText}>
            These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and the developer, {LEGAL_CONFIG.developerName} ("we," "us" or "our"), concerning your access to and use of the {LEGAL_CONFIG.appName} application.
          </Text>

          <Text style={styles.sectionTitle}>2. Use of Service</Text>
          <Text style={styles.bodyText}>
            {LEGAL_CONFIG.appName} provides self-tracking utilities, including focus sessions, tasks list milestones, habit logging, and study routine timers. You agree to use this service only for its intended purposes of personal productivity and goal tracking.
          </Text>

          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.bodyText}>
            By creating an account, you represent and warrant that all registration info you submit is truthful and accurate, and that you will maintain the accuracy of such info. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </Text>

          <Text style={styles.sectionTitle}>4. Prohibited Activities</Text>
          <Text style={styles.bodyText}>
            You may not access or use the App for any purpose other than that for which we make the App available. Prohibited activity includes:
          </Text>
          <Text style={styles.bulletItem}>
            • Attempting to bypass security measures or reverse-engineer the application.
          </Text>
          <Text style={styles.bulletItem}>
            • Using the App in any manner that could interfere with, disrupt, negatively affect, or inhibit other users from fully enjoying the service.
          </Text>
          <Text style={styles.bulletItem}>
            • Uploading or transmitting viruses, Trojan horses, or other malicious code.
          </Text>

          <Text style={styles.sectionTitle}>5. Intellectual Property Rights</Text>
          <Text style={styles.bodyText}>
            Unless otherwise indicated, the App, including all source code, databases, functionality, software, designs, audio, video, text, photographs, and graphics on the App (collectively, the "Content") and the trademarks, service marks, and logos contained therein are owned or controlled by us.
          </Text>

          <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.bodyText}>
            In no event will we or our service providers be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the App, even if we have been advised of the possibility of such damages.
          </Text>

          <Text style={styles.sectionTitle}>7. Disclaimers</Text>
          <Text style={styles.bodyText}>
            The App is provided on an "As-Is" and "As-Available" basis. You agree that your use of the App and our services will be at your sole risk. To the fullest extent permitted by law, we disclaim all warranties, express or implied, in connection with the App and your use thereof.
          </Text>

          <Text style={styles.sectionTitle}>8. Contact Us</Text>
          <Text style={styles.bodyText}>
            In order to resolve a complaint regarding the App or to receive further information regarding use of the App, please contact us at {LEGAL_CONFIG.supportEmail}.
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
});
