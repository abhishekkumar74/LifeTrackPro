import { Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/constants/config';
import { useAuthStore } from '@/lib/store/auth.store';
import { trackEvent, posthog } from '@/lib/posthog';

export const REFERRAL_STORAGE_KEY = 'lifetrack_referred_by';
export const REFERRAL_META_STORAGE_KEY = 'lifetrack_referral_metadata';

export interface ReferralParams {
  source?: string;       // e.g. 'profile_share', 'study_room', 'progress_card'
  medium?: string;       // e.g. 'social', 'invite', 'whatsapp'
  campaign?: string;     // e.g. 'user_referral', 'study_sprint'
  roomCode?: string;     // e.g. 'C87F39'
}

/**
 * Builds a universal referral tracking URL.
 * Automatically injects the active user ID and name into the Play Store / web URL
 * so PostHog can track exactly which user referred the new install.
 */
export function getReferralUrl(params?: ReferralParams): string {
  const user = useAuthStore.getState().user;
  const profile = useAuthStore.getState().profile;
  const referrerId = user?.id || 'anonymous';
  const referrerName = profile?.name ? encodeURIComponent(profile.name) : '';

  const source = params?.source || 'app_share';
  const medium = params?.medium || 'referral';
  const campaign = params?.campaign || 'user_invite';
  const roomCode = params?.roomCode ? encodeURIComponent(params.roomCode) : '';

  // Construct internal query parameters
  const queryParts = [
    `utm_source=${encodeURIComponent(source)}`,
    `utm_medium=${encodeURIComponent(medium)}`,
    `utm_campaign=${encodeURIComponent(campaign)}`,
    `referred_by=${encodeURIComponent(referrerId)}`,
  ];
  if (referrerName) queryParts.push(`referrer_name=${referrerName}`);
  if (roomCode) queryParts.push(`room=${roomCode}`);

  const rawQuery = queryParts.join('&');
  const encodedReferrer = encodeURIComponent(rawQuery);

  if (Platform.OS === 'ios') {
    return `${CONFIG.storeUrls.ios}?referred_by=${encodeURIComponent(referrerId)}&utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}`;
  }

  // Android: Google Play Store uses &referrer=<encoded-params> for Play Install Referrer
  const playStoreBase = CONFIG.storeUrls.android;
  const separator = playStoreBase.includes('?') ? '&' : '?';
  return `${playStoreBase}${separator}referrer=${encodedReferrer}`;
}

/**
 * Share LifeTrack Pro with referral tracking parameters attached.
 */
export async function shareReferralLink(params?: ReferralParams & { customMessage?: string; title?: string }) {
  const user = useAuthStore.getState().user;
  const profile = useAuthStore.getState().profile;
  const shareUrl = getReferralUrl(params);

  const defaultMessage = `Build unstoppable consistency with me on LifeTrack Pro! 🚀\nTrack habits, Pomodoro deep focus, and goal milestones:\n\n${shareUrl}`;
  const message = params?.customMessage || defaultMessage;
  const title = params?.title || 'Join me on LifeTrack Pro';

  try {
    const result = await Share.share({
      message,
      title,
    });

    trackEvent('referral_link_shared', {
      referred_by: user?.id,
      referrer_name: profile?.name,
      source: params?.source || 'app_share',
      medium: params?.medium || 'referral',
      campaign: params?.campaign || 'user_invite',
      room_code: params?.roomCode,
      share_url: shareUrl,
      action: result.action,
    });

    return result;
  } catch (error) {
    if (__DEV__) console.warn('[Referral] Share error:', error);
    throw error;
  }
}

/**
 * Captures and parses an incoming deep link or referral URL.
 * Records the attribution in PostHog so you can see where the user came from.
 */
export async function captureIncomingReferral(url: string): Promise<{ referredBy?: string; source?: string } | null> {
  if (!url) return null;

  try {
    let referredBy: string | null = null;
    let referrerName: string | null = null;
    let source: string | null = null;
    let medium: string | null = null;
    let campaign: string | null = null;
    let content: string | null = null;
    let collabPartner: string | null = null;
    let room: string | null = null;

    // Check direct query string or hash
    const searchPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';
    const sp = new URLSearchParams(searchPart);

    // Also check if there is an embedded Google Play 'referrer' query param:
    const playReferrer = sp.get('referrer');
    if (playReferrer) {
      try {
        const decodedPlaySp = new URLSearchParams(decodeURIComponent(playReferrer));
        referredBy = decodedPlaySp.get('referred_by') || decodedPlaySp.get('ref') || decodedPlaySp.get('utm_content');
        referrerName = decodedPlaySp.get('referrer_name');
        source = decodedPlaySp.get('utm_source');
        medium = decodedPlaySp.get('utm_medium');
        campaign = decodedPlaySp.get('utm_campaign');
        content = decodedPlaySp.get('utm_content');
        collabPartner = decodedPlaySp.get('collab_partner') || decodedPlaySp.get('utm_content');
        room = decodedPlaySp.get('room');
      } catch {}
    }

    // Direct query params override or fallback
    if (!referredBy) {
      referredBy = sp.get('referred_by') || sp.get('ref') || sp.get('referrer') || sp.get('utm_content');
    }
    if (!source) source = sp.get('utm_source');
    if (!medium) medium = sp.get('utm_medium');
    if (!campaign) campaign = sp.get('utm_campaign');
    if (!content) content = sp.get('utm_content');
    if (!collabPartner) collabPartner = sp.get('collab_partner') || sp.get('utm_content') || (source && source !== 'app_share' ? referredBy : null);
    if (!room) room = sp.get('room');
    if (!referrerName) referrerName = sp.get('referrer_name');

    const hasAttribution = Boolean(referredBy || source || campaign || collabPartner);

    if (hasAttribution) {
      const attributionMeta = {
        referred_by: referredBy || collabPartner || 'organic',
        referrer_name: referrerName,
        utm_source: source || 'app_share',
        utm_medium: medium || 'referral',
        utm_campaign: campaign || 'growth',
        utm_content: content,
        collab_partner: collabPartner || referredBy,
        room_code: room,
        captured_at: new Date().toISOString(),
        original_url: url,
      };

      // 1. Store in AsyncStorage for persistent attribution across app sessions
      if (referredBy) {
        await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, referredBy);
      }
      await AsyncStorage.setItem(REFERRAL_META_STORAGE_KEY, JSON.stringify(attributionMeta));

      // 2. Register as PostHog super properties (automatically attached to EVERY subsequent event)
      try {
        const superProps: Record<string, string> = {
          referred_by: attributionMeta.referred_by,
          utm_source: attributionMeta.utm_source,
          utm_medium: attributionMeta.utm_medium,
          utm_campaign: attributionMeta.utm_campaign,
          referral_source: attributionMeta.utm_source,
          referral_campaign: attributionMeta.utm_campaign,
        };
        if (referrerName) superProps.referrer_name = referrerName;
        if (content) superProps.utm_content = content;
        if (attributionMeta.collab_partner) superProps.collab_partner = attributionMeta.collab_partner;

        posthog.register(superProps);
      } catch {}

      // 3. Track explicit PostHog event for conversion & acquisition funnels
      trackEvent('app_opened_via_referral', {
        ...attributionMeta,
        url,
      });

      if (__DEV__) {
        console.log('[Referral] Successfully captured full attribution in PostHog:', attributionMeta);
      }

      return { referredBy: referredBy || undefined, source: source || undefined };
    }
  } catch (err) {
    if (__DEV__) console.warn('[Referral] Failed capturing referral:', err);
  }

  return null;
}

