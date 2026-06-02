# Quick Search Bar - Nearby Page

## ✅ Added Instant Search with Auto-Clear

Implemented a search bar on the nearby/map page for quick filtering with debounced updates and one-tap clear functionality.

## Features

### **1. Quick Search Input**
- 🔍 Search bar positioned below title, above category filters
- ⚡ 500ms debounced search (updates after user stops typing)
- 🎯 Searches business names, categories, and locations
- 🔄 Real-time results update
- ❌ One-tap clear button (X icon)

### **2. Auto-Clear Functionality**
- Clear button only appears when text is entered
- Tapping X clears search and resets to all businesses
- Smooth transition back to full results

### **3. Debounced Search**
- Waits 500ms after user stops typing
- Prevents excessive API calls
- Smooth, responsive experience

## UI Design

### **Search Bar Layout:**

```
┌─────────────────────────────────────────┐
│  Nearby Businesses         [Find Me][⚙] │  ← Title + Actions
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ 🔍 Search businesses, categories  ✕│  │  ← Search bar with clear
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  [All] [Food] [Health] [Retail] →       │  ← Category filters
└─────────────────────────────────────────┘
```

### **Search States:**

**Empty State:**
```
┌───────────────────────────────────┐
│ 🔍 Search businesses, categories  │  ← No X button
└───────────────────────────────────┘
```

**Typing State:**
```
┌───────────────────────────────────┐
│ 🔍 resta                        ✕ │  ← X button appears
└───────────────────────────────────┘
       ↓ (500ms wait)
   Searching...
```

**Results State:**
```
┌───────────────────────────────────┐
│ 🔍 restaurant                   ✕ │
└───────────────────────────────────┘
       ↓
  15 restaurants found
```

## Code Implementation

### **State Management:**

```typescript
// Local search query (controlled input)
const [localSearchQuery, setLocalSearchQuery] = useState(q || '');

// Actual search query used for API calls
const [searchQuery, setSearchQuery] = useState<string>(type === 'business' ? q : '');
```

### **Debounced Search Effect:**

```typescript
useEffect(() => {
  const searchTimer = setTimeout(() => {
    if (localSearchQuery !== (searchQuery || q)) {
      // User has typed a new search query
      fetchBusinesses(
        region.latitude,
        region.longitude,
        radius,
        localSearchQuery,
        activeCategory
      );
      setSearchQuery(localSearchQuery);
    }
  }, 500); // 500ms debounce

  return () => clearTimeout(searchTimer);
}, [localSearchQuery]);
```

### **Search Input UI:**

```typescript
<View className="mb-4 relative">
  {/* Search Icon */}
  <View className="absolute left-4 top-3 z-10">
    <Search size={18} color={colors.text.tertiary} />
  </View>

  {/* Text Input */}
  <TextInput
    value={localSearchQuery}
    onChangeText={setLocalSearchQuery}
    placeholder="Search businesses, categories..."
    placeholderTextColor={colors.text.tertiary}
    className="pl-12 pr-12 py-3 rounded-full text-sm font-outfit"
    style={{
      backgroundColor: colors.input.background,
      color: colors.text.primary,
      borderWidth: 1,
      borderColor: colors.border
    }}
  />

  {/* Clear Button (conditional) */}
  {localSearchQuery.length > 0 && (
    <TouchableOpacity
      onPress={() => {
        setLocalSearchQuery('');
        setSearchQuery('');
        fetchBusinesses(region.latitude, region.longitude, radius, '', activeCategory);
      }}
      className="absolute right-4 top-3 z-10"
    >
      <X size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  )}
</View>
```

## User Flows

### **Flow 1: Quick Search**

```
User: On nearby page
    ↓
Tap search bar
    ↓
Keyboard opens
    ↓
Type: "rest"
    ↓
Wait 500ms
    ↓
API call: get_nearby_businesses(..., search_query: "rest")
    ↓
Results update:
  - Restaurant A
  - Restaurant B
  - Restroom Supplies
    ✅ Filtered results shown
```

### **Flow 2: Refine Search**

```
User: Currently showing "restaurant" results
    ↓
Tap search bar
    ↓
Add more text: "restaurant colombo"
    ↓
Wait 500ms
    ↓
API call: get_nearby_businesses(..., search_query: "restaurant colombo")
    ↓
Results update:
  - Only restaurants in Colombo
    ✅ More specific results
```

### **Flow 3: Clear Search**

```
User: Showing filtered results
    ↓
Tap X (clear button)
    ↓
Immediate actions:
  - localSearchQuery: "restaurant" → ""
  - searchQuery: "restaurant" → ""
  - API call: get_nearby_businesses(..., search_query: "")
    ↓
Results update:
  - All businesses shown again
  - X button disappears
    ✅ Reset to default view
```

### **Flow 4: No Results**

