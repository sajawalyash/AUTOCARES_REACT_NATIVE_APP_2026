import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  ErrorText,
  LoadingState,
  OutlineButton,
  Screen,
  StatusBadge,
  Subtitle,
  Title,
} from '../../../components/ui';
import MapView, { Marker } from '../../../components/roadside-map';
import WhatsAppContactCard from '../../../components/whatsapp-contact-card';
import { theme } from '../../../constants/autocares-theme';
import { useProblemLabels } from '../../../hooks/use-problem-labels';
import { confirmServicePayment, formatPKR } from '../../../lib/payments';
import {
  cancelRequest,
  getLatestMechanicLocation,
  getRequest,
} from '../../../lib/requests';
import type { MechanicLocation, ServiceRequest } from '../../../lib/types';
import { FIXED_DIAGNOSIS_FEE } from '../../../lib/types';

export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { problemLabels, categoryError } = useProblemLabels();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [mechLoc, setMechLoc] = useState<MechanicLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const { request: req, error: reqError } = await getRequest(id);
    if (reqError || !req) {
      setError(reqError ?? 'Request not found');
      setLoading(false);
      return;
    }
    setRequest(req);
    const { location } = await getLatestMechanicLocation(id);
    setMechLoc(location);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  const [confirmingPayment, setConfirmingPayment] = useState(false);

  async function handleConfirmPayment(type: 'diagnosis_fee' | 'repair_charge') {
    if (!id) return;
    setConfirmingPayment(true);
    const { success, error: payError, message } = await confirmServicePayment(id, type);
    setConfirmingPayment(false);
    if (!success || payError) {
      Alert.alert('Payment Confirmation', payError ?? 'Could not confirm payment.');
    } else {
      Alert.alert('Payment Recorded', message ?? 'Payment confirmed successfully.');
      load();
    }
  }

  async function onCancel() {
    if (!id) return;
    const { error: cancelError } = await cancelRequest(id);
    if (cancelError) setError(cancelError);
    else load();
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading live tracking…" />
      </Screen>
    );
  }

  if (!request) {
    return (
      <Screen>
        <ErrorText message={error ?? 'Request not found.'} />
      </Screen>
    );
  }

  const customerCoord =
    request.customer_lat != null && request.customer_lng != null
      ? { latitude: request.customer_lat, longitude: request.customer_lng }
      : null;

  const mechanicCoord = mechLoc
    ? { latitude: mechLoc.latitude, longitude: mechLoc.longitude }
    : null;

  const diagnosisFee = request.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE;
  const repairCharges =
    request.repair_charges != null
      ? Number(request.repair_charges)
      : request.final_cost != null
      ? Number(request.final_cost)
      : null;
  const totalAmount = diagnosisFee + (repairCharges ?? 0);
  const diagnosisPaid = request.diagnosis_payment_status === 'paid';
  const repairPaid = request.repair_payment_status === 'paid';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.topStatusRow}>
          <View style={{ flex: 1 }}>
            <Title>Live Tracking</Title>
            <Subtitle>{problemLabels[request.problem_type]}</Subtitle>
          </View>
          <StatusBadge status={request.status} />
        </View>

        <ErrorText message={error} />
        <ErrorText message={categoryError} />

        {/* Assigned Mechanic WhatsApp & Call Contact Card */}
        {['accepted', 'en_route', 'in_progress'].includes(request.status) && (
          <WhatsAppContactCard
            role="customer"
            requestId={request.id}
            phone={request.mechanic?.phone}
            participantName={request.mechanic?.full_name}
            status={request.status}
          />
        )}

        {/* ETA & Mechanic Status Box */}
        <Card style={styles.etaCard}>
          <View style={styles.etaRow}>
            <View style={styles.etaIconCircle}>
              <Text style={styles.etaIcon}>⏱</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              <Text style={styles.etaValue}>
                {request.estimated_arrival_minutes != null
                  ? `~${request.estimated_arrival_minutes} minutes`
                  : 'Pending mechanic confirmation'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.coordText}>
            Mechanic GPS:{' '}
            {mechanicCoord
              ? `${mechanicCoord.latitude.toFixed(4)}, ${mechanicCoord.longitude.toFixed(4)}`
              : 'Awaiting mechanic location broadcast'}
          </Text>
        </Card>

        {/* Map View */}
        {customerCoord ? (
          <MapView
            style={styles.map}
            initialRegion={{
              ...customerCoord,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}>
            <Marker coordinate={customerCoord} title="Your Location" pinColor={theme.colors.blue} />
            {mechanicCoord && (
              <Marker coordinate={mechanicCoord} title="Mechanic Location" pinColor={theme.colors.orange} />
            )}
          </MapView>
        ) : (
          <View style={styles.mapFallback}>
            <Text style={styles.mapFallbackText}>
              Live roadside tracking active. Coordinates updated in real-time.
            </Text>
          </View>
        )}

        {/* Billing & Payment Breakdown Card */}
        <Card style={styles.billingCard}>
          <View style={styles.billingHeader}>
            <Text style={styles.billingTitle}>Billing & Cash Receipts</Text>
            <View style={styles.cashBadge}>
              <Text style={styles.cashBadgeText}>CASH PAYMENT</Text>
            </View>
          </View>
          <Text style={styles.billingSub}>Pay in cash directly to the technician</Text>

          {/* Row 1: Fixed Diagnosis Fee */}
          <View style={styles.billRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.billItem}>Standard Diagnosis Fee</Text>
              <Text style={styles.billHint}>Includes arrival and diagnostic inspection</Text>
            </View>
            <View style={styles.amountBadgeBox}>
              <Text style={styles.billAmount}>{formatPKR(diagnosisFee)}</Text>
              <View
                style={[
                  styles.statusPill,
                  diagnosisPaid ? styles.paidPill : styles.pendingPill,
                ]}>
                <Text style={[styles.statusPillText, diagnosisPaid ? styles.paidPillText : styles.pendingPillText]}>
                  {diagnosisPaid ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>

          {!diagnosisPaid && request.mechanic_id && (
            <OutlineButton
              label={confirmingPayment ? 'Confirming…' : 'Confirm Cash Paid (Rs. 300)'}
              onPress={() => handleConfirmPayment('diagnosis_fee')}
              disabled={confirmingPayment}
            />
          )}

          <View style={styles.divider} />

          {/* Row 2: Repair Charges */}
          <View style={styles.billRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.billItem}>Mechanic Repair Charges</Text>
              <Text style={styles.billHint}>
                {repairCharges != null
                  ? 'Assessed by mechanic on-site'
                  : 'Pending vehicle inspection'}
              </Text>
            </View>
            <View style={styles.amountBadgeBox}>
              <Text style={styles.billAmount}>
                {repairCharges != null ? formatPKR(repairCharges) : '—'}
              </Text>
              {repairCharges != null && (
                <View
                  style={[
                    styles.statusPill,
                    repairPaid ? styles.paidPill : styles.pendingPill,
                  ]}>
                  <Text style={[styles.statusPillText, repairPaid ? styles.paidPillText : styles.pendingPillText]}>
                    {repairPaid ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {repairCharges != null && !repairPaid && request.mechanic_id && (
            <OutlineButton
              label={
                confirmingPayment
                  ? 'Confirming…'
                  : `Confirm Cash Paid (${formatPKR(repairCharges)})`
              }
              onPress={() => handleConfirmPayment('repair_charge')}
              disabled={confirmingPayment}
            />
          )}

          <View style={styles.divider} />

          {/* Grand Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalAmount}>{formatPKR(totalAmount)}</Text>
          </View>
        </Card>

        {['pending', 'accepted', 'en_route'].includes(request.status) && (
          <OutlineButton
            label="Cancel Request"
            color={theme.colors.danger}
            onPress={onCancel}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 36,
  },
  topStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  etaCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  etaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.yellowLight,
    borderWidth: 1,
    borderColor: theme.colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaIcon: {
    fontSize: 20,
  },
  etaLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  etaValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 2,
  },
  coordText: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  map: {
    height: 240,
    borderRadius: theme.radius.lg,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mapFallback: {
    height: 90,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginVertical: 12,
  },
  mapFallbackText: {
    color: theme.colors.primaryDark,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
  },
  billingCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginVertical: 12,
    ...theme.shadows.cardElevated,
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  cashBadge: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cashBadgeText: {
    color: theme.colors.yellowText,
    fontSize: 10,
    fontWeight: '800',
  },
  billingSub: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
    marginBottom: 14,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billItem: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  billHint: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  amountBadgeBox: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    marginTop: 4,
  },
  paidPill: {
    backgroundColor: theme.colors.successLight,
  },
  paidPillText: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  pendingPill: {
    backgroundColor: theme.colors.yellowLight,
  },
  pendingPillText: {
    color: theme.colors.yellowText,
    fontSize: 11,
    fontWeight: '800',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.primaryDark,
  },
});
