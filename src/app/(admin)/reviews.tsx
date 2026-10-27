import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AdminSubscreenHeader from '@/components/admin-subscreen-header';
import { Card, EmptyState, ErrorText, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/autocares-theme';
import { deleteAdminRating, listAdminRatings, recordAdminActivity, type AdminRating } from '@/lib/admin';
import { useAuth } from '@/providers/auth-provider';

function StarRating({ stars }: { stars: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Ionicons
          key={index}
          name={index <= stars ? 'star' : 'star-outline'}
          size={16}
          color={index <= stars ? '#F59E0B' : theme.colors.muted}
        />
      ))}
      <Text style={styles.starText}>{stars}/5</Text>
    </View>
  );
}

export default function AdminReviews() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await listAdminRatings();
    setRatings(result.ratings);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function moderate(rating: AdminRating) {
    Alert.alert(
      'Remove review?',
      'This will permanently delete the review and recalculate the mechanic\'s rating average.',
      [
        { text: 'Keep review', style: 'cancel' },
        {
          text: 'Delete review',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(rating.id);
            const result = await deleteAdminRating(rating.id);
            setDeletingId(null);

            if (result.error) {
              Alert.alert('Could not remove review', result.error);
              return;
            }

            setRatings((prev) => prev.filter((r) => r.id !== rating.id));

            if (user) {
              recordAdminActivity({
                actor_id: user.id,
                action: 'deleted rating',
                entity_type: 'rating',
                entity_id: rating.id,
                details: {
                  stars: rating.stars,
                  customer: rating.customer?.full_name || rating.customer_id,
                  mechanic: rating.mechanic?.full_name || rating.mechanic_id,
                },
              }).catch(() => {});
            }

            Alert.alert('Review deleted', 'The review has been removed.');
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading user reviews…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AdminSubscreenHeader
        title="Review moderation"
        subtitle="Inspect customer ratings and moderate offensive or fraudulent feedback."
      />

      <ErrorText message={error} />

      <FlatList
        data={ratings}
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
        ListEmptyComponent={<EmptyState message="No reviews found in the platform." />}
        renderItem={({ item }) => {
          const isDeleting = deletingId === item.id;
          const customerName = item.customer?.full_name || item.profiles?.full_name || 'Customer';
          const mechanicName = item.mechanic?.full_name || 'Assigned Mechanic';

          return (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <StarRating stars={item.stars} />
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.partiesRow}>
                <View style={styles.partyItem}>
                  <Text style={styles.partyLabel}>Customer</Text>
                  <Text style={styles.partyName}>{customerName}</Text>
                </View>

                <Ionicons name="arrow-forward" size={14} color={theme.colors.muted} style={{ marginTop: 10 }} />

                <View style={styles.partyItem}>
                  <Text style={styles.partyLabel}>Mechanic</Text>
                  <Text style={styles.partyName}>{mechanicName}</Text>
                </View>
              </View>

              <View style={styles.commentBox}>
                <Text style={[styles.commentText, !item.comment && styles.emptyComment]}>
                  {item.comment ? `"${item.comment}"` : 'No written feedback provided.'}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.requestIdText}>Request ID: {item.request_id.slice(0, 8)}…</Text>
                <Pressable
                  onPress={() => moderate(item)}
                  disabled={isDeleting}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && { opacity: 0.7 },
                    isDeleting && { opacity: 0.5 },
                  ]}>
                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>Remove review</Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.muted,
  },
  partiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 8,
    borderRadius: theme.radius.sm,
    marginBottom: 10,
  },
  partyItem: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 1,
  },
  commentBox: {
    marginBottom: 10,
  },
  commentText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  emptyComment: {
    color: theme.colors.muted,
    fontStyle: 'normal',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  requestIdText: {
    fontSize: 11,
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
