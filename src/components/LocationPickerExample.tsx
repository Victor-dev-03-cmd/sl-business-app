import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MapPin, Navigation, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useLocation } from '../hooks/useLocation';
import * as Location from 'expo-location';

/**
 * Example component demonstrating proper usage of the enhanced useLocation hook
 * with improved GPS accuracy, permission checks, and user feedback.
 */
export const LocationPickerExample = () => {
  const [locationDetails, setLocationDetails] = useState<Location.LocationObject | null>(null);

  const {
    location,
    getCurrentLocation,
    isLoading,
    error,
    accuracy,
    permissionStatus,
    gpsEnabled,
    cancelLocationRequest,
    checkPermissionStatus,
    checkLocationEnabled,
  } = useLocation({
    enableHighAccuracy: true, // Use best GPS accuracy
    minAccuracy: 30, // Target 30m accuracy
    maxWaitTime: 20000, // Wait up to 20 seconds for good GPS fix
    retryAttempts: 3, // Retry up to 3 times
    onLocationUpdate: (loc) => {
      console.log('Location updated:', loc.coords);
    },
    onError: (errorMsg) => {
      console.error('Location error:', errorMsg);
    },
    onPermissionDenied: () => {
      Alert.alert(
        'Permission Required',
        'Location permission is required to set your business location. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
    },
  });

  const handleGetLocation = async () => {
    // First, check if GPS is enabled
    const isEnabled = await checkLocationEnabled();
    if (!isEnabled) {
      Alert.alert(
        'GPS Disabled',
        'Please enable GPS/Location services in your device settings to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check permission status
    const status = await checkPermissionStatus();
    if (status === 'denied') {
      Alert.alert(
        'Permission Denied',
        'Location permission was previously denied. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Get location with automatic retries and GPS fix waiting
    const loc = await getCurrentLocation();

    if (loc) {
      setLocationDetails(loc);

      // Show success message with accuracy info
      const accuracyText = loc.coords.accuracy
        ? `Accuracy: ${loc.coords.accuracy.toFixed(1)}m`
        : 'Accuracy unknown';

      Alert.alert(
        'Location Found',
        `Coordinates: ${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}\n${accuracyText}`,
        [{ text: 'OK' }]
      );
    }
  };

  const getAccuracyColor = () => {
    if (!accuracy) return '#gray';
    if (accuracy <= 20) return '#10b981'; // Excellent (green)
    if (accuracy <= 50) return '#f59e0b'; // Good (orange)
    return '#ef4444'; // Poor (red)
  };

  const getAccuracyLabel = () => {
    if (!accuracy) return 'Unknown';
    if (accuracy <= 20) return 'Excellent';
    if (accuracy <= 50) return 'Good';
    return 'Poor';
  };

  return (
    <View className="p-4 bg-white rounded-lg shadow-sm">
      {/* Permission Status */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Status</Text>
        <View className="flex-row items-center gap-2">
          {permissionStatus === 'granted' ? (
            <CheckCircle size={16} color="#10b981" />
          ) : (
            <AlertCircle size={16} color="#ef4444" />
          )}
          <Text className="text-sm text-gray-600">
            Permission: {permissionStatus || 'Not checked'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2 mt-1">
          {gpsEnabled ? (
            <CheckCircle size={16} color="#10b981" />
          ) : gpsEnabled === false ? (
            <AlertCircle size={16} color="#ef4444" />
          ) : null}
          <Text className="text-sm text-gray-600">
            GPS: {gpsEnabled === null ? 'Not checked' : gpsEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>

      {/* Current Location */}
      <View className="mb-4 p-3 bg-gray-50 rounded-lg">
        <View className="flex-row items-center gap-2 mb-2">
          <MapPin size={20} color="#6b7280" />
          <Text className="text-sm font-medium text-gray-700">Current Location</Text>
        </View>
        <Text className="text-sm text-gray-600">
          Lat: {location.latitude.toFixed(6)}
        </Text>
        <Text className="text-sm text-gray-600">
          Lng: {location.longitude.toFixed(6)}
        </Text>
        {accuracy && (
          <View className="flex-row items-center gap-2 mt-2">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getAccuracyColor() }}
            />
            <Text className="text-sm text-gray-600">
              Accuracy: {accuracy.toFixed(1)}m ({getAccuracyLabel()})
            </Text>
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View className="mb-4 p-3 bg-red-50 rounded-lg flex-row items-start gap-2">
          <AlertCircle size={16} color="#ef4444" className="mt-0.5" />
          <Text className="text-sm text-red-600 flex-1">{error}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={handleGetLocation}
          disabled={isLoading}
          className={`flex-1 flex-row items-center justify-center gap-2 py-3 px-4 rounded-lg ${
            isLoading ? 'bg-gray-300' : 'bg-blue-600'
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Navigation size={18} color="#ffffff" />
          )}
          <Text className="text-white font-medium">
            {isLoading ? 'Getting Location...' : 'Get My Location'}
          </Text>
        </TouchableOpacity>

        {isLoading && (
          <TouchableOpacity
            onPress={cancelLocationRequest}
            className="py-3 px-4 rounded-lg bg-red-600"
          >
            <Text className="text-white font-medium">Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tips for Better Accuracy */}
      {accuracy && accuracy > 50 && (
        <View className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <Text className="text-sm font-medium text-yellow-800 mb-1">
            Tips for Better Accuracy:
          </Text>
          <Text className="text-xs text-yellow-700">
            • Move to an open area away from tall buildings{'\n'}
            • Ensure you have a clear view of the sky{'\n'}
            • Wait a few moments for GPS to stabilize{'\n'}
            • Check that Location/GPS is enabled in device settings
          </Text>
        </View>
      )}
    </View>
  );
};
