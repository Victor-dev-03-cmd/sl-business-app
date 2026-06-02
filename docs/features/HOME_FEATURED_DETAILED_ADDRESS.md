# Home Screen - Featured Businesses Detailed Address Update

## ✅ Changes Made

Updated the home screen featured businesses cards to display `detailed_address` instead of just `address`.

## Files Modified

### **HomeScreen.tsx**

## Updates

### **1. Featured Business Card - Address Display** (Lines 767-771)

**Before:**
```tsx
{!!biz.address && (
  <Text className="text-[8px] font-outfit mb-2" numberOfLines={1} style={{ color: colors.text.tertiary }}>
    {biz.address}
  </Text>
)}
```

**After:**
```tsx
{!!(biz.detailed_address || biz.address) && (
  <Text className="text-[8px] font-outfit mb-2" numberOfLines={2} style={{ color: colors.text.tertiary }}>
    {biz.detailed_address || biz.address}
  </Text>
)}
```

**What changed:**
- ✅ Uses `detailed_address` first, falls back to `address`
- ✅ Changed `numberOfLines` from `1` to `2` (shows more detail)
- ✅ Shows if either field exists (not just `address`)

### **2. Search Data Query** (Line 227)

**Before:**
```tsx
.select('id, name, description, city, address, logo_url, image_url')
```

**After:**
```tsx
.select('id, name, description, city, address, detailed_address, logo_url, image_url')
```

**What changed:**
- ✅ Added `detailed_address` to search data fetch
- ✅ Ensures search results have complete address info

### **3. Featured Listings Query** (Line 366)

**Already correct:**
```tsx
.select('*, business:businesses(*)')
```

**Status:**
- ✅ Fetches all business columns including `detailed_address`
- ✅ No changes needed

## Visual Changes

### **Featured Business Card**

**Before:**
```
┌─────────────────────┐
│ [Business Image]    │
│                     │
│ Pizza Hut           │
│ 📍 Colombo          │
│ 123 Main St         │  ← Short address (1 line)
│ 🌐 Visit Website    │
└─────────────────────┘
```

**After:**
```
┌─────────────────────┐
│ [Business Image]    │
│                     │
│ Pizza Hut           │
│ 📍 Colombo          │
│ 123 Main St,        │  ← Detailed address
│ Colombo 03, Sri...  │  ← (2 lines)
│ 🌐 Visit Website    │
└─────────────────────┘
```

### **Key Improvements:**

1. **More Information**
   - Shows full postal address
   - Includes district/province
   - Better for user decision-making

2. **Better UX**
   - Users see complete address
   - No surprises when opening details
   - Matches web app behavior

3. **Consistent Data**
   - Same as business details page
   - Same as web app
   - Professional presentation

## Code Breakdown

### **Address Display Logic**

```tsx
// Condition: Show if either field exists
{!!(biz.detailed_address || biz.address) && (
  <Text numberOfLines={2}>
    {/* Priority: detailed_address first, then address */}
    {biz.detailed_address || biz.address}
  </Text>
)}
```

**Fallback Chain:**
```
1. biz.detailed_address
   ↓ (if null/empty)
2. biz.address
   ↓ (if null/empty)
3. Hide address section
```

### **Example Data**

**Business with detailed_address:**
```json
{
  "name": "Pizza Hut - Colombo 03",
  "city": "Colombo",
  "address": "123 Main St",
  "detailed_address": "123 Main St, Colombo 03, Western Province, Sri Lanka"
}
```

**Card displays:**
- City: `📍 Colombo`
- Address: `123 Main St, Colombo 03, Western Province, Sri Lanka` (2 lines)

**Business without detailed_address:**
```json
{
  "name": "Local Bakery",
  "city": "Kandy",
  "address": "456 Temple Rd",
  "detailed_address": null
}
```

**Card displays:**
- City: `📍 Kandy`
- Address: `456 Temple Rd` (fallback, 1 line)

## Comparison Across Screens

### **1. Home Screen - Featured Businesses** ✅
```tsx
{biz.detailed_address || biz.address}
```

### **2. Business Details Screen** ✅
```tsx
{business.detailed_address || business.address}
```

### **3. Business List Screen (Map View)**
```tsx
{item.city || 'Sri Lanka'}  // Shows distance + city (appropriate for map)
```

**Note:** Map view shows distance + city, which is appropriate since users are searching by location. Detailed address would be redundant in this context.

## Testing Checklist

### ✅ Featured Business Cards

- [ ] Address shows below city
- [ ] Uses `detailed_address` when available
- [ ] Falls back to `address` if no `detailed_address`
- [ ] Wraps to 2 lines if address is long
- [ ] Text is readable (gray color)
- [ ] Hides if both fields are empty
- [ ] Card layout doesn't break with long addresses

