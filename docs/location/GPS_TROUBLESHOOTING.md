# GPS Troubleshooting Guide

Common GPS/location issues and how to fix them.

## Quick Diagnostics

Run this diagnostic check in your component:

```tsx
import { useLocation } from '../hooks/useLocation';

function DiagnosticCheck() {
  const { 
    permissionStatus,
    gpsEnabled,
    accuracy,
    error,
    checkPermissionStatus,
    checkLocationEnabled 
  } = useLocation();

  useEffect(() => {
    checkPermissionStatus();
    checkLocationEnabled();
  }, []);

  return (
    <View>
      <Text>Permission: {permissionStatus || 'Unknown'} 
        {permissionStatus === 'granted' ? ' ✅' : ' ❌'}
      </Text>
      <Text>GPS Enabled: {gpsEnabled === null ? 'Unknown' : gpsEnabled ? 'Yes ✅' : 'No ❌'}</Text>
      <Text>Accuracy: {accuracy ? `${accuracy.toFixed(1)}m` : 'N/A'}</Text>
      {error && <Text style={{color: 'red'}}>Error: {error}</Text>}
    </View>
  );
}
```

## Common Issues

### Issue 1: "Location permission denied"

**Symptoms:**
- Permission prompt doesn't appear
- Getting "Permission denied" error
- `permissionStatus: 'denied'`

**Causes:**
- User denied permission previously
- Permission not configured in app.json
- Testing on simulator without location

**Solutions:**

1. **Check app.json configuration:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Allow app to access your location."
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

2. **Reset permissions (Android):**
```bash
# Clear app data
adb shell pm clear com.yourapp.package

# Or manually: Settings → Apps → [Your App] → Permissions → Location → Allow
```

3. **Reset permissions (iOS):**
```bash
# Settings → Privacy → Location Services → [Your App] → Allow While Using App
```

4. **Detect and guide user:**
```tsx
const { permissionStatus, checkPermissionStatus } = useLocation({
  onPermissionDenied: () => {
    Alert.alert(
      'Permission Required',
      'Please enable location permission in Settings → [App Name] → Location → Allow While Using App',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  }
});

// Check on mount
useEffect(() => {
  checkPermissionStatus().then((status) => {
    if (status === 'denied') {
      // Show help message
    }
  });
}, []);
```

---

### Issue 2: "GPS/Location services are disabled"

**Symptoms:**
- `gpsEnabled: false`
- Error: "GPS/Location services are disabled"
- Works on one device but not another

**Causes:**
- Location/GPS disabled in device settings
- Airplane mode enabled
- Battery saver mode disabled GPS

**Solutions:**

1. **Detect and guide user:**
```tsx
const { gpsEnabled, checkLocationEnabled } = useLocation();

const handleGetLocation = async () => {
  const isEnabled = await checkLocationEnabled();
  
  if (!isEnabled) {
    Alert.alert(
      'GPS Disabled',
      'Please enable Location/GPS in your device settings:\n\n' +
      'Android: Settings → Location → Turn On\n' +
      'iOS: Settings → Privacy → Location Services → Turn On',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
    return;
  }
  
  // Proceed with location request
};
```

2. **Check device settings:**
- **Android:** Settings → Location → Turn On
- **iOS:** Settings → Privacy & Security → Location Services → On

---

### Issue 3: Low GPS Accuracy (>100m)

**Symptoms:**
- `accuracy: 500m` or higher
- Location jumps around
- Getting "Low GPS accuracy" error
- Timeout before good fix

**Causes:**
- Indoors or surrounded by buildings
- Poor GPS signal
- Device GPS hardware issue
- Not enough time for GPS fix

**Solutions:**

1. **Environmental factors:**
- Move to open area with clear sky view
- Move away from tall buildings
- Go outside if indoors
- Wait 30-60 seconds for GPS to stabilize

2. **Increase wait time:**
```tsx
const { getCurrentLocation } = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 50,
  maxWaitTime: 30000, // Increase from 15s to 30s
  retryAttempts: 5, // More retries
});
```

3. **Progressive accuracy:**
```tsx
const [attempts, setAttempts] = useState(0);

const handleGetLocation = async () => {
  const loc = await getCurrentLocation();
  
  if (!loc || !loc.coords.accuracy || loc.coords.accuracy > 50) {
    if (attempts < 3) {
      setAttempts(a => a + 1);
      Alert.alert(
        'Improving Accuracy',
        `Current: ${loc?.coords.accuracy?.toFixed(0)}m. Trying again... (${attempts + 1}/3)`,
        [{ text: 'OK', onPress: () => handleGetLocation() }]
      );
    } else {
      Alert.alert(
        'Low Accuracy',
        'Unable to get precise location. Use manual address input?',
        [
          { text: 'Manual Input', onPress: () => showManualInput() },
          { text: 'Try Again', onPress: () => { setAttempts(0); handleGetLocation(); }}
        ]
      );
    }
  } else {
    // Good accuracy - use it
    setAttempts(0);
    useLocation(loc);
  }
};
```

