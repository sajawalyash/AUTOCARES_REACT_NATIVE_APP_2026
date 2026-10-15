import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  ErrorText,
  LoadingState,
  OutlineButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import MapView, { Marker } from '../../../components/roadside-map';
import { theme } from '../../../constants/autocares-theme';
import { useProblemLabels } from '../../../hooks/use-problem-labels';
import { confirmServicePayment, formatPKR } from '../../../lib/payments';
import {
  cancelRequest,
  getLatestMechanicLocation,
  getRequest,
} from '../../../lib/requests';
import type { MechanicLocation, ServiceRequest } from '../../../lib/types';
import { FIXED_DIAGNOSIS_FEE, STATUS_LABELS } from '../../../lib/types';

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
        <LoadingState label="Loading tracking…" />
      </Screen>
    );
  }

  if (!request) {
    return (
      <Screen>
        <ErrorText message={error ?? 'Not found'} />
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <Title>Live tracking</Title>
        <Subtitle>
          {problemLabels[request.problem_type]} · {STATUS_LABELS[request.status]}
        </Subtitle>
        <ErrorText message={error} />
        <ErrorText message={categoryError} />

        <Card>
          <Text style={styles.line}>
            ETA:{' '}
            {request.estimated_arrival_minutes != null
              ? `~${request.estimated_arrival_minutes} min`
              : 'Pending assignment'}
          </Text>
          <Text style={styles.line}>
            Mechanic location:{' '}
            {mechanicCoord
              ? `${mechanicCoord.latitude.toFixed(4)}, ${mechanicCoord.longitude.toFixed(4)}`
              : 'Waiting for mechanic GPS share'}
          </Text>
        </Card>

        {customerCoord && Platform.OS !== 'web' ? (
          <MapView
            style={styles.map}
            initialRegion={{
              ...customerCoord,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}>
            <Marker coordinate={customerCoord} title="You" pinColor={theme.colors.blue} />
            {mechanicCoord && (
              <Marker coordinate={mechanicCoord} title="Mechanic" pinColor={theme.colors.primaryDark} />
            )}
          </MapView>
        ) : (
          <View style={styles.mapFallback}>
            <Text style={styles.line}>Map unavailable on this platform.</Text>
          </View>
        )}

        <Card style={styles.billingCard}>
          <Text style={styles.billingTitle}>Billing & Payment Breakdown</Text>
          <Text style={styles.billingSub}>Payment mode: Direct cash to mechanic</Text>

          <View style={styles.billRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.billItem}>Fixed Diagnosis Fee</Text>
              <Text style={styles.billHint}>Standard fee applied to all requests</Text>
            </View>
            <View style={styles.amountBadge}>
              <Text style={styles.billAmount}>{formatPKR(diagnosisFee)}</Text>
              <Text style={[styles.statusBadge, diagnosisPaid ? styles.paidBadge : styles.pendingBadge]}>
                {diagnosisPaid ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>

          {!diagnosisPaid && request.mechanic_id && (
            <OutlineButton
              label={confirmingPayment ? 'Confirming…' : 'Confirm Cash Paid (Rs. 300)'}
              onPress={() => handleConfirmPayment('diagnosis_fee')}
              disabled={confirmingPayment}
            />
          )}

          <View style={[styles.billRow, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.billItem}>Mechanic Repair Charges</Text>
              <Text style={styles.billHint}>
                {repairCharges != null
                  ? 'Entered by mechanic upon vehicle inspection/fix'
                  : 'Pending mechanic assessment'}
              </Text>
            </View>
            <View style={styles.amountBadge}>
              <Text style={styles.billAmount}>
                {repairCharges != null ? formatPKR(repairCharges) : 'Pending'}
              </Text>
              {repairCharges != null && (
                <Text style={[styles.statusBadge, repairPaid ? styles.paidBadge : styles.pendingBadge]}>
                  {repairPaid ? 'Paid' : 'Pending'}
                </Text>
              )}
            </View>
          </View>

          {repairCharges != null && !repairPaid && request.mechanic_id && (
            <OutlineButton
              label={confirmingPayment ? 'Confirming…' : `Confirm Cash Paid (${formatPKR(repairCharges)})`}
              onPress={() => handleConfirmPayment('repair_charge')}
              disabled={confirmingPayment}
            />
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalAmount}>{formatPKR(totalAmount)}</Text>
          </View>
        </Card>

        {['pending', 'accepted', 'en_route'].includes(request.status) && (
          <OutlineButton label="Cancel request" onPress={onCancel} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { color: theme.colors.muted, marginBottom: 4 },
  map: { height: 260, borderRadius: 16, marginVertical: 12 },
  mapFallback: {
    height: 120,
    borderRadius: 16,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  billingCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  billingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  billingSub: {
    fontSize: 12,
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
  amountBadge: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    overflow: 'hidden',
  },
  paidBadge: {
    backgroundColor: theme.colors.successLight,
    color: theme.colors.success,
  },
  pendingBadge: {
    backgroundColor: theme.colors.yellowLight,
    color: '#854D0E',
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
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.blue,
  },
});
