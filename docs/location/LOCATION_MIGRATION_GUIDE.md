# Location Hook Migration Guide

Guide for updating existing screens to use the enhanced `useLocation` hook with improved GPS accuracy.

## What Changed?

### New Features
✅ Automatic GPS fix waiting (waits for good accuracy)  
✅ Multiple retry attempts with exponential backoff  
✅ GPS/Location service detection  
✅ Permission status tracking  
✅ Request cancellation  
✅ Better error messages and handling  

### New Return Values
- `permissionStatus` - Current permission state
- `gpsEnabled` - Whether GPS is on
- `cancelLocationRequest()` - Cancel ongoing requests
- `checkPermissionStatus()` - Check permission without requesting
- `checkLocationEnabled()` - Check if GPS is enabled

### Breaking Changes
**None!** The hook is backward compatible. Old code will work without changes.

## Quick Migration Examples

### Before (Old Hook)

```tsx
const { location, getCurrentLocation, isLoading, error } = useLocation();

const handleGetLocation = async () => {
  const loc = await getCurrentLocation();
  if (loc) {
    console.log(loc.coords);
  }
};
```

### After (Enhanced Hook - Recommended)

```tsx
const { 
  location, 
  getCurrentLocation, 
  isLoading, 
  error,
  accuracy,
  permissionStatus,
  gpsEnabled
} = useLocation({
  enableHighAccuracy: true,  // Already default
  minAccuracy: 30,           // Target 30m accuracy (vs 50m default)
  maxWaitTime: 20000,        // Wait up to 20s for GPS fix (vs 15s default)
  retryAttempts: 3,          // Already default
});

const handleGetLocation = async () => {
  const loc = await getCurrentLocation();
  if (loc) {
    console.log(loc.coords);
    console.log('Accuracy:', loc.coords.accuracy);
  }
};
```

## Screen-by-Screen Migration

### 1. HomeScreen.tsx

**Current Issue:** Direct `expo-location` usage, no accuracy checking

**Location:** Lines 13, 49, ~200+ (find location usage)

**Migration:**

```tsx
// Add to imports (if not present)
import { useLocation } from '../../hooks/useLocation';

// Replace direct expo-location calls with:
const { 
  location,
  getCurrentLocation,
  isLoading: locationLoading,
  accuracy,
  error: locationError
} = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 50, // 50m is fine for search/nearby
});

// Replace direct location fetching with:
const handleFindMe = async () => {
  const loc = await getCurrentLocation();
  if (loc) {
    // Use location
    setUserLocation({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude
    });
  } else if (locationError) {
    Alert.alert('Location Error', locationError);
  }
};
```

### 2. RegisterBusinessScreen.tsx

**Current Issue:** Needs high accuracy for business address

**Priority:** HIGH (business addresses need precision)

**Migration:**

```tsx
const { 
  location,
  getCurrentLocation,
  isLoading: locationLoading,
  accuracy,
  error: locationError,
  permissionStatus,
  gpsEnabled,
  checkLocationEnabled
} = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 20, // Want 20m accuracy for business addresses
  maxWaitTime: 30000, // Wait longer for better accuracy
  retryAttempts: 5, // More retries for important use case
});

const handleUseMyLocation = async () => {
  // 1. Check GPS is enabled
  const isEnabled = await checkLocationEnabled();
  if (!isEnabled) {
    Alert.alert(
      'GPS Disabled',
      'Please enable GPS/Location services in your device settings.',
      [{ text: 'OK' }]
    );
    return;
  }

  // 2. Get location (automatically handles permissions)
  const loc = await getCurrentLocation();
  
  if (loc) {
    const acc = loc.coords.accuracy || 0;
    
    // Check accuracy quality
    if (acc <= 30) {
      // Good accuracy - use it
      setBusinessLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      Alert.alert('Success', `Location set with ${acc.toFixed(1)}m accuracy`);
    } else if (acc <= 100) {
      // Moderate accuracy - warn user
      Alert.alert(
        'Moderate Accuracy',
        `Location accuracy is ${acc.toFixed(1)}m. Consider moving to an open area for better precision.`,
        [
          { text: 'Use Anyway', onPress: () => {
            setBusinessLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }},
          { text: 'Try Again', onPress: handleUseMyLocation }
        ]
      );
    } else {
      // Poor accuracy - recommend manual input
      Alert.alert(
        'Low Accuracy',
        `Location accuracy is only ${acc.toFixed(1)}m. We recommend setting the address manually on the map.`,
        [
          { text: 'Manual Input', style: 'cancel' },
          { text: 'Use Anyway', onPress: () => {
            setBusinessLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }}
        ]
      );
    }
  }
};

// In JSX - show loading and accuracy
{locationLoading && (
  <View>
    <ActivityIndicator />
    <Text>Getting precise location...</Text>
    <Text style={{fontSize: 12, color: '#666'}}>
      This may take a few moments for better accuracy
    </Text>
  </View>
)}

{accuracy && !locationLoading && (
  <Text style={{ 
    fontSize: 12, 
    color: accuracy <= 30 ? '#10b981' : accuracy <= 100 ? '#f59e0b' : '#ef4444'
  }}>
    Accuracy: ±{accuracy.toFixed(1)}m
  </Text>
)}
```

### 3. BusinessDetailsScreen.tsx

**Migration:**

