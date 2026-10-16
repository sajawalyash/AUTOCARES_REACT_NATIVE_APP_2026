import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AutoCaresLogo from '../../../components/autocares-logo';
import { StatusBadge } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { go } from '../../../lib/nav';
import { formatPKR } from '../../../lib/payments';
import { listCustomerRequests } from '../../../lib/requests';
import type { ServiceRequest } from '../../../lib/types';
import { FIXED_DIAGNOSIS_FEE } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

const shortcuts = [
  {
    href: '/(customer)/request',
    icon: 'construct-outline' as const,
    title: 'Request Help',
    desc: 'Instant roadside service',
    badge: 'Popular',
    color: theme.colors.primary,
  },
  {
    href: '/(customer)/(tabs)/mechanics',
    icon: 'map-outline' as const,
    title: 'Find Mechanics',
    desc: 'Live GPS & nearby list',
    color: theme.colors.primary,
  },
  {
    href: '/(customer)/vehicles',
    icon: 'car-sport-outline' as const,
    title: 'My Vehicles',
    desc: 'Garage & diagnostics',
    color: theme.colors.primary,
  },
  {
    href: '/(customer)/(tabs)/ai-help',
    icon: 'chatbubble-ellipses-outline' as const,
    title: 'AI Assistant',
    desc: 'Symptoms & OBD codes',
    badge: 'Smart',
    color: theme.colors.orange,
  },
  {
    href: '/(customer)/sos',
    icon: 'shield-checkmark-outline' as const,
    title: 'Emergency SOS',
    desc: 'Urgent priority dispatch',
    isSos: true,
    color: theme.colors.danger,
  },
  {
    href: '/(customer)/notifications',
    icon: 'notifications-outline' as const,
    title: 'Notifications',
    desc: 'Updates & alerts',
    color: theme.colors.primary,
  },
];

export default function CustomerHome() {
  const insets = useSafeAreaInsets();
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
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}>
        {/* Top Header Bar with AutoCares Logo & Notifications */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <AutoCaresLogo size="header" />
          </View>
          <Pressable
            onPress={() => router.push('/(customer)/notifications')}
            style={styles.bellButton}
            accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        {/* User Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.hello}>Hello, {profile?.full_name ?? 'Driver'} 👋</Text>
          <Text style={styles.greetingSub}>Ready to assist your journey across Pakistan</Text>
        </View>

        {/* Hero Card with Orange CTA */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>24/7 ROADSIDE DISPATCH</Text>
          </View>
          <Text style={styles.heroTitle}>Need Roadside Help?</Text>
          <Text style={styles.heroSub}>
            Find certified mechanics near you, request immediate help, and track live arrival on map.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={() => router.push('/(customer)/request')}>
            <Text style={styles.ctaText}>Request Assistance</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Active Requests */}
        {active.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Active Requests</Text>
              <View style={styles.activeCountBadge}>
                <Text style={styles.activeCountText}>{active.length} active</Text>
              </View>
            </View>
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
                  <View style={styles.activeTopRow}>
                    <StatusBadge status={req.status} />
                    <Text style={styles.activeTotal}>{formatPKR(total)}</Text>
                  </View>
                  <Text style={styles.activeProblem}>
                    {req.problem_type.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.activeSub}>
                    Diagnosis: {formatPKR(diag)} ({req.diagnosis_payment_status ?? 'pending'})
                    {rep != null
                      ? ` · Repair: ${formatPKR(rep)} (${req.repair_payment_status ?? 'pending'})`
                      : ''}
                  </Text>
                  <View style={styles.activeTrackLink}>
                    <Text style={styles.activeTrackText}>View Live Map & Tracking →</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>Quick Services</Text>
        <View style={styles.grid}>
          {shortcuts.map((item) => (
            <Link key={item.title} href={item.href as '/(customer)/request'} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  item.isSos && styles.sosCard,
                  pressed && styles.cardPressed,
                ]}>
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      item.isSos ? styles.sosIconCircle : { backgroundColor: theme.colors.primaryLight },
                    ]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  {item.badge && (
                    <View
                      style={[
                        styles.miniBadge,
                        item.badge === 'Smart'
                          ? { backgroundColor: theme.colors.yellowLight, borderColor: theme.colors.yellow }
                          : { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primarySubtle },
                      ]}>
                      <Text
                        style={[
                          styles.miniBadgeText,
                          item.badge === 'Smart'
                            ? { color: theme.colors.yellowText }
                            : { color: theme.colors.primaryDark },
                        ]}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    maxWidth: theme.layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandRow: {
    alignItems: 'flex-start',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.orange, // Orange notification accent
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  greetingBlock: {
    marginBottom: 16,
  },
  hello: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  greetingSub: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  hero: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.primarySubtle,
    padding: 20,
    marginBottom: 24,
    ...theme.shadows.cardElevated,
  },
  heroBadge: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.primary,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSub: {
    color: theme.colors.textSecondary,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
    fontSize: 14,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.orange, // Orange #FF9800 CTA
    borderRadius: theme.radius.md,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    ...theme.shadows.orangeButton,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.2,
  },
  activeCountBadge: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  activeCountText: {
    color: theme.colors.yellowText,
    fontSize: 11,
    fontWeight: '800',
  },
  activeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.cardElevated,
  },
  activeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeProblem: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  activeTotal: {
    fontWeight: '900',
    color: theme.colors.primaryDark,
    fontSize: 15,
  },
  activeSub: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  activeTrackLink: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  activeTrackText: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  card: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    minHeight: 128,
    justifyContent: 'space-between',
    ...theme.shadows.card,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadge: {
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sosCard: {
    backgroundColor: '#FFF7F7',
    borderColor: '#FECACA',
  },
  sosIconCircle: {
    backgroundColor: '#FEE2E2',
  },
  cardTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 14,
    marginTop: 8,
  },
  cardDesc: {
    color: theme.colors.muted,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
});
