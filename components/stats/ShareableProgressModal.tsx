import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { X, Share2, Copy, Flame, Clock, CheckSquare, Trophy, Sparkles, Check, ArrowRight } from 'lucide-react-native';
import { CONFIG } from '@/constants/config';
import { AppLogo } from '@/components/ui/AppLogo';
import { Toast } from '@/components/shared/Toast';

export type CardTheme = 'obsidian' | 'parchment' | 'indigo';
export type CardPeriod = 'week' | 'month' | 'all';

interface ProgressMetrics {
  userName: string;
  category: string;
  focusHours: number;
  habitStreak: number;
  tasksDone: number;
  consistencyRate: number;
  bestDayName?: string;
  bestDayHours?: number;
  totalEntriesCount?: number;
}

interface ShareableProgressModalProps {
  visible: boolean;
  onClose: () => void;
  metrics?: Partial<ProgressMetrics>;
}

export const ShareableProgressModal: React.FC<ShareableProgressModalProps> = ({
  visible,
  onClose,
  metrics,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('obsidian');
  const [selectedPeriod, setSelectedPeriod] = useState<CardPeriod>('week');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const viewShotRef = useRef<any>(null);

  const officialStoreUrl = Platform.OS === 'ios' ? CONFIG.storeUrls.ios : CONFIG.storeUrls.android;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Generate verified caption text for sharing
  const periodLabel = selectedPeriod === 'week' ? 'This Week' : selectedPeriod === 'month' ? 'This Month' : 'All-Time';
  
  const generateCaption = () => {
    return `⚡ My LifeTrack Pro Progress (${periodLabel}):\n` +
      `⏱️ Focus Duration: ${mergedMetrics.focusHours.toFixed(1)} hours\n` +
      `🔥 Habit Streak: ${mergedMetrics.habitStreak} Days\n` +
      `✅ Tasks Completed: ${mergedMetrics.tasksDone}\n` +
      `📈 Consistency: ${mergedMetrics.consistencyRate}%\n\n` +
      `Track your own growth with LifeTrack Pro:\n` +
      `${officialStoreUrl}\n\n` +
      `#LifeTrackPro #Consistency #DeepWork #Growth`;
  };

  const handleCopyCaption = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const caption = generateCaption();
    await Clipboard.setStringAsync(caption);
    showToast('Caption & App Link copied to clipboard!');
  };

  const handleShareImage = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsExporting(true);

    try {
      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();

        const canShare = await Sharing.isAvailableAsync();
        if (canShare && uri) {
          await Sharing.shareAsync(uri, {
            dialogTitle: 'Share your LifeTrack Pro Progress',
            mimeType: 'image/png',
            UTI: 'public.png',
          });
          showToast('Progress card shared!');
        } else {
          // Fallback to text Share API if native file sharing is unvailable
          await Share.share({
            message: generateCaption(),
            title: 'LifeTrack Pro Progress',
          });
        }
      } else {
        await Share.share({
          message: generateCaption(),
          title: 'LifeTrack Pro Progress',
        });
      }
    } catch (err: any) {
      if (__DEV__) console.warn('Share progress card error:', err);
      showToast('Copied text caption as fallback');
      await Clipboard.setStringAsync(generateCaption());
    } finally {
      setIsExporting(false);
    }
  };

  // Theme styling helpers
  const getCardBg = () => {
    switch (selectedTheme) {
      case 'parchment': return '#F5EFE6';
      case 'indigo': return '#5B4FE8';
      default: return '#17172A';
    }
  };

  const getTextColor = () => {
    switch (selectedTheme) {
      case 'parchment': return '#2C221E';
      default: return '#FFFFFF';
    }
  };

  const getSubtextColor = () => {
    switch (selectedTheme) {
      case 'parchment': return '#78685E';
      case 'indigo': return '#C3BEF7';
      default: return '#9B9BAF';
    }
  };

  const getCardBorderColor = () => {
    switch (selectedTheme) {
      case 'parchment': return 'rgba(232, 88, 88, 0.4)';
      case 'indigo': return '#4639C9';
      default: return '#2C2C46';
    }
  };

  const getStatBoxBg = () => {
    switch (selectedTheme) {
      case 'parchment': return '#EFE6D8';
      case 'indigo': return '#4A3ED1';
      default: return '#23233B';
    }
  };

  const mergedMetrics: ProgressMetrics = {
    userName: metrics?.userName || 'Achiever',
    category: metrics?.category || 'Student',
    focusHours: metrics?.focusHours ?? 0,
    habitStreak: metrics?.habitStreak ?? 0,
    tasksDone: metrics?.tasksDone ?? 0,
    consistencyRate: metrics?.consistencyRate ?? 0,
    bestDayName: metrics?.bestDayName,
    bestDayHours: metrics?.bestDayHours,
  };

  const categoryText = mergedMetrics.category ? mergedMetrics.category.replace('_', ' ').toUpperCase() : 'STUDENT';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#5B4FE8" />
              <Text style={styles.sheetTitle}>Share Progress</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#9B9BAF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Period Selector */}
            <View style={styles.periodRow}>
              {(['week', 'month', 'all'] as CardPeriod[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[styles.periodBtn, selectedPeriod === period && styles.periodBtnActive]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                    {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All-Time'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Theme Selector */}
            <View style={styles.themeRow}>
              <TouchableOpacity
                style={[styles.themePill, selectedTheme === 'obsidian' && styles.themePillActive]}
                onPress={() => setSelectedTheme('obsidian')}
              >
                <View style={[styles.themeDot, { backgroundColor: '#17172A' }]} />
                <Text style={styles.themeLabel}>Obsidian</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themePill, selectedTheme === 'parchment' && styles.themePillActive]}
                onPress={() => setSelectedTheme('parchment')}
              >
                <View style={[styles.themeDot, { backgroundColor: '#F5EFE6', borderWidth: 1, borderColor: '#D0C4B4' }]} />
                <Text style={styles.themeLabel}>Parchment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themePill, selectedTheme === 'indigo' && styles.themePillActive]}
                onPress={() => setSelectedTheme('indigo')}
              >
                <View style={[styles.themeDot, { backgroundColor: '#5B4FE8' }]} />
                <Text style={styles.themeLabel}>Indigo</Text>
              </TouchableOpacity>
            </View>

            {/* PREVIEW CONTAINER FOR VIEWSHOT EXPORT */}
            <View style={styles.previewWrapper}>
              <ViewShot
                ref={viewShotRef}
                options={{ format: 'png', quality: 0.95, result: 'tmpfile' }}
                style={[
                  styles.cardPreview,
                  { backgroundColor: getCardBg(), borderColor: getCardBorderColor() },
                  selectedTheme === 'parchment' && styles.cardParchmentBorder,
                ]}
              >
                {/* Brand Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppLogo size={28} variant={selectedTheme === 'parchment' ? 'light' : 'dark'} />
                    <Text style={[styles.cardBrandTitle, { color: getTextColor() }]}>
                      Life<Text style={{ color: selectedTheme === 'indigo' ? '#FFD700' : '#5B4FE8' }}>Track</Text> PRO
                    </Text>
                  </View>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{categoryText}</Text>
                  </View>
                </View>

                {/* User Name & Period Headline */}
                <View style={styles.cardTitleBox}>
                  <Text style={[styles.cardUserName, { color: getTextColor() }]}>
                    {mergedMetrics.userName || 'Achiever'}
                  </Text>
                  <Text
                    style={[
                      styles.cardHeadline,
                      { color: getSubtextColor() },
                      selectedTheme === 'parchment' && { fontFamily: 'InstrumentSerif', fontSize: 24 },
                    ]}
                  >
                    "{periodLabel} Progress Report"
                  </Text>
                </View>

                {/* Core Metrics Grid */}
                <View style={styles.cardMetricsGrid}>
                  {/* Metric 1: Focus Hours */}
                  <View style={[styles.cardStatBox, { backgroundColor: getStatBoxBg() }]}>
                    <Clock size={16} color={selectedTheme === 'indigo' ? '#FFD700' : '#5B4FE8'} />
                    <Text style={[styles.cardStatValue, { color: getTextColor() }]}>
                      {mergedMetrics.focusHours.toFixed(1)}h
                    </Text>
                    <Text style={[styles.cardStatLabel, { color: getSubtextColor() }]}>Deep Focus</Text>
                  </View>

                  {/* Metric 2: Habit Streak */}
                  <View style={[styles.cardStatBox, { backgroundColor: getStatBoxBg() }]}>
                    <Flame size={16} color="#E8A020" fill="#E8A020" />
                    <Text style={[styles.cardStatValue, { color: getTextColor() }]}>
                      {mergedMetrics.habitStreak} Days
                    </Text>
                    <Text style={[styles.cardStatLabel, { color: getSubtextColor() }]}>Active Streak</Text>
                  </View>

                  {/* Metric 3: Tasks Done */}
                  <View style={[styles.cardStatBox, { backgroundColor: getStatBoxBg() }]}>
                    <CheckSquare size={16} color="#00B894" />
                    <Text style={[styles.cardStatValue, { color: getTextColor() }]}>
                      {mergedMetrics.tasksDone}
                    </Text>
                    <Text style={[styles.cardStatLabel, { color: getSubtextColor() }]}>Tasks Done</Text>
                  </View>

                  {/* Metric 4: Consistency */}
                  <View style={[styles.cardStatBox, { backgroundColor: getStatBoxBg() }]}>
                    <Trophy size={16} color="#FFB800" />
                    <Text style={[styles.cardStatValue, { color: getTextColor() }]}>
                      {mergedMetrics.consistencyRate}%
                    </Text>
                    <Text style={[styles.cardStatLabel, { color: getSubtextColor() }]}>Consistency</Text>
                  </View>
                </View>

                {/* Best Day Highlight */}
                {mergedMetrics.bestDayName && (
                  <View style={[styles.cardHighlightBox, { backgroundColor: getStatBoxBg() }]}>
                    <Sparkles size={14} color="#E8A020" />
                    <Text style={[styles.cardHighlightText, { color: getTextColor() }]}>
                      Peak Focus: <Text style={{ fontWeight: 'bold' }}>{mergedMetrics.bestDayName}</Text> ({mergedMetrics.bestDayHours?.toFixed(1) || 0}h)
                    </Text>
                  </View>
                )}

                {/* Footer Tagline & App Link */}
                <View style={styles.cardFooter}>
                  <Text style={[styles.cardFooterText, { color: getSubtextColor() }]}>
                    Building real consistency with LifeTrack Pro
                  </Text>
                  <Text style={styles.cardFooterUrl}>
                    lifetrackpro.app
                  </Text>
                </View>
              </ViewShot>
            </View>

            {/* CTA ACTIONS */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.sharePrimaryBtn}
                onPress={handleShareImage}
                disabled={isExporting}
                activeOpacity={0.85}
              >
                {isExporting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Share2 size={16} color="#FFFFFF" />
                    <Text style={styles.sharePrimaryText}>Share Progress Card</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.copySecondaryBtn}
                onPress={handleCopyCaption}
                activeOpacity={0.7}
              >
                <Copy size={15} color="#5B4FE8" />
                <Text style={styles.copySecondaryText}>Copy Caption & Store Link</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Toast Notification */}
          {toastMessage && (
            <View style={styles.toastContainer}>
              <Check size={14} color="#FFFFFF" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#17172A',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F2F1EE',
    borderRadius: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#F2F1EE',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#9B9BAF',
  },
  periodTextActive: {
    color: '#17172A',
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F7F6F3',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  themePillActive: {
    borderColor: '#5B4FE8',
    backgroundColor: '#EAE8FD',
  },
  themeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeLabel: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#17172A',
  },
  previewWrapper: {
    alignItems: 'center',
    marginBottom: 18,
  },
  cardPreview: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardParchmentBorder: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(232, 88, 88, 0.5)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardBrandTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  cardBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardBadgeText: {
    fontFamily: 'DMMono',
    fontSize: 9,
    color: '#FFD700',
    fontWeight: '700',
  },
  cardTitleBox: {
    marginBottom: 16,
  },
  cardUserName: {
    fontFamily: 'DMSans-Bold',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardHeadline: {
    fontFamily: 'DMSans',
    fontSize: 13,
    fontStyle: 'italic',
  },
  cardMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  cardStatBox: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    alignItems: 'flex-start',
    gap: 2,
  },
  cardStatValue: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  cardStatLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
  },
  cardHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  cardHighlightText: {
    fontFamily: 'DMSans',
    fontSize: 11,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
    gap: 2,
  },
  cardFooterText: {
    fontFamily: 'DMSans',
    fontSize: 10,
  },
  cardFooterUrl: {
    fontFamily: 'DMMono',
    fontSize: 11,
    color: '#00B894',
    fontWeight: '700',
  },
  actionsContainer: {
    gap: 10,
  },
  sharePrimaryBtn: {
    backgroundColor: '#5B4FE8',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sharePrimaryText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  copySecondaryBtn: {
    backgroundColor: '#EAE8FD',
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  copySecondaryText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    color: '#5B4FE8',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#17172A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
