import { Avatar } from '../../../components/avatar';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AutoCaresLogo from '../../../components/autocares-logo';
import { StatusBadge } from '../../../components/ui';
import WhatsAppContactCard from '../../../components/whatsapp-contact-card';
import { supabase } from '../../../lib/supabase';
import { theme } from '../../../constants/autocares-theme';
import { go } from '../../../lib/nav';
import { formatPKR } from '../../../lib/payments';
import { listCustomerRequests } from '../../../lib/requests';
import type { ServiceRequest } from '../../../lib/types';
import { FIXED_DIAGNOSIS_FEE } from '../../../lib/types';
import { getShortRequestRef, openWhatsAppSupport } from '../../../lib/whatsapp';
import { useAuth } from '../../../providers/auth-provider';
import { useNotifications } from '../../../providers/notification-provider';

type ShortcutItem = {
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  badge?: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg?: string;
  badgeText?: string;
  badgeBorder?: string;
  isSos?: boolean;
};

const shortcuts: ShortcutItem[] = [
  {
    href: '/(customer)/request',
    icon: 'construct',
    title: 'Request Help',
    desc: 'Instant roadside repair',
    badge: 'POPULAR',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    badgeBg: '#E0F2FE',
    badgeText: '#0284C7',
    badgeBorder: '#BAE6FD',
  },
  {
    href: '/(customer)/(tabs)/mechanics',
    icon: 'navigate',
    title: 'Find Mechanics',
    desc: 'Live GPS & nearby shops',
    color: '#0D9488',
    bgColor: '#CCFBF1',
    borderColor: '#99F6E4',
    badgeBg: '#CCFBF1',
    badgeText: '#0F766E',
    badgeBorder: '#99F6E4',
  },
  {
    href: '/(customer)/(tabs)/ai-help',
    icon: 'sparkles',
    title: 'AI Assistant',
    desc: 'Symptom & engine triage',
    badge: 'SMART',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#D97706',
    badgeBorder: '#FDE68A',
  },
  {
    href: '/(customer)/obd-ii',
    icon: 'hardware-chip',
    title: 'OBD-II Scanner',
    desc: 'Bluetooth ECU diagnostic',
    badge: 'LIVE',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    borderColor: '#DDD6FE',
    badgeBg: '#EDE9FE',
    badgeText: '#7C3AED',
    badgeBorder: '#DDD6FE',
  },
  {
    href: '/(customer)/vehicles',
    icon: 'car-sport',
    title: 'My Vehicles',
    desc: 'Garage & maintenance',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    badgeBg: '#EFF6FF',
    badgeText: '#2563EB',
    badgeBorder: '#BFDBFE',
  },
  {
    href: '/(customer)/sos',
    icon: 'shield-checkmark',
    title: 'Emergency SOS',
    desc: 'Urgent priority dispatch',
    badge: '24/7 SOS',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
    badgeBg: '#FEE2E2',
    badgeText: '#DC2626',
    badgeBorder: '#FECACA',
    isSos: true,
  },
];

