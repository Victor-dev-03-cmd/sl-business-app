# Location Tracking Implementation Guide

## Overview

This app now uses **highest accuracy GPS tracking** with `Location.Accuracy.BestForNavigation` for precise location detection.

## Changes Made

### ✅ Fixed Location Accuracy

**Before:**
- Used `Location.Accuracy.Balanced` (lower accuracy)
- No accuracy validation
- Stale location data with `maximumAge: 10000`

**After:**
- Uses `Location.Accuracy.BestForNavigation` (highest accuracy)
- Validates accuracy before using location (rejects > 50m)
- No cached location data (always fresh)

### Files Updated

1. **HomeScreen.tsx** (line 121-164)
   - Search location with highest accuracy
   - Accuracy validation (<50m threshold)

2. **SearchScreen.tsx** (line 19-39)
   - Search by location with highest accuracy
   - Accuracy validation

3. **BusinessListScreen.tsx** (line 65-106, 108-185)
   - Auto-location on load with highest accuracy
   - "Find Me" button with accuracy validation
   - User alert when GPS accuracy is low

4. **New: useLocation.ts** (custom hook)
   - Reusable location tracking hook
   - Supports both single fetch and live tracking
   - Built-in accuracy validation

## Usage Examples

### 1. Single Location Fetch (Current Implementation)

```typescript
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();

if (status === 'granted') {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });

  // Validate accuracy
  if (location.coords.accuracy && location.coords.accuracy < 50) {
    // Use location
    const lat = location.coords.latitude;
    const lng = location.coords.longitude;
  } else {
    console.log('Low GPS accuracy, using fallback');
  }
}
```

### 2. Using the Custom Hook (Recommended)

```typescript
import { useLocation } from '../hooks/useLocation';

// Simple fetch
const { location, getCurrentLocation, isLoading } = useLocation();

const handleGetLocation = async () => {
  const loc = await getCurrentLocation();
  if (loc) {
    console.log('Lat:', location.latitude);
    console.log('Lng:', location.longitude);
    console.log('Accuracy:', location.accuracy);
  }
};
```

### 3. Live Location Tracking (For Delivery/Rider Apps)

```typescript
import { useLocation } from '../hooks/useLocation';

const { location, accuracy } = useLocation({
  watchPosition: true,
  timeInterval: 2000,      // Update every 2 seconds
  distanceInterval: 3,      // Or when moved 3 meters
  minAccuracy: 15,          // Only accept <15m accuracy
  onLocationUpdate: (loc) => {
    console.log('New location:', loc.coords);
    // Send to backend, update map, etc.
  },
  onError: (error) => {
    console.error('Location error:', error);
  }
});

// Display accuracy indicator
{accuracy && accuracy < 15 && <Text>🟢 High Accuracy</Text>}
{accuracy && accuracy >= 15 && accuracy < 50 && <Text>🟡 Medium Accuracy</Text>}
{accuracy && accuracy >= 50 && <Text>🔴 Low Accuracy</Text>}
```

## Accuracy Guidelines

| Accuracy (meters) | Quality | Use Case |
|------------------|---------|----------|
| < 5m | Excellent | Turn-by-turn navigation |
| 5-15m | Very Good | Delivery tracking, rider apps |
| 15-50m | Good | Business search, nearby locations |
| > 50m | Poor | Fallback to default location |

## How to Improve GPS Accuracy

### For Users:
1. ✅ Enable **Location Services** (Settings → Location)
2. ✅ Set to **High Accuracy / GPS mode**
3. ✅ Turn on **Wi-Fi** (helps location even without connection)
4. ✅ Enable **Mobile Data**
5. ✅ Go **outdoors** with clear sky view
6. ✅ Wait a few seconds for GPS to lock

### For Developers:
1. ✅ Use `Location.Accuracy.BestForNavigation`
2. ✅ Validate `location.coords.accuracy` before using
3. ✅ Don't use `maximumAge` (causes stale data)
4. ✅ Show accuracy indicators to users
5. ✅ Provide fallback for low accuracy scenarios

## Location Permissions

### Android (app.json / app.config.js)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location to find nearby businesses."
        }
      ]
    ],
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

### iOS (app.json / app.config.js)

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "We need your location to show nearby businesses.",
        "NSLocationAlwaysUsageDescription": "We need your location to show nearby businesses."
      }
    }
  }
}
```

## Testing GPS Accuracy

### On Real Device:
```typescript
const testAccuracy = async () => {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });
  
  console.log('Accuracy:', location.coords.accuracy, 'm');
  console.log('Altitude Accuracy:', location.coords.altitudeAccuracy, 'm');
  console.log('Speed:', location.coords.speed, 'm/s');
  console.log('Heading:', location.coords.heading, '°');
};
```

### Expected Results:
- **Outdoors with clear sky:** 3-10m accuracy
- **Near buildings/trees:** 10-30m accuracy
- **Indoors:** 20-100m+ accuracy (poor)

## Live Tracking Performance

For delivery/rider apps with continuous tracking:

```typescript
const { location, accuracy, stopWatching } = useLocation({
  watchPosition: true,
  timeInterval: 2000,       // 2 seconds
  distanceInterval: 3,       // 3 meters
  minAccuracy: 15,           // Only accept <15m
  onLocationUpdate: (loc) => {
    // Send location to backend
    sendLocationToServer({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
    });
  }
});

// Clean up when done (e.g., order completed)
useEffect(() => {
  return () => stopWatching();
}, []);
```

## Troubleshooting

### Issue: Low accuracy readings

**Solutions:**
1. Move outdoors
2. Wait 10-20 seconds for GPS lock
3. Enable High Accuracy mode in device settings
4. Turn on Wi-Fi
5. Restart location services

### Issue: Location not updating

**Solutions:**
1. Check permission status
2. Verify location services are enabled
3. Check for errors in console
4. Ensure device has GPS (emulators may not)

### Issue: App crashes on location request

**Solutions:**
1. Ensure expo-location is installed: `npx expo install expo-location`
2. Check permissions in app.json
3. Rebuild the app after config changes

## Performance Considerations

### Battery Impact:
- `BestForNavigation`: High battery usage (for active navigation only)
- `High`: Medium battery usage (recommended for most use cases)
- `Balanced`: Low battery usage (not recommended for this app)

### Recommendation:
Use `BestForNavigation` for:
- One-time location fetches (minimal battery impact)
- Critical accuracy requirements (delivery, navigation)

Use `High` for:
- Continuous background tracking
- Balance between accuracy and battery

## Next Steps

1. ✅ **Test on real devices** (not emulators)
2. ✅ Test outdoors for best accuracy
3. ⚠️ Consider adding **accuracy indicator UI**
4. ⚠️ Add **retry logic** for failed location requests
5. ⚠️ Implement **background location** (if needed for delivery tracking)

## References

- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [Location Accuracy Enum](https://docs.expo.dev/versions/latest/sdk/location/#accuracy)
- [watchPositionAsync](https://docs.expo.dev/versions/latest/sdk/location/#locationwatchpositionasyncoptions-callback)
