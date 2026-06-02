# 🚀 Location Quick Start

## 30-Second Setup

```tsx
import { useLocation } from './src/hooks/useLocation';

function MyComponent() {
  const { location, getCurrentLocation, isLoading, accuracy } = useLocation({
    enableHighAccuracy: true,
    minAccuracy: 30,
  });

  const handleGetLocation = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      console.log(loc.coords.latitude, loc.coords.longitude);
    }
  };

  return (
    <TouchableOpacity onPress={handleGetLocation} disabled={isLoading}>
      <Text>{isLoading ? 'Finding...' : 'Get My Location'}</Text>
      {accuracy && <Text>±{accuracy.toFixed(1)}m</Text>}
    </TouchableOpacity>
  );
}
```

## Common Configs

### High Precision (Addresses)
```tsx
useLocation({ minAccuracy: 20, maxWaitTime: 30000, retryAttempts: 5 })
```

### Balanced (General)
```tsx
useLocation({ minAccuracy: 50, maxWaitTime: 15000 }) // defaults
```

### Fast (Search)
```tsx
useLocation({ minAccuracy: 100, maxWaitTime: 10000, retryAttempts: 2 })
```

### Live Tracking
```tsx
useLocation({ watchPosition: true, timeInterval: 5000 })
```

## Full Example with Error Handling

```tsx
const {
  location,
  getCurrentLocation,
  isLoading,
  accuracy,
  error,
  checkLocationEnabled,
} = useLocation({
  enableHighAccuracy: true,
  minAccuracy: 30,
  maxWaitTime: 20000,
});

const handleGetLocation = async () => {
  // Check GPS enabled
  const enabled = await checkLocationEnabled();
  if (!enabled) {
    Alert.alert('GPS Disabled', 'Please enable GPS');
    return;
  }

  // Get location
  const loc = await getCurrentLocation();
  if (loc) {
    console.log('✓ Got location:', loc.coords);
  } else {
    Alert.alert('Error', error || 'Failed to get location');
  }
};
```

## Accuracy Colors

```tsx
const getColor = (accuracy: number | null) => {
  if (!accuracy) return '#666';
  if (accuracy <= 20) return '#10b981'; // Green
  if (accuracy <= 50) return '#f59e0b'; // Orange
  return '#ef4444'; // Red
};
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Permission denied | `Linking.openSettings()` |
| GPS disabled | Check with `checkLocationEnabled()` |
| Low accuracy | Move to open area, wait longer |
| Takes too long | Increase `maxWaitTime` |
| Works on simulator, not device | Test on physical device |

## Test It Now

```tsx
import { LocationPickerExample } from './src/components/LocationPickerExample';

// Add to any screen
<LocationPickerExample />
```

## What You Get

✅ Waits for good GPS fix (not just first reading)  
✅ Automatic retries on failure  
✅ Permission & GPS detection  
✅ Configurable accuracy targets  
✅ Cancel long requests  
✅ Detailed console logs  

## Files to Read

- **LOCATION_SETUP.md** - Full docs
- **useLocationExamples.md** - Code examples  
- **LOCATION_MIGRATION_GUIDE.md** - Migrate existing screens
- **GPS_TROUBLESHOOTING.md** - Fix issues

## Next Steps

1. ✅ Test `LocationPickerExample` component
2. ⚠️ Migrate `RegisterBusinessScreen` (HIGH PRIORITY)
3. ⚠️ Update other screens as needed
4. ✅ Test on physical device (required!)

---

**Need help?** Check `LOCATION_IMPLEMENTATION_SUMMARY.md`
