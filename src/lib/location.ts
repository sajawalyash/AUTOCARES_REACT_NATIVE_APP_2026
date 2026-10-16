import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

export async function getCurrentCoords(): Promise<
  { coords: Coords; error: null } | { coords: null; error: string }
> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { coords: null, error: 'Location permission was denied.' };
    }

    let position = await Location.getLastKnownPositionAsync({}).catch(() => null);
    if (!position) {
      position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    }

    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      error: null,
    };
  } catch (err) {
    return {
      coords: null,
      error: err instanceof Error ? err.message : 'Could not get device location.',
    };
  }
}

export async function watchCurrentCoords(
  onCoords: (coords: Coords) => void
): Promise<Location.LocationSubscription | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    return await Location.watchPositionAsync(
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
  } catch {
    return null;
  }
}