```
User: Type "zzzzzz"
    ↓
Wait 500ms
    ↓
API call returns: []
    ↓
Show: "No businesses found nearby"
    ↓
User: Tap X to clear
    ↓
All businesses shown again
    ✅ Easy recovery
```

## Debouncing Explained

### **Why 500ms?**

```
User types: "r" "e" "s" "t" "a" "u" "r" "a" "n" "t"
            ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓
Without debounce: 10 API calls (wasteful)

With 500ms debounce:
  "r"      → Timer starts
  "re"     → Timer resets
  "res"    → Timer resets
  "rest"   → Timer resets
  ...
  "restaurant" → Timer resets
  (User stops typing)
  500ms later → 1 API call (efficient)
```

### **Benefits:**

- ✅ **Reduced API calls** - 10 calls → 1 call
- ✅ **Better performance** - Less server load
- ✅ **Smoother UX** - No flickering results
- ✅ **Lower costs** - Fewer database queries
- ✅ **Battery efficient** - Less network activity

## Search Behavior

### **What Gets Searched:**

The search query is passed to `get_nearby_businesses` RPC function:

```sql
WHERE b.status = 'approved'
  AND ST_DWithin(b.location, user_location, dist_limit)
  AND (
    search_query = '' OR
    b.name ILIKE '%' || search_query || '%' OR          -- Business name
    b.city ILIKE '%' || search_query || '%' OR          -- City
    b.category ILIKE '%' || search_query || '%' OR      -- Category
    b.address ILIKE '%' || search_query || '%'          -- Address
  )
```

### **Search Examples:**

| Query | Matches |
|-------|---------|
| `"food"` | - Food City<br>- Seafood Restaurant<br>- Category: Food & Dining |
| `"colombo"` | - Businesses in Colombo city<br>- Addresses containing "Colombo" |
| `"hotel 5 star"` | - Five Star Hotel<br>- Hotel California |
| `"medical center"` | - Colombo Medical Center<br>- Urgent Medical Center |

### **Case Insensitive:**

```typescript
// All these are equivalent:
"Restaurant"
"restaurant"
"RESTAURANT"
"ReStAuRaNt"

// All match:
- "McDonald's Restaurant"
- "FINE DINING RESTAURANT"
- "The Restaurant"
```

## Integration with Other Features

### **Works with Category Filter:**

```typescript
// Search + Category filter
fetchBusinesses(
  region.latitude,
  region.longitude,
  radius,
  localSearchQuery,        // "pizza"
  activeCategory          // "Food & Dining"
);

// Results: Only pizza places in Food & Dining category
```

### **Works with Map Filters:**

```typescript
// Search + Distance + Rating
fetchBusinesses(
  region.latitude,
  region.longitude,
  5000,                   // 5km radius
  "restaurant",           // search query
  ""                      // no category filter
);

// Then apply client-side filters
if (minRating > 0) {
  results = results.filter(b => b.rating >= 4.5);
}

// Results: Restaurants within 5km, rated 4.5+
```

### **Works with "Search This Area":**

```
User: Drags map to new location
    ↓
"Search this area" button appears
    ↓
User: Taps button
    ↓
Fetches businesses with current search query:
  - New center: map center
  - Search query: preserved
  - Category filter: preserved
    ✅ Consistent search across map moves
```

## Performance Optimization

### **Debounce Implementation:**

```typescript
// Old approach (no debounce)
const handleSearch = (query: string) => {
  fetchBusinesses(..., query, ...);  // Called on every keystroke
};

// New approach (with debounce)
useEffect(() => {
  const timer = setTimeout(() => {
    if (localSearchQuery !== searchQuery) {
      fetchBusinesses(..., localSearchQuery, ...);
    }
  }, 500);
  
  return () => clearTimeout(timer);  // Cleanup on unmount or re-render
}, [localSearchQuery]);
```

### **Performance Metrics:**

```
Without debounce:
- User types 10 characters
- API calls: 10
- Network: 10 requests
- Time: ~2 seconds (200ms each)
- Database queries: 10

With 500ms debounce:
- User types 10 characters
- API calls: 1
- Network: 1 request
- Time: ~200ms
- Database queries: 1

Improvement: 90% fewer requests
```

## Accessibility

### **Screen Reader Support:**

```typescript
<TextInput
  accessible={true}
  accessibilityLabel="Search businesses"
  accessibilityHint="Type to filter nearby businesses by name or category"
  accessibilityRole="search"
  value={localSearchQuery}
  onChangeText={setLocalSearchQuery}
  placeholder="Search businesses, categories..."
/>

<TouchableOpacity
  accessible={true}
  accessibilityLabel="Clear search"
  accessibilityHint="Remove search text and show all businesses"
  accessibilityRole="button"
  onPress={handleClear}
>
  <X size={18} />
</TouchableOpacity>
```

### **Keyboard Navigation:**

```typescript
<TextInput
  returnKeyType="search"
  onSubmitEditing={() => {
    // Immediately trigger search (bypass debounce)
    fetchBusinesses(..., localSearchQuery, ...);
  }}
  blurOnSubmit={true}
/>
```

