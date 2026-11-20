import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapView, { Circle, Marker, PROVIDER_GOOGLE } from '../../../components/roadside-map';
import { CustomerMarkerView } from '../../../components/map/customer-marker';
import { MechanicMarkerView } from '../../../components/map/mechanic-marker';
import { RadiusSelector } from '../../../components/map/radius-selector';
import { SearchThisAreaButton } from '../../../components/map/search-this-area-button';
import { MapLegend } from '../../../components/map/map-legend';
import { MechanicBottomSheet } from '../../../components/map/mechanic-bottom-sheet';
import { FloatingSearchBar } from '../../../components/map/floating-search-bar';
import { VehicleTypeFilters } from '../../../components/map/vehicle-type-filters';
import { FloatingMapControls } from '../../../components/map/floating-map-controls';
import { Field, Label, OutlineButton, PrimaryButton } from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { MECHANIC_TYPE_FOR_VEHICLE } from '../../../lib/ai';
import {
  DEFAULT_SEARCH_RADIUS_METERS,
  distanceKm,
  distanceMeters,
  etaMinutesFromDistance,
  formatDistance,
  SEARCH_RADII_METERS,
  type SearchRadiusMeters,
} from '../../../lib/geo';
import { getAddressFromCoords, getCurrentCoords, watchCurrentCoords } from '../../../lib/location';
import { getNearbyMechanics, type NearbyMechanic } from '../../../lib/mechanics';
import type { VehicleType } from '../../../lib/types';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as unknown as { executionEnvironment?: string }).executionEnvironment ===
    'storeClient';

