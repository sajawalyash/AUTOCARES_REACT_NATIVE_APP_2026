import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../constants/autocares-theme';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/notifications';
import {
  registerForPushNotificationsAsync,
  setupMechanicNotificationChannel,
} from '../lib/push-notifications';
import { supabase } from '../lib/supabase';
import type { AppNotification } from '../lib/types';
import { useAuth } from './auth-provider';

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user, role } = useAuth();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);

  // Deduplication sets to prevent double-alerting between push & realtime
  const handledNotificationIds = useRef(new Set<string>());
  const handledRequestIds = useRef(new Set<string>());

  // Animated toast values
  const [translateY] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const dismissToast = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastNotification(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (notification: AppNotification) => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      setToastNotification(notification);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 5 seconds
      hideTimerRef.current = setTimeout(() => {
        dismissToast();
      }, 5000);
    },
    [dismissToast, opacity, translateY]
  );

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    try {
      const { notifications: list } = await listNotifications(user.id);
      setNotifications(list);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Register push token for authenticated user and configure Android channels
  const registeredUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || registeredUserRef.current === user.id) return;
    registeredUserRef.current = user.id;
    setupMechanicNotificationChannel();
    registerForPushNotificationsAsync(user.id);
  }, [user]);

  // Handle incoming push notification taps (background / lockscreen / heads-up tap)
  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      const requestId = data?.requestId;

      if (requestId) {
        if (role === 'mechanic') {
          router.push('/(mechanic)/(tabs)/requests');
        } else {
          router.push(`/(customer)/tracking/${requestId}` as any);
        }
      } else {
        if (role === 'mechanic') {
          router.push('/(mechanic)/notifications');
        } else {
          router.push('/(customer)/notifications');
        }
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, any> | undefined;
      const notifId = notification.request.identifier;
      const requestId = data?.requestId;

      if (requestId && handledRequestIds.current.has(requestId)) {
        return;
      }
      if (notifId && handledNotificationIds.current.has(notifId)) {
        return;
      }
      if (requestId) handledRequestIds.current.add(requestId);
      if (notifId) handledNotificationIds.current.add(notifId);

      loadNotifications();
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [loadNotifications, role]);

  // Initial fetch and Realtime Subscription
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      return;
    }

    listNotifications(user.id)
      .then(({ notifications: list }) => {
        if (isMounted) {
          setNotifications(list);
        }
      })
      .catch((err) => {
        console.warn('Initial notifications fetch skipped/failed:', err);
      });

    // Set up Supabase Realtime Channel
    let channel: any;
    try {
      const channelName = `realtime:notifications:${user.id}_${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as AppNotification;
            const reqId = newNotif.data?.requestId;

            if (newNotif.id && handledNotificationIds.current.has(newNotif.id)) {
              return;
            }
            if (reqId && handledRequestIds.current.has(reqId)) {
              return;
            }
            if (newNotif.id) handledNotificationIds.current.add(newNotif.id);
            if (reqId) handledRequestIds.current.add(reqId);

            setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);

            // Trigger vibration feedback
            if (Platform.OS !== 'web') {
              try {
                Vibration.vibrate([0, 250, 250, 250]);
              } catch {
                // Ignore if unsupported on current environment
              }
            }

            // Show floating in-app banner
            showToast(newNotif);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as AppNotification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const deleted = payload.old as { id: string };
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Failed to subscribe to realtime notifications channel:', err);
    }

    return () => {
      isMounted = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [showToast, user]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsRead(user.id);
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    }
  }, [user]);

  const handleToastPress = useCallback(() => {
    const currentToast = toastNotification;
    dismissToast();
    const requestId = currentToast?.data?.requestId;

    if (role === 'mechanic') {
      if (requestId) {
        router.push('/(mechanic)/(tabs)/requests');
      } else {
        router.push('/(mechanic)/notifications');
      }
    } else {
      if (requestId) {
        router.push(`/(customer)/tracking/${requestId}` as any);
      } else {
        router.push('/(customer)/notifications');
      }
    }
  }, [dismissToast, role, toastNotification]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      refresh: loadNotifications,
    }),
    [isLoading, loadNotifications, markAllAsRead, markAsRead, notifications, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Floating Modern Capsule Notification Popup */}
      {toastNotification && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: Math.max(insets.top, 16) + 6,
              transform: [{ translateY }],
              opacity,
            },
          ]}>
          <Pressable
            style={({ pressed }) => [styles.toastCard, pressed && styles.toastPressed]}
            onPress={handleToastPress}
            accessibilityRole="alert"
            accessibilityLabel={`Notification: ${toastNotification.title}`}>
            
            <View style={styles.toastAccentGlow} />

            <View style={styles.toastIconBox}>
              <Ionicons name="notifications" size={19} color={theme.colors.primaryDark} />
              <View style={styles.toastActivePulse} />
            </View>

            <View style={styles.toastTextBox}>
              <View style={styles.toastHeaderRow}>
                <View style={styles.brandTag}>
                  <Text style={styles.brandTagText}>AutoCares</Text>
                  <Text style={styles.brandDot}>•</Text>
                  <Text style={styles.toastTime}>Just now</Text>
                </View>
                <Pressable
                  onPress={dismissToast}
                  hitSlop={10}
                  style={styles.toastCloseBtn}
                  accessibilityLabel="Dismiss">
                  <Ionicons name="close" size={15} color={theme.colors.muted} />
                </Pressable>
              </View>

              <Text style={styles.toastTitle} numberOfLines={1}>
                {toastNotification.title}
              </Text>
              <Text style={styles.toastBody} numberOfLines={2}>
                {toastNotification.body}
              </Text>
            </View>

            <View style={styles.toastActionChip}>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.primaryDark} />
            </View>
          </Pressable>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#D6F1FA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 12,
  },
  toastPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  },
  toastAccentGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: theme.colors.primary,
  },
  toastIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EBF8FD',
    borderWidth: 1,
    borderColor: '#D6F1FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastActivePulse: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.orange,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  toastTextBox: {
    flex: 1,
    marginRight: 6,
  },
  toastHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  brandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandTagText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  brandDot: {
    color: theme.colors.muted,
    fontSize: 10,
  },
  toastTime: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  toastTitle: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  toastBody: {
    color: '#475569',
    fontSize: 12.5,
    lineHeight: 16.5,
    fontWeight: '400',
  },
  toastCloseBtn: {
    padding: 3,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  toastActionChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
