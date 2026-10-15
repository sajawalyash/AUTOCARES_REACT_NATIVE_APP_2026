import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Card,
  EmptyState,
  ErrorText,
  Field,
  LoadingState,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { useProblemLabels } from '../../../hooks/use-problem-labels';
import { go } from '../../../lib/nav';
import { formatPKR, listUserPayments } from '../../../lib/payments';
import { createRating, getRatingForRequest } from '../../../lib/ratings';
import { listCustomerRequests } from '../../../lib/requests';
import type { PaymentRecord, ServiceRequest } from '../../../lib/types';
import { FIXED_DIAGNOSIS_FEE, STATUS_LABELS, vehicleLabel } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

export default function HistoryScreen() {
  const { user } = useAuth();
  const { problemLabels, categoryError } = useProblemLabels();
  const [activeTab, setActiveTab] = useState<'requests' | 'payments'>('requests');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingRequest, setRatingRequest] = useState<ServiceRequest | null>(null);
  const [stars, setStars] = useState('5');
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ requests: reqData, error: reqErr }, { payments: payData, error: payErr }] =
      await Promise.all([
        listCustomerRequests(user.id),
        listUserPayments(user.id, 'customer'),
      ]);
    setError(reqErr ?? payErr);
    setRequests(reqData);
    setPayments(payData);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function submitRating() {
    if (!user || !ratingRequest?.mechanic_id) return;
    const value = Number(stars);
    if (value < 1 || value > 5) {
      Alert.alert('Invalid rating', 'Stars must be between 1 and 5.');
      return;
    }
    const existing = await getRatingForRequest(ratingRequest.id);
    if (existing.rating) {
      Alert.alert('Already rated', 'You already rated this job.');
      return;
    }
    const { error: rateError } = await createRating({
      request_id: ratingRequest.id,
      customer_id: user.id,
      mechanic_id: ratingRequest.mechanic_id,
      stars: value,
      comment,
    });
    if (rateError) {
      Alert.alert('Rating failed', rateError);
      return;
    }
    Alert.alert('Thanks', 'Your rating was submitted.');
    setRatingRequest(null);
    setComment('');
    load();
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Service & Payments</Title>
      <Subtitle>Review past requests, diagnosis fees, repair charges, and receipts.</Subtitle>
      <ErrorText message={error} />
      <ErrorText message={categoryError} />

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]}
          onPress={() => setActiveTab('requests')}>
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Service Requests ({requests.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'payments' && styles.tabButtonActive]}
          onPress={() => setActiveTab('payments')}>
          <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
            Payment History ({payments.length})
          </Text>
        </Pressable>
      </View>

      {ratingRequest && (
        <Card>
          <Text style={{ fontWeight: '800', color: theme.colors.text, marginBottom: 8 }}>
            Rate mechanic
          </Text>
          <Field value={stars} onChangeText={setStars} keyboardType="number-pad" placeholder="Stars 1-5" />
          <Field value={comment} onChangeText={setComment} placeholder="Comment (optional)" />
          <PrimaryButton label="Submit rating" onPress={submitRating} />
          <PrimaryButton label="Cancel" onPress={() => setRatingRequest(null)} danger />
        </Card>
      )}

      {activeTab === 'requests' ? (
        requests.length === 0 ? (
          <EmptyState message="No service history yet." />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const diagFee = item.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE;
              const repCost =
                item.repair_charges != null
                  ? Number(item.repair_charges)
                  : item.final_cost != null
                  ? Number(item.final_cost)
                  : null;
              const total = diagFee + (repCost ?? 0);
              const diagPaid = item.diagnosis_payment_status === 'paid';
              const repPaid = item.repair_payment_status === 'paid';

              return (
                <Pressable onPress={() => go(`/(customer)/tracking/${item.id}`)}>
                  <Card>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>
                        {problemLabels[item.problem_type]}
                        {item.is_sos ? ' · SOS' : ''}
                      </Text>
                      <Text style={styles.statusBadge}>{STATUS_LABELS[item.status]}</Text>
                    </View>

                    {item.vehicles && (
                      <Text style={styles.vehicleText}>{vehicleLabel(item.vehicles)}</Text>
                    )}

                    <View style={styles.feeBreakdown}>
                      <View style={styles.feeItem}>
                        <Text style={styles.feeLabel}>Diagnosis Fee:</Text>
                        <Text style={styles.feeValue}>
                          {formatPKR(diagFee)}{' '}
                          <Text style={{ color: diagPaid ? '#16a34a' : '#ca8a04', fontWeight: '800' }}>
                            ({diagPaid ? 'Paid' : 'Pending'})
                          </Text>
                        </Text>
                      </View>

                      {repCost != null && (
                        <View style={styles.feeItem}>
                          <Text style={styles.feeLabel}>Repair Charges:</Text>
                          <Text style={styles.feeValue}>
                            {formatPKR(repCost)}{' '}
                            <Text style={{ color: repPaid ? '#16a34a' : '#ca8a04', fontWeight: '800' }}>
                              ({repPaid ? 'Paid' : 'Pending'})
                            </Text>
                          </Text>
                        </View>
                      )}

                      <View style={[styles.feeItem, { marginTop: 4, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 4 }]}>
                        <Text style={[styles.feeLabel, { fontWeight: '800', color: theme.colors.text }]}>Total Payable:</Text>
                        <Text style={[styles.feeValue, { fontWeight: '900', color: theme.colors.blue }]}>{formatPKR(total)}</Text>
                      </View>
                    </View>

                    <Text style={styles.dateText}>
                      {new Date(item.created_at).toLocaleDateString()} · Tap to view details & track
                    </Text>

                    {item.status === 'completed' && item.mechanic_id && (
                      <PrimaryButton label="Rate mechanic" onPress={() => setRatingRequest(item)} />
                    )}
                  </Card>
                </Pressable>
              );
            }}
          />
        )
      ) : (
        payments.length === 0 ? (
          <EmptyState message="No payment transactions recorded yet." />
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Card>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {item.payment_type === 'diagnosis_fee'
                      ? 'Fixed Diagnosis Fee'
                      : 'Mechanic Repair Charges'}
                  </Text>
                  <Text
                    style={[
                      styles.paymentBadge,
                      item.status === 'paid' ? styles.paidBadge : styles.pendingBadge,
                    ]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.paymentAmount}>{formatPKR(item.amount)}</Text>

                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentInfo}>Method: Cash ({item.payment_method})</Text>
                  {item.paid_at && (
                    <Text style={styles.paymentInfo}>
                      Paid: {new Date(item.paid_at).toLocaleString()}
                    </Text>
                  )}
                  {item.mechanic?.full_name && (
                    <Text style={styles.paymentInfo}>Mechanic: {item.mechanic.full_name}</Text>
                  )}
                  <Text style={styles.paymentInfo}>
                    Request ID: {item.request_id.slice(0, 8)}…
                  </Text>
                </View>
              </Card>
            )}
          />
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontWeight: '800',
    color: theme.colors.text,
    fontSize: 15,
    flex: 1,
  },
  statusBadge: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleText: {
    color: theme.colors.muted,
    fontSize: 13,
    marginBottom: 6,
  },
  feeBreakdown: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  feeLabel: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  feeValue: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '700',
  },
  dateText: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.blue,
    marginVertical: 6,
  },
  paymentBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
  paymentDetails: {
    marginTop: 4,
    gap: 2,
  },
  paymentInfo: {
    fontSize: 12,
    color: theme.colors.muted,
  },
});
