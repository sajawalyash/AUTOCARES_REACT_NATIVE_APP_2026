import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from '../roadside-map';

export function CustomerMarkerView() {
  return (
    <View style={styles.container}>
      <View style={styles.pulseRing} />
      <View style={styles.whiteRing}>
        <View style={styles.innerDot} />
      </View>
    </View>
  );
}

export type CustomerLocationMarkerProps = {
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

export const CustomerLocationMarker = React.memo(function CustomerLocationMarker({
  coordinate,
}: CustomerLocationMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  // Freeze bitmap tracking after mounting for Android 60fps performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [coordinate.latitude, coordinate.longitude]);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={50}
      title="Your Location"
      description="Live GPS Position">
      <CustomerMarkerView />
    </Marker>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 184, 232, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 184, 232, 0.45)',
  },
  whiteRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  innerDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#38B8E8',
  },
});
