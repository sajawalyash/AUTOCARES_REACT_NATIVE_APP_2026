import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import AutoCaresLogo from '../../../components/autocares-logo';
import { theme } from '../../../constants/autocares-theme';
import { go } from '../../../lib/nav';
import { formatPKR } from '../../../lib/payments';
import { listCustomerRequests } from '../../../lib/requests';
import type { ServiceRequest } from '../../../lib/types';
import { FIXED_DIAGNOSIS_FEE, STATUS_LABELS } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

const shortcuts = [
  { href: '/(customer)/request', icon: 'construct-outline' as const, title: 'Request help', desc: 'Roadside assistance' },
  { href: '/(customer)/(tabs)/mechanics', icon: 'map-outline' as const, title: 'Find mechanics', desc: 'Nearby on map' },
  { href: '/(customer)/vehicles', icon: 'car-sport-outline' as const, title: 'My vehicles', desc: 'Garage & diagnostics' },
  { href: '/(customer)/(tabs)/ai-help', icon: 'chatbubble-ellipses-outline' as const, title: 'AI assistant', desc: 'Symptoms & OBD codes' },
  { href: '/(customer)/sos', icon: 'shield-checkmark-outline' as const, title: 'Emergency SOS', desc: 'Urgent roadside help' },
  { href: '/(customer)/notifications', icon: 'notifications-outline' as const, title: 'Notifications', desc: 'Updates & alerts' },
];

export default function CustomerHome() {
  const { profile, user } = useAuth();
  const [active, setActive] = useState<ServiceRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { requests } = await listCustomerRequests(user.id);
    setActive(
      requests.filter((r) =>
        ['pending', 'accepted', 'en_route', 'in_progress'].includes(r.status)
      )
    );
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View style={styles.brandBlock}>
          <AutoCaresLogo style={styles.brandLogo} />
          <Text style={styles.hello}>Hello, {profile?.full_name ?? 'Driver'}</Text>
        </View>
        <Pressable onPress={() => router.push('/(customer)/notifications')} style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Need roadside help?</Text>
        <Text style={styles.heroSub}>Find mechanics, request assistance, and track arrival live.</Text>
        <Pressable style={styles.cta} onPress={() => router.push('/(customer)/request')}>
          <Text style={styles.ctaText}>Request roadside assistance</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>

      {active.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active requests</Text>
          {active.map((req) => {
            const diag = req.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE;
            const rep =
              req.repair_charges != null
                ? Number(req.repair_charges)
                : req.final_cost != null
                ? Number(req.final_cost)
                : null;
            const total = diag + (rep ?? 0);
            return (
              <Pressable
                key={req.id}
                style={styles.activeCard}
                onPress={() => go(`/(customer)/tracking/${req.id}`)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.activeTitle}>{STATUS_LABELS[req.status]}</Text>
                  <Text style={{ fontWeight: '800', color: theme.colors.blue, fontSize: 13 }}>
                    {formatPKR(total)}
                  </Text>
                </View>
                <Text style={styles.activeSub}>
                  {req.problem_type.replace('_', ' ')} · Diagnosis: {formatPKR(diag)} ({req.diagnosis_payment_status ?? 'pending'})
                  {rep != null
                    ? ` · Repair: ${formatPKR(rep)} (${req.repair_payment_status ?? 'pending'})`
                    : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.grid}>
        {shortcuts.map((item) => (
          <Link key={item.title} href={item.href as '/(customer)/request'} asChild>
            <Pressable
              style={StyleSheet.flatten([styles.card, item.title.includes('SOS') && styles.sos])}>
              <Ionicons
                name={item.icon}
                size={24}
                color={item.title.includes('SOS') ? theme.colors.danger : theme.colors.text}
              />
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brandBlock: { flex: 1, marginRight: 12, alignItems: 'flex-start' },
  brandLogo: { width: 96, height: 55, alignSelf: 'flex-start', marginBottom: 6 },
  hello: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: '#EDF9FD',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 18,
    marginBottom: 20,
  },
  heroTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  heroSub: { color: theme.colors.muted, marginTop: 6, marginBottom: 14, lineHeight: 20 },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.orange,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: theme.colors.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  section: { marginBottom: 16 },
  sectionTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 18, marginBottom: 10 },
  activeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeTitle: { color: theme.colors.primary, fontWeight: '800' },
  activeSub: { color: theme.colors.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    minHeight: 120,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sos: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  cardTitle: { color: theme.colors.text, fontWeight: '800', marginTop: 10 },
  cardDesc: { color: theme.colors.muted, marginTop: 4, fontSize: 12, lineHeight: 16 },
});
