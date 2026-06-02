import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  gpsEnabled: boolean | null;
}

export interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  watchPosition?: boolean;
  timeInterval?: number; // milliseconds between updates (default: 2000)
  distanceInterval?: number; // meters moved between updates (default: 3)
  minAccuracy?: number; // minimum acceptable accuracy in meters (default: 50)
  maxWaitTime?: number; // max time to wait for good GPS fix in ms (default: 15000)
  retryAttempts?: number; // number of retry attempts for location (default: 3)
  onLocationUpdate?: (location: Location.LocationObject) => void;
  onError?: (error: string) => void;
  onPermissionDenied?: () => void;
}

const DEFAULT_COORDS = { latitude: 6.9271, longitude: 79.8612 }; // Colombo

/**
 * Enhanced custom hook for location tracking in Expo apps with improved GPS accuracy
 *
 * @example Single location fetch with high accuracy
 * const { location, getCurrentLocation, isLoading, accuracy } = useLocation({
 *   enableHighAccuracy: true,
 *   minAccuracy: 30,
 *   maxWaitTime: 20000
 * });
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
    maxWaitTime = 15000,
    retryAttempts = 3,
    onLocationUpdate,
    onError,
    onPermissionDenied,
  } = options;

  const [location, setLocation] = useState<LocationState>({
    latitude: DEFAULT_COORDS.latitude,
    longitude: DEFAULT_COORDS.longitude,
    accuracy: null,
    isLoading: false,
    error: null,
    permissionStatus: null,
    gpsEnabled: null,
  });

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Check if GPS/Location services are enabled on the device
   */
  const checkLocationEnabled = useCallback(async (): Promise<boolean> => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      setLocation((prev) => ({ ...prev, gpsEnabled: enabled }));

      if (!enabled) {
        const error = 'GPS/Location services are disabled. Please enable them in your device settings.';
        setLocation((prev) => ({ ...prev, error }));
        onError?.(error);
        return false;
      }
      return true;
    } catch (error: any) {
      console.warn('Failed to check location services:', error);
      return true; // Assume enabled if check fails
    }
  }, [onError]);

  /**
   * Request and verify location permissions
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Check current permission status first
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      setLocation((prev) => ({ ...prev, permissionStatus: existingStatus }));

      if (existingStatus === 'granted') {
        return true;
      }

      // Request permission if not granted
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocation((prev) => ({ ...prev, permissionStatus: status }));

      if (status !== 'granted') {
        const error = 'Location permission denied. Please enable location access in your device settings.';
        setLocation((prev) => ({ ...prev, error, isLoading: false }));
        onError?.(error);
        onPermissionDenied?.();
        return false;
      }

      return true;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to request location permission';
      setLocation((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
      return false;
    }
  }, [onError, onPermissionDenied]);

  /**
   * Validate location accuracy
   */
  const validateAccuracy = useCallback(
    (coords: Location.LocationObjectCoords): boolean => {
      if (!coords.accuracy || coords.accuracy > minAccuracy) {
        console.warn(
          `Low GPS accuracy: ${coords.accuracy?.toFixed(1)}m (target: ${minAccuracy}m). Consider moving to an open area.`
        );
        return false;
      }
      return true;
    },
    [minAccuracy]
  );

  /**
   * Wait for a good GPS fix by polling location until accuracy is acceptable
   */
  const waitForGoodGPSFix = useCallback(
    async (signal: AbortSignal): Promise<Location.LocationObject | null> => {
      const startTime = Date.now();
      let attempts = 0;
      let bestLocation: Location.LocationObject | null = null;
      let bestAccuracy = Infinity;

      while (Date.now() - startTime < maxWaitTime && !signal.aborted) {
        attempts++;

        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: enableHighAccuracy
              ? Location.Accuracy.BestForNavigation
              : Location.Accuracy.Balanced,
          });

          const currentAccuracy = loc.coords.accuracy || Infinity;

          // Keep track of the best location we've seen
          if (currentAccuracy < bestAccuracy) {
            bestAccuracy = currentAccuracy;
            bestLocation = loc;
          }

          // If we have acceptable accuracy, return immediately
          if (validateAccuracy(loc.coords)) {
            console.log(`✓ Good GPS fix achieved: ${currentAccuracy.toFixed(1)}m after ${attempts} attempts`);
            return loc;
          }

          // Log progress
          console.log(`GPS attempt ${attempts}: ${currentAccuracy.toFixed(1)}m accuracy (target: ${minAccuracy}m)`);

          // Wait before next attempt (exponential backoff with max 2s)
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * attempts, 2000)));
        } catch (error: any) {
          console.warn(`GPS attempt ${attempts} failed:`, error.message);

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Return best location we found, even if not meeting accuracy target
      if (bestLocation) {
        console.warn(`Timeout: Returning best location with ${bestAccuracy.toFixed(1)}m accuracy`);
        return bestLocation;
      }

      return null;
    },
    [maxWaitTime, enableHighAccuracy, minAccuracy, validateAccuracy]
  );

  /**
   * Get current location with retries and GPS fix waiting
   */
  const getCurrentLocation = useCallback(async (): Promise<Location.LocationObject | null> => {
    setLocation((prev) => ({ ...prev, isLoading: true, error: null }));

    // Cancel any previous ongoing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Step 1: Check location services are enabled
      const isEnabled = await checkLocationEnabled();
      if (!isEnabled) {
        setLocation((prev) => ({ ...prev, isLoading: false }));
        return null;
      }

      // Step 2: Request and verify permissions
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setLocation((prev) => ({ ...prev, isLoading: false }));
        return null;
      }

      // Step 3: Wait for good GPS fix with retries
      let lastError: string | null = null;
      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        if (signal.aborted) {
          throw new Error('Location request cancelled');
        }

        try {
          console.log(`📍 Getting location (attempt ${attempt}/${retryAttempts})...`);
          const loc = await waitForGoodGPSFix(signal);

          if (!loc) {
            lastError = 'Unable to get GPS fix. Please ensure you are in an open area.';
            continue;
          }

          const isAccurate = validateAccuracy(loc.coords);
          const finalError = isAccurate
            ? null
            : `Low GPS accuracy (${loc.coords.accuracy?.toFixed(1)}m). Location may be imprecise.`;

          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy || null,
            isLoading: false,
            error: finalError,
            permissionStatus: location.permissionStatus,
            gpsEnabled: location.gpsEnabled,
          });

          return loc;
        } catch (attemptError: any) {
          lastError = attemptError?.message || 'Failed to get location';
          console.warn(`Attempt ${attempt} failed:`, lastError);

          if (attempt < retryAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      // All attempts failed
      const errorMessage = lastError || 'Failed to get location after multiple attempts';
      setLocation((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
      return null;
    } catch (error: any) {
      if (error?.message === 'Location request cancelled') {
        setLocation((prev) => ({ ...prev, isLoading: false }));
        return null;
      }

      const errorMessage = error?.message || 'Failed to get location';
      setLocation((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
      return null;
    }
  }, [
    checkLocationEnabled,
    requestPermission,
    waitForGoodGPSFix,
    retryAttempts,
    validateAccuracy,
    onError,
    location.permissionStatus,
    location.gpsEnabled,
  ]);

  /**
   * Cancel any ongoing location request
   */
  const cancelLocationRequest = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLocation((prev) => ({ ...prev, isLoading: false }));
  }, []);

  /**
   * Start watching location changes (for live tracking)
   */
  const startWatching = useCallback(async () => {
    // Check location services first
    const isEnabled = await checkLocationEnabled();
    if (!isEnabled) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      console.log('📍 Starting location tracking...');

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

          // Update state even with low accuracy, but flag it
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy || null,
            isLoading: false,
            error: isAccurate ? null : `Low accuracy: ${loc.coords.accuracy?.toFixed(1)}m`,
            permissionStatus: location.permissionStatus,
            gpsEnabled: location.gpsEnabled,
          });

          // Only trigger callback if accuracy is acceptable
          if (isAccurate) {
            onLocationUpdate?.(loc);
          }
        }
      );

      subscriptionRef.current = subscription;
      console.log('✓ Location tracking started');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to start location tracking';
      setLocation((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  }, [
    checkLocationEnabled,
    requestPermission,
    enableHighAccuracy,
    timeInterval,
    distanceInterval,
    validateAccuracy,
    onLocationUpdate,
    onError,
    location.permissionStatus,
    location.gpsEnabled,
  ]);

  /**
   * Stop watching location changes
   */
  const stopWatching = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
      console.log('✓ Location tracking stopped');
    }
  }, []);

  /**
   * Check current permission status without requesting
   */
  const checkPermissionStatus = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocation((prev) => ({ ...prev, permissionStatus: status }));
      return status;
    } catch (error) {
      console.warn('Failed to check permission status:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (watchPosition) {
      startWatching();
    }

    return () => {
      stopWatching();
      cancelLocationRequest();
    };
  }, [watchPosition, startWatching, stopWatching, cancelLocationRequest]);

  return {
    location,
    getCurrentLocation,
    startWatching,
    stopWatching,
    cancelLocationRequest,
    checkPermissionStatus,
    checkLocationEnabled,
    isLoading: location.isLoading,
    error: location.error,
    accuracy: location.accuracy,
    permissionStatus: location.permissionStatus,
    gpsEnabled: location.gpsEnabled,
  };
};
