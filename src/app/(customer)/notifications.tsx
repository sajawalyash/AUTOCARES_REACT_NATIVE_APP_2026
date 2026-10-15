import { useCallback, useState } from 'react';
import { FlatList, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Card,
  EmptyState,
  LoadingState,
  Screen,
  Subtitle,
  Title,
} from '../../components/ui';
import { theme } from '../../constants/autocares-theme';
import {
  listNotifications,
  markNotificationRead,
} from '../../lib/notifications';
import type { AppNotification } from '../../lib/types';
import { useAuth } from '../../providers/auth-provider';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { notifications } = await listNotifications(user.id);
    setItems(notifications);
    setLoading(false);
    notifications.filter((n) => !n.is_read).forEach((n) => markNotificationRead(n.id));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Notifications</Title>
      <Subtitle>In-app updates about your requests.</Subtitle>
      {items.length === 0 ? (
        <EmptyState message="No notifications yet." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontWeight: '800', color: theme.colors.text }}>{item.title}</Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>{item.body}</Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
