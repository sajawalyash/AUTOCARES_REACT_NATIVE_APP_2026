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
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Earnings & Transactions</Title>
      <Subtitle>Breakdown of diagnosis fees, repair charges, and payment history.</Subtitle>
      <ErrorText message={categoryError} />

      <Card style={styles.summaryCard}>
        <Text style={styles.totalAmountText}>{formatPKR(stats.total)}</Text>
        <Text style={styles.totalSub}>Total recorded earnings (completed jobs)</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Diagnosis Fees</Text>
            <Text style={styles.statVal}>{formatPKR(stats.diagTotal)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Repair Charges</Text>
            <Text style={styles.statVal}>{formatPKR(stats.repairTotal)}</Text>
          </View>
        </View>
      </Card>

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
            Payment History ({payments.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'jobs' ? (
        jobs.length === 0 ? (
          <EmptyState message="No completed paid jobs yet." />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const diag = item.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE;
              const rep = Number(item.repair_charges ?? item.final_cost ?? 0);
              return (
                <Card>
                  <View style={styles.cardHeader}>
                    <Text style={styles.jobTitle}>{problemLabels[item.problem_type]}</Text>
                    <Text style={styles.jobTotal}>{formatPKR(diag + rep)}</Text>
                  </View>

                  <Text style={styles.customerName}>
                    Customer: {item.profiles?.full_name ?? 'Driver'}
                  </Text>

                  <View style={styles.feeBreakdown}>
                    <Text style={styles.feeRowText}>
                      Diagnosis Fee: {formatPKR(diag)} · Status: {item.diagnosis_payment_status ?? 'pending'}
                    </Text>
                    <Text style={styles.feeRowText}>
                      Repair Charges: {formatPKR(rep)} · Status: {item.repair_payment_status ?? 'pending'}
                    </Text>
                  </View>

                  <Text style={styles.dateText}>
                    Completed:{' '}
                    {item.completed_at
                      ? new Date(item.completed_at).toLocaleDateString()
                      : 'Completed'}
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
            renderItem={({ item }) => (
              <Card>
                <View style={styles.cardHeader}>
                  <Text style={styles.jobTitle}>
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

                <Text style={styles.transAmount}>{formatPKR(item.amount)}</Text>

                <View style={styles.transDetails}>
                  <Text style={styles.transInfo}>Method: Cash ({item.payment_method})</Text>
                  {item.customer?.full_name && (
                    <Text style={styles.transInfo}>Customer: {item.customer.full_name}</Text>
                  )}
                  {item.paid_at && (
                    <Text style={styles.transInfo}>
                      Paid: {new Date(item.paid_at).toLocaleString()}
                    </Text>
                  )}
                  <Text style={styles.transInfo}>
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
  summaryCard: {
    padding: 16,
    marginBottom: 16,
  },
  totalAmountText: {
    color: theme.colors.text,
    fontWeight: '900',
    fontSize: 26,
  },
  totalSub: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    gap: 12,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: '700',
  },
  statVal: {
    fontSize: 14,
    color: theme.colors.blue,
    fontWeight: '800',
    marginTop: 2,
  },
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
    color: theme.colors.blue,
    fontSize: 15,
  },
  customerName: {
    color: theme.colors.muted,
    fontSize: 13,
    marginBottom: 6,
  },
  feeBreakdown: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
    gap: 2,
  },
  feeRowText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  dateText: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 6,
  },
  transAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.blue,
    marginVertical: 4,
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
  transDetails: {
    gap: 2,
    marginTop: 4,
  },
  transInfo: {
    fontSize: 12,
    color: theme.colors.muted,
  },
});
