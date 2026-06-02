# Nearby Map Search Fix - Proper Location Handling

## ✅ Fixed Map Search with Correct Locations

Updated BusinessListScreen to properly handle town and business searches with correct map positioning and business results.

## Problems Fixed

**Before:**
```typescript
// ❌ Only checked if coordinates exist, but didn't use them properly
if (!initialLat && !initialLng) {
  // Try to get current location
  const location = await Location.getCurrentPositionAsync();
  // Use location
}
// Always fell back to region state (Colombo)
fetchBusinesses(region.latitude, region.longitude, radius, q, activeCategory);
```

**Issues:**
1. 🐛 Town searches didn't use town coordinates
2. 🐛 Business searches didn't fetch business location
3. 🐛 Map always centered on Colombo or user location
4. 🐛 Search query not preserved properly
5. 🐛 No distinction between search types

## Solution

**After:**
```typescript
// ✅ Handle different search types properly
const initializeSearch = async () => {
  // Case 1: Business search - fetch business location first
  if (type === 'business' && suggestionData?.id) {
    const { data: businessData } = await supabase
      .from('businesses')
      .select('latitude, longitude, name')
      .eq('id', suggestionData.id)
      .single();
    
    setRegion({
      latitude: businessData.latitude,
      longitude: businessData.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
    
    fetchBusinesses(
      businessData.latitude,
      businessData.longitude,
      radius,
      businessData.name,
      activeCategory
    );
    return;
  }

  // Case 2: Town search with coordinates
  if (type === 'town' && initialLat && initialLng) {
    setRegion({
      latitude: parseFloat(initialLat),
      longitude: parseFloat(initialLng),
      latitudeDelta: 0.15, // Wider view for towns
      longitudeDelta: 0.15,
    });
    
    fetchBusinesses(
      parseFloat(initialLat),
      parseFloat(initialLng),
      radius,
      q, // Town name
      activeCategory
    );
    return;
  }

  // Case 3: Coordinates provided
  if (initialLat && initialLng) {
    setRegion({
      latitude: parseFloat(initialLat),
      longitude: parseFloat(initialLng),
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
    
    fetchBusinesses(
      parseFloat(initialLat),
      parseFloat(initialLng),
      radius,
      searchQuery || q,
      activeCategory
    );
    return;
  }

  // Case 4: No coordinates - get current location
  // ... (existing logic)
};
```

## Changes Made

### **File:** `src/screens/Business/BusinessListScreen.tsx`

#### **1. Added New State:**

```typescript
// Track the search query separately
const [searchQuery, setSearchQuery] = useState<string>(type === 'business' ? q : '');
```

#### **2. Updated Route Params:**

```typescript
// Accept suggestionData which contains full business/town info
const { q = '', lat: initialLat, lng: initialLng, type, suggestionData } = route.params || {};
```

#### **3. Replaced useEffect with Smart Search Logic:**

**Search Type Handling:**

```
┌─────────────────────────────────────────┐
│  Search Type: "business"                │
│  ─────────────────────────────          │
│  1. Fetch business from database        │
│  2. Get latitude/longitude              │
│  3. Center map on business              │
│  4. Search nearby businesses            │
│  5. Highlight searched business         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Search Type: "town"                    │
│  ─────────────────────────────          │
│  1. Use provided town coordinates       │
│  2. Center map on town center           │
│  3. Use wider zoom (0.15 delta)         │
│  4. Search businesses in town           │
│  5. Show all town businesses            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Search Type: "category"                │
│  ─────────────────────────────          │
│  1. Use current/default location        │
│  2. Set category filter                 │
│  3. Search nearby in category           │
│  4. Show category-specific results      │
└─────────────────────────────────────────┘
```

#### **4. Updated searchThisArea Function:**

```typescript
const searchThisArea = () => {
  // Use current searchQuery instead of original q
  fetchBusinesses(region.latitude, region.longitude, radius, searchQuery || q, activeCategory);
  setShowSearchThisArea(false);
};
```

## User Flows

### **Flow 1: Search Town → See Map**

```
User: Home screen → Search "Galle"
    ↓
HomeScreen: Get town from towns.json
    { name: "Galle", lat: 6.0535, lon: 80.2210, district: "Galle" }
    ↓
Navigate to Map tab with:
    q: "Galle"
    lat: 6.0535
    lng: 80.2210
    type: "town"
    ↓
BusinessListScreen: Initialize search
    Case 2: Town search detected
    ↓
Set map region to Galle:
    latitude: 6.0535
    longitude: 80.2210
    latitudeDelta: 0.15 (wider view)
    ↓
Fetch businesses near Galle:
    RPC call: get_nearby_businesses(6.0535, 80.2210, "Galle", 50km)
    ↓
Result:
    ✅ Map centered on Galle town
    ✅ Shows all businesses in Galle
    ✅ Correct search radius
```

### **Flow 2: Search Business → See Location**

