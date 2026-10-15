import { useCallback, useState } from 'react';
import { Alert, FlatList, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card, EmptyState, ErrorText, LoadingState, OutlineButton, Screen, Subtitle, Title } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { listAdminSupportTickets, recordAdminActivity, updateSupportTicketStatus } from '../../../lib/admin';
import type { SupportTicket } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

const statuses = ['open', 'in_progress', 'resolved', 'closed'] as const;
type TicketStatus = (typeof statuses)[number];

export default function AdminSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminSupportTickets();
    setTickets(result.tickets);
    setError(result.error);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function setStatus(ticket: SupportTicket, status: TicketStatus) {
    const result = await updateSupportTicketStatus(ticket.id, status);
    if (result.error) {
      Alert.alert('Could not update ticket', result.error);
      return;
    }
    if (user) {
      const log = await recordAdminActivity({
        actor_id: user.id,
        action: `set status to ${status}`,
        entity_type: 'support_ticket',
        entity_id: ticket.id,
      });
      if (log.error) Alert.alert('Ticket updated, but activity log failed', log.error);
    }
    load();
  }

  if (loading) return <Screen><LoadingState /></Screen>;

  return (
    <Screen>
      <Title>Complaints & support</Title>
      <Subtitle>Review requests and track each ticket to resolution.</Subtitle>
      <ErrorText message={error} />
      {tickets.length === 0 ? <EmptyState message="No support tickets found." /> : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{item.subject}</Text>
              <Text style={{ color: theme.colors.muted, marginTop: 5 }}>
                {item.profiles?.full_name ?? 'User'} · {item.status} · {new Date(item.created_at).toLocaleString()}
              </Text>
              <Text style={{ color: theme.colors.text, marginTop: 8 }}>{item.message}</Text>
              {statuses.filter((status) => status !== item.status).map((status) => (
                <OutlineButton
                  key={status}
                  label={`Mark ${status.replace('_', ' ')}`}
                  onPress={() => setStatus(item, status)}
                />
              ))}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
