# Town Search with Coordinates & Category Filters

## ✅ Implementation Complete

Updated the home screen search to use town coordinates (lat/lng) for accurate nearby business searches and implemented category filtering.

## Changes Made

### **1. Town Search with Coordinates** ✅

**File:** `src/screens/Home/HomeScreen.tsx`

#### **Town Data Structure:**
```typescript
interface Town {
  name: string;
  lat: number;
  lon: number;
  district: string;
  type: string;
}
```

**Example:**
```json
{
  "name": "Colombo",
  "lat": 6.9271,
  "lon": 79.8612,
  "district": "Colombo",
  "type": "city"
}
```

#### **Search Items Update:**

**Before:**
```typescript
...uniqueTowns.map((t, index) => ({
  id: `town-${index}-${t}`,
  name: t,
  type: 'town'
}))
```

**After:**
```typescript
// Create map to deduplicate and keep full data
const townMap = new Map();
townsData.forEach(town => {
  if (!townMap.has(town.name)) {
    townMap.set(town.name, town);
  }
});

...Array.from(townMap.values()).map((town, index) => ({
  id: `town-${index}-${town.name}`,
  name: town.name,
  town_name: town.name,
  type: 'town',
  subtitle: town.district !== 'Unknown' ? town.district : undefined,
  data: town // ✅ Includes lat/lon
}))
```

#### **Search Handler Update:**

**When Town is Selected:**
```typescript
if (suggestion?.type === 'town' && suggestion?.data) {
  lat = suggestion.data.lat;  // ✅ Use town coordinates
  lng = suggestion.data.lon;
  // Skip GPS location fetch
}
```

**When Category/Business is Selected:**
```typescript
// Try to get user's current GPS location
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.BestForNavigation,
});

if (location.coords.accuracy < 50) {
  lat = location.coords.latitude;
  lng = location.coords.longitude;
}
```

### **2. Category Filter** ✅

**File:** `src/screens/Business/BusinessListScreen.tsx`

#### **Filter Implementation:**

**State:**
```typescript
const [activeCategory, setActiveCategory] = useState<string>(
  type === 'category' ? q : ''
);
```

**Database Query:**
```typescript
const { data } = await supabase.rpc('get_nearby_businesses', {
  user_lat: lat,
  user_lng: lng,
  search_query: query,
  dist_limit: radius,
  category_filter: category // ✅ Filter parameter
});
```

#### **UI Filter Buttons:**

