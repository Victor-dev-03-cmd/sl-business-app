# Enhanced Location Setup with expo-location

This guide covers the improved location accuracy implementation using `expo-location` with proper GPS fix waiting, permission handling, and retry logic.

## Features

✅ **High-accuracy GPS tracking** with `enableHighAccuracy: true`  
✅ **Automatic retry logic** with configurable attempts  
✅ **GPS fix waiting** - waits for acceptable accuracy before returning  
✅ **Permission verification** - checks and handles permission states  
✅ **GPS/Location service detection** - verifies services are enabled  
✅ **Configurable accuracy thresholds** - set minimum acceptable accuracy  
✅ **Request cancellation** - cancel ongoing location requests  
✅ **Live position tracking** - for real-time location updates  
✅ **Comprehensive error handling** with user-friendly messages

## Quick Start

### Basic Usage

```tsx
import { useLocation } from '../hooks/useLocation';

function MyComponent() {
  const { location, getCurrentLocation, isLoading, error, accuracy } = useLocation({
    enableHighAccuracy: true,
    minAccuracy: 30, // Target 30m accuracy
    maxWaitTime: 20000, // Wait up to 20s for good GPS
  });

  const handleGetLocation = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      console.log('Location:', loc.coords.latitude, loc.coords.longitude);
      console.log('Accuracy:', loc.coords.accuracy);
    }
  };

  return (
    <TouchableOpacity onPress={handleGetLocation} disabled={isLoading}>
      <Text>{isLoading ? 'Getting location...' : 'Get My Location'}</Text>
      {accuracy && <Text>Accuracy: {accuracy.toFixed(1)}m</Text>}
      {error && <Text style={{color: 'red'}}>{error}</Text>}
    </TouchableOpacity>
  );
}
```

### Advanced Usage with Full Error Handling

```tsx
import { useLocation } from '../hooks/useLocation';
import { Alert } from 'react-native';

function LocationPicker() {
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
    onError: (errorMsg) => {
      console.error('Location error:', errorMsg);
    },
    onPermissionDenied: () => {
      Alert.alert(
        'Permission Required',
        'Please enable location permission in settings.',
        [{ text: 'OK' }]
      );
    },
  });

  const handleGetLocation = async () => {
    // 1. Check GPS is enabled
    const isEnabled = await checkLocationEnabled();
    if (!isEnabled) {
      Alert.alert('GPS Disabled', 'Please enable GPS in device settings.');
      return;
    }

    // 2. Check permission
    const status = await checkPermissionStatus();
    if (status === 'denied') {
      Alert.alert('Permission Denied', 'Please enable location in settings.');
      return;
    }

    // 3. Get location (automatically handles permission request)
    const loc = await getCurrentLocation();
    
    if (loc) {
      console.log('✓ Location obtained:', loc.coords);
      console.log('✓ Accuracy:', loc.coords.accuracy);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handleGetLocation} disabled={isLoading}>
        <Text>{isLoading ? 'Finding location...' : 'Get Location'}</Text>
      </TouchableOpacity>
      
      {isLoading && (
        <TouchableOpacity onPress={cancelLocationRequest}>
          <Text>Cancel</Text>
        </TouchableOpacity>
      )}

      {/* Show status */}
      <Text>Permission: {permissionStatus}</Text>
      <Text>GPS: {gpsEnabled ? 'Enabled' : 'Disabled'}</Text>
      <Text>Accuracy: {accuracy ? `${accuracy.toFixed(1)}m` : 'N/A'}</Text>
      
      {error && <Text style={{color: 'red'}}>{error}</Text>}
    </View>
  );
}
```

### Live Position Tracking (for Delivery/Rider Apps)

```tsx
const { location, startWatching, stopWatching } = useLocation({
  watchPosition: true,
  enableHighAccuracy: true,
  timeInterval: 2000, // Update every 2 seconds
  distanceInterval: 3, // Or when moved 3 meters
  onLocationUpdate: (loc) => {
    // Send to backend or update map
    console.log('Position updated:', loc.coords);
  },
});

// Manually control tracking
useEffect(() => {
  startWatching();
  return () => stopWatching();
}, []);
```

## Configuration Options

### `UseLocationOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableHighAccuracy` | boolean | `true` | Use GPS for best accuracy (vs cell towers) |
| `watchPosition` | boolean | `false` | Enable live tracking |
| `timeInterval` | number | `2000` | Min time (ms) between updates |
| `distanceInterval` | number | `3` | Min distance (m) moved between updates |
| `minAccuracy` | number | `50` | Target accuracy in meters |
| `maxWaitTime` | number | `15000` | Max wait time for GPS fix (ms) |
| `retryAttempts` | number | `3` | Number of retry attempts |
| `onLocationUpdate` | function | - | Callback when position updates |
| `onError` | function | - | Callback on errors |
| `onPermissionDenied` | function | - | Callback when permission denied |

## Returned Values

### `LocationState`

```tsx
{
  latitude: number;           // Current latitude
  longitude: number;          // Current longitude
  accuracy: number | null;    // Accuracy in meters
  isLoading: boolean;         // Loading state
  error: string | null;       // Error message
  permissionStatus: Location.PermissionStatus | null;
  gpsEnabled: boolean | null; // Whether GPS is enabled
}
```

### Methods

