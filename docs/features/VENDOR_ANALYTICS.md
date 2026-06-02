# Vendor Analytics Feature

## Overview

Implemented vendor analytics screen in the mobile app that replaces the "Add Business" button for users who already own businesses. This provides business owners with performance insights directly in the mobile app, matching the functionality from the web version.

## Features

### ✅ Dynamic Tab Navigation
- **Regular Users:** See "Add Business" tab (PlusCircle icon)
- **Vendors (Business Owners):** See "Analytics" tab (TrendingUp icon)
- Automatic detection based on whether user owns any businesses

### ✅ Analytics Dashboard

#### Key Metrics Cards
- **Profile Views** - Total views in selected period (7d/30d)
- **Call Clicks** - Number of times call button was clicked
- **Leads Generated** - Lead form submissions
- **Total Reviews** - All-time review count

Each metric card includes:
- Color-coded icon
- Time period badge
- Large number display
- Descriptive label

#### Performance Chart
- Custom SVG line chart (no external dependencies)
- Shows Views (blue) and Calls (green) over time
- Interactive dots on data points
- Grid lines and axis labels
- Auto-scales based on data
- Responsive to different time ranges

#### Time Range Toggle
- 7 Days view (default)
- 30 Days view
- Pills-style selector

#### Pull to Refresh
- Swipe down to refresh analytics data
- Shows loading indicator

### ✅ Empty States
- **No businesses:** Friendly message prompting user to register first
- **No data:** Message when no analytics data is available

## Implementation Details

### Files Created

1. **`src/screens/Vendor/VendorAnalyticsScreen.tsx`** (450 lines)
   - Main analytics screen component
   - Fetches data from Supabase
   - Displays stats cards and chart
   - Handles loading and empty states

2. **`src/components/SimpleLineChart.tsx`** (180 lines)
   - Custom SVG line chart component
   - No external chart library dependencies
   - Responsive and theme-aware
   - Smooth animations

### Files Modified

1. **`src/navigation/MainTabNavigator.tsx`**
   - Added vendor detection logic
   - Conditional tab rendering (Analytics vs Add Business)
   - Added TrendingUp icon import
   - Created AnalyticsStack navigator

### Database Tables Used

- `businesses` - Check if user owns any businesses
- `analytics_logs` - Fetch view/call/lead events
- `reviews` - Count total reviews

### Data Flow

```
User Login
    ↓
Check businesses table (owner_id = user.id)
    ↓
Has businesses? ─┬─ YES → Show Analytics Tab
                 └─ NO  → Show Add Business Tab
    ↓
Analytics Screen:
    ↓
1. Fetch business IDs owned by user
2. Fetch analytics_logs for those businesses
3. Fetch reviews count
4. Process data into daily buckets
5. Display stats cards
6. Render chart
```

## Usage

### For Developers

#### Install Dependencies
No additional packages needed! Uses React Native SVG (already included).

#### Run the App
```bash
npx expo start
```

#### Test Vendor View
1. Login with an account
2. Register a business
3. Navigate to Account tab
4. You should now see "Analytics" instead of "Add Business"

#### Test Regular User View
1. Login with a new account (no businesses)
2. You should see "Add Business" tab

### For Users

1. **Regular Users:**
   - See "Add Business" button in bottom navigation
   - Tap to register a new business

2. **Business Owners (Vendors):**
   - "Add Business" button automatically replaced with "Analytics"
   - Tap to view business performance metrics
   - Pull down to refresh data
   - Toggle between 7 days and 30 days view

## API Reference

### Analytics Data Structure

```typescript
interface AnalyticsData {
  date: string;           // ISO date string
  views: number;          // Profile view count
  calls: number;          // Call button clicks
  leads: number;          // Lead form submissions
}

interface Stats {
  views: number;          // Total views
  calls: number;          // Total calls
  reviews: number;        // All-time reviews
  leads: number;          // Total leads
}
```

### Supabase Queries

#### Check if User is Vendor
```typescript
const { data: businesses } = await supabase
  .from('businesses')
  .select('id')
  .eq('owner_id', userId)
  .limit(1);

const isVendor = !!(businesses && businesses.length > 0);
```

#### Fetch Analytics Logs
```typescript
const { data: logs } = await supabase
  .from('analytics_logs')
  .select('*')
  .in('business_id', businessIds)
  .gte('created_at', startDate.toISOString())
  .order('created_at', { ascending: true });
```

