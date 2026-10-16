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
      if (loc.error) setError((current) => (current ? `${current} ${loc.error}` : loc.error));
      setLoading(false);
    })();
  }, [user, params.problemType, params.vehicleType]);

  async function submit() {
    if (!user) return;
    if (!problem) {
      setError('Please select a service problem category.');
      return;
    }
    if (!coords) {
      setError('Live location is required to submit a roadside request.');
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
      Alert.alert('Request failed', createError ?? 'Unknown error occurred.');
      return;
    }
    replace(`/(customer)/tracking/${request.id}`);
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Preparing assistance form…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Title>Request Roadside Help</Title>
        <Subtitle>Select the problem, choose your vehicle, and request assistance.</Subtitle>
        <ErrorText message={error} />

        {/* Problem Type Section */}
        <Label>Select Service Problem</Label>
        <View style={styles.chipsRow}>
          {categories.map((category) => {
            const isSelected = problem === category.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => setProblem(category.id)}
                style={[styles.chip, isSelected && styles.chipSelected]}>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Vehicle Selection Section */}
        <Label>Select Vehicle</Label>
        {vehicles.length === 0 ? (
          <View style={styles.emptyVehicleBox}>
            <Text style={styles.emptyVehicleText}>
              No vehicles saved yet. You can still submit this request.
            </Text>
          </View>
        ) : (
          <View style={styles.vehicleList}>
            {vehicles.map((v) => {
              const isSelected = vehicleId === v.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setVehicleId(v.id)}
                  style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}>
                  <View style={styles.vehicleCardContent}>
                    <Text style={[styles.vehicleTitle, isSelected && styles.vehicleTitleSelected]}>
                      {v.year ? `${v.year} ` : ''}
                      {vehicleLabel(v)}
                    </Text>
                    {v.registration_number ? (
                      <Text style={styles.vehicleSub}>{v.registration_number}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Details Note */}
        <Label>Describe the issue (optional)</Label>
        <Field
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. flat front tire, engine smoking, battery drained..."
          multiline
          style={styles.detailsField}
        />

        {/* Location Status Card */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Incident Location</Text>
          <Text style={styles.locationCoords}>
            {coords
              ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (GPS locked)`
              : 'Detecting live coordinates…'}
          </Text>
        </View>

        {/* Diagnosis Fee Card (Yellow Accent) */}
        <Card style={styles.feeCard}>
          <View style={styles.feeHeader}>
            <View>
              <Text style={styles.feeLabel}>Standard Diagnosis Fee</Text>
              <Text style={styles.feeHint}>Covers mechanic arrival & vehicle inspection</Text>
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceTagText}>Rs. 300 PKR</Text>
            </View>
          </View>
          <View style={styles.feeDivider} />
          <Text style={styles.feeNote}>
            Pay directly in cash to the mechanic upon arrival. Any repair parts or extra labor
            charges will be submitted and approved separately.
          </Text>
        </Card>

        {/* Submit Button (Orange CTA) */}
        <PrimaryButton
          variant="orange"
          label={submitting ? 'Submitting Request…' : 'Submit Roadside Request (Rs. 300 Fee)'}
          onPress={submit}
          disabled={submitting}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 36,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextSelected: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  vehicleList: {
    gap: 8,
    marginBottom: 16,
  },
  vehicleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14,
    backgroundColor: theme.colors.surface,
  },
  vehicleCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  vehicleCardContent: {
    flex: 1,
  },
  vehicleTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  vehicleTitleSelected: {
    color: theme.colors.primaryDark,
  },
  vehicleSub: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  emptyVehicleBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyVehicleText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  detailsField: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
  },
  locationTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  locationCoords: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  feeCard: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderRadius: theme.radius.lg,
    marginBottom: 20,
    padding: 16,
    ...theme.shadows.card,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  feeHint: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  priceTag: {
    backgroundColor: theme.colors.yellow,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceTagText: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.yellowText,
  },
  feeDivider: {
    height: 1,
    backgroundColor: theme.colors.yellowSubtle,
    marginVertical: 10,
  },
  feeNote: {
    fontSize: 12,
    color: theme.colors.yellowText,
    lineHeight: 18,
    fontWeight: '500',
  },
});
