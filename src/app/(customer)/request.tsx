import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  ErrorText,
  Field,
  Label,
  LoadingState,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../components/ui';
import { theme } from '../../constants/autocares-theme';
import { listServiceCategories } from '../../lib/admin';
import { getCurrentCoords } from '../../lib/location';
import { replace } from '../../lib/nav';
import { createServiceRequest } from '../../lib/requests';
import type { ProblemType, ServiceCategory, Vehicle } from '../../lib/types';
import { vehicleLabel } from '../../lib/types';
import { listVehicles } from '../../lib/vehicles';
import { useAuth } from '../../providers/auth-provider';

export default function RequestScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    eta?: string;
    mechanicHint?: string;
    problemType?: string;
    vehicleType?: string;
  }>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [problem, setProblem] = useState<ProblemType | null>(null);
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [{ vehicles: list }, loc, categoryResult] = await Promise.all([
        listVehicles(user.id),
        getCurrentCoords(),
        listServiceCategories(),
      ]);
      setVehicles(list);
      setCategories(categoryResult.categories);
      if (categoryResult.error) setError(categoryResult.error);
      const requestedProblem = categoryResult.categories.find(
        (category) => category.id === params.problemType
      );
      if (requestedProblem) setProblem(requestedProblem.id);
      else if (categoryResult.categories[0]) setProblem(categoryResult.categories[0].id);
      const requestedVehicle = list.find((vehicle) => vehicle.vehicle_type === params.vehicleType);
      if (requestedVehicle) setVehicleId(requestedVehicle.id);
      else if (list[0]) setVehicleId(list[0].id);
      if (loc.coords) setCoords(loc.coords);
      if (loc.error) setError((current) => current ? `${current} ${loc.error}` : loc.error);
      setLoading(false);
    })();
  }, [user, params.problemType, params.vehicleType]);

  async function submit() {
    if (!user) return;
    if (!problem) {
      setError('No service categories are currently available.');
      return;
    }
    if (!coords) {
      setError('Location is required to submit a roadside request.');
      return;
    }
    setSubmitting(true);
    const eta = params.eta ? Number(params.eta) : null;
    const { request, error: createError } = await createServiceRequest({
      customer_id: user.id,
      mechanic_id: params.mechanicHint ?? null,
      vehicle_id: vehicleId,
      problem_type: problem,
      description,
      customer_lat: coords.latitude,
      customer_lng: coords.longitude,
      estimated_arrival_minutes: eta && !Number.isNaN(eta) ? eta : null,
    });
    setSubmitting(false);
    if (createError || !request) {
      Alert.alert('Request failed', createError ?? 'Unknown error');
      return;
    }
    replace(`/(customer)/tracking/${request.id}`);
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
      <ScrollView>
        <Title>Request roadside assistance</Title>
        <Subtitle>Select a problem, share your location, and submit.</Subtitle>
        <ErrorText message={error} />

        <Label>Problem type</Label>
        <View style={styles.row}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setProblem(category.id)}
              style={[styles.chip, problem === category.id && styles.chipOn]}>
              <Text style={styles.chipText}>{category.label}</Text>
            </Pressable>
          ))}
        </View>

        <Label>Vehicle</Label>
        {vehicles.length === 0 ? (
          <Text style={styles.hint}>No vehicles saved. You can still submit, or add one first.</Text>
        ) : (
          vehicles.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => setVehicleId(v.id)}
              style={[styles.vehicle, vehicleId === v.id && styles.vehicleOn]}>
              <Text style={styles.vehicleText}>
                {v.year ? `${v.year} ` : ''}
                {vehicleLabel(v)}
              </Text>
            </Pressable>
          ))
        )}

        <Label>Details</Label>
        <Field
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what happened"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Text style={styles.hint}>
          Location:{' '}
          {coords
            ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
            : 'Not available'}
        </Text>

        <Card style={styles.feeCard}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Fixed Diagnosis Charge</Text>
            <Text style={styles.feeValue}>Rs. 300 PKR</Text>
          </View>
          <Text style={styles.feeNote}>
            Applied automatically to all requests (Cars, Bikes, Scooters, Vans). Pay directly to the mechanic in cash upon arrival.
          </Text>
        </Card>

        <PrimaryButton
          label={submitting ? 'Submitting…' : 'Submit request (Rs. 300 PKR Fee)'}
          onPress={submit}
          disabled={submitting}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
  vehicle: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
  },
  vehicleOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  vehicleText: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  hint: { color: theme.colors.muted, marginBottom: 14, fontSize: 13 },
  feeCard: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: '#FDE047',
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 16,
    padding: 14,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feeLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  feeValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#854D0E',
  },
  feeNote: {
    fontSize: 12,
    color: '#713F12',
    lineHeight: 17,
  },
});