```tsx
const { getCurrentLocation } = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 50,
});

const handleGetDirections = async () => {
  const loc = await getCurrentLocation();
  if (loc) {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${loc.coords.latitude},${loc.coords.longitude}&destination=${business.latitude},${business.longitude}`;
    Linking.openURL(url);
  } else {
    Alert.alert('Error', 'Could not get your location for directions');
  }
};
```

### 4. SearchScreen.tsx

**Migration:**

```tsx
const { location, getCurrentLocation } = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 100, // Lower accuracy OK for search
  maxWaitTime: 10000, // Faster timeout for better UX
});

const handleNearbySearch = async () => {
  const loc = await getCurrentLocation();
  if (loc) {
    searchNearby(loc.coords.latitude, loc.coords.longitude);
  }
};
```

### 5. BusinessListScreen.tsx

**Migration:**

```tsx
const { location, getCurrentLocation } = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 100,
});

useEffect(() => {
  // Get location on mount for sorting by distance
  getCurrentLocation().then((loc) => {
    if (loc) {
      sortBusinessesByDistance(loc.coords);
    }
  });
}, []);
```

## Common Patterns

### Pattern 1: Simple Button

```tsx
// Before
<TouchableOpacity onPress={handleGetLocation}>
  <Text>Use My Location</Text>
</TouchableOpacity>

// After
<TouchableOpacity 
  onPress={handleGetLocation} 
  disabled={locationLoading}
>
  {locationLoading ? (
    <ActivityIndicator size="small" />
  ) : (
    <Icon name="navigation" />
  )}
  <Text>
    {locationLoading ? 'Finding location...' : 'Use My Location'}
  </Text>
</TouchableOpacity>
```

### Pattern 2: Show Accuracy

```tsx
{accuracy && (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <View style={{
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: accuracy <= 30 ? '#10b981' : accuracy <= 100 ? '#f59e0b' : '#ef4444'
    }} />
    <Text style={{ fontSize: 12, color: '#666' }}>
      Accuracy: ±{accuracy.toFixed(1)}m
    </Text>
  </View>
)}
```

### Pattern 3: Error Handling

```tsx
const handleGetLocation = async () => {
  const loc = await getCurrentLocation();
  
  if (!loc) {
    // Check why it failed
    if (!gpsEnabled) {
      Alert.alert(
        'GPS Disabled',
        'Please enable GPS in your device settings.',
        [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
    } else if (permissionStatus === 'denied') {
      Alert.alert(
        'Permission Denied',
        'Location permission is required. Please enable it in settings.',
        [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
    } else {
      Alert.alert('Error', locationError || 'Failed to get location');
    }
    return;
  }
  
  // Success - use location
  console.log('Location:', loc.coords);
};
```

### Pattern 4: Cancel Long Requests

```tsx
const [isGettingLocation, setIsGettingLocation] = useState(false);

const { getCurrentLocation, cancelLocationRequest } = useLocation({
  maxWaitTime: 30000, // Long timeout
});

const handleGetLocation = async () => {
  setIsGettingLocation(true);
  const loc = await getCurrentLocation();
  setIsGettingLocation(false);
  
  if (loc) {
    // Use location
  }
};

const handleCancel = () => {
  cancelLocationRequest();
  setIsGettingLocation(false);
};

// In JSX
{isGettingLocation ? (
  <TouchableOpacity onPress={handleCancel}>
    <Text>Cancel</Text>
  </TouchableOpacity>
) : (
  <TouchableOpacity onPress={handleGetLocation}>
    <Text>Get Location</Text>
  </TouchableOpacity>
)}
```

## Testing Checklist

After migration, test each screen:

### ✅ Permissions
- [ ] Permission prompt appears correctly
- [ ] Denied permission shows helpful message
- [ ] Works after granting permission

### ✅ GPS Status
- [ ] Detects when GPS is disabled
- [ ] Shows appropriate message
- [ ] Works after enabling GPS

### ✅ Accuracy
- [ ] Waits for acceptable accuracy
- [ ] Shows accuracy value to user
- [ ] Handles low accuracy gracefully

### ✅ Loading States
- [ ] Shows loading indicator
- [ ] Can be cancelled (if applicable)
- [ ] Doesn't freeze UI

### ✅ Error Handling
- [ ] Timeout handled properly
- [ ] Network errors handled
- [ ] Shows user-friendly messages

## Configuration by Screen Type

| Screen Type | minAccuracy | maxWaitTime | retryAttempts |
|-------------|-------------|-------------|---------------|
| Register Business | 20m | 30s | 5 |
| Edit Business | 20m | 30s | 5 |
| Search/Nearby | 100m | 10s | 2 |
| Directions | 50m | 15s | 3 |
| General Use | 50m | 15s | 3 |

## Tips

1. **Always show accuracy** to users for address-related features
2. **Provide manual fallback** if GPS fails or accuracy is poor
3. **Use appropriate thresholds** - don't require 10m accuracy for search
4. **Show progress** - GPS can take 10-30s for good fix
5. **Allow cancellation** for long-running requests
6. **Cache location** to avoid repeated requests

## Rollback

If you encounter issues, the old implementation is still available:

```tsx
// Emergency rollback - use basic hook
const { location, getCurrentLocation } = useLocation();
// This will still work, just without enhanced features
```

## Questions?

See:
- `LOCATION_SETUP.md` - Full documentation
- `src/hooks/useLocationExamples.md` - Code examples
- `src/components/LocationPickerExample.tsx` - Reference implementation
