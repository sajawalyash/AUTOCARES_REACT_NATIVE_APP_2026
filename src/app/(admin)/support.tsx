import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AdminSubscreenHeader from '@/components/admin-subscreen-header';
import { Card, EmptyState, ErrorText, LoadingState, Screen, StatusBadge } from '@/components/ui';
import { theme } from '@/constants/autocares-theme';
import { listAdminSupportTickets, recordAdminActivity, updateSupportTicketStatus } from '@/lib/admin';
import type { SupportTicket } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

const STATUS_FILTERS: { id: 'all' | TicketStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
];

export default function AdminSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | TicketStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await listAdminSupportTickets();
    setTickets(result.tickets);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSetStatus(ticket: SupportTicket, newStatus: TicketStatus) {
    setUpdatingId(ticket.id);
    const result = await updateSupportTicketStatus(ticket.id, newStatus);
    setUpdatingId(null);

    if (result.error) {
      Alert.alert('Could not update ticket', result.error);
      return;
    }

    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: newStatus } : t))
    );

    if (user) {
      recordAdminActivity({
        actor_id: user.id,
        action: `set ticket status to ${newStatus}`,
        entity_type: 'support_ticket',
        entity_id: ticket.id,
        details: { previous_status: ticket.status, new_status: newStatus },
      }).catch(() => {});
    }
  }

  const counts = useMemo(() => {
    const res = { all: tickets.length, open: 0, in_progress: 0, resolved: 0, closed: 0 };
    for (const t of tickets) {
      if (t.status === 'open') res.open++;
      else if (t.status === 'in_progress') res.in_progress++;
      else if (t.status === 'resolved') res.resolved++;
      else if (t.status === 'closed') res.closed++;
    }
    return res;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (selectedFilter === 'all') return tickets;
    return tickets.filter((t) => t.status === selectedFilter);
  }, [tickets, selectedFilter]);

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading support tickets…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AdminSubscreenHeader
        title="Complaints & support"
        subtitle="Manage user support requests and track each issue to resolution."
      />

      <View style={styles.filterBar}>
        {STATUS_FILTERS.map((f) => {
          const isSelected = selectedFilter === f.id;
          const count = counts[f.id];
          return (
            <Pressable
              key={f.id}
              onPress={() => setSelectedFilter(f.id)}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}>
              <Text style={[styles.filterLabel, isSelected && styles.filterLabelActive]}>
                {f.label}
              </Text>
              {count > 0 ? (
                <View style={[styles.filterBadge, isSelected && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, isSelected && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <ErrorText message={error} />

      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <EmptyState
            message={
              selectedFilter === 'all'
                ? 'No support tickets found.'
                : `No tickets with status "${selectedFilter.replace('_', ' ')}".`
            }
          />
        }
        renderItem={({ item }) => {
          const isBusy = updatingId === item.id;
          return (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.subjectText}>{item.subject}</Text>
                  <Text style={styles.authorText}>
                    {item.profiles?.full_name || 'Customer'}
                    {item.profiles?.phone ? ` · ${item.profiles.phone}` : ''}
                    {' · '}
                    {new Date(item.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{item.message}</Text>
              </View>

              <View style={styles.actionsBar}>
                <Text style={styles.actionPrompt}>Update Status:</Text>
                {isBusy ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 8 }} />
                ) : (
                  <View style={styles.actionButtonsRow}>
                    {item.status !== 'in_progress' && item.status !== 'resolved' && (
                      <Pressable
                        onPress={() => handleSetStatus(item, 'in_progress')}
                        style={styles.actionBtn}>
                        <Ionicons name="play-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.actionBtnText}>In Progress</Text>
                      </Pressable>
                    )}

                    {item.status !== 'resolved' && (
                      <Pressable
                        onPress={() => handleSetStatus(item, 'resolved')}
                        style={[styles.actionBtn, styles.actionBtnSuccess]}>
                        <Ionicons name="checkmark-outline" size={14} color="#15803D" />
                        <Text style={[styles.actionBtnText, { color: '#15803D' }]}>Resolve</Text>
                      </Pressable>
                    )}

                    {item.status !== 'closed' && (
                      <Pressable
                        onPress={() => handleSetStatus(item, 'closed')}
                        style={styles.actionBtn}>
                        <Ionicons name="lock-closed-outline" size={14} color={theme.colors.muted} />
                        <Text style={[styles.actionBtnText, { color: theme.colors.muted }]}>Close</Text>
                      </Pressable>
                    )}

                    {(item.status === 'resolved' || item.status === 'closed') && (
                      <Pressable
                        onPress={() => handleSetStatus(item, 'open')}
                        style={styles.actionBtn}>
                        <Ionicons name="reload-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.actionBtnText}>Reopen</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.text,
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  card: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  subjectText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.1,
  },
  authorText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  messageBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  messageText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexWrap: 'wrap',
    gap: 6,
  },
  actionPrompt: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  actionBtnSuccess: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
