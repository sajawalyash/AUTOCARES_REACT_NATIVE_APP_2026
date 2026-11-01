import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import AdminSupportCard from '../../../components/admin-support-card';
import { customAlert } from '../../../components/custom-alert';
import {
  EmptyState,
  ErrorText,
  LoadingState,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { useProblemLabels } from '../../../hooks/use-problem-labels';
import { distanceKm, etaMinutesFromDistance } from '../../../lib/geo';
import { getCurrentCoords } from '../../../lib/location';
import { getMechanicProfile } from '../../../lib/mechanics';
import { go } from '../../../lib/nav';
import { acceptRequest, listPendingRequestsForMechanic, rejectRequest } from '../../../lib/requests';
import type { ServiceRequest } from '../../../lib/types';
import { vehicleLabel } from '../../../lib/types';
import { normalizePhoneNumber } from '../../../lib/whatsapp';
import { useAuth } from '../../../providers/auth-provider';

export default function IncomingRequests() {
  const { user } = useAuth();
  const { problemLabels, categoryError } = useProblemLabels();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [mechanicCoords, setMechanicCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [requestsResult, locResult] = await Promise.all([
      listPendingRequestsForMechanic(user.id),
      getCurrentCoords(),
    ]);

    setError(requestsResult.error);
    setRequests(requestsResult.requests);
    if (locResult.coords) {
      setMechanicCoords({
        latitude: locResult.coords.latitude,
        longitude: locResult.coords.longitude,
      });
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onAccept(item: ServiceRequest) {
    if (!user) return;
    const { mechanic } = await getMechanicProfile(user.id);
    if (!mechanic || mechanic.verification_status !== 'approved') {
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
        distanceKm(
          loc.coords.latitude,
          loc.coords.longitude,
          item.customer_lat,
          item.customer_lng
        )
      );
    }

    customAlert.confirm(
      'Accept Assistance Request',
      `Accept this roadside assistance job?\n\nThe customer will be notified immediately and provided with your live contact details.`,
      async () => {
        const { request, error: acceptError } = await acceptRequest(item.id, user.id, eta);
        if (acceptError || !request) {
          customAlert.error('Could Not Accept', acceptError ?? 'This request is no longer available.');
          await load();
          return;
        }
        customAlert.success(
          'Request Accepted!',
          'You have accepted this assistance request. Proceeding to job tracking.',
          () => go(`/(mechanic)/job/${request.id}`)
        );
      },
      undefined,
      'Accept Request',
      'Cancel'
    );
  }

  async function onReject(id: string) {
    customAlert.confirm(
      'Reject Assistance Request',
      'Are you sure you want to reject this request? The customer will be informed so they can find another nearby technician.',
      async () => {
        const { error: rejectError } = await rejectRequest(id);
        if (rejectError) {
          customAlert.error('Reject Failed', rejectError);
        } else {
          customAlert.info('Request Rejected', 'The customer has been notified to choose another mechanic.');
        }
        load();
      },
      undefined,
      'Reject Request',
      'Cancel',
      true
    );
  }

  if (loading) {
    return (
      <Screen safeBottom={false}>
        <LoadingState label="Loading incoming customer requests…" />
      </Screen>
    );
  }

  return (
    <Screen safeBottom={false}>
      <Title>Incoming Requests</Title>
      <Subtitle>Review problem, vehicle, location, then accept or reject.</Subtitle>
      <ErrorText message={error} />
      <ErrorText message={categoryError} />

      <AdminSupportCard role="mechanic" style={{ marginBottom: 16 }} />

      {requests.length === 0 ? (
        <EmptyState message="No pending requests right now. When customers nearby request assistance, they will appear here live." />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const customerPhone = item.profiles?.phone ? normalizePhoneNumber(item.profiles.phone).formatted : null;
            const displayPhone = customerPhone
              ? customerPhone.startsWith('92')
                ? `0${customerPhone.slice(2, 5)} ${customerPhone.slice(5)}`
                : customerPhone
              : 'Phone not provided';

            const vehicleStr = item.vehicles ? vehicleLabel(item.vehicles) : 'Vehicle not specified';
            const vehicleTypeStr = item.vehicles?.vehicle_type || 'Vehicle';

            let distanceStr = 'Location shared';
            if (mechanicCoords && item.customer_lat != null && item.customer_lng != null) {
              const km = distanceKm(
                mechanicCoords.latitude,
                mechanicCoords.longitude,
                item.customer_lat,
                item.customer_lng
              );
              distanceStr = `${km.toFixed(1)} km away (~${etaMinutesFromDistance(km)} mins)`;
            } else if (item.customer_lat != null) {
              distanceStr = `GPS: ${item.customer_lat.toFixed(4)}, ${item.customer_lng?.toFixed(4)}`;
            }

            const requestDate = new Date(item.created_at);
            const dateStr = requestDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
            const timeStr = requestDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View style={styles.requestCard}>
                {/* Header Row: Problem Type & Time */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.problemTitle}>
                      {problemLabels[item.problem_type] || item.problem_type.replace('_', ' ').toUpperCase()}
                      {item.is_sos ? ' · 🚨 SOS' : ''}
                    </Text>
                    <Text style={styles.dateTimeText}>
                      🕒 {dateStr} at {timeStr}
                    </Text>
                  </View>
                  <View style={item.is_sos ? styles.sosBadge : styles.newBadge}>
                    <Text style={item.is_sos ? styles.sosBadgeText : styles.newBadgeText}>
                      {item.is_sos ? 'URGENT SOS' : 'NEW REQUEST'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Details Section */}
                <View style={styles.detailsBlock}>
                  {/* Customer Name & Phone */}
                  <View style={styles.infoRow}>
                    <Ionicons name="person" size={15} color={theme.colors.primaryDark} />
                    <Text style={styles.infoText}>
                      Customer: <Text style={styles.bold}>{item.profiles?.full_name ?? 'Driver'}</Text>
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={15} color="#15803D" />
                    <Text style={styles.infoText}>
                      Phone: <Text style={styles.bold}>{displayPhone}</Text>
                    </Text>
                  </View>

                  {/* Vehicle Type & Details */}
                  <View style={styles.infoRow}>
                    <Ionicons name="car-sport" size={15} color={theme.colors.primary} />
                    <Text style={styles.infoText}>
                      Vehicle: <Text style={styles.bold}>[{vehicleTypeStr}]</Text> {vehicleStr}
                    </Text>
                  </View>

                  {/* Customer Location & Distance */}
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={15} color={theme.colors.orange} />
                    <Text style={styles.infoText}>
                      Distance: <Text style={styles.bold}>{distanceStr}</Text>
                    </Text>
                  </View>

                  {/* Diagnosis Fee Note */}
                  <View style={styles.feeHighlightRow}>
                    <Ionicons name="cash" size={15} color="#0284C7" />
                    <Text style={styles.feeText}>
                      Diagnosis Fee: <Text style={styles.bold}>Rs. 300 PKR</Text> (Cash upon arrival)
                    </Text>
                  </View>

                  {/* Problem Description */}
                  {item.description ? (
                    <View style={styles.descriptionBox}>
                      <Text style={styles.descriptionLabel}>Problem Description:</Text>
                      <Text style={styles.descriptionText}>{item.description}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Action Buttons: Green Accept, Red Reject */}
                <View style={styles.actionsRow}>
                  <Pressable
                    style={({ pressed }) => [styles.acceptBtn, pressed && styles.btnPressed]}
                    onPress={() => onAccept(item)}
                    accessibilityRole="button"
                    accessibilityLabel="Accept Request">
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.acceptBtnText}>Accept Request</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.rejectBtn, pressed && styles.btnPressed]}
                    onPress={() => onReject(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Reject Request">
                    <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  problemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateTimeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  newBadge: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  sosBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  sosBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  detailsBlock: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  feeHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 8,
    marginTop: 2,
  },
  feeText: {
    fontSize: 12.5,
    color: '#0369A1',
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 4,
  },
  descriptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 12.5,
    color: '#1E293B',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A', // Green Accept button
    borderRadius: 14,
    height: 46,
    gap: 8,
    ...theme.shadows.card,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2', // Red Reject button
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    height: 46,
    gap: 6,
  },
  rejectBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