export default function CustomerHome() {
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const { unreadCount } = useNotifications();
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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`customer_requests_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

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
          <View style={styles.headerRightActions}>
            <Pressable
              onPress={() => openWhatsAppSupport('customer')}
              style={({ pressed }) => [styles.headerWhatsappBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="AutoCares 24/7 WhatsApp Support">
              <FontAwesome name="whatsapp" size={21} color="#25D366" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(customer)/notifications')}
              style={styles.bellButton}
              accessibilityLabel={`Notifications (${unreadCount} unread)`}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* User Greeting & Avatar Row */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingBlock}>
            <Text style={styles.hello}>Hello, {profile?.full_name ?? 'Driver'} 👋</Text>
            <Text style={styles.greetingSub}>Ready to assist your journey across Pakistan</Text>
          </View>
          <Avatar
            url={profile?.avatar_url}
            name={profile?.full_name}
            size={48}
            onPress={() => router.push('/(customer)/(tabs)/profile')}
          />
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

        {/* 24/7 WhatsApp Roadside Helpline Banner */}
        <Pressable
          style={({ pressed }) => [styles.whatsappHelplineBanner, pressed && styles.cardPressed]}
          onPress={() => openWhatsAppSupport('customer')}
          accessibilityRole="button"
          accessibilityLabel="AutoCares 24/7 WhatsApp Roadside Helpline">
          <View style={styles.whatsappHelplineLeft}>
            <View style={styles.whatsappHelplineIconBox}>
              <FontAwesome name="whatsapp" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.whatsappHelplineContent}>
              <View style={styles.whatsappHelplineTitleRow}>
                <Text style={styles.whatsappHelplineTitle}>24/7 WhatsApp Helpline</Text>
                <View style={styles.whatsappLiveBadge}>
                  <View style={styles.whatsappLiveDot} />
                  <Text style={styles.whatsappLiveText}>ONLINE</Text>
                </View>
              </View>
              <Text style={styles.whatsappHelplineSub}>
                Instant roadside breakdown support & live mechanic dispatch
              </Text>
            </View>
          </View>
          <View style={styles.whatsappHelplineAction}>
            <Text style={styles.whatsappChatActionText}>Chat</Text>
            <Ionicons name="chevron-forward" size={16} color="#25D366" />
          </View>
        </Pressable>

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
              const isAssigned =
                ['accepted', 'en_route', 'in_progress'].includes(req.status) &&
                Boolean(req.mechanic_id);

              return (
                <View key={req.id} style={styles.activeCard}>
                  <Pressable onPress={() => go(`/(customer)/tracking/${req.id}`)}>
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

                  {isAssigned ? (
                    <WhatsAppContactCard
                      compact
                      role="customer"
                      requestId={req.id}
                      phone={req.mechanic?.phone}
                      participantName={req.mechanic?.full_name}
                      status={req.status}
                    />
                  ) : (
                    <View style={styles.pendingWhatsappBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingWhatsappTitle}>Matching nearby mechanics...</Text>
                        <Text style={styles.pendingWhatsappSub}>Need priority dispatch assistance?</Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          openWhatsAppSupport(
                            'customer',
                            `Assistance request ${getShortRequestRef(req.id)}`
                          )
                        }
                        style={({ pressed }) => [
                          styles.pendingWhatsappBtn,
                          pressed && styles.btnPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Contact AutoCares on WhatsApp">
                        <FontAwesome name="whatsapp" size={15} color="#FFFFFF" />
                        <Text style={styles.pendingWhatsappBtnText}>WhatsApp</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Services Section */}
        <View style={styles.servicesHeader}>
          <Text style={styles.sectionTitle}>Quick Services</Text>
          <Text style={styles.sectionSubtitle}>Roadside repair, live diagnostics & garage</Text>
        </View>

        <View style={styles.grid}>
          {shortcuts.map((item) => (
            <Link key={item.title} href={item.href as any} asChild>
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
                      {
                        backgroundColor: item.bgColor,
                        borderColor: item.borderColor,
                      },
                    ]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  {item.badge ? (
                    <View
                      style={[
                        styles.miniBadge,
                        {
                          backgroundColor: item.badgeBg,
                          borderColor: item.badgeBorder,
                        },
                      ]}>
                      <Text style={[styles.miniBadgeText, { color: item.badgeText }]}>
                        {item.badge}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.badgeSpacer} />
                  )}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text
                      style={[styles.cardTitle, item.isSos && styles.sosTitle]}
                      numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={[styles.cardActionCircle, item.isSos && styles.sosActionCircle]}>
                      <Ionicons
                        name="arrow-forward"
                        size={11}
                        color={item.isSos ? '#DC2626' : theme.colors.muted}
                      />
                    </View>
                  </View>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.desc}
                  </Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>

        {/* Quick Helper Access Chips */}
        <View style={styles.quickFooterRow}>
          <Pressable
            onPress={() => openWhatsAppSupport('customer')}
            style={({ pressed }) => [styles.quickActionBtn, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="WhatsApp Support">
            <View style={[styles.quickActionIconBox, { backgroundColor: '#DCFCE7' }]}>
              <FontAwesome name="whatsapp" size={16} color="#16A34A" />
            </View>
            <Text style={styles.quickActionLabel} numberOfLines={1}>WhatsApp</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(customer)/support')}
            style={({ pressed }) => [styles.quickActionBtn, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="24/7 Support">
            <View style={[styles.quickActionIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="headset-outline" size={15} color="#D97706" />
            </View>
            <Text style={styles.quickActionLabel} numberOfLines={1}>Helpline</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(customer)/notifications')}
            style={({ pressed }) => [styles.quickActionBtn, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="Notifications">
            <View style={[styles.quickActionIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="notifications-outline" size={15} color="#0284C7" />
            </View>
            <Text style={styles.quickActionLabel} numberOfLines={1}>Alerts</Text>
            {unreadCount > 0 && <View style={styles.quickActionDot} />}
          </Pressable>

          <Pressable
            onPress={() => router.push('/(customer)/(tabs)/history')}
            style={({ pressed }) => [styles.quickActionBtn, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="Service History">
            <View style={[styles.quickActionIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="time-outline" size={15} color="#475569" />
            </View>
            <Text style={styles.quickActionLabel} numberOfLines={1}>History</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Floating 24/7 WhatsApp Button (FAB) */}
      <Pressable
        onPress={() => openWhatsAppSupport('customer')}
        style={({ pressed }) => [
          styles.whatsappFab,
          { bottom: Math.max(insets.bottom, 16) + 16 },
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="AutoCares 24/7 WhatsApp Helpline">
        <FontAwesome name="whatsapp" size={28} color="#FFFFFF" />
      </Pressable>
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
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingBlock: {
    flex: 1,
    marginRight: 12,
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
  servicesHeader: {
    marginTop: 10,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 3,
    fontWeight: '500',
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: 12,
  },
  card: {
    width: '48.2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    minHeight: 148,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2.5,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  sosCard: {
    backgroundColor: '#FFFBFB',
    borderColor: '#FECACA',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    minHeight: 46,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadge: {
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  miniBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeSpacer: {
    width: 20,
    height: 20,
  },
  cardBody: {
    justifyContent: 'flex-end',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  cardTitle: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 14.5,
    letterSpacing: -0.2,
  },
  sosTitle: {
    color: '#DC2626',
  },
  cardActionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosActionCircle: {
    backgroundColor: '#FEE2E2',
  },
  cardDesc: {
    color: theme.colors.muted,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  quickFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
    marginBottom: 6,
  },
  quickActionBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 6,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  quickActionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.1,
  },
  quickActionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.orange,
    position: 'absolute',
    top: 7,
    right: 7,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerWhatsappBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  whatsappHelplineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    ...theme.shadows.card,
  },
  whatsappHelplineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  whatsappHelplineIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  whatsappHelplineContent: {
    flex: 1,
    marginLeft: 12,
  },
  whatsappHelplineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whatsappHelplineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: -0.2,
  },
  whatsappLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  whatsappLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  whatsappLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  whatsappHelplineSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    fontWeight: '500',
  },
  whatsappHelplineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 2,
  },
  whatsappChatActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  pendingWhatsappBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pendingWhatsappTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  pendingWhatsappSub: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
  pendingWhatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  pendingWhatsappBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  whatsappFab: {
    position: 'absolute',
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
