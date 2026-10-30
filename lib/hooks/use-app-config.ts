import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export interface AppConfigItem {
  key: string;
  value: any;
  description?: string | null;
  updated_at?: string;
}

export interface MaintenanceModeConfig {
  enabled: boolean;
  message?: string;
}

export interface VersionConfig {
  min_version: string;
  latest_version?: string;
  force_update: boolean;
  store_url?: string;
}

export interface FeatureFlagsConfig {
  [feature: string]: boolean;
}

const CACHE_KEY = '@lifetrack_app_config_cache';

const DEFAULT_CONFIG: Record<string, any> = {
  maintenance_mode: {
    enabled: false,
    message: 'Scheduled maintenance in progress.',
  },
  min_supported_version: {
    min_version: '1.0.0',
    latest_version: '1.0.0',
    force_update: false,
    store_url: 'https://play.google.com/store/apps/details?id=com.lifetrackpro.app',
  },
  feature_flags: {
    enable_study_rooms: true,
    enable_ambient_sounds: true,
    enable_ai_insights: true,
    enable_flashcards: true,
  },
};

/**
 * Compare two semver strings (e.g. '1.0.2' vs '1.1.0')
 * Returns negative if v1 < v2, 0 if v1 == v2, positive if v1 > v2
 */
export function compareSemver(v1: string, v2: string): number {
  const clean = (v: string) => (v || '1.0.0').replace(/^v/i, '').split('-')[0].trim();
  const parts1 = clean(v1).split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean(v2).split('.').map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (parts1[i] || 0) - (parts2[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Hook to retrieve remote application configuration from Supabase public.app_config.
 * Security guarantees:
 * - Queries ONLY keys explicitly marked 'is_public = true'
 * - Read-only: never modifies or writes to database from client
 * - Offline-first: uses local cache and safe defaults on any failure
 * - Non-blocking: failures never lock out legitimate users
 */
export function useAppConfig() {
  const queryClient = useQueryClient();
  const currentAppVersion = Constants.expoConfig?.version || '1.0.0';

  const query = useQuery<Record<string, any>>({
    queryKey: ['app_config'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('key, value, description, updated_at')
          .eq('is_public', true);

        if (error) {
          // Graceful handling if migration has not been applied yet
          if (
            error.code === '42P01' ||
            error.message?.includes('PGRST205') ||
            error.message?.includes('schema cache') ||
            error.message?.includes('does not exist')
          ) {
            return DEFAULT_CONFIG;
          }
          throw error;
        }

        const map: Record<string, any> = { ...DEFAULT_CONFIG };
        for (const item of data || []) {
          if (item.key && item.value !== undefined) {
            map[item.key] = item.value;
          }
        }

        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map)).catch(() => {});
        return map;
      } catch (err: any) {
        // Fallback to AsyncStorage cache
        const cachedRaw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
        if (cachedRaw) {
          try {
            return JSON.parse(cachedRaw);
          } catch {
            // Ignore parse errors
          }
        }
        return DEFAULT_CONFIG;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const config = query.data || DEFAULT_CONFIG;

  const maintenance = (config.maintenance_mode || DEFAULT_CONFIG.maintenance_mode) as MaintenanceModeConfig;
  const versionInfo = (config.min_supported_version || DEFAULT_CONFIG.min_supported_version) as VersionConfig;
  const featureFlags = (config.feature_flags || DEFAULT_CONFIG.feature_flags) as FeatureFlagsConfig;

  // Check if force update is needed
  const isUpdateRequired = useMemo(() => {
    if (!versionInfo.force_update) return false;
    const minVer = versionInfo.min_version || '1.0.0';
    return compareSemver(currentAppVersion, minVer) < 0;
  }, [versionInfo, currentAppVersion]);

  // Feature flag checker
  const isFeatureEnabled = useCallback(
    (featureName: string, defaultFallback = true): boolean => {
      if (featureFlags && typeof featureFlags[featureName] === 'boolean') {
        return featureFlags[featureName];
      }
      return defaultFallback;
    },
    [featureFlags]
  );

  return {
    config,
    isMaintenanceMode: Boolean(maintenance.enabled),
    maintenanceMessage: maintenance.message || 'Scheduled maintenance in progress.',
    isUpdateRequired,
    storeUrl: versionInfo.store_url || 'https://play.google.com/store/apps/details?id=com.lifetrackpro.app',
    isFeatureEnabled,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['app_config'] }),
  };
}
