import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AdminSubscreenHeader from '@/components/admin-subscreen-header';
import { Card, EmptyState, ErrorText, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/autocares-theme';
import { listAdminActivity } from '@/lib/admin';
import type { AdminActivityLog } from '@/lib/types';

const ENTITY_FILTERS = ['all', 'service_category', 'support_ticket', 'rating', 'announcement'] as const;

export default function AdminActivity() {
  const [activities, setActivities] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    const result = await listAdminActivity(200);
    setActivities(result.activities);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      if (selectedEntity !== 'all' && item.entity_type !== selectedEntity) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesAction = item.action.toLowerCase().includes(query);
        const matchesEntity = item.entity_type.toLowerCase().includes(query);
        const matchesId = item.entity_id?.toLowerCase().includes(query);
        const matchesDetails = JSON.stringify(item.details).toLowerCase().includes(query);
        return matchesAction || matchesEntity || matchesId || matchesDetails;
      }
      return true;
    });
  }, [activities, selectedEntity, searchQuery]);

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading audit activity logs…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AdminSubscreenHeader
        title="Activity audit logs"
        subtitle="Review the chronological audit log of administrator actions and modifications."
      />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={theme.colors.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by action, ID, or details…"
          placeholderTextColor={theme.colors.muted}
          style={styles.searchInput}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {ENTITY_FILTERS.map((filter) => {
          const isSelected = selectedEntity === filter;
          const label = filter === 'all' ? 'All' : filter.replace('_', ' ');
          return (
            <Pressable
              key={filter}
              onPress={() => setSelectedEntity(filter)}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorText message={error} />

      <FlatList
        data={filteredActivities}
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
              searchQuery || selectedEntity !== 'all'
                ? 'No activity matches your filters.'
                : 'No administrator activity has been logged yet.'
            }
          />
        }
        renderItem={({ item }) => {
          const hasDetails = Object.keys(item.details).length > 0;
          return (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeBox}>
                  <Text style={styles.badgeText}>{item.entity_type.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.timestamp}>
                  {new Date(item.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <Text style={styles.actionText}>{item.action}</Text>

              {item.entity_id ? (
                <Text style={styles.entityIdText}>Target ID: {item.entity_id}</Text>
              ) : null}

              {hasDetails ? (
                <View style={styles.detailsBox}>
                  {Object.entries(item.details).map(([key, value]) => (
                    <View key={key} style={styles.detailRow}>
                      <Text style={styles.detailKey}>{key}:</Text>
                      <Text style={styles.detailVal}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeBox: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.muted,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  entityIdText: {
    fontSize: 11,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  detailsBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    padding: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailKey: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  detailVal: {
    fontSize: 11,
    color: theme.colors.text,
    flex: 1,
  },
});