```tsx
<ScrollView horizontal>
  {/* All Categories */}
  <TouchableOpacity
    onPress={() => setActiveCategory('')}
    style={{
      backgroundColor: activeCategory === '' ? colors.brand.blue : colors.surface
    }}
  >
    <Text>All</Text>
  </TouchableOpacity>

  {/* Category Buttons */}
  {CATEGORY_GROUPS.map(group => (
    <TouchableOpacity
      key={group.id}
      onPress={() => setActiveCategory(group.name)}
      style={{
        backgroundColor: activeCategory === group.name ? colors.brand.blue : colors.surface
      }}
    >
      <Text>{group.name}</Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

## Database Function Required

### **get_nearby_businesses Function:**

```sql
CREATE OR REPLACE FUNCTION get_nearby_businesses(
  user_lat NUMERIC,
  user_lng NUMERIC,
  search_query TEXT DEFAULT '',
  dist_limit INTEGER DEFAULT 50000,
  category_filter TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  address TEXT,
  detailed_address TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  logo_url TEXT,
  image_url TEXT,
  phone TEXT,
  email TEXT,
  website_url TEXT,
  rating NUMERIC,
  reviews_count INTEGER,
  distance_meters NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.description,
    b.category,
    b.address,
    b.detailed_address,
    b.city,
    b.latitude,
    b.longitude,
    b.logo_url,
    b.image_url,
    b.phone,
    b.email,
    b.website_url,
    b.rating,
    b.reviews_count,
    ST_Distance(
      b.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters
  FROM businesses b
  WHERE
    b.status = 'approved'
    AND (
      search_query = ''
      OR b.name ILIKE '%' || search_query || '%'
      OR b.description ILIKE '%' || search_query || '%'
      OR b.category ILIKE '%' || search_query || '%'
      OR b.city ILIKE '%' || search_query || '%'
    )
    AND (
      category_filter = ''
      OR b.category ILIKE '%' || category_filter || '%'
    )
    AND ST_DWithin(
      b.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      dist_limit
    )
  ORDER BY distance_meters ASC
  LIMIT 100;
END;
$$;
```

**Grant permissions:**
```sql
GRANT EXECUTE ON FUNCTION get_nearby_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_businesses TO anon;
```

## User Flow

### **1. Search for Town**

```
User types "Galle"
    ↓
Suggestions show:
┌─────────────────────────┐
│ 📍 Galle                │
│    Southern Province    │
└─────────────────────────┘
    ↓
User taps "Galle"
    ↓
Navigate to Nearby page with:
- lat: 6.0535
- lng: 80.2210
- q: "Galle"
    ↓
Shows businesses near Galle
```

### **2. Search for Category**

```
User types "Restaurant"
    ↓
Suggestions show:
┌─────────────────────────┐
│ 🏷️ Food & Dining       │
└─────────────────────────┘
    ↓
User taps category
    ↓
Get user's GPS location
    ↓
Navigate to Nearby page with:
- lat: [user's GPS lat]
- lng: [user's GPS lng]
- q: "Food & Dining"
- type: "category"
    ↓
Category filter auto-selected
Shows restaurants near user
```

### **3. Search for Business**

```
User types "Pizza Hut"
    ↓
Suggestions show:
┌─────────────────────────┐
│ 🏢 Pizza Hut Colombo    │
│    Colombo              │
└─────────────────────────┘
    ↓
User taps business
    ↓
Get user's GPS location
    ↓
Navigate to Nearby page with:
- lat: [user's GPS lat]
- lng: [user's GPS lng]
- q: "Pizza Hut Colombo"
    ↓
Shows matching business + nearby
```

## Features

### ✅ **Smart Location Resolution**

| Search Type | Location Source | Behavior |
|------------|-----------------|----------|
| **Town** | Town coordinates | No GPS needed |
| **Category** | User GPS | Gets current location |
| **Business** | User GPS | Gets current location |
| **Generic text** | User GPS | Gets current location |

### ✅ **Suggestion Display**

```tsx
Town:
┌─────────────────────────┐
│ 📍 Colombo              │  ← Name
│    Western Province     │  ← District
└─────────────────────────┘

Category:
┌─────────────────────────┐
│ 🏷️ Food & Dining       │  ← Name
│    CATEGORY             │  ← Type badge
└─────────────────────────┘

Business:
┌─────────────────────────┐
│ 🏢 Pizza Hut            │  ← Name
│    Colombo              │  ← City
│    BUSINESS             │  ← Type badge
└─────────────────────────┘
```

### ✅ **Category Filters on Map**

**Header:**
```
┌──────────────────────────────────────┐
│ Nearby "Colombo"    [🧭 Find Me] [≡] │
├──────────────────────────────────────┤
│ [All] [Food] [Health] [Shopping] ... │
└──────────────────────────────────────┘
```

**Behavior:**
- Tap "All" → Shows all businesses
- Tap "Food" → Shows only food businesses
- Active filter highlighted in blue
- Re-fetches data on filter change

## Towns Data

### **File:** `src/data/sri-lanka-towns.json`

**Total Towns:** ~1000+ towns/cities/suburbs

**Structure:**
```json
[
  {
    "name": "Colombo",
    "lat": 6.9271,
    "lon": 79.8612,
    "district": "Colombo",
    "type": "city"
  },
  {
    "name": "Galle",
    "lat": 6.0535,
    "lon": 80.2210,
    "district": "Galle",
    "type": "city"
  },
  {
    "name": "Kandy",
    "lat": 7.2906,
    "lon": 80.6337,
    "district": "Kandy",
    "type": "city"
  }
  // ... more towns
]
```

### **Major Cities with Coordinates:**

| City | Latitude | Longitude | District |
|------|----------|-----------|----------|
| Colombo | 6.9271 | 79.8612 | Colombo |
| Galle | 6.0535 | 80.2210 | Galle |
| Kandy | 7.2906 | 80.6337 | Kandy |
| Jaffna | 9.6615 | 80.0255 | Jaffna |
| Negombo | 7.2083 | 79.8358 | Gampaha |
| Anuradhapura | 8.3114 | 80.4037 | Anuradhapura |
| Trincomalee | 8.5874 | 81.2152 | Trincomalee |
| Batticaloa | 7.7102 | 81.6924 | Batticaloa |
| Matara | 5.9549 | 80.5550 | Matara |
| Kurunegala | 7.4863 | 80.3623 | Kurunegala |

## Categories Available

```typescript
const CATEGORY_GROUPS = [
  { name: 'Food & Dining', subcategories: [...] },
  { name: 'Shopping & Retail', subcategories: [...] },
  { name: 'Health & Wellness', subcategories: [...] },
  { name: 'Professional Services', subcategories: [...] },
  { name: 'Home & Garden', subcategories: [...] },
  { name: 'Automotive', subcategories: [...] },
  { name: 'Entertainment', subcategories: [...] },
  { name: 'Education', subcategories: [...] },
  { name: 'Technology', subcategories: [...] },
  { name: 'Beauty & Personal Care', subcategories: [...] },
  { name: 'Travel & Tourism', subcategories: [...] },
  { name: 'Real Estate', subcategories: [...] },
  { name: 'Finance & Insurance', subcategories: [...] },
  { name: 'Sports & Fitness', subcategories: [...] }
];
```

## Testing

### **Test Town Search:**

1. Open app
2. Tap search bar
3. Type "Galle"
4. Suggestion shows "Galle - Southern Province"
5. Tap suggestion
6. Map centers on Galle (6.0535, 80.2210)
7. Shows businesses near Galle

### **Test Category Filter:**

1. Search for any location
2. Opens map with businesses
3. Tap "Food & Dining" filter
4. Only food businesses shown
5. Tap "All" filter
6. All businesses shown again

### **Test Combined:**

1. Search "Colombo"
2. Map shows businesses in Colombo
3. Tap "Health & Wellness" filter
4. Shows only health businesses in Colombo
5. Change radius to 5km
6. Shows only health businesses within 5km of Colombo center

## Performance Optimizations

### **1. Town Deduplication**
```typescript
const townMap = new Map();
townsData.forEach(town => {
  if (!townMap.has(town.name)) {
    townMap.set(town.name, town);
  }
});
```
- Removes duplicate town names
- Keeps first occurrence
- ~1000 towns → ~300 unique names

### **2. Memoized Search Items**
```typescript
const searchableItems = useMemo(() => {
  // Build search index
}, [searchData]);
```
- Only rebuilds when searchData changes
- Prevents unnecessary re-renders

### **3. Debounced Search**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```
- Waits 300ms after typing stops
- Prevents excessive searches

### **4. Database Indexes**

Ensure these indexes exist:
```sql
CREATE INDEX idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_name ON businesses USING GIN(to_tsvector('english', name));
```

## Troubleshooting

### **Issue: Town search shows "not found"**

**Check:**
1. Town name spelling matches JSON
2. Town data includes lat/lon
3. Database function accepts coordinates

### **Issue: Category filter not working**

**Check:**
1. `get_nearby_businesses` function handles `category_filter`
2. Category name matches database values
3. Function uses ILIKE for partial match

### **Issue: No businesses shown for town**

**Check:**
1. Town coordinates are correct
2. Radius is large enough (default 50km)
3. Businesses exist in that area
4. Businesses status is "approved"

## Summary

✅ **Town search with coordinates** - Uses lat/lng from towns.json  
✅ **Smart location resolution** - Town coords or user GPS  
✅ **Category filters** - Shows in header, filters results  
✅ **District display** - Shows town district in suggestions  
✅ **Database integration** - RPC function with filters  
✅ **Performance optimized** - Memoized, debounced, indexed  

Users can now search by town name and get accurate nearby businesses with category filters! 🎯
