import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Marker } from '../roadside-map';
import type { NearbyMechanic } from '../../lib/mechanics';

export type MechanicMarkerViewProps = {
  mechanic: NearbyMechanic;
  isSelected: boolean;
};

export function MechanicMarkerView({
  mechanic,
  isSelected,
}: MechanicMarkerViewProps) {
  const isAvailable = mechanic.is_available !== false;
  const isBike = mechanic.mechanic_type === 'Bike Mechanic';

  const pinBgColor = !isAvailable
    ? '#94A3B8'
    : isSelected
    ? '#38B8E8'
    : '#38B8E8';

  const tipColor = pinBgColor;

  return (
    <View style={[styles.container, isSelected && styles.containerSelected]}>
      {/* Glow ring for selected state */}
      {isSelected && <View style={styles.selectedGlow} />}

      {/* Pin Head */}
      <View
        style={[
          styles.pinHead,
          { backgroundColor: pinBgColor },
          isSelected && styles.pinHeadSelected,
          !isAvailable && styles.pinHeadUnavailable,
        ]}>
        <Ionicons
          name="construct"
          size={isSelected ? 20 : 16}
          color="#FFFFFF"
        />

        {/* Vehicle Type mini badge */}
        <View
          style={[
            styles.vehicleBadge,
            isSelected && styles.vehicleBadgeSelected,
          ]}>
          <Ionicons
            name={isBike ? 'bicycle' : 'car'}
            size={isSelected ? 10 : 8}
            color="#0F172A"
          />
        </View>
      </View>

      {/* Pin Point Tip */}
      <View
        style={[
          styles.pinTip,
          { borderTopColor: tipColor },
          isSelected && styles.pinTipSelected,
        ]}
      />

      {/* Small ground shadow point */}
      <View style={styles.groundShadow} />
    </View>
  );
}

export type MechanicMarkerProps = {
  mechanic: NearbyMechanic;
  isSelected: boolean;
  onPress: (mechanic: NearbyMechanic) => void;
};

export const MechanicMarker = React.memo(function MechanicMarker({
  mechanic,
  isSelected,
  onPress,
}: MechanicMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const isAvailable = mechanic.is_available !== false;

  // Whenever selection or availability changes, briefly enable tracksViewChanges so Android captures the new view
  useEffect(() => {
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [isSelected, isAvailable, mechanic.latitude, mechanic.longitude]);

  if (mechanic.latitude == null || mechanic.longitude == null) {
    return null;
  }

  const coordinate = {
    latitude: Number(mechanic.latitude),
    longitude: Number(mechanic.longitude),
  };

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1.0 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={isSelected ? 999 : isAvailable ? 100 : 80}
      title={mechanic.workshop_name || mechanic.profiles?.full_name || 'Mechanic'}
      onPress={() => onPress(mechanic)}>
      <MechanicMarkerView mechanic={mechanic} isSelected={isSelected} />
    </Marker>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  containerSelected: {
    paddingBottom: 4,
  },
  selectedGlow: {
    position: 'absolute',
    top: -4,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 213, 42, 0.4)',
    borderWidth: 2,
    borderColor: '#FFD52A',
  },
  pinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  pinHeadSelected: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: '#FFD52A', // Vibrant yellow highlight border
    elevation: 10,
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  pinHeadUnavailable: {
    borderColor: '#F1F5F9',
    opacity: 0.9,
  },
  pinTip: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
    elevation: 3,
  },
  pinTipSelected: {
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    marginTop: -2,
  },
  vehicleBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFD52A',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleBadgeSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -4,
    right: -4,
  },
  groundShadow: {
    width: 10,
    height: 3,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: 1,
  },
});