4. **Show visual feedback:**
```tsx
const getAccuracyStatus = (accuracy: number | null) => {
  if (!accuracy) return { text: 'Unknown', color: '#666', icon: '❓' };
  if (accuracy <= 20) return { text: 'Excellent', color: '#10b981', icon: '🎯' };
  if (accuracy <= 50) return { text: 'Good', color: '#f59e0b', icon: '✓' };
  if (accuracy <= 100) return { text: 'Fair', color: '#f59e0b', icon: '⚠' };
  return { text: 'Poor', color: '#ef4444', icon: '❌' };
};

const status = getAccuracyStatus(accuracy);

<View>
  <Text>{status.icon} {status.text}: {accuracy?.toFixed(1)}m</Text>
  {accuracy && accuracy > 50 && (
    <Text style={{fontSize: 12, color: '#666'}}>
      Move to an open area for better accuracy
    </Text>
  )}
</View>
```

---

### Issue 4: "Failed to get location after multiple attempts"

**Symptoms:**
- Timeout after waiting
- Multiple failed attempts
- Console shows retry attempts failing

**Causes:**
- Very poor GPS signal
- GPS hardware not working
- Network location also failing
- Device location cache corrupted

**Solutions:**

1. **Check console logs:**
```
📍 Getting location (attempt 1/3)...
GPS attempt 1: 85.3m accuracy (target: 30m)
GPS attempt 2: Failed - timeout
GPS attempt 3: 120.5m accuracy (target: 30m)
Failed to get location after multiple attempts
```

2. **Lower accuracy requirements temporarily:**
```tsx
const { getCurrentLocation } = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 200, // Temporarily accept lower accuracy
  maxWaitTime: 45000, // Longer timeout
  retryAttempts: 5,
});
```

3. **Fallback to network location:**
```tsx
const { getCurrentLocation } = useLocation({
  enableHighAccuracy: false, // Use network (WiFi/cell tower) location
  minAccuracy: 500,
});
```

4. **Provide manual fallback:**
```tsx
const handleGetLocation = async () => {
  const loc = await getCurrentLocation();
  
  if (!loc) {
    Alert.alert(
      'Location Unavailable',
      'Unable to get your location automatically. Would you like to enter it manually?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Manual Input', onPress: () => showMapPicker() }
      ]
    );
  }
};
```

---

### Issue 5: Location Request Takes Too Long

**Symptoms:**
- Waiting 20+ seconds
- User thinks app is frozen
- No feedback during wait

**Causes:**
- Waiting for high-accuracy GPS fix
- Multiple retry attempts
- Poor GPS signal requiring longer acquisition

**Solutions:**

1. **Show progress feedback:**
```tsx
const [progress, setProgress] = useState<string>('');

const { getCurrentLocation } = useLocation({
  enableHighAccuracy: true,
  maxWaitTime: 30000,
  onError: (err) => setProgress(err),
});

// Add console monitoring
useEffect(() => {
  let progressTimer: NodeJS.Timeout;
  
  if (isLoading) {
    setProgress('Getting GPS signal...');
    
    const messages = [
      'Finding satellites...',
      'Improving accuracy...',
      'Almost there...'
    ];
    
    let index = 0;
    progressTimer = setInterval(() => {
      if (index < messages.length) {
        setProgress(messages[index]);
        index++;
      }
    }, 7000);
  }
  
  return () => clearInterval(progressTimer);
}, [isLoading]);

// In JSX
{isLoading && (
  <View>
    <ActivityIndicator />
    <Text>{progress}</Text>
    <Text style={{fontSize: 12, color: '#666'}}>
      This may take up to 30 seconds for best accuracy
    </Text>
  </View>
)}
```

2. **Add cancel button:**
```tsx
const { cancelLocationRequest } = useLocation();

{isLoading && (
  <TouchableOpacity onPress={() => {
    cancelLocationRequest();
    Alert.alert('Cancelled', 'Location request cancelled');
  }}>
    <Text>Cancel</Text>
  </TouchableOpacity>
)}
```

3. **Use faster mode for non-critical features:**
```tsx
// For search/nearby - don't need high precision
const { getCurrentLocation } = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 100, // Accept 100m
  maxWaitTime: 10000, // Only wait 10s
  retryAttempts: 2,
});
```

