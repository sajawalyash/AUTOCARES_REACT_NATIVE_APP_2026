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
  StatusBadge,
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
import { FIXED_DIAGNOSIS_FEE, vehicleLabel } from '../../../lib/types';
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
    Alert.alert('Thank you', 'Your review and rating were submitted.');
    setRatingRequest(null);
    setComment('');
    load();
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading service history…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Service History & Receipts</Title>
      <Subtitle>Review past assistance requests, fees, and receipts.</Subtitle>
      <ErrorText message={error} />
      <ErrorText message={categoryError} />

      {/* Segmented Tab Controls */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]}
          onPress={() => setActiveTab('requests')}>
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests ({requests.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'payments' && styles.tabButtonActive]}
          onPress={() => setActiveTab('payments')}>
          <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
            Receipts ({payments.length})
          </Text>
        </Pressable>
      </View>

      {/* Rating Modal/Card */}
      {ratingRequest && (
        <Card style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Rate Mechanic</Text>
          <Text style={styles.ratingSub}>How was your experience?</Text>
          <Field
            value={stars}
            onChangeText={setStars}
            keyboardType="number-pad"
            placeholder="Stars (1 to 5)"
          />
          <Field
            value={comment}
            onChangeText={setComment}
            placeholder="Optional comments or feedback"
            multiline
            style={{ minHeight: 60 }}
          />
          <PrimaryButton label="Submit Rating" onPress={submitRating} />
          <PrimaryButton label="Cancel" onPress={() => setRatingRequest(null)} danger />
        </Card>
      )}

      {activeTab === 'requests' ? (
        requests.length === 0 ? (
          <EmptyState message="No past roadside assistance requests found." />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
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
                  <Card style={styles.itemCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>
                        {problemLabels[item.problem_type]}
                        {item.is_sos ? ' · SOS' : ''}
                      </Text>
                      <StatusBadge status={item.status} />
                    </View>

                    {item.vehicles && (
                      <Text style={styles.vehicleText}>🚗 {vehicleLabel(item.vehicles)}</Text>
                    )}

                    <View style={styles.feeBreakdown}>
                      <View style={styles.feeItem}>
                        <Text style={styles.feeLabel}>Diagnosis Fee:</Text>
                        <Text style={styles.feeValue}>
                          {formatPKR(diagFee)}{' '}
                          <Text
                            style={{
                              color: diagPaid ? theme.colors.success : theme.colors.yellowText,
                              fontWeight: '800',
                            }}>
                            ({diagPaid ? 'Paid' : 'Pending'})
                          </Text>
                        </Text>
                      </View>

                      {repCost != null && (
                        <View style={styles.feeItem}>
                          <Text style={styles.feeLabel}>Repair Charges:</Text>
                          <Text style={styles.feeValue}>
                            {formatPKR(repCost)}{' '}
                            <Text
                              style={{
                                color: repPaid ? theme.colors.success : theme.colors.yellowText,
                                fontWeight: '800',
                              }}>
                              ({repPaid ? 'Paid' : 'Pending'})
                            </Text>
                          </Text>
                        </View>
                      )}

                      <View style={styles.feeTotalRow}>
                        <Text style={styles.feeTotalLabel}>Total Amount:</Text>
                        <Text style={styles.feeTotalValue}>{formatPKR(total)}</Text>
                      </View>
                    </View>

                    <Text style={styles.dateText}>
                      {new Date(item.created_at).toLocaleDateString()} · Tap to track or view
                    </Text>

                    {item.status === 'completed' && item.mechanic_id && (
                      <PrimaryButton
                        variant="yellow"
                        label="Rate Technician"
                        onPress={() => setRatingRequest(item)}
                      />
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
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Card style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {item.payment_type === 'diagnosis_fee'
                      ? 'Diagnosis Fee'
                      : 'Repair Charges'}
                  </Text>
                  <View
                    style={[
                      styles.paymentBadge,
                      item.status === 'paid' ? styles.paidBadge : styles.pendingBadge,
                    ]}>
                    <Text
                      style={[
                        styles.paymentBadgeText,
                        item.status === 'paid' ? styles.paidBadgeText : styles.pendingBadgeText,
                      ]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.paymentAmount}>{formatPKR(item.amount)}</Text>

                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentInfo}>Method: Cash payment</Text>
                  {item.paid_at && (
                    <Text style={styles.paymentInfo}>
                      Date: {new Date(item.paid_at).toLocaleString()}
                    </Text>
                  )}
                  {item.mechanic?.full_name && (
                    <Text style={styles.paymentInfo}>Mechanic: {item.mechanic.full_name}</Text>
                  )}
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
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary, // Sky Blue
  },
  tabText: {
    color: theme.colors.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  list: {
    paddingBottom: 24,
  },
  itemCard: {
    marginBottom: 10,
    borderRadius: theme.radius.lg,
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
  vehicleText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  feeBreakdown: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginVertical: 6,
    gap: 3,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  feeLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  feeValue: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '700',
  },
  feeTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 4,
  },
  feeTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  feeTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.primaryDark,
  },
  dateText: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  ratingCard: {
    marginBottom: 16,
    borderColor: theme.colors.yellow,
    borderWidth: 1.5,
    backgroundColor: theme.colors.yellowLight,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  ratingSub: {
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 10,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    marginVertical: 4,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paidBadge: {
    backgroundColor: theme.colors.successLight,
  },
  paidBadgeText: {
    color: theme.colors.success,
  },
  pendingBadge: {
    backgroundColor: theme.colors.yellowLight,
  },
  pendingBadgeText: {
    color: theme.colors.yellowText,
  },
  paymentDetails: {
    gap: 2,
    marginTop: 4,
  },
  paymentInfo: {
    fontSize: 12,
    color: theme.colors.muted,
  },
});
