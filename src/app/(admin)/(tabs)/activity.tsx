import { useCallback, useState } from 'react';
import { FlatList, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card, EmptyState, ErrorText, LoadingState, Screen, Subtitle, Title } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { listAdminActivity } from '../../../lib/admin';
import type { AdminActivityLog } from '../../../lib/types';

export default function AdminActivity() {
  const [activities, setActivities] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminActivity();
    setActivities(result.activities);
    setError(result.error);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen><LoadingState /></Screen>;

  return (
    <Screen>
      <Title>Administrator activity</Title>
      <Subtitle>Recent recorded admin actions (latest 200).</Subtitle>
      <ErrorText message={error} />
      {activities.length === 0 ? <EmptyState message="No activity has been recorded." /> : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                {item.action} · {item.entity_type}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 5 }}>
                {new Date(item.created_at).toLocaleString()}
                {item.entity_id ? ` · ${item.entity_id}` : ''}
              </Text>
              {Object.keys(item.details).length > 0 ? (
                <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                  {JSON.stringify(item.details)}
                </Text>
              ) : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