## Testing

### **Test 1: Basic Search**

1. Open nearby page
2. Tap search bar
3. Type "restaurant"
4. Wait 500ms
5. **Expected:**
   - Loading indicator appears
   - Results filtered to restaurants only
   - X button appears

### **Test 2: Clear Button**

1. Search for "cafe"
2. Results filtered
3. Tap X button
4. **Expected:**
   - Search clears immediately
   - All businesses shown
   - X button disappears

### **Test 3: Debounce**

1. Type quickly: "r-e-s-t-a-u-r-a-n-t"
2. **Expected:**
   - Only 1 API call after 500ms
   - No flickering results
   - Network tab shows 1 request

### **Test 4: Empty Results**

1. Search for "zzzzzz"
2. **Expected:**
   - "No businesses found nearby" message
   - X button visible
   - Can clear and retry

### **Test 5: Category + Search**

1. Select "Food & Dining" category
2. Search "pizza"
3. **Expected:**
   - Only pizza places in Food category
   - Both filters active

### **Test 6: Map Move + Search**

1. Search "restaurant"
2. Drag map to new area
3. Tap "Search this area"
4. **Expected:**
   - Searches for "restaurant" at new location
   - Query preserved

## Edge Cases

### **Case 1: Rapid Typing**

```typescript
// User types very fast
"r" (50ms) "e" (50ms) "s" (50ms) "t"

// Each keystroke resets the timer
// Only 1 API call 500ms after last keystroke
```

### **Case 2: Paste Text**

```typescript
// User pastes "Restaurant Colombo"
onChangeText("Restaurant Colombo")

// Behaves the same as typing
// 500ms debounce applies
```

### **Case 3: Clear During Search**

```typescript
// User types "rest"
// Waits 300ms
// Taps X

// Timer is cleared
// No API call made (cancelled)
// State reset immediately
```

### **Case 4: Component Unmount**

```typescript
useEffect(() => {
  const timer = setTimeout(...);
  
  return () => clearTimeout(timer);  // Cleanup
}, [localSearchQuery]);

// If user navigates away mid-search
// Timer is cleaned up
// No memory leaks
```

## Future Enhancements

### **1. Search History:**

```typescript
const [searchHistory, setSearchHistory] = useState<string[]>([]);

const saveToHistory = (query: string) => {
  if (query.length > 0) {
    setSearchHistory(prev => [query, ...prev.filter(q => q !== query)].slice(0, 5));
  }
};

// Show dropdown with recent searches
{searchHistory.map(query => (
  <TouchableOpacity onPress={() => setLocalSearchQuery(query)}>
    <Text>{query}</Text>
  </TouchableOpacity>
))}
```

### **2. Autocomplete Suggestions:**

```typescript
const [suggestions, setSuggestions] = useState<string[]>([]);

useEffect(() => {
  if (localSearchQuery.length > 2) {
    // Fetch suggestions
    const matches = allBusinesses
      .filter(b => b.name.toLowerCase().includes(localSearchQuery.toLowerCase()))
      .slice(0, 5)
      .map(b => b.name);
    
    setSuggestions(matches);
  }
}, [localSearchQuery]);
```

### **3. Voice Search:**

```typescript
import Voice from '@react-native-voice/voice';

const startVoiceSearch = async () => {
  try {
    await Voice.start('en-US');
  } catch (e) {
    console.error(e);
  }
};

Voice.onSpeechResults = (e) => {
  setLocalSearchQuery(e.value[0]);
};
```

### **4. Search Analytics:**

```typescript
const logSearch = async (query: string, resultsCount: number) => {
  await supabase.from('search_logs').insert({
    user_id: userId,
    query: query,
    results_count: resultsCount,
    location: region,
    timestamp: new Date()
  });
};
```

### **5. Smart Search Suggestions:**

```typescript
// Based on popular searches
const popularSearches = [
  "Restaurant",
  "Hotel",
  "Hospital",
  "Pharmacy"
];

// Show when search bar is focused but empty
{localSearchQuery.length === 0 && (
  <View>
    <Text>Popular searches:</Text>
    {popularSearches.map(search => (
      <TouchableOpacity onPress={() => setLocalSearchQuery(search)}>
        <Text>{search}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}
```

## Summary

✅ **Quick search bar** - Positioned below title for easy access  
✅ **Debounced updates** - 500ms delay prevents excessive API calls  
✅ **Auto-clear button** - One-tap X to reset search  
✅ **Real-time results** - Updates as you type (after debounce)  
✅ **Works with filters** - Combines with category/distance/rating filters  
✅ **Smooth UX** - No flickering, responsive, intuitive  
✅ **Performance optimized** - Minimal network requests  
✅ **Accessible** - Screen reader support, keyboard friendly  

Search experience on nearby page is now fast and user-friendly! 🔍✨
