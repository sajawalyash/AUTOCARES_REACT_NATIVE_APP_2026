import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Card,
  EmptyState,
  ErrorText,
  LoadingState,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { useProblemLabels } from '../../../hooks/use-problem-labels';
import { formatPKR, listUserPayments } from '../../../lib/payments';
import { listMechanicJobs } from '../../../lib/requests';
import type { PaymentRecord, ServiceRequest } from '../../../lib/types';
import { FIXED_DIAGNOSIS_FEE } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

export default function EarningsScreen() {
  const { user } = useAuth();
  const { problemLabels, categoryError } = useProblemLabels();
  const [activeTab, setActiveTab] = useState<'jobs' | 'payments'>('jobs');
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!user) return;
        setLoading(true);
        const [{ requests }, { payments: payList }] = await Promise.all([
          listMechanicJobs(user.id),
          listUserPayments(user.id, 'mechanic'),
        ]);
        setJobs(requests.filter((j) => j.status === 'completed'));
        setPayments(payList);
        setLoading(false);
      })();
    }, [user])
  );

  const stats = useMemo(() => {
    let diagSum = 0;
    let repairSum = 0;

    for (const job of jobs) {
      diagSum += job.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE;
      repairSum += Number(job.repair_charges ?? job.final_cost ?? 0);
    }

    return {
      total: diagSum + repairSum,
      diagTotal: diagSum,
      repairTotal: repairSum,
    };
  }, [jobs]);

  if (loading) {
    return (
      <Screen safeBottom={false}>
        <LoadingState label="Loading earnings data…" />
      </Screen>
    );
  }

  return (
    <Screen safeBottom={false}>
      <Title>Earnings & Ledger</Title>
      <Subtitle>Breakdown of diagnosis fees, repair charges, and payment transactions.</Subtitle>
      <ErrorText message={categoryError} />

      {/* Summary Highlights Card */}
      <Card style={styles.summaryCard}>
        <Text style={styles.totalLabel}>Total Completed Earnings</Text>
        <Text style={styles.totalAmountText}>{formatPKR(stats.total)}</Text>
        <Text style={styles.totalSub}>All cash amounts collected on-site</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Diagnosis Fees</Text>
            <Text style={styles.statVal}>{formatPKR(stats.diagTotal)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Repair Charges</Text>
            <Text style={styles.statVal}>{formatPKR(stats.repairTotal)}</Text>
          </View>
        </View>
      </Card>

      {/* Segmented Tab Controls */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, activeTab === 'jobs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('jobs')}>
          <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
            Completed Jobs ({jobs.length})
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

      {activeTab === 'jobs' ? (
        jobs.length === 0 ? (
          <EmptyState message="No completed paid jobs recorded yet." />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const diag = item.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE;
              const rep = Number(item.repair_charges ?? item.final_cost ?? 0);
              return (
                <Card style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.jobTitle}>{problemLabels[item.problem_type]}</Text>
                    <Text style={styles.jobTotal}>{formatPKR(diag + rep)}</Text>
                  </View>

                  <Text style={styles.customerName}>
                    Customer: {item.profiles?.full_name ?? 'Driver'}
                  </Text>

                  <View style={styles.feeBreakdown}>
                    <Text style={styles.feeRowText}>
                      Diagnosis Fee: {formatPKR(diag)} · {item.diagnosis_payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                    <Text style={styles.feeRowText}>
                      Repair Charges: {formatPKR(rep)} · {item.repair_payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>

                  <Text style={styles.dateText}>
                    Completed: {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'Done'}
                  </Text>
                </Card>
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
                  <Text style={styles.jobTitle}>
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

                <Text style={styles.transAmount}>{formatPKR(item.amount)}</Text>

                <View style={styles.transDetails}>
                  <Text style={styles.transInfo}>Method: Cash payment</Text>
                  {item.customer?.full_name && (
                    <Text style={styles.transInfo}>Customer: {item.customer.full_name}</Text>
                  )}
                  {item.paid_at && (
                    <Text style={styles.transInfo}>
                      Received: {new Date(item.paid_at).toLocaleString()}
                    </Text>
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
  summaryCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.cardElevated,
  },
  totalLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  totalAmountText: {
    color: theme.colors.primaryDark,
    fontWeight: '900',
    fontSize: 28,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  totalSub: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '800',
    marginTop: 2,
  },
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
    marginBottom: 4,
  },
  jobTitle: {
    fontWeight: '800',
    color: theme.colors.text,
    fontSize: 15,
    flex: 1,
  },
  jobTotal: {
    fontWeight: '900',
    color: theme.colors.primaryDark,
    fontSize: 16,
  },
  customerName: {
    color: theme.colors.muted,
    fontSize: 13,
    marginBottom: 6,
  },
  feeBreakdown: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginVertical: 4,
    gap: 3,
  },
  feeRowText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  dateText: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 6,
  },
  transAmount: {
    fontSize: 18,
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
  transDetails: {
    gap: 2,
    marginTop: 4,
  },
  transInfo: {
    fontSize: 12,
    color: theme.colors.muted,
  },
});
