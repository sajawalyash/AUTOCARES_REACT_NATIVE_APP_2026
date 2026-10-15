import { useCallback, useState } from 'react';
import { Alert, FlatList, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card, EmptyState, ErrorText, LoadingState, OutlineButton, Screen, Subtitle, Title } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { deleteAdminRating, listAdminRatings, recordAdminActivity } from '../../../lib/admin';
import { useAuth } from '../../../providers/auth-provider';
import type { Rating } from '../../../lib/types';

type AdminRating = Rating & { profiles?: { full_name: string | null } };

export default function AdminReviews() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminRatings();
    setRatings(result.ratings);
    setError(result.error);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function moderate(rating: AdminRating) {
    Alert.alert('Remove review?', 'This permanently deletes the review.', [
      { text: 'Keep review', style: 'cancel' },
      {
        text: 'Delete review',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteAdminRating(rating.id);
          if (result.error) {
            Alert.alert('Could not remove review', result.error);
            return;
          }
          if (user) {
            const log = await recordAdminActivity({
              actor_id: user.id,
              action: 'deleted',
              entity_type: 'rating',
              entity_id: rating.id,
              details: { stars: rating.stars },
            });
            if (log.error) Alert.alert('Review deleted, but activity log failed', log.error);
          }
          load();
        },
      },
    ]);
  }

  if (loading) return <Screen><LoadingState /></Screen>;

  return (
    <Screen>
      <Title>Review moderation</Title>
      <Subtitle>Review submitted ratings and remove inappropriate content.</Subtitle>
      <ErrorText message={error} />
      {ratings.length === 0 ? <EmptyState message="No reviews found." /> : (
        <FlatList
          data={ratings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                {item.stars}/5 · {item.profiles?.full_name ?? 'Customer'}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 5 }}>
                {new Date(item.created_at).toLocaleString()} · Request {item.request_id}
              </Text>
              <Text style={{ color: theme.colors.text, marginTop: 8 }}>{item.comment || 'No written comment.'}</Text>
              <OutlineButton label="Remove review" onPress={() => moderate(item)} />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
