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
import { getMechanicProfile, listMechanicRatings } from '../../lib/mechanics';
import type { MechanicProfile, Rating } from '../../lib/types';
import { useAuth } from '../../providers/auth-provider';

export default function ReviewsScreen() {
  const { user } = useAuth();
  const [mechanic, setMechanic] = useState<MechanicProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!user) return;
        setLoading(true);
        const [mp, list] = await Promise.all([
          getMechanicProfile(user.id),
          listMechanicRatings(user.id),
        ]);
        setMechanic(mp.mechanic);
        setRatings(list.ratings);
        setLoading(false);
      })();
    }, [user])
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
      <Title>Reviews & performance</Title>
      <Subtitle>Customer feedback and stats.</Subtitle>
      <Card>
        <Text style={{ fontWeight: '800', color: theme.colors.text, fontSize: 22 }}>
          ★ {Number(mechanic?.average_rating ?? 0).toFixed(1)}
        </Text>
        <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
          {mechanic?.rating_count ?? 0} reviews · {mechanic?.completed_jobs ?? 0} completed jobs
        </Text>
      </Card>
      {ratings.length === 0 ? (
        <EmptyState message="No reviews yet." />
      ) : (
        <FlatList
          data={ratings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontWeight: '800', color: theme.colors.text }}>
                {'★'.repeat(item.stars)}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                {item.comment || 'No comment'}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
