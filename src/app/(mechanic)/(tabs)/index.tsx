import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import AutoCaresLogo from '../../../components/autocares-logo';
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
        <LoadingState label="Loading mechanic overview…" />
      </Screen>
    );
  }

  const isApproved = mechanic?.verification_status === 'approved';

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }>
        {/* AutoCares Brand Header */}
        <View style={styles.topLogoRow}>
          <AutoCaresLogo size="header" />
        </View>

        {/* Header Block */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Title>Mechanic Console</Title>
            <Subtitle>{profile?.full_name ?? 'Certified Technician'}</Subtitle>
          </View>
          <View style={[styles.statusBadge, isApproved ? styles.approvedBadge : styles.pendingBadge]}>
            <Text style={[styles.statusBadgeText, isApproved ? styles.approvedText : styles.pendingText]}>
              {isApproved ? 'VERIFIED' : 'PENDING'}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.grid}>
          {[
            { label: 'Today', value: String(stats.today), color: theme.colors.text },
            { label: 'Pending', value: String(stats.pending), color: theme.colors.orange },
            { label: 'Active', value: String(stats.accepted), color: theme.colors.primary },
            { label: 'Completed', value: String(stats.completed), color: theme.colors.success },
            { label: 'Rating', value: `★ ${stats.rating}`, color: theme.colors.yellowText },
            { label: 'Earned (PKR)', value: `Rs. ${stats.earnings.toLocaleString()}`, color: theme.colors.primaryDark },
          ].map((item) => (
            <Card key={item.label} style={styles.stat}>
              <Text style={[styles.value, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.label}>{item.label}</Text>
            </Card>
          ))}
        </View>

        {/* Action Shortcuts */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.actionGroup}>
          <OutlineButton
            label={`Incoming Requests (${stats.pending})`}
            onPress={() => router.push('/(mechanic)/(tabs)/requests')}
          />
          <OutlineButton
            label={`My Jobs (${stats.accepted} active)`}
            onPress={() => router.push('/(mechanic)/(tabs)/jobs')}
          />
          <OutlineButton
            label="Earnings & Receipts"
            onPress={() => router.push('/(mechanic)/(tabs)/earnings')}
          />
          <OutlineButton
            label="Customer Reviews"
            onPress={() => router.push('/(mechanic)/reviews')}
          />
          <OutlineButton
            label="Job Notifications"
            onPress={() => router.push('/(mechanic)/notifications')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 36,
  },
  topLogoRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  approvedBadge: {
    backgroundColor: theme.colors.successLight,
    borderColor: '#BBF7D0',
  },
  approvedText: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
  },
  pendingText: {
    color: theme.colors.yellowText,
    fontSize: 11,
    fontWeight: '800',
  },
  statusBadgeText: {
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  stat: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    minHeight: 80,
  },
  value: {
    fontWeight: '900',
    fontSize: 17,
    textAlign: 'center',
  },
  label: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  actionGroup: {
    gap: 4,
  },
});