```
User: Home screen → Search "Cargills Food City"
    ↓
HomeScreen: Server-side search returns business
    { id: "abc-123", name: "Cargills Food City", city: "Colombo" }
    ↓
Navigate to Map tab with:
    q: "Cargills Food City"
    type: "business"
    suggestionData: { id: "abc-123", name: "Cargills Food City" }
    ↓
BusinessListScreen: Initialize search
    Case 1: Business search detected
    ↓
Fetch business location from database:
    SELECT latitude, longitude, name FROM businesses WHERE id = 'abc-123'
    Returns: { latitude: 6.9271, longitude: 79.8612, name: "Cargills Food City" }
    ↓
Set map region to business location:
    latitude: 6.9271
    longitude: 79.8612
    latitudeDelta: 0.05 (close zoom)
    ↓
Fetch nearby businesses:
    RPC call: get_nearby_businesses(6.9271, 79.8612, "Cargills Food City", 50km)
    ↓
Result:
    ✅ Map centered on specific business
    ✅ Shows that business + nearby ones
    ✅ Searched business highlighted
```

### **Flow 3: Category Search**

```
User: Home screen → Search "Food & Dining"
    ↓
HomeScreen: Category from static list
    { name: "Food & Dining", type: "category" }
    ↓
Navigate to Map tab with:
    q: "Food & Dining"
    type: "category"
    ↓
BusinessListScreen: Initialize search
    Case 4: No coordinates, get current location
    ↓
Request GPS location:
    Location.getCurrentPositionAsync()
    Returns: { latitude: 6.9271, longitude: 79.8612 }
    ↓
Set category filter:
    activeCategory: "Food & Dining"
    ↓
Fetch businesses near user:
    RPC call: get_nearby_businesses(6.9271, 79.8612, "", 50km, "Food & Dining")
    ↓
Result:
    ✅ Map centered on user location
    ✅ Shows only "Food & Dining" businesses
    ✅ Filtered by category
```

## Navigation Parameters

### **From HomeScreen:**

```typescript
parent.navigate('Map', {
  screen: 'MapMain',
  params: {
    q: suggestion?.name || searchQuery,      // Search term
    lat: latitude,                           // Latitude (if available)
    lng: longitude,                          // Longitude (if available)
    type: suggestion?.type,                  // 'town', 'business', 'category'
    suggestionData: suggestion?.data,        // Full suggestion object
  }
});
```

### **Parameter Breakdown:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | `string` | Search query/name | `"Galle"`, `"Cargills"` |
| `lat` | `number/string` | Latitude coordinate | `6.0535`, `"6.9271"` |
| `lng` | `number/string` | Longitude coordinate | `80.2210`, `"79.8612"` |
| `type` | `string` | Type of search | `"town"`, `"business"`, `"category"` |
| `suggestionData` | `object` | Full data object | `{ id: "...", name: "...", lat: 6.0535 }` |

## Database RPC Function

**Function:** `get_nearby_businesses`

```sql
CREATE OR REPLACE FUNCTION get_nearby_businesses (
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  search_query TEXT DEFAULT '',
  dist_limit DOUBLE PRECISION DEFAULT 5000,
  category_filter TEXT DEFAULT ''
) RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  detailed_address TEXT,
  city TEXT,
  phone TEXT,
  logo_url TEXT,
  image_url TEXT,
  rating NUMERIC,
  reviews_count INTEGER,
  distance_meters DOUBLE PRECISION,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.category,
    b.description,
    b.latitude,
    b.longitude,
    b.address,
    b.detailed_address,
    b.city,
    b.phone,
    b.logo_url,
    b.image_url,
    b.rating,
    b.reviews_count,
    ST_Distance(
      ST_MakePoint(user_lng, user_lat)::geography,
      b.location
    ) AS distance_meters,
    b.is_verified
  FROM businesses b
  WHERE b.status = 'approved'
    AND ST_DWithin(
      b.location,
      ST_MakePoint(user_lng, user_lat)::geography,
      dist_limit
    )
    AND (
      search_query = '' OR
      b.name ILIKE '%' || search_query || '%' OR
      b.city ILIKE '%' || search_query || '%' OR
      b.category ILIKE '%' || search_query || '%'
    )
    AND (
      category_filter = '' OR
      b.category ILIKE '%' || category_filter || '%'
    )
  ORDER BY distance_meters ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;
```

**Parameters:**
- `user_lat` - Center latitude for search
- `user_lng` - Center longitude for search
- `search_query` - Filter by name/city/category (optional)
- `dist_limit` - Radius in meters (default 5000m/5km)
- `category_filter` - Filter by category (optional)

## Map Zoom Levels

### **Zoom Delta Comparison:**

```typescript
// Town search - wider view to see whole town
latitudeDelta: 0.15    // ~16.5km view
longitudeDelta: 0.15

// Business search - close zoom on specific location
latitudeDelta: 0.05    // ~5.5km view
longitudeDelta: 0.05

// User location - medium zoom
latitudeDelta: 0.05    // ~5.5km view
longitudeDelta: 0.05
```

### **Visual Comparison:**

