import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  ErrorText,
  Field,
  Label,
  LoadingState,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { useProblemLabels } from '../../../hooks/use-problem-labels';
import { getCurrentCoords } from '../../../lib/location';
import {
  confirmServicePayment,
  formatPKR,
  submitRepairCharges,
} from '../../../lib/payments';
import {
  getRequest,
  updateRequestStatus,
  upsertMechanicLocation,
} from '../../../lib/requests';
import type { RequestStatus, ServiceRequest } from '../../../lib/types';
import { FIXED_DIAGNOSIS_FEE, STATUS_LABELS, vehicleLabel } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { problemLabels, categoryError } = useProblemLabels();
  const [job, setJob] = useState<ServiceRequest | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [work, setWork] = useState('');
  const [cost, setCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingCharges, setSubmittingCharges] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [sharing, setSharing] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const { request, error: err } = await getRequest(id);
    setError(err);
    setJob(request);
    if (request) {
      setDiagnosis(request.diagnosis ?? '');
      setWork(request.work_performed ?? '');
      const existingCharges = request.repair_charges ?? request.final_cost;
      setCost(existingCharges != null ? String(existingCharges) : '');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  async function shareLocationOnce() {
    if (!user || !id) return;
    const loc = await getCurrentCoords();
    if (!loc.coords) {
      Alert.alert('Location', loc.error ?? 'Permission required');
      return;
    }
    await upsertMechanicLocation({
      request_id: id,
      mechanic_id: user.id,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
  }

  function startSharing() {
    setSharing(true);
    shareLocationOnce();
    timer.current = setInterval(shareLocationOnce, 15000);
    Alert.alert(
      'Location sharing on',
      'Your live location is shared with the customer while this job is active. They consented by submitting a roadside request.'
    );
  }

  function stopSharing() {
    setSharing(false);
    if (timer.current) clearInterval(timer.current);
  }

  async function handleSubmitCharges() {
    if (!id) return;
    const numericCost = Number(cost);
    if (!cost.trim() || Number.isNaN(numericCost) || numericCost < 0) {
      Alert.alert('Invalid amount', 'Please enter a valid repair charge amount (PKR).');
      return;
    }
    setSubmittingCharges(true);
    const { request, error: submitError } = await submitRepairCharges(id, numericCost, {
      diagnosis: diagnosis.trim() || undefined,
      work_performed: work.trim() || undefined,
    });
    setSubmittingCharges(false);
    if (submitError) {
      Alert.alert('Submission failed', submitError);
    } else {
      Alert.alert(
        'Charges submitted',
        `Repair charges of ${formatPKR(numericCost)} submitted. Total customer bill is ${formatPKR(
          numericCost + (request?.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE)
        )}.`
      );
      load();
    }
  }

  async function handleConfirmPayment(type: 'diagnosis_fee' | 'repair_charge') {
    if (!id) return;
    setConfirmingPayment(true);
    const { success, error: payError, message } = await confirmServicePayment(id, type);
    setConfirmingPayment(false);
    if (!success || payError) {
      Alert.alert('Confirmation failed', payError ?? 'Could not confirm payment.');
    } else {
      Alert.alert('Payment recorded', message ?? 'Cash payment confirmed.');
      load();
    }
  }

  async function setStatus(status: RequestStatus) {
    if (!id) return;
    const numericCost = cost.trim() ? Number(cost) : null;
    const { error: updateError } = await updateRequestStatus(id, status, {
      diagnosis: diagnosis.trim() || null,
      work_performed: work.trim() || null,
      repair_charges: numericCost,
      final_cost: numericCost,
    });
    if (updateError) Alert.alert('Update failed', updateError);
    else {
      if (status === 'en_route' || status === 'in_progress') startSharing();
      if (status === 'completed' || status === 'cancelled') stopSharing();
      load();
    }
  }

  function openNavigation() {
    if (job?.customer_lat == null || job.customer_lng == null) {
      Alert.alert('No coordinates', 'Customer location missing.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${job.customer_lat},${job.customer_lng}`;
    Linking.openURL(url);
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!job) {
    return (
      <Screen>
        <ErrorText message={error ?? 'Job not found'} />
      </Screen>
    );
  }

  const diagnosisFee = job.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE;
  const numericCost = cost.trim() && !Number.isNaN(Number(cost)) ? Number(cost) : 0;
  const totalPayable = diagnosisFee + numericCost;
  const diagnosisPaid = job.diagnosis_payment_status === 'paid';
  const repairPaid = job.repair_payment_status === 'paid';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Title>{problemLabels[job.problem_type]}</Title>
        <Subtitle>
          {STATUS_LABELS[job.status]} · {job.profiles?.full_name ?? 'Customer'}
        </Subtitle>
        <ErrorText message={error} />
        <ErrorText message={categoryError} />

        <Card>
          <Text style={{ color: theme.colors.muted }}>
            Phone: {job.profiles?.phone || 'Not provided'}
          </Text>
          <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
            Vehicle: {job.vehicles ? vehicleLabel(job.vehicles) : 'N/A'}
          </Text>
          <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
            {job.description || 'No extra details'}
          </Text>
        </Card>

        <OutlineButton label="Navigate to customer" onPress={openNavigation} />
        {job.profiles?.phone ? (
          <OutlineButton
            label="Call customer"
            onPress={() => Linking.openURL(`tel:${job.profiles?.phone}`)}
          />
        ) : null}
        <OutlineButton
          label={sharing ? 'Stop location sharing' : 'Share live location'}
          onPress={sharing ? stopSharing : startSharing}
        />

        {/* Diagnostic & Billing Breakdown */}
        <Card style={styles.billingCard}>
          <Text style={styles.billingTitle}>Fee & Charges Management</Text>
          <Text style={styles.billingSub}>All payments must be collected in cash</Text>

          {/* Fixed Diagnosis Fee Row */}
          <View style={styles.billRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.billItem}>Fixed Diagnosis Fee</Text>
              <Text style={styles.billHint}>Standard fee applied to all requests</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.billAmount}>{formatPKR(diagnosisFee)}</Text>
              <Text style={[styles.statusBadge, diagnosisPaid ? styles.paidBadge : styles.pendingBadge]}>
                {diagnosisPaid ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>

          {!diagnosisPaid && (
            <OutlineButton
              label={confirmingPayment ? 'Confirming…' : 'Confirm Cash Diagnosis Fee Received (Rs. 300)'}
              onPress={() => handleConfirmPayment('diagnosis_fee')}
              disabled={confirmingPayment}
            />
          )}

          <View style={styles.divider} />

          {/* Repair Charges Input */}
          <Label>Final repair charges (PKR)</Label>
          <Field
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
            placeholder="e.g. 1500"
          />

          <PrimaryButton
            label={submittingCharges ? 'Submitting…' : 'Submit repair charges to customer'}
            onPress={handleSubmitCharges}
            disabled={submittingCharges}
          />

          {job.repair_charges != null && (
            <View style={[styles.billRow, { marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.billItem}>Submitted Repair Status</Text>
                <Text style={styles.billHint}>Visible live on customer dashboard</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.billAmount}>{formatPKR(job.repair_charges)}</Text>
                <Text style={[styles.statusBadge, repairPaid ? styles.paidBadge : styles.pendingBadge]}>
                  {repairPaid ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          )}

          {job.repair_charges != null && !repairPaid && (
            <OutlineButton
              label={confirmingPayment ? 'Confirming…' : `Confirm Repair Cash Received (${formatPKR(job.repair_charges)})`}
              onPress={() => handleConfirmPayment('repair_charge')}
              disabled={confirmingPayment}
            />
          )}

          <View style={styles.divider} />

          {/* Grand Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable by Customer</Text>
            <Text style={styles.totalAmount}>{formatPKR(totalPayable)}</Text>
          </View>
        </Card>

        <Label>Diagnosis notes</Label>
        <Field value={diagnosis} onChangeText={setDiagnosis} multiline style={{ minHeight: 70 }} />

        <Label>Work performed</Label>
        <Field value={work} onChangeText={setWork} multiline style={{ minHeight: 70 }} />

        {job.status === 'accepted' && (
          <PrimaryButton label="Mark en route" onPress={() => setStatus('en_route')} />
        )}
        {job.status === 'en_route' && (
          <PrimaryButton label="Start work" onPress={() => setStatus('in_progress')} />
        )}
        {['accepted', 'en_route', 'in_progress'].includes(job.status) && (
          <PrimaryButton label="Complete job" onPress={() => setStatus('completed')} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 12,
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
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.blue,
  },
});
