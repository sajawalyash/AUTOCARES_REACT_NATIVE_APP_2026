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
        <LoadingState label="Finding available mechanics nearby…" />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <Title>Available Mechanics</Title>
        <Subtitle>
          Live GPS, nearest-first distance, ratings, and estimated arrival.
        </Subtitle>
        <ErrorText message={error} />
      </View>

      {/* Vehicle Type Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {vehicleFilters.map((filter) => {
            const isSelected = vehicleFilter === filter;
            return (
              <Pressable
                key={filter}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setFilterSelection({
                  routeVehicleType: params.vehicleType,
                  filter,
                })}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}>
                <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                  {filter === 'All' ? 'All Vehicles' : filter}
                </Text>
              </Pressable>
            );
          })}
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
          <PrimaryButton label="Search Coordinates" onPress={() => void searchManualLocation()} />
        </View>
      )}

      {/* Map View */}
      {coords && Platform.OS !== 'web' ? (
        <View style={styles.mapContainer}>
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
              title="Your Location"
              description="Live roadside coordinates"
              pinColor={theme.colors.blue}
            />
            {filteredMechanics.map((mechanic) =>
              mechanic.latitude != null && mechanic.longitude != null ? (
                <Marker
                  key={mechanic.user_id}
                  coordinate={{ latitude: mechanic.latitude, longitude: mechanic.longitude }}
                  title={mechanic.workshop_name || mechanic.profiles?.full_name || 'Mechanic'}
                  description={`${mechanic.distance_km.toFixed(1)} km away · ETA ~${mechanic.eta_minutes} min`}
                  pinColor={theme.colors.orange}
                  onPress={() => selectMechanic(mechanic)}
                />
              ) : null
            )}
          </MapView>
          <View style={styles.mapActions}>
            <OutlineButton
              label="Center on My Location"
              onPress={() => mapRef.current?.animateToRegion({
                ...coords,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              })}
            />
          </View>
        </View>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.placeholderText}>
            {Platform.OS === 'web'
              ? 'Interactive map ready. Available nearby mechanics are listed below.'
              : 'Allow location access to display your live position and nearby mechanics.'}
          </Text>
        </View>
      )}

      {/* Selected Mechanic Quick Spotlight */}
      {selectedMechanic && (
        <View style={styles.detailCard}>
          <View style={styles.cardTopRow}>
            <Text style={styles.name}>
              {selectedMechanic.workshop_name || selectedMechanic.profiles?.full_name || 'Mechanic'}
            </Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {Number(selectedMechanic.average_rating).toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {selectedMechanic.mechanic_type ?? 'Mechanic'} · {selectedMechanic.distance_km.toFixed(1)} km away · ETA ~{selectedMechanic.eta_minutes} min
          </Text>
          <Text style={styles.metaSub}>
            Specialties: {selectedMechanic.specialties?.join(', ') || 'General roadside repairs'}
          </Text>
          <View style={styles.availableRow}>
            <View style={styles.greenDot} />
            <Text style={styles.availability}>Verified & Available Now</Text>
          </View>
          <PrimaryButton
            variant="orange"
            label="Request This Mechanic"
            onPress={() => requestAssistance(selectedMechanic)}
          />
        </View>
      )}

      {/* Mechanics List */}
      {filteredMechanics.length === 0 ? (
        <EmptyState message={
          vehicleFilter === 'All'
            ? 'No verified mechanics with an active location were found nearby.'
            : `No available ${vehicleFilter.toLowerCase()} mechanics found nearby.`
        } />
      ) : (
        <FlatList
          data={filteredMechanics}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.name}>
                  {item.workshop_name || item.profiles?.full_name || 'Mechanic'}
                </Text>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>★ {Number(item.average_rating).toFixed(1)}</Text>
                </View>
              </View>

              <Text style={styles.meta}>
                {item.distance_km.toFixed(1)} km away · ETA ~{item.eta_minutes} min ({item.rating_count} reviews)
              </Text>
              <Text style={styles.metaSub}>
                {item.mechanic_type ?? 'Mechanic'} · {item.specialties?.join(', ') || 'General repairs'}
              </Text>

              <View style={styles.actionButtonsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => selectMechanic(item)}
                  style={styles.showMapButton}>
                  <Text style={styles.showMapText}>View on Map</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => requestAssistance(item)}
                  style={styles.requestButton}>
                  <Text style={styles.requestButtonText}>Request</Text>
                </Pressable>
              </View>
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
          <Text style={styles.refresh}>↻ Refresh GPS and mechanics</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  filters: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  filterText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  filterTextSelected: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  manualSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualField: {
    flex: 1,
  },
  mapContainer: {
    marginHorizontal: 16,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  map: {
    height: 260,
    width: '100%',
  },
  mapPlaceholder: {
    height: 100,
    marginHorizontal: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 8,
  },
  placeholderText: {
    color: theme.colors.primaryDark,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  mapActions: {
    padding: 8,
    backgroundColor: theme.colors.surface,
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    ...theme.shadows.cardElevated,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
    flex: 1,
  },
  ratingBadge: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ratingText: {
    color: theme.colors.yellowText,
    fontSize: 11,
    fontWeight: '800',
  },
  meta: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  metaSub: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  availability: {
    color: theme.colors.success,
    fontWeight: '700',
    fontSize: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  showMapButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  showMapText: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },
  requestButton: {
    flex: 1,
    backgroundColor: theme.colors.orange,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    ...theme.shadows.orangeButton,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  refreshSection: {
    padding: 16,
    alignItems: 'center',
  },
  refresh: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
});
