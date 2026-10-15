import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

export async function getCurrentCoords(): Promise<
  { coords: Coords; error: null } | { coords: null; error: string }
> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { coords: null, error: 'Location permission was denied.' };
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    },
    error: null,
  };
}

export async function watchCurrentCoords(
  onCoords: (coords: Coords) => void
): Promise<Location.LocationSubscription> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to keep your position updated on the map.');
  }

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 15,
      timeInterval: 10000,
    },
    (position) => {
      onCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    }
  );
}
