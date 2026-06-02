# useLocation Hook - Quick Examples

## Common Use Cases

### 1. Simple "Find Me" Button

```tsx
import { useLocation } from '../hooks/useLocation';

function FindMeButton() {
  const { getCurrentLocation, isLoading } = useLocation({
    enableHighAccuracy: true,
    minAccuracy: 30,
  });

  const handlePress = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      console.log('Found:', loc.coords.latitude, loc.coords.longitude);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={isLoading}>
      <Text>{isLoading ? 'Finding...' : 'Find Me'}</Text>
    </TouchableOpacity>
  );
}
```

### 2. Business Address Picker (High Accuracy)

```tsx
function AddressInput() {
  const [address, setAddress] = useState(null);
  
  const { 
    location, 
    getCurrentLocation, 
    isLoading, 
    accuracy,
    error 
  } = useLocation({
    enableHighAccuracy: true,
    minAccuracy: 20, // Want 20m accuracy for addresses
    maxWaitTime: 30000, // Wait longer for better accuracy
    retryAttempts: 5,
  });

  const handleUseMyLocation = async () => {
    const loc = await getCurrentLocation();
    
    if (loc && loc.coords.accuracy && loc.coords.accuracy <= 30) {
      // Good accuracy - use it
      setAddress({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      });
    } else {
      Alert.alert(
        'Low Accuracy',
        'GPS accuracy is low. Consider manual address entry or moving to an open area.'
      );
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handleUseMyLocation}>
        <Text>Use My Location</Text>
      </TouchableOpacity>
      
      {isLoading && <ActivityIndicator />}
      
      {accuracy && (
        <Text style={{ color: accuracy <= 30 ? 'green' : 'orange' }}>
          Accuracy: {accuracy.toFixed(1)}m
        </Text>
      )}
      
      {error && <Text style={{color: 'red'}}>{error}</Text>}
    </View>
  );
}
```

### 3. Map with User Location

```tsx
import MapView, { Marker } from 'react-native-maps';

function LocationMap() {
  const [region, setRegion] = useState(null);
  
  const { location, getCurrentLocation, isLoading, accuracy } = useLocation({
    enableHighAccuracy: true,
    minAccuracy: 50,
  });

  useEffect(() => {
    // Get location on mount
    getCurrentLocation().then((loc) => {
      if (loc) {
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    });
  }, []);

  return (
    <View>
      {region && (
        <MapView style={{ flex: 1 }} region={region}>
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="You are here"
            description={`Accuracy: ±${accuracy?.toFixed(0)}m`}
          />
        </MapView>
      )}
      
      {isLoading && (
        <View style={{ position: 'absolute', top: 20, alignSelf: 'center' }}>
          <Text>Getting your location...</Text>
        </View>
      )}
    </View>
  );
}
```

### 4. Delivery/Rider Live Tracking

```tsx
function RiderTracking() {
  const [tracking, setTracking] = useState(false);
  
  const { 
    location, 
    startWatching, 
    stopWatching,
    accuracy 
  } = useLocation({
    watchPosition: tracking, // Auto-start when tracking enabled
    enableHighAccuracy: true,
    timeInterval: 5000, // Update every 5 seconds
    distanceInterval: 10, // Or when moved 10 meters
    onLocationUpdate: (loc) => {
      // Send to backend
      sendLocationToServer({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        timestamp: loc.timestamp,
      });
    },
  });

  const toggleTracking = () => {
    if (tracking) {
      stopWatching();
    } else {
      startWatching();
    }
    setTracking(!tracking);
  };

  return (
    <View>
      <Switch value={tracking} onValueChange={toggleTracking} />
      <Text>Live Tracking: {tracking ? 'ON' : 'OFF'}</Text>
      <Text>Current: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>
      <Text>Accuracy: {accuracy ? `${accuracy.toFixed(1)}m` : 'N/A'}</Text>
    </View>
  );
}
```

### 5. Location with Full Error Handling