// Core AutoCares Service Hub in Karachi (where registered approved workshops are located)
const KARACHI_HUB = {
  latitude: 24.9255,
  longitude: 67.0650,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const DEFAULT_REGION = KARACHI_HUB;

function isVehicleType(value: string | undefined): value is VehicleType {
  return value === 'Car' || value === 'Van' || value === 'Bike' || value === 'Scooter';
}

export default function MechanicsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ vehicleType?: string; problemType?: string }>();
  const mapRef = useRef<any>(null);
  const currentRegionRef = useRef(DEFAULT_REGION);

  // Core state
  const [mechanics, setMechanics] = useState<NearbyMechanic[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ latitude: number; longitude: number }>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [selectedRadius, setSelectedRadius] = useState<SearchRadiusMeters>(
    DEFAULT_SEARCH_RADIUS_METERS
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [filterSelection, setFilterSelection] = useState<{
    routeVehicleType?: string;
    filter: VehicleType | 'All';
  } | null>(null);

  const vehicleFilter =
    filterSelection && filterSelection.routeVehicleType === params.vehicleType
      ? filterSelection.filter
      : isVehicleType(params.vehicleType)
      ? params.vehicleType
      : 'All';

  // Interaction & UI state
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);
  const [pendingMapCenter, setPendingMapCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchingArea, setSearchingArea] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Manual GPS entry modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');

  // Fetch address label for search center
  const updateAddressLabel = useCallback(async (lat: number, lng: number) => {
    try {
      const address = await getAddressFromCoords(lat, lng);
      setLocationAddress(address);
    } catch {
      setLocationAddress(null);
    }
  }, []);

  // Primary loader for mechanics
  const load = useCallback(
    async (centerOverride?: { latitude: number; longitude: number }) => {
      setLoading(true);
      setError(null);

      let center = centerOverride || searchCenter;

      if (!centerOverride && !coords) {
        try {
          const loc = await getCurrentCoords();
          if (loc.coords) {
            setCoords(loc.coords);
            setPermissionDenied(false);
            setManualLatitude(String(loc.coords.latitude));
            setManualLongitude(String(loc.coords.longitude));

            // Check if customer GPS is in/near the Karachi service hub
            const distFromKarachi = distanceKm(
              loc.coords.latitude,
              loc.coords.longitude,
              KARACHI_HUB.latitude,
              KARACHI_HUB.longitude
            );

            if (distFromKarachi <= 50) {
              center = loc.coords;
              setSearchCenter(loc.coords);
              void updateAddressLabel(loc.coords.latitude, loc.coords.longitude);
            } else {
              // Remote simulator location (e.g. Android Emulator in Mountain View CA)
              center = KARACHI_HUB;
              setSearchCenter(KARACHI_HUB);
              void updateAddressLabel(KARACHI_HUB.latitude, KARACHI_HUB.longitude);
            }
          } else {
            setPermissionDenied(true);
            center = KARACHI_HUB;
            setSearchCenter(KARACHI_HUB);
            void updateAddressLabel(KARACHI_HUB.latitude, KARACHI_HUB.longitude);
            if (loc.error) {
              setError(loc.error);
            }
          }
        } catch (locErr) {
          setPermissionDenied(true);
          center = KARACHI_HUB;
          setSearchCenter(KARACHI_HUB);
          void updateAddressLabel(KARACHI_HUB.latitude, KARACHI_HUB.longitude);
          setError(locErr instanceof Error ? locErr.message : 'Could not retrieve device location.');
        }
      }

      // Fetch mechanics from backend around center
      try {
        const radiusKm = selectedRadius / 1000;
        const maxFetchKm = Math.max(radiusKm * 1.5, 30);
        const { mechanics: nearby, error: mechanicError } = await getNearbyMechanics(
          center.latitude,
          center.longitude,
          maxFetchKm,
          true // include both available and unavailable
        );

        if (mechanicError) {
          setError((prev) => (prev ? `${prev} · ${mechanicError}` : mechanicError));
        }

        setMechanics(nearby);

        // Center map to initial view
        if (!centerOverride) {
          mapRef.current?.animateToRegion({
            latitude: center.latitude,
            longitude: center.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : 'Could not load mechanics.');
      } finally {
        setLoading(false);
      }
    },
    [coords, searchCenter, selectedRadius, updateAddressLabel]
  );

  // Screen focus effect: load data & watch GPS position
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
          // GPS watch not available; static coords suffice
        }
      })();

      return () => {
        focused = false;
        subscription?.remove();
      };
    }, [load])
  );

  // Recalculate distance from active search center and filter by radius
  const radiusFilteredMechanics = useMemo(() => {
    return mechanics
      .filter((m) => {
        if (m.latitude == null || m.longitude == null) return false;
        const lat = Number(m.latitude);
        const lng = Number(m.longitude);
        if (isNaN(lat) || isNaN(lng)) return false;

        // Actual geographical distance check in meters
        const meters = distanceMeters(
          searchCenter.latitude,
          searchCenter.longitude,
          lat,
          lng
        );
        return meters <= selectedRadius;
      })
      .map((m) => {
        const km = distanceKm(
          searchCenter.latitude,
          searchCenter.longitude,
          Number(m.latitude),
          Number(m.longitude)
        );
        return {
          ...m,
          distance_km: km,
          eta_minutes: etaMinutesFromDistance(km),
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km);
  }, [mechanics, searchCenter, selectedRadius]);

  // Apply Vehicle Filter and Search Query
  const filteredMechanics = useMemo(() => {
    return radiusFilteredMechanics.filter((mechanic) => {
      // Vehicle type filter
      if (vehicleFilter !== 'All') {
        const targetType = MECHANIC_TYPE_FOR_VEHICLE[vehicleFilter];
        const matchesType = mechanic.mechanic_type === targetType;
        const matchesSpecialty = mechanic.specialties?.some((s) =>
          s.toLowerCase().includes(vehicleFilter.toLowerCase())
        );
        if (!matchesType && !matchesSpecialty) {
          return false;
        }
      }

      // Text search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const name = (
          mechanic.workshop_name ||
          mechanic.profiles?.full_name ||
          ''
        ).toLowerCase();
        const specialties = (mechanic.specialties || []).join(' ').toLowerCase();
        const type = (mechanic.mechanic_type || '').toLowerCase();
        return name.includes(q) || specialties.includes(q) || type.includes(q);
      }

      return true;
    });
  }, [radiusFilteredMechanics, vehicleFilter, searchQuery]);

  // Active selected mechanic
  const selectedMechanic = useMemo(() => {
    if (!selectedMechanicId) return null;
    return filteredMechanics.find((m) => m.user_id === selectedMechanicId) ?? null;
  }, [filteredMechanics, selectedMechanicId]);

  const effectiveSelectedMechanicId = selectedMechanic ? selectedMechanic.user_id : null;

  // Marker / Card Selection Handler
  const handleSelectMechanic = useCallback((mechanic: NearbyMechanic) => {
    setSelectedMechanicId(mechanic.user_id);
    if (mechanic.latitude != null && mechanic.longitude != null) {
      mapRef.current?.animateToRegion({
        latitude: Number(mechanic.latitude),
        longitude: Number(mechanic.longitude),
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedMechanicId(null);
  }, []);

  // Map Region Change Handler
  const handleRegionChangeComplete = useCallback(
    (region: any) => {
      if (!region) return;
      currentRegionRef.current = region;

      // Check distance between current map center and current search center
      const movedMeters = distanceMeters(
        searchCenter.latitude,
        searchCenter.longitude,
        region.latitude,
        region.longitude
      );

      // If moved meaningfully (> 350 meters), show "Search This Area" button
      if (movedMeters > 350) {
        setPendingMapCenter({
          latitude: region.latitude,
          longitude: region.longitude,
        });
        setShowSearchThisArea(true);
      } else {
        setShowSearchThisArea(false);
      }
    },
    [searchCenter]
  );

  // "Search This Area" Action
  const handleSearchThisArea = useCallback(async () => {
    if (!pendingMapCenter) return;
    setSearchingArea(true);
    setShowSearchThisArea(false);

    setSearchCenter(pendingMapCenter);
    void updateAddressLabel(pendingMapCenter.latitude, pendingMapCenter.longitude);

    try {
      const radiusKm = selectedRadius / 1000;
      const { mechanics: nearby } = await getNearbyMechanics(
        pendingMapCenter.latitude,
        pendingMapCenter.longitude,
        Math.max(radiusKm * 1.5, 30),
        true
      );
      setMechanics(nearby);
    } catch {
      // Keep existing list if failed
    } finally {
      setSearchingArea(false);
    }
  }, [pendingMapCenter, selectedRadius, updateAddressLabel]);

  // Recenter on Customer GPS Location
  const handleRecenterCustomer = useCallback(() => {
    setShowSearchThisArea(false);
    if (coords) {
      const distFromKarachi = distanceKm(
        coords.latitude,
        coords.longitude,
        KARACHI_HUB.latitude,
        KARACHI_HUB.longitude
      );

      const target = distFromKarachi <= 50 ? coords : KARACHI_HUB;
      setSearchCenter(target);
      void updateAddressLabel(target.latitude, target.longitude);
      mapRef.current?.animateToRegion({
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      void load(target);
    } else {
      void load();
    }
  }, [coords, load, updateAddressLabel]);

  // Zoom In / Out
  const handleZoomIn = useCallback(() => {
    const cur = currentRegionRef.current;
    const newRegion = {
      ...cur,
      latitudeDelta: Math.max(0.003, cur.latitudeDelta / 2),
      longitudeDelta: Math.max(0.003, cur.longitudeDelta / 2),
    };
    currentRegionRef.current = newRegion;
    mapRef.current?.animateToRegion(newRegion);
  }, []);

  const handleZoomOut = useCallback(() => {
    const cur = currentRegionRef.current;
    const newRegion = {
      ...cur,
      latitudeDelta: Math.min(1.5, cur.latitudeDelta * 2),
      longitudeDelta: Math.min(1.5, cur.longitudeDelta * 2),
    };
    currentRegionRef.current = newRegion;
    mapRef.current?.animateToRegion(newRegion);
  }, []);

  // Fit all markers
  const handleFitMarkers = useCallback(() => {
    const points: { latitude: number; longitude: number }[] = [];
    if (coords) points.push(coords);
    filteredMechanics.forEach((m) => {
      if (m.latitude != null && m.longitude != null) {
        points.push({ latitude: Number(m.latitude), longitude: Number(m.longitude) });
      }
    });

    if (points.length === 0) {
      handleRecenterCustomer();
      return;
    }

    if (points.length === 1) {
      mapRef.current?.animateToRegion({
        latitude: points[0].latitude,
        longitude: points[0].longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
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
    const latDelta = Math.max(0.015, (maxLat - minLat) * 1.35);
    const lngDelta = Math.max(0.015, (maxLng - minLng) * 1.35);

    const fitRegion = {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
    currentRegionRef.current = fitRegion;
    mapRef.current?.animateToRegion(fitRegion);
  }, [coords, filteredMechanics, handleRecenterCustomer]);

  // Radius change handler
  const handleSelectRadius = useCallback(
    (radius: SearchRadiusMeters) => {
      setSelectedRadius(radius);
      // Zoom map smoothly to accommodate radius
      const delta = (radius / 1000) * 0.018;
      mapRef.current?.animateToRegion({
        latitude: searchCenter.latitude,
        longitude: searchCenter.longitude,
        latitudeDelta: Math.max(0.02, delta),
        longitudeDelta: Math.max(0.02, delta),
      });
    },
    [searchCenter]
  );

  // Expand radius automatically when empty
  const handleExpandRadius = useCallback(() => {
    const currentIndex = SEARCH_RADII_METERS.indexOf(selectedRadius);
    const nextRadius =
      currentIndex < SEARCH_RADII_METERS.length - 1
        ? SEARCH_RADII_METERS[currentIndex + 1]
        : SEARCH_RADII_METERS[SEARCH_RADII_METERS.length - 1];
    handleSelectRadius(nextRadius);
  }, [selectedRadius, handleSelectRadius]);

  // Request Roadside Assistance
  const handleRequestAssistance = useCallback(
    (mechanic: NearbyMechanic) => {
      router.push({
        pathname: '/(customer)/request',
        params: {
          mechanicHint: mechanic.user_id,
          eta: String(mechanic.eta_minutes),
          problemType: params.problemType,
          vehicleType: vehicleFilter === 'All' ? params.vehicleType : vehicleFilter,
        },
      });
    },
    [params.problemType, params.vehicleType, vehicleFilter]
  );

  // Manual Coordinates Search
  const handleSearchManualCoords = useCallback(async () => {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError('Enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    setShowManualModal(false);
    const newCenter = { latitude, longitude };
    setSearchCenter(newCenter);
    setCoords(newCenter);
    setPermissionDenied(false);
    void updateAddressLabel(latitude, longitude);

    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
    void load(newCenter);
  }, [manualLatitude, manualLongitude, load, updateAddressLabel]);

  const initialRegion = {
    latitude: searchCenter.latitude,
    longitude: searchCenter.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  };

  return (
    <View style={styles.rootContainer}>
      {/* FULL-SCREEN GOOGLE MAP */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : isExpoGo ? undefined : PROVIDER_GOOGLE}
        style={styles.fullMap}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}>
        {/* Search Radius Circle Overlay */}
        <Circle
          center={searchCenter}
          radius={selectedRadius}
          strokeColor="#38B8E8"
          strokeWidth={2}
          fillColor="rgba(56, 184, 232, 0.15)"
          zIndex={10}
        />

        {/* Customer Location Pointer (Blue GPS Dot) */}
        {coords && (
          <Marker
            coordinate={coords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            title="Your Location"
            description="Live GPS Position"
            zIndex={50}>
            <CustomerMarkerView />
          </Marker>
        )}

        {/* Custom Mechanic Markers (Blue Teardrop Wrench Pins) */}
        {filteredMechanics.map((mechanic) => {
          const isSelected = effectiveSelectedMechanicId === mechanic.user_id;
          const isAvailable = mechanic.is_available !== false;
          return (
            <Marker
              key={mechanic.user_id}
              coordinate={{
                latitude: Number(mechanic.latitude),
                longitude: Number(mechanic.longitude),
              }}
              anchor={{ x: 0.5, y: 1.0 }}
              tracksViewChanges={false}
              zIndex={isSelected ? 999 : isAvailable ? 100 : 80}
              title={mechanic.workshop_name || mechanic.profiles?.full_name || 'Mechanic'}
              description={
                isAvailable
                  ? `${formatDistance(mechanic.distance_km)} away · Available`
                  : `${formatDistance(mechanic.distance_km)} away · Busy`
              }
              onPress={() => handleSelectMechanic(mechanic)}>
              <MechanicMarkerView mechanic={mechanic} isSelected={isSelected} />
            </Marker>
          );
        })}
      </MapView>

      {/* TOP FLOATING OVERLAY: Search Bar & Vehicle Filters */}
      <View style={[styles.topFloatingSection, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        {/* Floating Search Bar */}
        <FloatingSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          locationLabel={locationAddress}
          onRecenterCustomer={handleRecenterCustomer}
          hasGpsLocation={Boolean(coords)}
        />

        {/* Vehicle Type Filter Chips */}
        <VehicleTypeFilters
          selectedFilter={vehicleFilter}
          onSelectFilter={(filter) =>
            setFilterSelection({
              routeVehicleType: params.vehicleType,
              filter,
            })
          }
        />

        {/* Error or Permission Alert Banner */}
        {error ? (
          <Pressable onPress={() => setError(null)} style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={15} color={theme.colors.danger} />
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {error}
            </Text>
            <Ionicons name="close" size={14} color={theme.colors.danger} />
          </Pressable>
        ) : null}

        {permissionDenied && !coords ? (
          <Pressable onPress={() => setShowManualModal(true)} style={styles.permissionBanner}>
            <Ionicons name="location-outline" size={15} color={theme.colors.orangeDark} />
            <Text style={styles.permissionBannerText} numberOfLines={2}>
              GPS permission unavailable. Tap to enter custom coordinates or pan map.
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.orangeDark} />
          </Pressable>
        ) : null}
      </View>

      {/* SEARCH THIS AREA BUTTON */}
      <SearchThisAreaButton
        visible={showSearchThisArea}
        loading={searchingArea}
        onPress={handleSearchThisArea}
      />

      {/* RIGHT-SIDE FLOATING CONTROLS: Recenter, Zoom, Markers */}
      <View style={styles.rightControlsContainer} pointerEvents="box-none">
        <FloatingMapControls
          hasCoords={Boolean(coords)}
          onRecenter={handleRecenterCustomer}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitMarkers={handleFitMarkers}
          hasMarkers={filteredMechanics.length > 0}
          onToggleManualCoords={() => setShowManualModal(true)}
          manualMode={showManualModal}
        />
      </View>

      {/* FLOATING RADIUS SELECTOR (Compact floating card above bottom sheet) */}
      <View style={styles.radiusSelectorContainer} pointerEvents="box-none">
        <RadiusSelector
          selectedRadius={selectedRadius}
          onSelectRadius={handleSelectRadius}
        />
      </View>

      {/* MAP LEGEND (Bottom Left above sheet) */}
      <View style={styles.legendContainer} pointerEvents="box-none">
        <MapLegend hasSelected={Boolean(selectedMechanic)} />
      </View>

      {/* LOADING OVERLAY BADGE */}
      {loading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color="#38B8E8" />
          <Text style={styles.loadingBadgeText}>Updating mechanics…</Text>
        </View>
      )}

      {/* EXPANDABLE BOTTOM SHEET: List, Preview Card & Request Integration */}
      <MechanicBottomSheet
        mechanics={filteredMechanics}
        selectedMechanic={selectedMechanic}
        onSelectMechanic={handleSelectMechanic}
        onClearSelection={handleClearSelection}
        onRequestAssistance={handleRequestAssistance}
        onExpandRadius={handleExpandRadius}
        selectedRadius={selectedRadius}
      />

      {/* MANUAL COORDINATES MODAL */}
      <Modal
        visible={showManualModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManualModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Custom Coordinates</Text>
              <Pressable
                onPress={() => setShowManualModal(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <Label>Latitude & Longitude</Label>
            <View style={styles.modalInputRow}>
              <Field
                value={manualLatitude}
                onChangeText={setManualLatitude}
                placeholder="Latitude (e.g. 24.8607)"
                keyboardType="decimal-pad"
                style={{ flex: 1 }}
              />
              <Field
                value={manualLongitude}
                onChangeText={setManualLongitude}
                placeholder="Longitude (e.g. 67.0011)"
                keyboardType="decimal-pad"
                style={{ flex: 1 }}
              />
            </View>

            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <OutlineButton
                  label="Cancel"
                  onPress={() => setShowManualModal(false)}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <PrimaryButton
                  label="Search Coordinates"
                  onPress={() => void handleSearchManualCoords()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F5F8FA',
    position: 'relative',
  },
  fullMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topFloatingSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 80,
    gap: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 3,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5E6',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 3,
  },
  permissionBannerText: {
    color: '#A35200',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  rightControlsContainer: {
    position: 'absolute',
    right: 16,
    top: 210,
    zIndex: 70,
  },
  radiusSelectorContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 236, // positioned comfortably right above the collapsed bottom sheet
    zIndex: 75,
  },
  legendContainer: {
    position: 'absolute',
    left: 16,
    bottom: 304,
    zIndex: 70,
  },
  loadingBadge: {
    position: 'absolute',
    top: 175,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#38B8E8',
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 85,
  },
  loadingBadgeText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
