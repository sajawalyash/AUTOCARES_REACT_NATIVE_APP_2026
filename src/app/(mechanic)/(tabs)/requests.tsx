import { useCallback, useState } from 'react';
import { Alert, FlatList, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Card,
  EmptyState,
  ErrorText,
  LoadingState,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { useProblemLabels } from '../../../hooks/use-problem-labels';
import { etaMinutesFromDistance, distanceKm } from '../../../lib/geo';
import { getCurrentCoords } from '../../../lib/location';
import { getMechanicProfile } from '../../../lib/mechanics';
import { go } from '../../../lib/nav';
import { acceptRequest, listPendingRequests, rejectRequest } from '../../../lib/requests';
import type { ServiceRequest } from '../../../lib/types';
import { vehicleLabel } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

export default function IncomingRequests() {
  const { user } = useAuth();
  const { problemLabels, categoryError } = useProblemLabels();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { requests: data, error: err } = await listPendingRequests();
    setError(err);
    setRequests(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onAccept(item: ServiceRequest) {
    if (!user) return;
    const { mechanic } = await getMechanicProfile(user.id);
    if (!mechanic || mechanic.verification_status !== 'approved') {
      Alert.alert('Not verified', 'An admin must approve your mechanic profile first.');
      return;
    }
    if (!mechanic.is_available) {
      Alert.alert('Unavailable', 'Set yourself available in Profile to accept jobs.');
      return;
    }

    let eta = 20;
    const loc = await getCurrentCoords();
    if (
      loc.coords &&
      item.customer_lat != null &&
      item.customer_lng != null
    ) {
      eta = etaMinutesFromDistance(
        distanceKm(
          loc.coords.latitude,
          loc.coords.longitude,
          item.customer_lat,
          item.customer_lng
        )
      );
    }

    const { request, error: acceptError } = await acceptRequest(item.id, user.id, eta);
    if (acceptError || !request) {
      Alert.alert('Accept failed', acceptError ?? 'Unavailable');
      return;
    }
    go(`/(mechanic)/job/${request.id}`);
  }

  async function onReject(id: string) {
    const { error: rejectError } = await rejectRequest(id);
    if (rejectError) Alert.alert('Reject failed', rejectError);
    load();
  }

  if (loading) {
    return (
      <Screen safeBottom={false}>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen safeBottom={false}>
      <Title>Incoming requests</Title>
      <Subtitle>Review problem, vehicle, location, then accept or reject.</Subtitle>
      <ErrorText message={error} />
      <ErrorText message={categoryError} />

      {requests.length === 0 ? (
        <EmptyState message="No pending requests right now." />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontWeight: '800', color: theme.colors.text }}>
                {problemLabels[item.problem_type]}
                {item.is_sos ? ' · SOS' : ''}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                Customer: {item.profiles?.full_name ?? 'Driver'}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                Vehicle:{' '}
                {item.vehicles
                  ? vehicleLabel(item.vehicles)
                  : 'Not specified'}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                Location:{' '}
                {item.customer_lat != null
                  ? `${item.customer_lat.toFixed(4)}, ${item.customer_lng?.toFixed(4)}`
                  : 'Unknown'}
              </Text>
              <Text style={{ color: theme.colors.blue, fontWeight: '700', marginTop: 4 }}>
                Diagnosis Fee: Rs. 300 PKR (Cash on arrival)
              </Text>
              {item.description ? (
                <Text style={{ color: theme.colors.muted, marginTop: 4 }}>{item.description}</Text>
              ) : null}
              <PrimaryButton label="Accept" onPress={() => onAccept(item)} />
              <OutlineButton label="Reject" onPress={() => onReject(item.id)} />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
