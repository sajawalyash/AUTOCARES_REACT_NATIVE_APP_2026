import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  Field,
  Label,
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

const DEFAULT_REGION = {
  latitude: 24.8607,
  longitude: 67.0011,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MechanicsScreen() {
  const params = useLocalSearchParams<{ vehicleType?: string; problemType?: string }>();
  const mapRef = useRef<any>(null);
  const currentRegionRef = useRef(DEFAULT_REGION);

  const [mechanics, setMechanics] = useState<NearbyMechanic[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
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

    let customerLocation: { latitude: number; longitude: number } | null = null;
    try {
      const loc = await getCurrentCoords();
      if (loc.coords) {
        customerLocation = loc.coords;
        setCoords(loc.coords);
        setPermissionDenied(false);
        setManualLatitude(String(loc.coords.latitude));
        setManualLongitude(String(loc.coords.longitude));
      } else {
        setPermissionDenied(true);
        if (loc.error) {
          setError(loc.error);
        }
      }
    } catch (locErr) {
      setPermissionDenied(true);
      setError(locErr instanceof Error ? locErr.message : 'Could not retrieve device location.');
    }

    // Always fetch mechanics whether user location is available or not
    try {
      const { mechanics: nearby, error: mechanicError } = await getNearbyMechanics(
        customerLocation?.latitude,
        customerLocation?.longitude
      );
      if (mechanicError) {
        setError((prev) => (prev ? `${prev} · ${mechanicError}` : mechanicError));
      }
      setMechanics(nearby);

      // If customer location is available, center map
      if (customerLocation) {
        mapRef.current?.animateToRegion({
          ...customerLocation,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } else if (nearby.length > 0 && nearby[0].latitude != null && nearby[0].longitude != null) {
        // If customer location unavailable, center on first mechanic
        mapRef.current?.animateToRegion({
          latitude: Number(nearby[0].latitude),
          longitude: Number(nearby[0].longitude),
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        });
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Could not load nearby mechanics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let focused = true;
      let subscription: { remove: () => void } | null = null;

      void (async () => {
        await load();
        try {
          const sub = await watchCurrentCoords((nextCoords) => {
            if (!focused) return;
            setCoords(nextCoords);
            setPermissionDenied(false);
            setManualLatitude(String(nextCoords.latitude));
            setManualLongitude(String(nextCoords.longitude));
          });
          if (focused && sub) {
            subscription = sub;
          } else if (sub) {
            sub.remove();
          }
        } catch {
          // Live location watch failed or not permitted; static coords from load() will suffice
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
            Number(mechanic.latitude),
            Number(mechanic.longitude)
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
        latitude: Number(mechanic.latitude),
        longitude: Number(mechanic.longitude),
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      });
    }
  }

  function recenterCustomer() {
    if (coords) {
      mapRef.current?.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    } else {
      void load();
    }
  }

  function zoomIn() {
    const cur = currentRegionRef.current;
    const newRegion = {
      ...cur,
      latitudeDelta: Math.max(0.005, cur.latitudeDelta / 2),
      longitudeDelta: Math.max(0.005, cur.longitudeDelta / 2),
    };
    currentRegionRef.current = newRegion;
    mapRef.current?.animateToRegion(newRegion);
  }

  function zoomOut() {
    const cur = currentRegionRef.current;
    const newRegion = {
      ...cur,
      latitudeDelta: Math.min(1.5, cur.latitudeDelta * 2),
      longitudeDelta: Math.min(1.5, cur.longitudeDelta * 2),
    };
    currentRegionRef.current = newRegion;
    mapRef.current?.animateToRegion(newRegion);
  }

  function fitAllMarkers() {
    const points: { latitude: number; longitude: number }[] = [];
    if (coords) points.push(coords);
    filteredMechanics.forEach((m) => {
      if (m.latitude != null && m.longitude != null) {
        points.push({ latitude: Number(m.latitude), longitude: Number(m.longitude) });
      }
    });

    if (points.length === 0) {
      recenterCustomer();
      return;
    }

    if (points.length === 1) {
      mapRef.current?.animateToRegion({
        latitude: points[0].latitude,
        longitude: points[0].longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
      return;
    }

    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;

    points.forEach((p) => {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    });

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const latDelta = Math.max(0.02, (maxLat - minLat) * 1.4);
    const lngDelta = Math.max(0.02, (maxLng - minLng) * 1.4);

    const fitRegion = {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
    currentRegionRef.current = fitRegion;
    mapRef.current?.animateToRegion(fitRegion);
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
      setPermissionDenied(false);
      setMechanics(nearby);
      setError(searchError);
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
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

  const initialRegion = {
    latitude: coords?.latitude ?? (mechanics[0]?.latitude ?? DEFAULT_REGION.latitude),
    longitude: coords?.longitude ?? (mechanics[0]?.longitude ?? DEFAULT_REGION.longitude),
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }} safeBottom={false}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Title>Available Mechanics</Title>
            <Subtitle>
              Live Google Maps view with real-time mechanic availability.
            </Subtitle>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh mechanics"
            onPress={() => void load()}
            style={styles.headerRefreshBtn}>
            <Ionicons name="refresh" size={18} color={theme.colors.primaryDark} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {permissionDenied && !coords ? (
          <View style={styles.permissionBanner}>
            <Ionicons name="location-outline" size={16} color={theme.colors.orangeDark} />
            <Text style={styles.permissionText}>
              Location permission denied. Map is showing default view. Tap GPS button to retry or enter coordinates below.
            </Text>
          </View>
        ) : null}
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

      {/* Google Maps View - Always rendered on screen */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : (isExpoGo ? undefined : PROVIDER_GOOGLE)}
          style={styles.map}
          initialRegion={initialRegion}
          onRegionChangeComplete={(r: any) => {
            if (r) currentRegionRef.current = r;
          }}>
          {/* Customer Location Marker */}
          {coords && (
            <Marker
              coordinate={coords}
              title="Your Location"
              description="Live customer position"
              pinColor={theme.colors.blue}
            />
          )}

          {/* Mechanic Markers */}
          {filteredMechanics.map((mechanic) =>
            mechanic.latitude != null && mechanic.longitude != null ? (
              <Marker
                key={mechanic.user_id}
                coordinate={{ latitude: Number(mechanic.latitude), longitude: Number(mechanic.longitude) }}
                title={mechanic.workshop_name || mechanic.profiles?.full_name || 'Mechanic'}
                description={
                  mechanic.distance_km > 0
                    ? `${mechanic.distance_km.toFixed(1)} km away · ETA ~${mechanic.eta_minutes} min`
                    : `${mechanic.mechanic_type ?? 'Mechanic'} · Available`
                }
                pinColor={selectedMechanicId === mechanic.user_id ? theme.colors.yellow : theme.colors.orange}
                onPress={() => selectMechanic(mechanic)}
              />
            ) : null
          )}
        </MapView>

        {/* Floating Map Controls */}
        <View style={styles.mapFloatingControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recenter on my location"
            style={[styles.mapControlBtn, coords && styles.mapControlBtnActive]}
            onPress={recenterCustomer}>
            <Ionicons
              name={coords ? 'locate' : 'locate-outline'}
              size={20}
              color={coords ? theme.colors.primary : theme.colors.textSecondary}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            style={styles.mapControlBtn}
            onPress={zoomIn}>
            <Ionicons name="add" size={20} color={theme.colors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            style={styles.mapControlBtn}
            onPress={zoomOut}>
            <Ionicons name="remove" size={20} color={theme.colors.text} />
          </Pressable>

          {filteredMechanics.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fit all markers"
              style={styles.mapControlBtn}
              onPress={fitAllMarkers}>
              <Ionicons name="scan-outline" size={18} color={theme.colors.primaryDark} />
            </Pressable>
          )}
        </View>

        {/* Loading overlay badge */}
        {loading && (
          <View style={styles.mapLoadingBadge}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.mapLoadingText}>Updating mechanics…</Text>
          </View>
        )}

        {/* Map Legend */}
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.blue }]} />
            <Text style={styles.legendText}>You</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.orange }]} />
            <Text style={styles.legendText}>Mechanic</Text>
          </View>
          {selectedMechanic && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.yellow }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          )}
        </View>
      </View>

      {/* Manual GPS fallback toggle */}
      <View style={styles.manualToggleSection}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setManualMode(!manualMode)}
          style={styles.manualToggleBtn}>
          <Ionicons
            name={manualMode ? 'chevron-up-outline' : 'options-outline'}
            size={14}
            color={theme.colors.muted}
          />
          <Text style={styles.manualToggleText}>
            {manualMode ? 'Hide coordinate search' : 'Search by custom coordinates'}
          </Text>
        </Pressable>
      </View>

      {manualMode && (
        <View style={styles.manualSection}>
          <Label>Search location manually (coordinates)</Label>
          <View style={styles.manualRow}>
            <Field
              value={manualLatitude}
              onChangeText={setManualLatitude}
              placeholder="Latitude (e.g. 24.8607)"
              keyboardType="decimal-pad"
              style={styles.manualField}
            />
            <Field
              value={manualLongitude}
              onChangeText={setManualLongitude}
              placeholder="Longitude (e.g. 67.0011)"
              keyboardType="decimal-pad"
              style={styles.manualField}
            />
          </View>
          <PrimaryButton label="Search Coordinates" onPress={() => void searchManualLocation()} />
        </View>
      )}

      {/* Selected Mechanic Spotlight Card */}
      {selectedMechanic && (
        <View style={styles.detailCard}>
          <View style={styles.cardTopRow}>
            <Text style={styles.name}>
              {selectedMechanic.workshop_name || selectedMechanic.profiles?.full_name || 'Mechanic'}
            </Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {Number(selectedMechanic.average_rating || 0).toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {selectedMechanic.mechanic_type ?? 'Mechanic'}
            {selectedMechanic.distance_km > 0
              ? ` · ${selectedMechanic.distance_km.toFixed(1)} km away · ETA ~${selectedMechanic.eta_minutes} min`
              : ' · Available'}
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

      {/* Mechanics List or Empty State */}
      {filteredMechanics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="location-outline" size={32} color={theme.colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>No mechanics available nearby</Text>
          <Text style={styles.emptySubtitle}>
            {vehicleFilter === 'All'
              ? 'No mechanics are currently active in this area. Please try again later.'
              : `No available ${vehicleFilter.toLowerCase()} mechanics found nearby. Try selecting "All Vehicles" or search again.`}
          </Text>
          <View style={styles.emptyActions}>
            <OutlineButton label="Refresh Nearby Mechanics" onPress={() => void load()} />
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredMechanics}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isSelected = item.user_id === selectedMechanicId;
            return (
              <View style={[styles.card, isSelected && styles.cardSelected]}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.name}>
                    {item.workshop_name || item.profiles?.full_name || 'Mechanic'}
                  </Text>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>★ {Number(item.average_rating || 0).toFixed(1)}</Text>
                  </View>
                </View>

                <Text style={styles.meta}>
                  {item.distance_km > 0
                    ? `${item.distance_km.toFixed(1)} km away · ETA ~${item.eta_minutes} min`
                    : 'Location available'}
                  {item.rating_count ? ` (${item.rating_count} reviews)` : ''}
                </Text>
                <Text style={styles.metaSub}>
                  {item.mechanic_type ?? 'Mechanic'} · {item.specialties?.join(', ') || 'General repairs'}
                </Text>

                <View style={styles.actionButtonsRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => selectMechanic(item)}
                    style={[styles.showMapButton, isSelected && styles.showMapButtonSelected]}>
                    <Ionicons
                      name="map-outline"
                      size={14}
                      color={isSelected ? theme.colors.primaryDark : theme.colors.textSecondary}
                    />
                    <Text style={[styles.showMapText, isSelected && styles.showMapTextSelected]}>
                      View on Map
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => requestAssistance(item)}
                    style={styles.requestButton}>
                    <Text style={styles.requestButtonText}>Request</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.danger,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  errorBannerText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.warningLight,
    borderColor: theme.colors.warning,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  permissionText: {
    color: theme.colors.orangeText,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  filters: {
    gap: 8,
    paddingBottom: 2,
  },
  filterChip: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
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
  },
  mapContainer: {
    marginHorizontal: 16,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    height: 280,
    ...theme.shadows.cardElevated,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapFloatingControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 6,
  },
  mapControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  mapControlBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  mapLoadingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  mapLoadingText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  manualToggleSection: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  manualToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manualToggleText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  manualSection: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualField: {
    flex: 1,
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    ...theme.shadows.cardElevated,
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
    fontSize: 15,
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
    marginBottom: 10,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  availability: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    maxWidth: 280,
  },
  emptyActions: {
    width: '100%',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
    ...theme.shadows.card,
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    backgroundColor: theme.colors.primaryLight,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  showMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  showMapButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  showMapText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  showMapTextSelected: {
    color: theme.colors.primaryDark,
  },
  requestButton: {
    flex: 1,
    backgroundColor: theme.colors.orange,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.orangeButton,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
