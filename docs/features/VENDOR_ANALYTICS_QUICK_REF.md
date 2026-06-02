# 🚀 Vendor Analytics - Quick Reference

## What Changed?

### For Regular Users
- **Before:** See "Add Business" button (➕)
- **After:** Still see "Add Business" button (➕)
- **No change** in experience

### For Vendors (Business Owners)
- **Before:** See "Add Business" button (➕)
- **After:** See "Analytics" button (📊)
- **Automatic** - Changes when user registers first business

## Visual Changes

### Bottom Navigation Bar

**Regular User:**
```
┌──────┬──────┬─────────────┬──────────┐
│ Home │ Map  │ Add Business│  Account │
│  🏠  │ 🗺️   │     ➕      │    👤    │
└──────┴──────┴─────────────┴──────────┘
```

**Vendor (Business Owner):**
```
┌──────┬──────┬─────────────┬──────────┐
│ Home │ Map  │  Analytics  │  Account │
│  🏠  │ 🗺️   │     📊      │    👤    │
└──────┴──────┴─────────────┴──────────┘
```

## Analytics Screen Features

### Metrics Cards (4 cards)
```
┌─────────────────┐  ┌─────────────────┐
│ 👁️  Profile Views│  │ 📞 Call Clicks   │
│     1,234       │  │      56         │
└─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ 💬 Leads        │  │ ⭐ Reviews      │
│      12         │  │      45         │
└─────────────────┘  └─────────────────┘
```

### Time Range Selector
```
┌────────────────────────────┐
│ [ 7 Days ] [ 30 Days ]     │
└────────────────────────────┘
```

### Line Chart
```
Views & Calls Over Time
━━━━━━━━━━━━━━━━━━━━━━━━━━━
        📈
      /   \
    /       \___
  /             \
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Legend: — Views  — Calls
```

## Files Changed

### New Files (3)
```
src/screens/Vendor/
  └─ VendorAnalyticsScreen.tsx     [14KB]

src/components/
  └─ SimpleLineChart.tsx           [5.2KB]

docs/features/
  └─ VENDOR_ANALYTICS.md           [8.7KB]
```

### Modified Files (1)
```
src/navigation/
  └─ MainTabNavigator.tsx          [Modified]
      • Added vendor detection
      • Added Analytics tab
      • Conditional rendering
```

## Testing Steps

### Test 1: Regular User
```bash
1. npx expo start
2. Login with NEW account (no businesses)
3. ✓ Should see "Add Business" tab
4. ✓ Tap tab to register business
```

### Test 2: Vendor
```bash
1. Login with account that has businesses
   (or register business from Test 1)
2. ✓ Should see "Analytics" tab instead
3. ✓ Tap Analytics tab
4. ✓ Should see metrics cards
5. ✓ Should see line chart
6. ✓ Toggle between 7d and 30d
7. ✓ Pull down to refresh
```

## Data Flow

```
┌─────────────┐
│  User Login │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Check if user owns any  │
│ businesses in database  │
└──────┬─────────┬────────┘
       │         │
   YES │         │ NO
       │         │
       ▼         ▼
┌──────────┐  ┌─────────────┐
│Analytics │  │Add Business │
│   Tab    │  │    Tab      │
└──────────┘  └─────────────┘
```

## Key Points

✅ **Automatic Detection**
   - App checks business ownership on startup
   - No manual configuration needed

✅ **Same Data as Web**
   - Uses same Supabase tables
   - Identical analytics logic
   - Matches web dashboard

✅ **No Extra Dependencies**
   - Custom SVG chart
   - No npm packages added
   - Uses existing libraries

✅ **Theme Support**
   - Works in light mode
   - Works in dark mode
   - Auto-adapts colors

## Troubleshooting

### "Add Business" still shows for vendor
```
Solution 1: Force close and reopen app
Solution 2: Logout and login again
Solution 3: Check business has correct owner_id in database
```

### Chart not rendering
```
Solution: Ensure react-native-svg is installed
Command: npm list react-native-svg
```

### No data showing
```
Solution 1: Check analytics_logs table has data
Solution 2: Wait for analytics events to occur
Solution 3: Check time range (try 30 days)
```

## Quick Commands

```bash
# Start app
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios

# Check for errors
npx expo doctor

# Clear cache
npx expo start -c
```

## Database Tables Used

```sql
-- Check vendor status
businesses (owner_id = user.id)

-- Fetch analytics
analytics_logs (business_id, event_type, created_at)

-- Count reviews  
reviews (business_id)
```

## Metrics Explained

| Metric | Source | Description |
|--------|--------|-------------|
| **Views** | `analytics_logs.event_type = 'view'` | Business profile page views |
| **Calls** | `analytics_logs.event_type = 'call_click'` | Phone button clicks |
| **Leads** | `analytics_logs.event_type = 'lead_form_submit'` | Contact form submissions |
| **Reviews** | `reviews` table count | All-time review count |

## Color Scheme

```
Views:   #2563eb (Blue)    ████
Calls:   #10b981 (Green)   ████
Leads:   #8b5cf6 (Purple)  ████
Reviews: #f59e0b (Amber)   ████
```

## Next Steps

1. ✅ Test on physical device
2. ✅ Verify metrics are accurate
3. ✅ Test with multiple businesses
4. ✅ Test pull-to-refresh
5. ✅ Test time range toggle

## Support

📚 **Full Documentation:**
`docs/features/VENDOR_ANALYTICS.md`

🐛 **Report Issues:**
Include:
- User type (vendor/regular)
- Number of businesses
- Screenshots
- Console logs

---

**Quick Ref Version:** 1.0  
**Last Updated:** June 2, 2026  
**Status:** ✅ Ready for testing
