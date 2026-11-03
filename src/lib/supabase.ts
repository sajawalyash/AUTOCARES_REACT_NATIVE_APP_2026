import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { Platform } from 'react-native';

function sanitizeEnv(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isValidUrl(url?: string): boolean {
  if (!url || url === 'YOUR_URL') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const rawUrl = sanitizeEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
const rawKey = sanitizeEnv(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

const DEFAULT_SUPABASE_URL = 'https://dlkljjmruxuznxneslju.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_m5v4Y04k7V440K5z66Y20L_r-cCJCbI';

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl : DEFAULT_SUPABASE_URL;
const supabasePublishableKey =
  rawKey && rawKey !== 'YOUR_KEY' ? rawKey : DEFAULT_SUPABASE_KEY;

const authStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

let clientInstance: SupabaseClient;

try {
  clientInstance = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (error) {
  console.warn('Failed to initialize primary Supabase client, using fallback:', error);
  clientInstance = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = clientInstance;
