import { Ionicons } from '@expo/vector-icons';
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
    const { notifications: list } = await listNotifications(user.id);
    setNotifications(list);
    setIsLoading(false);
  }, [user]);

  // Initial fetch and Realtime Subscription
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      return;
    }

    listNotifications(user.id).then(({ notifications: list }) => {
      if (isMounted) {
        setNotifications(list);
      }
    });

    // Set up Supabase Realtime Channel
    const channelName = `realtime:notifications:${user.id}`;
    const channel = supabase
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
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);

          // Trigger vibration feedback
          if (Platform.OS !== 'web') {
            try {
              Vibration.vibrate(250);
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

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [showToast, user]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead(user.id);
  }, [user]);

  const handleToastPress = useCallback(() => {
    dismissToast();
    if (role === 'mechanic') {
      router.push('/(mechanic)/notifications');
    } else {
      router.push('/(customer)/notifications');
    }
  }, [dismissToast, role]);

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