---

### Issue 6: Works in Simulator but Not on Device

**Symptoms:**
- Simulator shows location fine
- Real device fails
- Different behavior on physical device

**Causes:**
- Simulator uses mock location
- Real device needs actual GPS signal
- Permissions work differently
- GPS hardware issues

**Solutions:**

1. **Always test on physical device:**
```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

2. **Different config for development:**
```tsx
const { getCurrentLocation } = useLocation({
  enableHighAccuracy: true,
  minAccuracy: __DEV__ ? 200 : 50, // Less strict in dev
  maxWaitTime: __DEV__ ? 10000 : 20000,
});
```

3. **Mock location for testing (dev only):**
```tsx
const MOCK_LOCATION = {
  coords: {
    latitude: 6.9271,
    longitude: 79.8612,
    accuracy: 25,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};

// In development only
if (__DEV__ && USE_MOCK_LOCATION) {
  return MOCK_LOCATION;
}

const loc = await getCurrentLocation();
```

---

## Advanced Debugging

### Enable Verbose Logging

The hook already logs to console. To see more:

```tsx
const { getCurrentLocation, location } = useLocation({
  enableHighAccuracy: true,
  onLocationUpdate: (loc) => {
    console.log('[LOCATION UPDATE]', {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      timestamp: new Date(loc.timestamp).toISOString(),
    });
  },
  onError: (err) => {
    console.error('[LOCATION ERROR]', err);
  },
});

// Log all state changes
useEffect(() => {
  console.log('[LOCATION STATE]', {
    lat: location.latitude,
    lng: location.longitude,
    accuracy: location.accuracy,
    isLoading: location.isLoading,
    error: location.error,
    permissionStatus: location.permissionStatus,
    gpsEnabled: location.gpsEnabled,
  });
}, [location]);
```

### Test GPS Hardware

```tsx
import * as Location from 'expo-location';

const testGPSHardware = async () => {
  try {
    // Test 1: Check services
    const enabled = await Location.hasServicesEnabledAsync();
    console.log('GPS Services:', enabled ? 'ON' : 'OFF');
    
    // Test 2: Check permission
    const { status } = await Location.getForegroundPermissionsAsync();
    console.log('Permission:', status);
    
    // Test 3: Quick location (low accuracy)
    const quick = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    });
    console.log('Quick location:', quick.coords);
    
    // Test 4: High accuracy location
    const precise = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    console.log('Precise location:', precise.coords);
    
    console.log('✅ GPS hardware working');
  } catch (error) {
    console.error('❌ GPS test failed:', error);
  }
};
```

### Performance Monitoring

```tsx
const { getCurrentLocation } = useLocation();

const getLocationWithTiming = async () => {
  const startTime = Date.now();
  console.log('[TIMING] Location request started');
  
  const loc = await getCurrentLocation();
  
  const duration = Date.now() - startTime;
  console.log('[TIMING] Location request completed in', duration, 'ms');
  
  if (loc) {
    console.log('[TIMING] Success with accuracy:', loc.coords.accuracy);
  } else {
    console.log('[TIMING] Failed');
  }
  
  return loc;
};
```

## Device-Specific Issues

### Android

**Battery Saver Mode:** Disables GPS
- Solution: Settings → Battery → Battery Saver → Off

**App Battery Optimization:** Restricts location
- Solution: Settings → Apps → [App] → Battery → Unrestricted

**Mock Location Apps:** Interfere with real GPS
- Solution: Uninstall mock location apps

### iOS

**Low Power Mode:** Reduces GPS accuracy
- Solution: Settings → Battery → Low Power Mode → Off

**Background App Refresh:** Needed for background location
- Solution: Settings → General → Background App Refresh → On

**Precise Location:** Must be enabled
- Solution: Settings → Privacy → Location → [App] → Precise Location → On

## Still Having Issues?

1. **Test in different locations** - Move outdoors to open area
2. **Test on different device** - Check if device-specific
3. **Check console logs** - Look for specific error messages
4. **Test other GPS apps** - Verify GPS hardware works (Google Maps, etc.)
5. **Reset location settings** - Clear cache and reset app permissions
6. **Contact support** - Provide console logs and device info

## Useful Console Output

When reporting issues, include:

```
📍 Getting location (attempt 1/3)...
GPS attempt 1: 85.3m accuracy (target: 30m)
GPS attempt 2: 42.1m accuracy (target: 30m)
Permission: granted ✅
GPS Enabled: true ✅
Device: Pixel 7, Android 13
Location: Colombo, Sri Lanka
Time: 11:30 AM
Environment: Outdoors, clear sky
```