#### Fetch Reviews Count
```typescript
const { count: reviewsCount } = await supabase
  .from('reviews')
  .select('*', { count: 'exact', head: true })
  .in('business_id', businessIds);
```

## Configuration

### Theme Support
The analytics screen automatically adapts to light/dark themes using the app's theme context.

### Colors Used
- **Views:** `#2563eb` (Blue)
- **Calls:** `#10b981` (Green)
- **Leads:** `#8b5cf6` (Purple)
- **Reviews:** `#f59e0b` (Amber)

## Performance Considerations

### Optimizations
- Fetches minimal data (only necessary fields)
- Uses `limit(1)` for vendor check (doesn't fetch all businesses)
- Caches vendor status in state
- Lazy loads chart component
- Efficient data processing (single pass through logs)

### Data Volumes
- **7 days:** Fetches ~1 week of logs per business
- **30 days:** Fetches ~1 month of logs per business
- Multiple businesses: Query scales with business count

## Troubleshooting

### "Add Business" Still Shows for Vendor
1. Pull down to refresh the app
2. Check that business `owner_id` matches user ID
3. Verify business exists in `businesses` table
4. Check console logs for errors

### Chart Not Rendering
1. Ensure `react-native-svg` is installed
2. Check that `chartData` has valid data
3. Verify dates are in correct format (ISO strings)

### No Data Showing
1. Check that analytics_logs table has data
2. Verify business IDs are correct
3. Ensure date range includes data
4. Check Supabase RLS policies allow reading

### Performance Issues
1. Reduce time range to 7 days
2. Limit number of businesses queried
3. Add pagination for large datasets
4. Consider caching results

## Future Enhancements

### Potential Improvements
- [ ] Add more metrics (messages, shares, saves)
- [ ] Add comparison view (vs previous period)
- [ ] Add export functionality (CSV, PDF)
- [ ] Add push notifications for milestones
- [ ] Add real-time updates
- [ ] Add drill-down by business
- [ ] Add competitor analysis
- [ ] Add goal setting and tracking

### Advanced Features
- [ ] Predictive analytics
- [ ] A/B testing insights
- [ ] Conversion funnel analysis
- [ ] Customer demographics
- [ ] Heat maps for engagement
- [ ] Custom date range selector

## Matching Web Version

This implementation matches the web version from:
`sl_business_index/app/vendor/dashboard/VendorAnalytics.tsx`

### Shared Features
✅ Same data source (analytics_logs table)  
✅ Same metrics (views, calls, leads, reviews)  
✅ Same time ranges (7d, 30d)  
✅ Same data processing logic  
✅ Same color scheme  

### Mobile-Specific Adaptations
- Responsive chart sizing
- Touch-friendly UI elements
- Pull-to-refresh gesture
- Bottom tab navigation
- Simpler chart (no recharts dependency)

## Testing Checklist

### Functional Testing
- [ ] Regular user sees "Add Business" tab
- [ ] Vendor sees "Analytics" tab
- [ ] Stats cards display correctly
- [ ] Chart renders with data
- [ ] Time range toggle works
- [ ] Pull to refresh works
- [ ] Empty states display correctly
- [ ] Loading states display correctly

### Data Testing
- [ ] Correct business IDs fetched
- [ ] Analytics logs filtered correctly
- [ ] Date ranges calculated correctly
- [ ] Stats totals are accurate
- [ ] Chart data points are accurate

### UI Testing
- [ ] Theme colors apply correctly
- [ ] Layout responsive on different screens
- [ ] Touch targets adequate size
- [ ] Text readable at all sizes
- [ ] Icons display correctly

### Performance Testing
- [ ] Initial load < 2 seconds
- [ ] Refresh < 1 second
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] Chart renders smoothly

## Support

### Common Questions

**Q: Can vendors still add more businesses?**  
A: Yes! They can navigate to Account → Profile → Add Business, or the feature can be updated to allow this.

**Q: How often is data updated?**  
A: Data is fetched on screen mount and on pull-to-refresh. It's real-time from the database.

**Q: Can I see analytics for each business separately?**  
A: Currently shows combined analytics for all businesses. Per-business view can be added as enhancement.

**Q: Does this work offline?**  
A: No, requires internet connection to fetch analytics data from Supabase.

---

**Implementation Date:** June 2, 2026  
**Version:** 1.0.0  
**Status:** ✅ Complete and ready for testing