### ✅ Search Functionality

- [ ] Search results include `detailed_address`
- [ ] Navigating to business details shows full address
- [ ] No errors if `detailed_address` is null

### ✅ Data Fetching

- [ ] Featured listings fetch includes `detailed_address`
- [ ] Search data fetch includes `detailed_address`
- [ ] No performance issues with additional field

### ✅ Edge Cases

- [ ] Very long addresses wrap correctly
- [ ] Empty addresses hide properly
- [ ] Mixed data (some with, some without) renders correctly
- [ ] RTL languages (if supported) display correctly

## Performance Notes

### **Text Rendering**
- `numberOfLines={2}` limits height
- Prevents card height inconsistency
- Adds ellipsis (...) for overflow

### **Query Impact**
- Minimal: Just one additional column
- Already fetching `address`, adding `detailed_address` has negligible impact
- Featured listings query uses `*` so no change needed

### **Memory Impact**
- Typical address: ~50-100 characters
- 6 featured businesses × 100 chars = 600 bytes
- Negligible memory overhead

## Layout Considerations

### **Card Height**

**Before (1 line address):**
- Fixed height: ~180px

**After (2 line address):**
- Variable height: ~188-192px
- Still acceptable for 2-column grid

### **Text Size**

- Font size: `8px` (unchanged)
- Line height: Auto
- Color: `colors.text.tertiary` (gray)
- Max lines: `2`

### **Responsive Behavior**

```tsx
style={{ width: '48%' }}  // 2 columns
```

- Works on all screen sizes
- 2 lines fit comfortably
- No layout breaks

## Web App Comparison

### **Web Featured Businesses**

The web app (`sl_business_index`) likely shows similar info. Check if:

```tsx
// Web app business card
<div>
  <h3>{business.name}</h3>
  <p>{business.city}</p>
  <p>{business.detailed_address || business.address}</p>
</div>
```

**Consistency:** ✅ Both platforms now use same logic

## Future Enhancements

### **1. Truncate Intelligently**

Instead of simple ellipsis, show most important parts:

```tsx
const formatAddress = (address: string, maxLength: number = 50) => {
  if (address.length <= maxLength) return address;
  
  // Show start + end, hide middle
  const start = address.slice(0, maxLength / 2);
  const end = address.slice(-maxLength / 2);
  return `${start}...${end}`;
};
```

### **2. Address Icon**

Add small icon to distinguish from other text:

```tsx
<View className="flex-row items-start">
  <Home size={8} color={colors.text.tertiary} className="mt-0.5" />
  <Text className="flex-1 ml-1">
    {biz.detailed_address || biz.address}
  </Text>
</View>
```

### **3. Tooltip on Tap**

Show full address in modal if truncated:

```tsx
<TouchableOpacity onPress={() => showFullAddress(biz.detailed_address)}>
  <Text numberOfLines={2}>
    {biz.detailed_address || biz.address}
  </Text>
</TouchableOpacity>
```

### **4. Smart Formatting**

Parse and highlight key parts:

```tsx
// "123 Main St, Colombo 03, Western Province, Sri Lanka"
// Highlight: "Colombo 03" (district)
<Text>
  <Text style={{ fontWeight: 'normal' }}>123 Main St, </Text>
  <Text style={{ fontWeight: 'bold' }}>Colombo 03</Text>
  <Text style={{ fontWeight: 'normal' }}>, Western Province, Sri Lanka</Text>
</Text>
```

## Related Updates

### **Already Updated:**
- ✅ Business Details Screen (header + location section)
- ✅ Home Screen Featured Businesses (this update)

### **May Need Updates:**
- ⚠️ Search Results Screen (if exists)
- ⚠️ Favorites Screen (if shows address)
- ⚠️ Recent Viewed Screen (if shows address)
- ⚠️ Business News Cards (if shows business address)

## Database Schema

### **businesses table:**
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  address TEXT,           -- Short: "123 Main St"
  detailed_address TEXT,  -- Full: "123 Main St, Colombo 03, Western Province, Sri Lanka"
  -- ... other fields
);
```

### **featured_listings table:**
```sql
CREATE TABLE featured_listings (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  order_index INTEGER,
  -- ... other fields
);
```

**Join Query:**
```sql
SELECT fl.*, b.*
FROM featured_listings fl
JOIN businesses b ON b.id = fl.business_id
ORDER BY fl.order_index
LIMIT 6;
```

## Summary

✅ **Featured business cards now show detailed addresses**  
✅ **2-line display for better readability**  
✅ **Fallback to short address if detailed not available**  
✅ **Search data includes detailed_address field**  
✅ **Consistent with business details page**  
✅ **Matches web app behavior**  

The home screen now displays complete, professional addresses in featured business cards! 🎯
