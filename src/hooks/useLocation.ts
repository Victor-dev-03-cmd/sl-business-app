import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  watchPosition?: boolean;
  timeInterval?: number; // milliseconds between updates (default: 2000)
  distanceInterval?: number; // meters moved between updates (default: 3)
  minAccuracy?: number; // minimum acceptable accuracy in meters (default: 50)
  onLocationUpdate?: (location: Location.LocationObject) => void;
  onError?: (error: string) => void;
}

const DEFAULT_COORDS = { latitude: 6.9271, longitude: 79.8612 }; // Colombo

/**
 * Custom hook for location tracking in Expo apps
 *
 * @example Single location fetch
 * const { location, getCurrentLocation, isLoading } = useLocation();
 *
 * @example Live tracking (for delivery/rider apps)
 * const { location } = useLocation({
 *   watchPosition: true,
 *   timeInterval: 2000,
 *   distanceInterval: 3,
 *   onLocationUpdate: (loc) => console.log(loc.coords)
 * });
 */
export const useLocation = (options: UseLocationOptions = {}) => {
  const {
    enableHighAccuracy = true,
    watchPosition = false,
    timeInterval = 2000,
    distanceInterval = 3,
    minAccuracy = 50,
    onLocationUpdate,
    onError,
  } = options;

  const [location, setLocation] = useState<LocationState>({
    latitude: DEFAULT_COORDS.latitude,
    longitude: DEFAULT_COORDS.longitude,
    accuracy: null,
    isLoading: false,
    error: null,
  });

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const error = 'Location permission denied';
        setLocation((prev) => ({ ...prev, error, isLoading: false }));
        onError?.(error);
        return false;
      }
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to request location permission';
      setLocation((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  const validateAccuracy = useCallback(
    (coords: Location.LocationObjectCoords): boolean => {
      if (!coords.accuracy || coords.accuracy > minAccuracy) {
        console.warn(
          `Low GPS accuracy: ${coords.accuracy}m. Consider moving to an open area or enabling High Accuracy mode.`
        );
        return false;
      }
      return true;
    },
    [minAccuracy]
  );

  const getCurrentLocation = useCallback(async (): Promise<Location.LocationObject | null> => {
    setLocation((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return null;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: enableHighAccuracy
          ? Location.Accuracy.BestForNavigation
          : Location.Accuracy.Balanced,
      });

      const isAccurate = validateAccuracy(loc.coords);

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || null,
        isLoading: false,
        error: isAccurate ? null : 'Low GPS accuracy',
      });

      return loc;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to get location';
      setLocation((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      onError?.(errorMessage);
      return null;
    }
  }, [requestPermission, enableHighAccuracy, validateAccuracy, onError]);

  const startWatching = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: enableHighAccuracy
            ? Location.Accuracy.BestForNavigation
            : Location.Accuracy.Balanced,
          timeInterval,
          distanceInterval,
        },
        (loc) => {
          const isAccurate = validateAccuracy(loc.coords);

          // Only update if accuracy is acceptable
          if (isAccurate) {
            setLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy || null,
              isLoading: false,
              error: null,
            });
            onLocationUpdate?.(loc);
          }
        }
      );

      subscriptionRef.current = subscription;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to start location tracking';
      setLocation((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  }, [
    requestPermission,
    enableHighAccuracy,
    timeInterval,
    distanceInterval,
    validateAccuracy,
    onLocationUpdate,
    onError,
  ]);

  const stopWatching = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (watchPosition) {
      startWatching();
    }

    return () => {
      stopWatching();
    };
  }, [watchPosition, startWatching, stopWatching]);

  return {
    location,
    getCurrentLocation,
    startWatching,
    stopWatching,
    isLoading: location.isLoading,
    error: location.error,
    accuracy: location.accuracy,
  };
};
