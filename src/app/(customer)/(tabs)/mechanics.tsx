import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from '../../../components/roadside-map';

import {
  EmptyState,
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
import { MECHANIC_TYPE_FOR_VEHICLE } from '../../../lib/ai';
import { distanceKm, etaMinutesFromDistance } from '../../../lib/geo';
import { getCurrentCoords, watchCurrentCoords } from '../../../lib/location';
import { getNearbyMechanics, type NearbyMechanic } from '../../../lib/mechanics';
import type { VehicleType } from '../../../lib/types';

const vehicleFilters: (VehicleType | 'All')[] = ['All', 'Car', 'Van', 'Bike', 'Scooter'];

function isVehicleType(value: string | undefined): value is VehicleType {
  return value === 'Car' || value === 'Van' || value === 'Bike' || value === 'Scooter';
}

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as unknown as { executionEnvironment?: string }).executionEnvironment ===
    'storeClient';

export default function MechanicsScreen() {
  const params = useLocalSearchParams<{ vehicleType?: string; problemType?: string }>();
  const mapRef = useRef<MapView | null>(null);
  const [mechanics, setMechanics] = useState<NearbyMechanic[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [filterSelection, setFilterSelection] = useState<{
    routeVehicleType?: string;
    filter: VehicleType | 'All';
  } | null>(null);
  const vehicleFilter = filterSelection && filterSelection.routeVehicleType === params.vehicleType
    ? filterSelection.filter
    : isVehicleType(params.vehicleType) ? params.vehicleType : 'All';
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let loc: Awaited<ReturnType<typeof getCurrentCoords>>;
    try {
      loc = await getCurrentCoords();
    } catch (locationError) {
      loc = {
        coords: null,
        error: locationError instanceof Error ? locationError.message : 'Could not get device location.',
      };
    }
    if (loc.error || !loc.coords) {
      setError(loc.error ?? 'Could not get location.');
      setManualMode(true);
      setLoading(false);
      return;
    }

    setCoords(loc.coords);
    setManualLatitude(String(loc.coords.latitude));
    setManualLongitude(String(loc.coords.longitude));
    try {
      const { mechanics: nearby, error: mechanicError } = await getNearbyMechanics(
        loc.coords.latitude,
        loc.coords.longitude
      );
      if (mechanicError) setError(mechanicError);
      setMechanics(nearby);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Could not load nearby mechanics.');
    } finally {
      setLoading(false);
    }
  }, [setManualMode]);

  useFocusEffect(
    useCallback(() => {
      let focused = true;
      let subscription: Awaited<ReturnType<typeof watchCurrentCoords>> | null = null;
      void (async () => {
        await load();
        try {
          subscription = await watchCurrentCoords((nextCoords) => {
            if (!focused) return;
            setCoords(nextCoords);
            setManualLatitude(String(nextCoords.latitude));
            setManualLongitude(String(nextCoords.longitude));
          });
          if (!focused) subscription.remove();
        } catch (locationError) {
          if (focused) {
            setError(locationError instanceof Error
              ? locationError.message
              : 'Live location updates are unavailable.');
          }
        }
      })();
      return () => {
        focused = false;
        subscription?.remove();
      };
    }, [load])
  );

  const distanceSortedMechanics = useMemo(
    () => mechanics
      .map((mechanic) => {
        if (coords && mechanic.latitude != null && mechanic.longitude != null) {
          const distance = distanceKm(
            coords.latitude,
            coords.longitude,
            mechanic.latitude,
            mechanic.longitude
          );
          return {
            ...mechanic,
            distance_km: distance,
            eta_minutes: etaMinutesFromDistance(distance),
          };
        }
        return mechanic;
      })
      .sort((first, second) => first.distance_km - second.distance_km),
    [coords, mechanics]
  );

  const filteredMechanics = useMemo(
    () => distanceSortedMechanics.filter((mechanic) => (
      vehicleFilter === 'All' ||
      mechanic.mechanic_type === MECHANIC_TYPE_FOR_VEHICLE[vehicleFilter]
    )),
    [distanceSortedMechanics, vehicleFilter]
  );
  const selectedMechanic = filteredMechanics.find(
    (mechanic) => mechanic.user_id === selectedMechanicId
  ) ?? null;

  function selectMechanic(mechanic: NearbyMechanic) {
    setSelectedMechanicId(mechanic.user_id);
    if (mechanic.latitude != null && mechanic.longitude != null) {
      mapRef.current?.animateToRegion({
        latitude: mechanic.latitude,
        longitude: mechanic.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      });
    }
  }

  async function searchManualLocation() {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    ) {
      setError('Enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { mechanics: nearby, error: searchError } = await getNearbyMechanics(latitude, longitude);
      setCoords({ latitude, longitude });
      setMechanics(nearby);
      setError(searchError);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Could not load nearby mechanics.');
    } finally {
      setLoading(false);
    }
  }

  function requestAssistance(mechanic: NearbyMechanic) {
    router.push({
      pathname: '/(customer)/request',
      params: {
        mechanicHint: mechanic.user_id,
        eta: String(mechanic.eta_minutes),
        problemType: params.problemType,
        vehicleType: vehicleFilter === 'All' ? params.vehicleType : vehicleFilter,
      },
    });
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Finding available mechanics…" />
      </Screen>
    );
  }

  return (
    <Screen style={{ padding: 0 }}>
      <View style={styles.header}>
        <Title>Available mechanics</Title>
        <Subtitle>
          Live GPS, nearest-first distance, specialties, ratings, and ETA.
        </Subtitle>
        <ErrorText message={error} />
      </View>

      <View style={styles.filterSection}>
        <Label>Filter by vehicle type</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {vehicleFilters.map((filter) => (
            <Pressable
              key={filter}
              accessibilityRole="button"
              accessibilityState={{ selected: vehicleFilter === filter }}
              onPress={() => setFilterSelection({
                routeVehicleType: params.vehicleType,
                filter,
              })}
              style={[styles.filterChip, vehicleFilter === filter && styles.filterChipSelected]}>
              <Text style={[styles.filterText, vehicleFilter === filter && styles.filterTextSelected]}>
                {filter === 'All' ? 'All vehicles' : filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {manualMode && (
        <View style={styles.manualSection}>
          <Label>Search location manually (coordinates)</Label>
          <View style={styles.manualRow}>
            <Field
              value={manualLatitude}
              onChangeText={setManualLatitude}
              placeholder="Latitude"
              keyboardType="decimal-pad"
              style={styles.manualField}
            />
            <Field
              value={manualLongitude}
              onChangeText={setManualLongitude}
              placeholder="Longitude"
              keyboardType="decimal-pad"
              style={styles.manualField}
            />
          </View>
          <PrimaryButton label="Search this location" onPress={() => void searchManualLocation()} />
        </View>
      )}

      {coords && Platform.OS !== 'web' ? (
        <MapView
          ref={mapRef}
          provider={isExpoGo ? undefined : PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            ...coords,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}>
          <Marker
            coordinate={coords}
            title="Your live location"
            description="Location updates while this screen is open."
            pinColor={theme.colors.blue}
          />
          {filteredMechanics.map((mechanic) =>
            mechanic.latitude != null && mechanic.longitude != null ? (
              <Marker
                key={mechanic.user_id}
                coordinate={{ latitude: mechanic.latitude, longitude: mechanic.longitude }}
                title={mechanic.workshop_name || mechanic.profiles?.full_name || 'Mechanic'}
                description={`${mechanic.distance_km.toFixed(1)} km away · ETA ~${mechanic.eta_minutes} min`}
                pinColor={theme.colors.primaryDark}
                onPress={() => selectMechanic(mechanic)}
              />
            ) : null
          )}
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.placeholderText}>
            {Platform.OS === 'web'
              ? 'Google Maps is available in the native app. Available mechanics are listed below.'
              : 'Allow location access to display your live position and nearby mechanics.'}
          </Text>
        </View>
      )}

      {coords && Platform.OS !== 'web' && (
        <View style={styles.mapActions}>
          <OutlineButton
            label="Center map on my location"
            onPress={() => mapRef.current?.animateToRegion({
              ...coords,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            })}
          />
        </View>
      )}

      {selectedMechanic && (
        <View style={styles.detailCard}>
          <Text style={styles.name}>
            {selectedMechanic.workshop_name || selectedMechanic.profiles?.full_name || 'Mechanic'}
          </Text>
          <Text style={styles.meta}>
            {selectedMechanic.mechanic_type ?? 'Mechanic'} · {selectedMechanic.distance_km.toFixed(1)} km · ETA ~{selectedMechanic.eta_minutes} min
          </Text>
          <Text style={styles.meta}>
            ★ {Number(selectedMechanic.average_rating).toFixed(1)} ({selectedMechanic.rating_count} reviews) · {selectedMechanic.experience_years} yrs experience
          </Text>
          <Text style={styles.meta}>
            {selectedMechanic.specialties?.join(', ') || 'General service'}
          </Text>
          <Text style={styles.availability}>Available now</Text>
          <PrimaryButton
            label="Request assistance"
            onPress={() => requestAssistance(selectedMechanic)}
          />
        </View>
      )}

      {filteredMechanics.length === 0 ? (
        <EmptyState message={
          vehicleFilter === 'All'
            ? 'No available, verified mechanics with a shared location were found nearby.'
            : `No available ${vehicleFilter.toLowerCase()} mechanics with a shared location were found nearby.`
        } />
      ) : (
        <FlatList
          data={filteredMechanics}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>
                {item.workshop_name || item.profiles?.full_name || 'Mechanic'}
              </Text>
              <Text style={styles.meta}>
                {item.distance_km.toFixed(1)} km · ETA ~{item.eta_minutes} min · ★{' '}
                {Number(item.average_rating).toFixed(1)} ({item.rating_count})
              </Text>
              <Text style={styles.meta}>
                {item.mechanic_type ?? 'Mechanic'} · {item.specialties?.join(', ') || 'General service'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => selectMechanic(item)}
                style={styles.detailsLink}>
                <Text style={styles.detailsLinkText}>Show on map</Text>
              </Pressable>
              <PrimaryButton
                label="Request this mechanic"
                onPress={() => requestAssistance(item)}
              />
            </View>
          )}
        />
      )}

      <View style={styles.refreshSection}>
        <Pressable
          onPress={() => {
            setManualMode(false);
            setSelectedMechanicId(null);
            void load();
          }}>
          <Text style={styles.refresh}>Refresh GPS and available mechanics</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 0 },
  filterSection: { paddingHorizontal: 16, marginBottom: 8 },
  filters: { gap: 8, paddingBottom: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  filterText: { color: theme.colors.text, fontWeight: '600', fontSize: 13 },
  filterTextSelected: { color: theme.colors.primaryDark, fontWeight: '700' },
  manualSection: { paddingHorizontal: 16, marginBottom: 12 },
  map: { height: 290, marginHorizontal: 16, borderRadius: 16 },
  mapPlaceholder: {
    height: 140,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  placeholderText: { color: theme.colors.muted, textAlign: 'center' },
  mapActions: { paddingHorizontal: 16, marginTop: 4 },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  list: { padding: 16 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  name: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: theme.colors.muted, marginTop: 4, fontSize: 13 },
  availability: { color: theme.colors.success, marginTop: 8, fontWeight: '700' },
  detailsLink: { alignSelf: 'flex-start', marginTop: 10 },
  detailsLinkText: { color: theme.colors.primary, fontWeight: '700' },
  refreshSection: { padding: 16 },
  refresh: { color: theme.colors.primary, textAlign: 'center', fontWeight: '700' },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualField: { flex: 1 },
});
