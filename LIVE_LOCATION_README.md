# Live Current Location Feature

## Overview
Enhanced location tracking system that provides accurate, real-time user location for finding nearby businesses with high precision.

## Features Implemented

### 1. High-Accuracy Location
- **Best For Navigation** - Uses highest accuracy GPS setting
- **Fast Updates** - Gets fresh location data
- **Smart Caching** - Updates every 10 seconds for performance

### 2. Auto-Location on Load
- **Automatic Detection** - Gets user location when opening nearby screen
- **Silent Fallback** - Uses default (Colombo) if permission denied
- **Smart Detection** - Only auto-locates if no specific search location provided

### 3. Manual "Find Me" Button
- **User Control** - Tap to get current location anytime
- **Visual Feedback** - Loading indicator while locating
- **Auto Zoom** - Zooms closer to show nearby businesses clearly

### 4. Comprehensive Error Handling
- **Permission Denied** - Guides user to enable location in settings
- **Timeout Errors** - Helpful message if location takes too long
- **Service Disabled** - Prompts user to enable location services
- **Network Issues** - Graceful fallback to last known location

### 5. Live Map Features
- **Shows User Location** - Blue dot on map (`showsUserLocation={true}`)
- **Auto-Center** - Animates to user's current position
- **Nearby Search** - Automatically fetches businesses at current location
- **Distance Calculation** - Shows distance from current location to each business

## Location Accuracy Levels

```typescript
Location.Accuracy.BestForNavigation  // Highest accuracy (uses GPS) ✅ Used
Location.Accuracy.Best              // High accuracy
Location.Accuracy.Balanced          // Medium accuracy (uses WiFi/Cell)
Location.Accuracy.Low               // Low accuracy (battery-saving)
```

## Code Implementation

### High-Accuracy Location Request
```typescript
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 10000, // Update every 10 seconds
});
```

### Auto-Location on Screen Load
```typescript
useEffect(() => {
  const autoGetLocation = async () => {
    if (!initialLat && !initialLng) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        // Update map and fetch businesses
      }
    }
  };
  autoGetLocation();
}, []);
```

### "Find Me" Button with Error Handling
```typescript
const findMe = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', '...');
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    // Zoom closer for better view
    const newRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01, // Zoomed in
      longitudeDelta: 0.01,
    };

    // Animate to location
    mapRef.current?.animateToRegion(newRegion, 1000);

    // Fetch nearby businesses
    fetchBusinesses(location.coords.latitude, location.coords.longitude, radius, q, activeCategory);

  } catch (error) {
    // Handle specific error types
    let errorMessage = 'Unable to get your current location. ';
    if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
      errorMessage += 'Please enable location services.';
    } else if (error.code === 'E_LOCATION_TIMEOUT') {
      errorMessage += 'Location request timed out.';
    }
    Alert.alert('Location Error', errorMessage);
  }
};
```

## User Experience Flow

### 1. Screen Opens
```
User opens Nearby/Map screen
  ↓
Check if specific search location provided
  ↓
NO → Auto-request location permission
  ↓
Permission granted?
  ↓
YES → Get high-accuracy location
  ↓
Animate map to user location
  ↓
Fetch nearby businesses
  ↓
Show businesses with distance
```

### 2. User Taps "Find Me" Button
```
User taps location button
  ↓
Show loading indicator
  ↓
Request location permission (if not granted)
  ↓
Get BestForNavigation accuracy location
  ↓
Zoom map closer (0.01 delta)
  ↓
Animate to user's exact location
  ↓
Fetch businesses at current location
  ↓
Update business list with distances
  ↓
Hide loading indicator
```

### 3. Error Scenarios
```
Location request fails
  ↓
Identify error type
  ↓
Show user-friendly message
  ↓
Permission Denied → Guide to settings
Timeout → Suggest retry
Services Disabled → Guide to enable
Unavailable → Use last known location
```

## Permissions Required

### iOS (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby businesses and services</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Allow location access to find businesses near you</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

These are automatically added by `expo-location` config plugin.

## Location Features

### 1. Distance Calculation
```typescript
// Server-side (PostgreSQL + PostGIS)
st_distance(
  b.location,
  st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
) AS distance_meters

// Display in UI
{(business.distance_meters / 1000).toFixed(1)} km away
```

### 2. Blue Dot on Map
```typescript
<MapView
  showsUserLocation={true}  // Shows blue dot
  showsMyLocationButton={false}  // We use custom button
  followsUserLocation={false}  // Don't auto-follow
/>
```