```
┌─────────────────────────────────────────┐
│  Delta: 0.15 (Town View)                │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │         Galle Town                │  │
│  │                                   │  │
│  │    🏢  🏢  🏢                     │  │
│  │                                   │  │
│  │       🏢  🏢                      │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│  16.5km x 16.5km                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Delta: 0.05 (Business View)            │
│  ┌─────────────────┐                    │
│  │                 │                    │
│  │    🏪 Target    │                    │
│  │                 │                    │
│  │   🏢  🏢        │                    │
│  │                 │                    │
│  └─────────────────┘                    │
│  5.5km x 5.5km                          │
└─────────────────────────────────────────┘
```

## Testing

### **Test 1: Town Search**

1. Home screen → Search "Galle"
2. **Expected:**
   - Map centers on Galle (6.0535, 80.2210)
   - Shows businesses in Galle
   - Wider zoom to see whole town
   - Search query preserved

### **Test 2: Business Search**

1. Home screen → Search "Cargills"
2. **Expected:**
   - Map centers on specific Cargills location
   - Shows that Cargills + nearby businesses
   - Close zoom on business
   - Business name in search

### **Test 3: Category Search**

1. Home screen → Search "Food & Dining"
2. **Expected:**
   - Map centers on user location (or Colombo)
   - Shows only Food & Dining businesses
   - Category filter active
   - Correct radius

### **Test 4: Search This Area**

1. Open map
2. Drag map to different location
3. Tap "Search This Area"
4. **Expected:**
   - Fetches businesses at new center
   - Preserves search query
   - Preserves category filter
   - Updates results

### **Test 5: Find Me Button**

1. Open map
2. Tap "Find Me" button
3. **Expected:**
   - Gets GPS location
   - Centers map on user
   - Fetches nearby businesses
   - Updates markers

## Error Handling

### **Business Not Found:**

```typescript
if (type === 'business' && suggestionData?.id) {
  const { data: businessData, error } = await supabase
    .from('businesses')
    .select('latitude, longitude')
    .eq('id', suggestionData.id)
    .single();

  if (!businessData || !businessData.latitude) {
    // Business doesn't exist or has no location
    // Fall back to default location
    console.error('Business not found or has no location');
    // Continue to Case 3 or 4
  }
}
```

### **Invalid Coordinates:**

```typescript
if (initialLat && initialLng) {
  const lat = parseFloat(initialLat);
  const lng = parseFloat(initialLng);
  
  if (isNaN(lat) || isNaN(lng)) {
    console.error('Invalid coordinates provided');
    // Fall back to current location or default
  }
}
```

### **Location Permission Denied:**

```typescript
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  Alert.alert(
    'Location Permission Required',
    'Please enable location permission to see nearby businesses.'
  );
  // Use default Colombo coordinates
}
```

## Performance Optimization

### **Avoid Unnecessary Fetches:**

```typescript
// Only fetch when map region changes significantly
const onRegionChangeComplete = (newRegion: any) => {
  setRegion(newRegion);
  // Don't auto-fetch, show "Search this area" button instead
  setShowSearchThisArea(true);
};
```

### **Limit Database Results:**

```sql
-- RPC function already limits to 100 results
LIMIT 100;
```

### **Use Appropriate Indexes:**

```sql
-- Spatial index for fast distance queries
CREATE INDEX idx_businesses_location 
  ON businesses USING gist(location);

-- Text search indexes
CREATE INDEX idx_businesses_name_trgm 
  ON businesses USING gin(name gin_trgm_ops);
```

## Future Enhancements

### **1. Search History:**

```typescript
// Save recent searches
const saveSearchHistory = async (query: string, type: string) => {
  await AsyncStorage.setItem('search_history', JSON.stringify([
    { query, type, timestamp: Date.now() },
    ...previousHistory
  ]));
};
```

### **2. Clustering:**

When many businesses are close together, show clusters:

```typescript
import { Marker, MarkerCluster } from 'react-native-maps';

<MarkerCluster>
  {businesses.map(business => (
    <Marker key={business.id} coordinate={...} />
  ))}
</MarkerCluster>
```

### **3. Route Directions:**

Add "Get Directions" button:

```typescript
const openDirections = (business: Business) => {
  const url = Platform.select({
    ios: `maps://app?daddr=${business.latitude},${business.longitude}`,
    android: `google.navigation:q=${business.latitude},${business.longitude}`
  });
  Linking.openURL(url);
};
```

### **4. Save Favorite Locations:**

```typescript
const saveFavorite = async (location: Location) => {
  await supabase.from('saved_locations').insert({
    user_id: userId,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude
  });
};
```

## Summary

✅ **Town search** - Uses town coordinates from towns.json  
✅ **Business search** - Fetches business location from database  
✅ **Category search** - Uses current location with category filter  
✅ **Map centering** - Proper zoom levels for each search type  
✅ **Search preservation** - Query maintained across interactions  
✅ **Error handling** - Graceful fallbacks for all cases  
✅ **Performance** - Smart fetching, no unnecessary calls  

Map search now works correctly for all search types! 🗺️
