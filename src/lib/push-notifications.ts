import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  AndroidImportance,
  AndroidNotificationPriority,
  AndroidNotificationVisibility,
  getExpoPushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export const MECHANIC_REQUESTS_CHANNEL_ID = 'autocares_mechanic_requests';

/**
 * Configure default notification behavior when app is in foreground.
 * We want heads-up banner alert, sound, and badge.
 */
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: AndroidNotificationPriority.MAX,
  }),
});

/**
 * Configures the dedicated Android Notification Channel for Mechanic Requests.
 * High importance ensures heads-up banner, vibration, and dedicated sound.
 */
export async function setupMechanicNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const isExpoGo = Constants.appOwnership === 'expo';

  const baseConfig = {
    name: 'Mechanic Assistance Requests',
    description: 'Notifications for incoming roadside assistance requests.',
    importance: AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#38B8E8',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  };

  // In standalone / prebuild / dev-client APKs, request_alert.wav exists in android/app/src/main/res/raw.
  // In Expo Go, custom raw audio assets do not exist and the native Android module throws a NullPointerException.
  if (!isExpoGo) {
    try {
      await setNotificationChannelAsync(MECHANIC_REQUESTS_CHANNEL_ID, {
        ...baseConfig,
        sound: 'request_alert.wav',
      });
      return;
    } catch {
      // Fall through to standard configuration if native raw resource lookup fails
    }
  }

  try {
    await setNotificationChannelAsync(MECHANIC_REQUESTS_CHANNEL_ID, baseConfig);
  } catch (error) {
    console.warn('[PushNotifications] Failed to setup notification channel:', error);
  }
}

/**
 * Requests notification permissions and registers the push token in Supabase.
 * Supports Android 13+ POST_NOTIFICATIONS permission.
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // 1. Ensure notification channel exists on Android
    await setupMechanicNotificationChannel();

    // 2. Check and request OS notification permissions
    const { status: existingStatus } = await getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[PushNotifications] Permission not granted for push notifications.');
      return null;
    }

    // 3. In Expo Go on Android (SDK 53+), remote push notifications were removed by Expo.
    // They work in development builds (npx expo run:android) and standalone APKs.
    if (Constants.appOwnership === 'expo') {
      // Supabase Realtime handles all in-app notifications in Expo Go.
      return null;
    }

    // 4. Obtain EAS / Expo Project ID
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'a534a5e7-a25a-42f6-8b92-2322ec38c40f';

    // 5. Get the Expo Push Token
    const tokenResponse = await getExpoPushTokenAsync({
      projectId,
    });
    const pushToken = tokenResponse.data;

    if (!pushToken) {
      console.warn('[PushNotifications] Failed to get Expo push token.');
      return null;
    }

    // 6. Store/upsert push token into Supabase for this user
    const deviceName = Device.modelName ?? `${Platform.OS} device`;
    const { error: dbError } = await supabase.from('user_push_tokens').upsert(
      {
        user_id: userId,
        push_token: pushToken,
        platform: Platform.OS,
        device_name: deviceName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,push_token' }
    );

    if (dbError) {
      console.warn('[PushNotifications] Error saving push token to database:', dbError.message);
    }

    return pushToken;
  } catch (err) {
    console.warn('[PushNotifications] Error registering for push notifications:', err);
    return null;
  }
}

/**
 * Removes user push token from Supabase upon logout.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'a534a5e7-a25a-42f6-8b92-2322ec38c40f';

    const tokenResponse = await getExpoPushTokenAsync({ projectId }).catch(() => null);
    if (!tokenResponse?.data) return;

    await supabase
      .from('user_push_tokens')
      .delete()
      .match({ user_id: userId, push_token: tokenResponse.data });
  } catch (err) {
    console.warn('[PushNotifications] Error unregistering push token:', err);
  }
}

export type DispatchNotificationParams = {
  requestId: string;
  mechanicId: string;
  customerId: string;
  customerName?: string | null;
  vehicleType?: string | null;
  problemType?: string | null;
  distanceKm?: number | null;
  description?: string | null;
  isSos?: boolean;
};

/**
 * Dispatches a push notification to the assigned mechanic.
 * Priority 1: Supabase Edge Function 'notify-request' (secure backend dispatch).
 * Priority 2: Direct Expo Push API fallback if edge function is unhosted/offline.
 */
export async function dispatchMechanicNotification(
  params: DispatchNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const {
    requestId,
    mechanicId,
    customerId,
    customerName,
    vehicleType,
    problemType,
    distanceKm,
    description,
    isSos,
  } = params;

  const defaultTitle = isSos
    ? '🚨 Emergency SOS Assistance Request!'
    : '🚗 New Assistance Request!';

  const distancePart =
    typeof distanceKm === 'number'
      ? distanceKm < 1
        ? ` · ${Math.round(distanceKm * 1000)} m away`
        : ` · ${distanceKm.toFixed(1)} km away`
      : '';

  const defaultBody = customerName
    ? `${customerName} needs ${vehicleType || 'vehicle'} assistance${distancePart}${
        description ? ` (${description.slice(0, 40)})` : ''
      }`
    : `A customer nearby needs your help${distancePart}. Tap to view request.`;

  // 1. Attempt secure dispatch via Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('notify-request', {
      body: {
        requestId,
        mechanicId,
        customerId,
        customerName,
        vehicleType,
        problemType,
        distanceKm,
        title: defaultTitle,
        body: defaultBody,
        isSos,
      },
    });

    if (!error && data?.success) {
      return { success: true };
    }
  } catch {
    // Edge function invocation failed or unhosted; fallback to client push dispatch
  }

  // 2. Fallback: Query mechanic push tokens and post to Expo Push API
  try {
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', mechanicId);

    if (tokensError || !tokens || tokens.length === 0) {
      return { success: false, error: 'No push tokens registered for mechanic.' };
    }

    const messages = tokens.map((t) => ({
      to: t.push_token,
      sound: 'request_alert.wav',
      title: defaultTitle,
      body: defaultBody,
      channelId: MECHANIC_REQUESTS_CHANNEL_ID,
      priority: 'high',
      _displayInForeground: true,
      data: {
        requestId,
        customerId,
        vehicleType,
        problemType,
        isSos: !!isSos,
        channelId: MECHANIC_REQUESTS_CHANNEL_ID,
      },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
