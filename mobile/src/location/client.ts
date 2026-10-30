import * as Location from 'expo-location';
import type { LocationFix } from './tracker';
export type LocationSubscription = { remove(): void };
export type LocationFailure = { message: string; denied: boolean };
export async function watchPlayerLocation(onFix: (fix: LocationFix) => void, onError: (error: LocationFailure) => void): Promise<LocationSubscription> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Location permission was denied. Allow location in the app settings, then try again.');
  if (!await Location.hasServicesEnabledAsync()) throw new Error('Location services are turned off. Enable them and try again.');
  return Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 }, fix => onFix({ latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy, speed: fix.coords.speed, timestamp: fix.timestamp }), message => onError({ message, denied: false }));
}
