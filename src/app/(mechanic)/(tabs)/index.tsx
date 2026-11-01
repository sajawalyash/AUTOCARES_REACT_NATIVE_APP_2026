import { Avatar } from '../../../components/avatar';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import AutoCaresLogo from '../../../components/autocares-logo';
import { Card, LoadingState, OutlineButton, Screen, StatusBadge, Subtitle, Title } from '../../../components/ui';
import WhatsAppContactCard from '../../../components/whatsapp-contact-card';
import AdminSupportCard from '../../../components/admin-support-card';
import { customAlert } from '../../../components/custom-alert';
import { acceptRequest, rejectRequest, listPendingRequestsForMechanic } from '../../../lib/requests';
import { distanceKm, etaMinutesFromDistance } from '../../../lib/geo';
import { getCurrentCoords } from '../../../lib/location';
import { normalizePhoneNumber } from '../../../lib/whatsapp';
import { theme } from '../../../constants/autocares-theme';
import { getMechanicProfile } from '../../../lib/mechanics';
import { listMechanicJobs, listPendingRequests } from '../../../lib/requests';
import type { MechanicProfile, ServiceRequest } from '../../../lib/types';
import { openWhatsAppSupport } from '../../../lib/whatsapp';
import { useAuth } from '../../../providers/auth-provider';
import { useNotifications } from '../../../providers/notification-provider';

