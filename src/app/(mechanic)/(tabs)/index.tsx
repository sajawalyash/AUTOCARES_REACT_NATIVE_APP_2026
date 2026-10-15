import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, LoadingState, OutlineButton, Screen, Subtitle, Title } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { getMechanicProfile } from '../../../lib/mechanics';
import { listMechanicJobs, listPendingRequests } from '../../../lib/requests';
import type { MechanicProfile, ServiceRequest } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

export default function MechanicHome() {
  const { user, profile } = useAuth();
  const [mechanic, setMechanic] = useState<MechanicProfile | null>(null);
  const [pending, setPending] = useState<ServiceRequest[]>([]);
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [mp, pend, mine] = await Promise.all([
      getMechanicProfile(user.id),
      listPendingRequests(),
      listMechanicJobs(user.id),
    ]);
    setMechanic(mp.mechanic);
    setPending(pend.requests);
    setJobs(mine.requests);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todays = jobs.filter((j) => new Date(j.created_at).toDateString() === today);
    const accepted = jobs.filter((j) =>
      ['accepted', 'en_route', 'in_progress'].includes(j.status)
    );
    const completed = jobs.filter((j) => j.status === 'completed');
    const earnings = completed.reduce(
      (sum, j) =>
        sum + (j.diagnosis_fee ?? 300) + (Number(j.repair_charges ?? j.final_cost) || 0),
      0
    );
    return {
      today: todays.length,
      pending: pending.length,
      accepted: accepted.length,
      completed: completed.length,
      rating: Number(mechanic?.average_rating ?? 0).toFixed(1),
      earnings,
    };
  }, [jobs, pending, mechanic]);

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }>
        <Title>Mechanic overview</Title>
        <Subtitle>
          {profile?.full_name ?? 'Technician'} ·{' '}
          {mechanic?.verification_status === 'approved' ? 'Verified' : 'Pending verification'}
        </Subtitle>

        <View style={styles.grid}>
          {[
            ['Today', String(stats.today)],
            ['Pending', String(stats.pending)],
            ['Active', String(stats.accepted)],
            ['Done', String(stats.completed)],
            ['Rating', stats.rating],
            ['Earn Rs', stats.earnings.toLocaleString()],
          ].map(([label, value]) => (
            <Card key={label} style={styles.stat}>
              <Text style={styles.value}>{value}</Text>
              <Text style={styles.label}>{label}</Text>
            </Card>
          ))}
        </View>

        <OutlineButton label="Incoming requests" onPress={() => router.push('/(mechanic)/(tabs)/requests')} />
        <OutlineButton label="My jobs" onPress={() => router.push('/(mechanic)/(tabs)/jobs')} />
        <OutlineButton label="Reviews" onPress={() => router.push('/(mechanic)/reviews')} />
        <OutlineButton label="Notifications" onPress={() => router.push('/(mechanic)/notifications')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '31%', alignItems: 'center', marginBottom: 4 },
  value: { color: theme.colors.text, fontWeight: '800', fontSize: 18 },
  label: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
});
