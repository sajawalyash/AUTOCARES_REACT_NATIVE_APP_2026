import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card, ErrorText, Field, LoadingState, Screen, Subtitle, Title } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { listServiceCategories } from '../../../lib/admin';
import { listMechanicsByVerificationStatus } from '../../../lib/mechanics';
import { listProfilesByRole } from '../../../lib/profiles';
import { formatPKR } from '../../../lib/payments';
import { listAllRequests } from '../../../lib/requests';
import type { Profile, ServiceCategory, ServiceRequest } from '../../../lib/types';

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function AdminAnalytics() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [mechanicStatuses, setMechanicStatuses] = useState<{ pending: number; approved: number; rejected: number }>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [fromDate, setFromDate] = useState(() => dateString(new Date(Date.now() - 29 * 86400000)));
  const [toDate, setToDate] = useState(() => dateString(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [profileResult, requestResult, mechanicResult, categoryResult] = await Promise.all([
      listProfilesByRole(),
      listAllRequests(),
      listMechanicsByVerificationStatus(),
      listServiceCategories(true),
    ]);
    setProfiles(profileResult.profiles);
    setRequests(requestResult.requests);
    setCategories(categoryResult.categories);
    setMechanicStatuses({
      pending: mechanicResult.mechanics.filter((item) => item.verification_status === 'pending').length,
      approved: mechanicResult.mechanics.filter((item) => item.verification_status === 'approved').length,
      rejected: mechanicResult.mechanics.filter((item) => item.verification_status === 'rejected').length,
    });
    const errors = [
      profileResult.error,
      requestResult.error,
      mechanicResult.error,
      categoryResult.error,
    ].filter((message): message is string => Boolean(message));
    setError(errors.length ? errors.join('\n') : null);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const dateError = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return 'Enter dates in YYYY-MM-DD format.';
    }
    const parsedFrom = new Date(`${fromDate}T00:00:00Z`);
    const parsedTo = new Date(`${toDate}T00:00:00Z`);
    if (
      Number.isNaN(parsedFrom.getTime()) ||
      Number.isNaN(parsedTo.getTime()) ||
      parsedFrom.toISOString().slice(0, 10) !== fromDate ||
      parsedTo.toISOString().slice(0, 10) !== toDate
    ) {
      return 'Enter valid calendar dates.';
    }
    if (fromDate > toDate) return 'Start date must be on or before end date.';
    return null;
  }, [fromDate, toDate]);

  const report = useMemo(() => {
    const customers = profiles.filter((profile) => profile.role === 'customer').length;
    const mechanics = profiles.filter((profile) => profile.role === 'mechanic').length;
    const matchingRequests = dateError
      ? []
      : requests.filter((request) => {
          const date = request.created_at.slice(0, 10);
          return date >= fromDate && date <= toDate;
        });
    const byProblem = new Map<string, number>();
    for (const request of matchingRequests) {
      byProblem.set(request.problem_type, (byProblem.get(request.problem_type) ?? 0) + 1);
    }
    const categoryLabels = new Map<string, string>();
    for (const category of categories) {
      categoryLabels.set(category.id, category.label);
    }
    return {
      customers,
      mechanics,
      matchingRequests,
      completed: dateError ? [] : requests.filter((request) =>
        request.status === 'completed' &&
        request.completed_at != null &&
        request.completed_at.slice(0, 10) >= fromDate &&
        request.completed_at.slice(0, 10) <= toDate
      ),
      cancelled: dateError ? [] : requests.filter((request) =>
        request.status === 'cancelled' &&
        request.updated_at.slice(0, 10) >= fromDate &&
        request.updated_at.slice(0, 10) <= toDate
      ),
      byProblem: [...byProblem.entries()],
      categoryLabels,
    };
  }, [profiles, requests, categories, dateError, fromDate, toDate]);

  if (loading) {
    return <Screen><LoadingState /></Screen>;
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }>
        <Title>Reports & analytics</Title>
        <Subtitle>User totals and job reports for a selected date range.</Subtitle>
        <ErrorText message={error} />

        <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
        <Field value={fromDate} onChangeText={setFromDate} placeholder="2026-01-01" />
        <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
        <Field value={toDate} onChangeText={setToDate} placeholder="2026-01-31" />
        <ErrorText message={dateError} />

        <View style={styles.grid}>
          {[
            ['Customers', report.customers],
            ['Mechanics', report.mechanics],
            ['Pending mechanics', mechanicStatuses.pending],
            ['Approved mechanics', mechanicStatuses.approved],
            ['Rejected mechanics', mechanicStatuses.rejected],
            ['Requests in range', report.matchingRequests.length],
            ['Completed jobs', report.completed.length],
            ['Cancelled jobs', report.cancelled.length],
          ].map(([label, value]) => (
            <Card key={String(label)} style={styles.stat}>
              <Text style={styles.value}>{value}</Text>
              <Text style={styles.cardLabel}>{label}</Text>
            </Card>
          ))}
        </View>

        <Title>Requests by category</Title>
        {report.byProblem.length === 0 ? (
          <Card><Text style={styles.cardLabel}>No requests in this date range.</Text></Card>
        ) : (
          report.byProblem.map(([key, count]) => (
            <Card key={key}>
              <Text style={{ fontWeight: '800', color: theme.colors.text }}>
                {report.categoryLabels.get(key) ?? key}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>{count} requests</Text>
            </Card>
          ))
        )}

        <Title>Completed job report</Title>
        {report.completed.length === 0 ? (
          <Card><Text style={styles.cardLabel}>No completed jobs in this date range.</Text></Card>
        ) : report.completed.map((request) => (
          <Card key={request.id}>
            <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
              {report.categoryLabels.get(request.problem_type) ?? request.problem_type}
            </Text>
            <Text style={styles.cardLabel}>
              {new Date(request.completed_at ?? request.created_at).toLocaleString()}
              {request.final_cost != null ? ` · ${formatPKR(Number(request.final_cost))}` : ''}
            </Text>
          </Card>
        ))}

        <Title>Cancelled job report</Title>
        {report.cancelled.length === 0 ? (
          <Card><Text style={styles.cardLabel}>No cancelled jobs in this date range.</Text></Card>
        ) : report.cancelled.map((request) => (
          <Card key={request.id}>
            <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
              {report.categoryLabels.get(request.problem_type) ?? request.problem_type}
            </Text>
            <Text style={styles.cardLabel}>{new Date(request.created_at).toLocaleString()}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  stat: { width: '31%', alignItems: 'center' },
  value: { color: theme.colors.text, fontWeight: '800', fontSize: 20 },
  label: { color: theme.colors.text, fontWeight: '700', fontSize: 13, marginBottom: 6 },
  cardLabel: { color: theme.colors.muted, marginTop: 4, fontSize: 12 },
});