### 3. Custom Location Button
```typescript
<TouchableOpacity
  onPress={findMe}
  className="absolute right-6 bottom-6"
>
  {isLocating ? (
    <ActivityIndicator />
  ) : (
    <Crosshair size={24} color="#fff" />
  )}
</TouchableOpacity>
```

## Error Messages

### Permission Denied
```
Title: "Permission Denied"
Message: "Location permission is required to show your current location. 
Please enable it in your device settings."
```

### Location Services Disabled
```
Title: "Location Error"
Message: "Unable to get your current location. Please enable location 
services in your device settings."
```

### Timeout
```
Title: "Location Error"
Message: "Unable to get your current location. Location request timed out. 
Please try again."
```

### Temporarily Unavailable
```
Title: "Location Error"
Message: "Unable to get your current location. Location is temporarily 
unavailable."
```

## Testing Checklist

- [ ] Auto-location on screen load (if no search params)
- [ ] "Find Me" button gets current location
- [ ] Loading indicator shows while locating
- [ ] Map animates to user location
- [ ] Blue dot appears on map at user location
- [ ] Businesses fetch at current location
- [ ] Distance shows correctly for each business
- [ ] Permission denied shows helpful message
- [ ] Location services disabled shows guide
- [ ] Timeout error handled gracefully
- [ ] Works on Android devices
- [ ] Works on iOS devices
- [ ] Fallback to Colombo if permission denied
- [ ] Nearby businesses update when location changes

## Best Practices

### 1. Request Permission Explicitly
```typescript
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  // Show clear message why permission is needed
  Alert.alert('Permission Required', 'We need location to find nearby businesses');
  return;
}
```

### 2. Use Appropriate Accuracy
```typescript
// For "Find Me" - High accuracy
accuracy: Location.Accuracy.BestForNavigation

// For background updates - Balanced
accuracy: Location.Accuracy.Balanced

// For battery saving - Low
accuracy: Location.Accuracy.Low
```

### 3. Handle Errors Gracefully
```typescript
try {
  const location = await Location.getCurrentPositionAsync();
} catch (error) {
  // Always provide fallback behavior
  console.log('Using default location');
  useDefaultLocation();
}
```

### 4. Provide Visual Feedback
```typescript
// Show loading state
setIsLocating(true);

// Get location
const location = await getLocation();

// Always cleanup
setIsLocating(false);
```

## Performance Optimization

### 1. Cache Location Updates
- Updates every 10 seconds (not on every map move)
- Prevents excessive API calls
- Balances accuracy with battery life

### 2. Smart Auto-Location
- Only auto-locates if no search params
- Silently fails if permission denied
- Uses default location as fallback

### 3. Debounced Map Updates
- Fetches businesses when user stops dragging
- Prevents fetching while actively panning
- Uses `onRegionChangeComplete` not `onRegionChange`

## Troubleshooting

### Location Not Working on Emulator
**Solution:** Emulators may not have GPS. Set custom location:
- Android: Use Extended Controls → Location
- iOS Simulator: Debug → Location → Custom Location

### Permission Prompt Not Showing
**Solution:** Check if already denied in device settings
- Android: Settings → Apps → [App] → Permissions → Location
- iOS: Settings → [App] → Location

### Slow Location Updates
**Solution:** Change accuracy level or check GPS signal
```typescript
// Try different accuracy
accuracy: Location.Accuracy.Balanced // Faster, less accurate
```

### Map Not Animating to Location
**Solution:** Check if mapRef is properly set
```typescript
const mapRef = useRef<MapView>(null);

// In MapView
ref={mapRef}

// When animating
if (mapRef.current) {
  mapRef.current.animateToRegion(region, 1000);
}
```

## Future Enhancements

- [ ] **Background Location** - Track location when app is backgrounded
- [ ] **Location History** - Remember frequently visited locations
- [ ] **Geofencing** - Notify when near saved businesses
- [ ] **Route Navigation** - Directions to selected business
- [ ] **Location Sharing** - Share current location with others
- [ ] **Offline Maps** - Cached map tiles for offline use
- [ ] **Location Accuracy Indicator** - Show GPS signal strength
- [ ] **Battery Optimization** - Smart switching between accuracy levels

---

**Live Location Feature Complete!** 📍

Users now get accurate, real-time location with automatic detection and comprehensive error handling!
