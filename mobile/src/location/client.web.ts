import type { LocationFailure, LocationSubscription } from './client';
import type { LocationFix } from './tracker';
export async function watchPlayerLocation(onFix: (fix: LocationFix) => void, onError: (error: LocationFailure) => void): Promise<LocationSubscription> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) throw new Error('This browser cannot provide location. Open the app over HTTPS or localhost in a browser with location support.');
  const id = navigator.geolocation.watchPosition(position => onFix({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp, speed: position.coords.speed }), error => {
    const message = error.code === 1 ? 'Location permission was denied. Allow location for this site in your browser, then try again.' : error.code === 3 ? 'Location is taking longer than expected. Check that device location is enabled or try near a window.' : 'Your device could not determine its location. Enable device location and try again.';
    onError({ message, denied: error.code === 1 });
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  return { remove: () => navigator.geolocation.clearWatch(id) };
}