```tsx
function RobustLocationPicker() {
  const {
    location,
    getCurrentLocation,
    isLoading,
    error,
    accuracy,
    permissionStatus,
    gpsEnabled,
    checkPermissionStatus,
    checkLocationEnabled,
    cancelLocationRequest,
  } = useLocation({
    enableHighAccuracy: true,
    minAccuracy: 30,
    maxWaitTime: 20000,
    retryAttempts: 3,
    onError: (err) => console.error('Location error:', err),
    onPermissionDenied: () => {
      Alert.alert(
        'Permission Required',
        'This app needs location access to work.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    },
  });

  const handleGetLocation = async () => {
    // Step 1: Check GPS enabled
    const isGpsOn = await checkLocationEnabled();
    if (!isGpsOn) {
      Alert.alert(
        'GPS Disabled',
        'Please enable GPS/Location in your device settings.',
        [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
      return;
    }

    // Step 2: Check permission
    const status = await checkPermissionStatus();
    if (status === 'denied') {
      Alert.alert(
        'Permission Denied',
        'Location permission was denied. Please enable it in Settings.',
        [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
      return;
    }

    // Step 3: Get location
    const loc = await getCurrentLocation();
    
    if (loc) {
      const acc = loc.coords.accuracy || 0;
      
      if (acc <= 30) {
        Alert.alert('Success', `Location found with ${acc.toFixed(1)}m accuracy`);
      } else if (acc <= 100) {
        Alert.alert(
          'Moderate Accuracy',
          `Location accuracy is ${acc.toFixed(1)}m. Consider moving to an open area for better results.`
        );
      } else {
        Alert.alert(
          'Low Accuracy',
          `Location accuracy is only ${acc.toFixed(1)}m. The location may be imprecise.`
        );
      }
    }
  };

  return (
    <View>
      {/* Status Indicators */}
      <View>
        <Text>Permission: {permissionStatus || 'Unknown'}</Text>
        <Text>GPS: {gpsEnabled === null ? 'Unknown' : gpsEnabled ? 'ON' : 'OFF'}</Text>
        <Text>Accuracy: {accuracy ? `${accuracy.toFixed(1)}m` : 'N/A'}</Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={{ backgroundColor: '#fee', padding: 10 }}>
          <Text style={{ color: 'red' }}>{error}</Text>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity 
        onPress={handleGetLocation} 
        disabled={isLoading}
        style={{ backgroundColor: isLoading ? '#ccc' : '#007AFF' }}
      >
        <Text>{isLoading ? 'Getting Location...' : 'Get My Location'}</Text>
      </TouchableOpacity>

      {/* Cancel Button */}
      {isLoading && (
        <TouchableOpacity onPress={cancelLocationRequest}>
          <Text>Cancel</Text>
        </TouchableOpacity>
      )}

      {/* Accuracy Tips */}
      {accuracy && accuracy > 50 && (
        <View style={{ backgroundColor: '#fffbeb', padding: 10 }}>
          <Text style={{ fontWeight: 'bold' }}>Tips for Better Accuracy:</Text>
          <Text>• Move to an open area</Text>
          <Text>• Ensure clear view of the sky</Text>
          <Text>• Wait 30-60 seconds</Text>
          <Text>• Check GPS is enabled</Text>
        </View>
      )}
    </View>
  );
}
```

### 6. Background Location (Requires Setup)

```tsx
// Note: Requires additional permissions in app.json
function BackgroundTracking() {
  const { startWatching, stopWatching } = useLocation({
    watchPosition: true,
    enableHighAccuracy: true,
    timeInterval: 30000, // Every 30 seconds (battery friendly)
    onLocationUpdate: (loc) => {
      // Background task to save location
      BackgroundFetch.scheduleTaskAsync('location-update', {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    },
  });

  useEffect(() => {
    // Start on mount
    startWatching();
    return () => stopWatching();
  }, []);

  return <View><Text>Tracking in background...</Text></View>;
}
```

### 7. Cancellable Location Request

```tsx
function CancellableLocationFetch() {
  const { 
    getCurrentLocation, 
    cancelLocationRequest,
    isLoading 
  } = useLocation({
    enableHighAccuracy: true,
    maxWaitTime: 30000, // Long timeout
  });

  const handleGetLocation = () => {
    getCurrentLocation();
  };

  const handleCancel = () => {
    cancelLocationRequest();
    Alert.alert('Cancelled', 'Location request cancelled');
  };

  return (
    <View>
      {!isLoading ? (
        <TouchableOpacity onPress={handleGetLocation}>
          <Text>Get Location</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={handleCancel}>
          <Text>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### 8. Distance Calculator

```tsx
function DistanceCalculator() {
  const [businessLocation] = useState({ lat: 6.9271, lng: 79.8612 });
  const [distance, setDistance] = useState<number | null>(null);
  
  const { getCurrentLocation } = useLocation({
    enableHighAccuracy: true,
    minAccuracy: 50,
  });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleCalculate = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      const dist = calculateDistance(
        loc.coords.latitude,
        loc.coords.longitude,
        businessLocation.lat,
        businessLocation.lng
      );
      setDistance(dist);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handleCalculate}>
        <Text>Calculate Distance</Text>
      </TouchableOpacity>
      {distance && (
        <Text>Distance: {distance.toFixed(2)} km away</Text>
      )}
    </View>
  );
}
```

## Configuration Presets

### High Precision (Address Input)
```tsx
{
  enableHighAccuracy: true,
  minAccuracy: 20,
  maxWaitTime: 30000,
  retryAttempts: 5,
}
```

### Balanced (General Use)
```tsx
{
  enableHighAccuracy: true,
  minAccuracy: 50,
  maxWaitTime: 15000,
  retryAttempts: 3,
}
```

### Battery Friendly (Live Tracking)
```tsx
{
  watchPosition: true,
  enableHighAccuracy: false,
  timeInterval: 10000,
  distanceInterval: 20,
  minAccuracy: 100,
}
```

### Fast but Lower Accuracy
```tsx
{
  enableHighAccuracy: false,
  minAccuracy: 100,
  maxWaitTime: 5000,
  retryAttempts: 1,
}
```