export default function MechanicHome() {
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [mechanic, setMechanic] = useState<MechanicProfile | null>(null);
  const [pending, setPending] = useState<ServiceRequest[]>([]);
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [mp, pend, mine] = await Promise.all([
      getMechanicProfile(user.id),
      listPendingRequestsForMechanic(user.id),
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

  const activeJobs = useMemo(() => {
    return jobs.filter((j) => ['accepted', 'on_the_way', 'en_route', 'arrived', 'in_progress'].includes(j.status));
  }, [jobs]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todays = jobs.filter((j) => new Date(j.created_at).toDateString() === today);
    const accepted = jobs.filter((j) =>
      ['accepted', 'on_the_way', 'en_route', 'arrived', 'in_progress'].includes(j.status)
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
      <Screen safeBottom={false}>
        <LoadingState label="Loading mechanic overview…" />
      </Screen>
    );
  }

  
  async function handleAcceptPending(item: ServiceRequest) {
    if (!user) return;
    if (mechanic?.verification_status !== 'approved') {
      customAlert.warning('Not Verified', 'An admin must approve your mechanic profile before you can accept requests.');
      return;
    }
    if (!mechanic.is_available) {
      customAlert.warning('Currently Unavailable', 'Please toggle your availability to Available in your Profile to accept jobs.');
      return;
    }

    let eta = 20;
    const loc = await getCurrentCoords();
    if (loc.coords && item.customer_lat != null && item.customer_lng != null) {
      eta = etaMinutesFromDistance(
        distanceKm(loc.coords.latitude, loc.coords.longitude, item.customer_lat, item.customer_lng)
      );
    }

    customAlert.confirm(
      'Accept Assistance Request',
      `Accept this roadside assistance job?\n\nThe customer will be notified immediately and provided with your live contact details.`,
      async () => {
        const { request, error: acceptErr } = await acceptRequest(item.id, user.id, eta);
        if (acceptErr || !request) {
          customAlert.error('Could Not Accept', acceptErr ?? 'This request is no longer available.');
          await load();
          return;
        }
        customAlert.success(
          'Request Accepted!',
          'You have accepted this assistance request. Proceeding to job tracking.',
          () => router.push(`/(mechanic)/job/${request.id}`)
        );
      },
      undefined,
      'Accept Request',
      'Cancel'
    );
  }

  async function handleRejectPending(id: string) {
    customAlert.confirm(
      'Reject Assistance Request',
      'Are you sure you want to reject this request? The customer will be informed so they can find another nearby technician.',
      async () => {
        const { error: rejectErr } = await rejectRequest(id);
        if (rejectErr) {
          customAlert.error('Reject Failed', rejectErr);
        } else {
          customAlert.info('Request Rejected', 'The customer has been notified to choose another mechanic.');
        }
        await load();
      },
      undefined,
      'Reject Request',
      'Cancel',
      true
    );
  }

  const isApproved = mechanic?.verification_status === 'approved';

  return (
    <Screen safeBottom={false}>
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
          <View style={styles.mechanicHeaderActions}>
            <Pressable
              onPress={() => openWhatsAppSupport('mechanic')}
              style={({ pressed }) => [styles.headerWhatsappBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="AutoCares Dispatch WhatsApp Helpline">
              <FontAwesome name="whatsapp" size={22} color="#25D366" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(mechanic)/notifications')}
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

        {/* Header Block with Avatar */}
        <View style={styles.headerRow}>
          <Avatar
            url={profile?.avatar_url}
            name={mechanic?.workshop_name || profile?.full_name}
            size={48}
            onPress={() => router.push('/(mechanic)/(tabs)/profile')}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Title>{mechanic?.workshop_name || profile?.full_name || 'Mechanic Console'}</Title>
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

        {/* 24/7 Dispatch WhatsApp Helpline Banner */}
        <AdminSupportCard role="mechanic" style={{ marginBottom: 16 }} />

        
        {/* Incoming Customer Assistance Requests */}
        {pending.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionHeader}>Incoming Customer Requests ({pending.length})</Text>
              <Pressable onPress={() => router.push('/(mechanic)/(tabs)/requests')}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>View All →</Text>
              </Pressable>
            </View>

            {pending.slice(0, 3).map((item) => {
              const customerPhone = item.profiles?.phone ? normalizePhoneNumber(item.profiles.phone).formatted : null;
              const displayPhone = customerPhone
                ? customerPhone.startsWith('92')
                  ? `0${customerPhone.slice(2, 5)} ${customerPhone.slice(5)}`
                  : customerPhone
                : 'Phone not provided';
              const vehicleLabelStr = item.vehicles
                ? `${item.vehicles.vehicle_type ? `[${item.vehicles.vehicle_type}] ` : ''}${item.vehicles.make} ${item.vehicles.model}`
                : 'Vehicle details pending';

              return (
                <Card key={item.id} style={styles.pendingDashboardCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                        {item.problem_type.replace('_', ' ').toUpperCase()}
                        {item.is_sos ? ' · SOS' : ''}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        🕒 {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={styles.dashboardPendingBadge}>
                      <Text style={styles.dashboardPendingBadgeText}>NEW REQUEST</Text>
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 }} />

                  <Text style={{ fontSize: 13, color: '#1E293B', marginBottom: 2 }}>
                    👤 <Text style={{ fontWeight: '700' }}>{item.profiles?.full_name ?? 'Customer'}</Text> · 📞 {displayPhone}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#475569', marginBottom: 2 }}>
                    🚗 {vehicleLabelStr}
                  </Text>
                  {item.description ? (
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }} numberOfLines={2}>
                      💬 {item.description}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 12, color: '#0284C7', fontWeight: '600', marginBottom: 8 }}>
                    📍 {item.customer_lat != null ? `Location: ${item.customer_lat.toFixed(4)}, ${item.customer_lng?.toFixed(4)}` : 'Location shared'} · Diagnosis: Rs. 300
                  </Text>

                  {/* Accept / Reject Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      style={({ pressed }) => [styles.dashAcceptBtn, pressed && styles.btnPressed]}
                      onPress={() => handleAcceptPending(item)}>
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.dashAcceptBtnText}>Accept Request</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.dashRejectBtn, pressed && styles.btnPressed]}
                      onPress={() => handleRejectPending(item.id)}>
                      <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                      <Text style={styles.dashRejectBtnText}>Reject</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Active Assigned Jobs with WhatsApp Contact */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionHeader}>Active Assigned Jobs ({activeJobs.length})</Text>
          {activeJobs.length > 0 ? (
            activeJobs.map((activeJob) => (
              <Card key={activeJob.id} style={{ marginBottom: 12 }}>
                <Pressable onPress={() => router.push(`/(mechanic)/job/${activeJob.id}`)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '800', color: theme.colors.text, fontSize: 15 }}>
                      {activeJob.problem_type.replace('_', ' ').toUpperCase()}
                    </Text>
                    <StatusBadge status={activeJob.status} />
                  </View>
                  <Text style={{ color: theme.colors.muted, marginTop: 4, fontSize: 12 }}>
                    Customer: {activeJob.profiles?.full_name ?? 'Driver'} · Tap to manage job →
                  </Text>
                </Pressable>
                <WhatsAppContactCard
                  compact
                  role="mechanic"
                  requestId={activeJob.id}
                  phone={activeJob.profiles?.phone}
                  participantName={activeJob.profiles?.full_name}
                  status={activeJob.status}
                />
              </Card>
            ))
          ) : (
            <View style={styles.emptyJobsBanner}>
              <View style={styles.emptyJobsRow}>
                <Ionicons name="briefcase-outline" size={18} color={theme.colors.muted} />
                <Text style={styles.emptyJobsTitle}>No Active Jobs In Progress</Text>
              </View>
              <Text style={styles.emptyJobsText}>
                When you accept roadside assistance requests, the customer&apos;s direct WhatsApp and phone contact cards will appear here.
              </Text>
            </View>
          )}
        </View>

        {/* Action Shortcuts */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.actionGroup}>
          <Pressable
            style={({ pressed }) => [styles.whatsappActionBtn, pressed && styles.cardPressed]}
            onPress={() => openWhatsAppSupport('mechanic')}>
            <View style={styles.whatsappActionIconBox}>
              <FontAwesome name="whatsapp" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.whatsappActionTitle}>WhatsApp Dispatch Support</Text>
              <Text style={styles.whatsappActionSub}>Contact 24/7 control room for live job assistance</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#25D366" />
          </Pressable>

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
            label={unreadCount > 0 ? `Job Notifications (${unreadCount} new)` : 'Job Notifications'}
            onPress={() => router.push('/(mechanic)/notifications')}
          />
        </View>
      </ScrollView>

      {/* Floating 24/7 Dispatch WhatsApp Button (FAB) */}
      <Pressable
        onPress={() => openWhatsAppSupport('mechanic')}
        style={({ pressed }) => [styles.whatsappFab, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="AutoCares Dispatch WhatsApp Helpline">
        <FontAwesome name="whatsapp" size={28} color="#FFFFFF" />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 36,
  },
  topLogoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mechanicHeaderActions: {
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
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
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
  dispatchBanner: {
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
  dispatchBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dispatchBannerIconBox: {
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
  dispatchBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  dispatchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dispatchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: -0.2,
  },
  dispatchLiveBadge: {
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
  dispatchLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  dispatchLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  dispatchSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    fontWeight: '500',
  },
  dispatchActionBox: {
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
  dispatchActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  emptyJobsBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 8,
  },
  emptyJobsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  emptyJobsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyJobsText: {
    fontSize: 12,
    color: theme.colors.muted,
    lineHeight: 17,
  },
  whatsappActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    ...theme.shadows.card,
  },
  whatsappActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  whatsappActionSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  whatsappFab: {
    position: 'absolute',
    bottom: 24,
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

  pendingDashboardCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBF5',
    marginBottom: 10,
  },
  dashboardPendingBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  dashboardPendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C',
  },
  dashAcceptBtn: {
    flex: 1.2,
    height: 40,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dashAcceptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dashRejectBtn: {
    flex: 0.8,
    height: 40,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dashRejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },

});