- **`getCurrentLocation()`** - Get current location with retries
- **`startWatching()`** - Start live position tracking
- **`stopWatching()`** - Stop live tracking
- **`cancelLocationRequest()`** - Cancel ongoing request
- **`checkPermissionStatus()`** - Check permission without requesting
- **`checkLocationEnabled()`** - Check if GPS/location services enabled

## How It Works

### GPS Fix Waiting Algorithm

1. **Permission Check** - Verifies location permission is granted
2. **Service Check** - Ensures GPS/location services are enabled
3. **Initial Request** - Gets first location reading
4. **Accuracy Validation** - Checks if accuracy meets threshold
5. **Retry Loop** - If accuracy insufficient:
   - Waits with exponential backoff (1s → 2s)
   - Retries up to `maxWaitTime`
   - Keeps track of best location seen
6. **Fallback** - Returns best location if timeout reached
7. **Multiple Attempts** - Retries entire process up to `retryAttempts`

### Console Output Example

```
📍 Getting location (attempt 1/3)...
GPS attempt 1: 85.3m accuracy (target: 30m)
GPS attempt 2: 42.1m accuracy (target: 30m)
GPS attempt 3: 28.7m accuracy (target: 30m)
✓ Good GPS fix achieved: 28.7m after 3 attempts
```

## Accuracy Levels

| Accuracy Range | Quality | Use Case |
|----------------|---------|----------|
| 0-20m | Excellent | Precise address location |
| 20-50m | Good | General business location |
| 50-100m | Fair | Neighborhood level |
| 100m+ | Poor | City/area level only |

## Troubleshooting

### Low GPS Accuracy

**Symptoms:** Accuracy > 50m, location jumps around

**Solutions:**
- Move to an open area away from buildings
- Ensure clear view of the sky
- Wait 30-60 seconds for GPS to stabilize
- Check GPS is enabled in device settings
- Try disabling WiFi (can interfere)

### Permission Issues

**Symptoms:** `permissionStatus: 'denied'`

**Solutions:**
```tsx
// Detect denied permission
if (permissionStatus === 'denied') {
  Alert.alert(
    'Permission Required',
    'Go to Settings → Apps → [App Name] → Permissions → Location → Allow',
    [{ text: 'OK' }]
  );
}
```

### GPS Disabled

**Symptoms:** `gpsEnabled: false`

**Solutions:**
```tsx
const isEnabled = await checkLocationEnabled();
if (!isEnabled) {
  Alert.alert(
    'GPS Disabled',
    'Please enable Location/GPS in your device settings.',
    [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
  );
}
```

### Timeout Issues

**Symptoms:** "Unable to get GPS fix" after waiting

**Solutions:**
- Increase `maxWaitTime` (default: 15s → 30s)
- Increase `retryAttempts` (default: 3 → 5)
- Lower `minAccuracy` threshold (default: 50m → 100m)
- Check device GPS is working in other apps

## App Configuration

Ensure `app.json` has proper location configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow app to access location for setting business addresses.",
          "locationWhenInUsePermission": "Allow app to access location for setting business addresses.",
          "isAndroidBackgroundLocationEnabled": false,
          "isIosBackgroundLocationEnabled": false
        }
      ]
    ],
    "android": {
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ]
    }
  }
}
```

## Best Practices

1. **Always check GPS enabled** before requesting location
2. **Provide user feedback** during GPS fix waiting (loading state)
3. **Show accuracy** to users so they know reliability
4. **Offer manual input** as fallback if GPS fails
5. **Use `enableHighAccuracy: true`** for business addresses
6. **Set reasonable `minAccuracy`** (20-30m for addresses)
7. **Allow cancellation** for long-running requests
8. **Cache location** to avoid repeated requests

## Testing Tips

### Simulator Testing (Limited)
- iOS Simulator: Features → Location → Custom Location
- Android Emulator: Extended Controls → Location
- Note: Simulators don't provide realistic accuracy values

### Device Testing (Recommended)
```bash
# Run on physical device
npx expo run:android
npx expo run:ios

# Or with Expo Go
npx expo start
# Scan QR code with device
```

### Mock Location (Development)
```tsx
const MOCK_LOCATION = {
  coords: {
    latitude: 6.9271,
    longitude: 79.8612,
    accuracy: 25,
  }
};

// In development
if (__DEV__) {
  return MOCK_LOCATION;
}
```

## Performance Considerations

- **Battery Impact**: High accuracy GPS drains battery faster
- **Request Frequency**: For live tracking, 2-5s interval is reasonable
- **Background Tracking**: Requires additional permissions and setup
- **Network Usage**: Location services may use data for A-GPS

## Migration from Old Hook

If you're using the old `useLocation` hook:

**Old:**
```tsx
const { location, getCurrentLocation } = useLocation();
const loc = await getCurrentLocation();
```

**New (Enhanced):**
```tsx
const { location, getCurrentLocation, accuracy } = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 30,
  maxWaitTime: 20000,
});
const loc = await getCurrentLocation();
// Now automatically waits for good GPS fix!
```

## Resources

- [expo-location docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [Location accuracy explained](https://developer.android.com/training/location/location-accuracy)
- [GPS troubleshooting guide](https://support.google.com/maps/answer/2839911)

## Support

For issues or questions:
1. Check console logs for detailed GPS attempt info
2. Verify permissions in device settings
3. Test on physical device (simulator GPS is limited)
4. Check `app.json` configuration