/**
 * Called when a user registers or establishes a session.
 * Connects the referral source to their identified PostHog profile.
 */
export async function syncUserReferralToPostHog(userId: string) {
  if (!userId) return;

  try {
    const savedReferrer = await AsyncStorage.getItem(REFERRAL_STORAGE_KEY);
    const metaStr = await AsyncStorage.getItem(REFERRAL_META_STORAGE_KEY);
    const meta = metaStr ? JSON.parse(metaStr) : null;

    if (savedReferrer || meta) {
      // Set Person properties on PostHog - visible in PostHog Person Profiles
      try {
        const personProps: Record<string, string> = {
          referred_by: savedReferrer || meta?.referred_by || 'organic',
          utm_source: meta?.utm_source || 'app_share',
          utm_medium: meta?.utm_medium || 'referral',
          utm_campaign: meta?.utm_campaign || 'user_invite',
        };
        if (meta?.referrer_name) personProps.referrer_name = meta.referrer_name;
        if (meta?.utm_content) personProps.utm_content = meta.utm_content;
        if (meta?.collab_partner) personProps.collab_partner = meta.collab_partner;
        if (meta?.captured_at) personProps.first_referral_time = meta.captured_at;
        if (meta?.original_url) personProps.initial_referrer_url = meta.original_url;

        posthog.setPersonProperties(personProps);
      } catch {}

      // Capture conversion event
      trackEvent('user_signed_up_with_referral', {
        user_id: userId,
        referred_by: savedReferrer || meta?.referred_by,
        referrer_name: meta?.referrer_name,
        utm_source: meta?.utm_source,
        utm_medium: meta?.utm_medium,
        utm_campaign: meta?.utm_campaign,
        utm_content: meta?.utm_content,
        collab_partner: meta?.collab_partner,
      });

      if (__DEV__) {
        console.log('[Referral] Synced referral conversion in PostHog for user:', userId, 'Meta:', meta);
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('[Referral] syncUserReferralToPostHog error:', err);
  }
}
