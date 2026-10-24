import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState, LoadingState, Screen, Subtitle, Title } from '../../components/ui';
import { theme } from '../../constants/autocares-theme';
import type { AppNotification } from '../../lib/types';
import { useNotifications } from '../../providers/notification-provider';

function formatRelativeTime(dateString: string): string {
  try {
    const now = Date.now();
    const date = new Date(dateString).getTime();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateString).toLocaleDateString();
  } catch {
    return '';
  }
}

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (isLoading && notifications.length === 0) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Title>Notifications</Title>
          <Subtitle>Realtime updates about roadside requests</Subtitle>
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={markAllAsRead}
            style={({ pressed }) => [styles.markAllBtn, pressed && styles.btnPressed]}>
            <Ionicons name="checkmark-done" size={16} color={theme.colors.primaryDark} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {notifications.length === 0 ? (
        <EmptyState message="No notifications yet. You're all caught up!" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: AppNotification }) => (
            <Pressable
              onPress={() => {
                if (!item.is_read) {
                  markAsRead(item.id);
                }
              }}
              style={({ pressed }) => [
                styles.itemCard,
                !item.is_read && styles.itemCardUnread,
                pressed && styles.cardPressed,
              ]}>
              <View
                style={[
                  styles.iconBox,
                  !item.is_read ? styles.iconBoxUnread : styles.iconBoxRead,
                ]}>
                <Ionicons
                  name={!item.is_read ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color={!item.is_read ? theme.colors.orange : theme.colors.primary}
                />
              </View>
              <View style={styles.textBox}>
                <View style={styles.itemTopRow}>
                  <Text
                    style={[
                      styles.itemTitle,
                      !item.is_read && styles.itemTitleUnread,
                    ]}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemTime}>
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
                <Text style={styles.itemBody}>{item.body}</Text>
              </View>
              {!item.is_read && <View style={styles.unreadDot} />}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primarySubtle,
    marginTop: 4,
  },
  markAllText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.8,
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  itemCardUnread: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FED7AA',
    borderWidth: 1.5,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxUnread: {
    backgroundColor: theme.colors.orangeLight,
  },
  iconBoxRead: {
    backgroundColor: theme.colors.primaryLight,
  },
  textBox: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 14.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  itemTitleUnread: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  itemTime: {
    color: theme.colors.muted,
    fontSize: 11.5,
    fontWeight: '500',
  },
  itemBody: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.orange,
    marginLeft: 8,
  },
});
