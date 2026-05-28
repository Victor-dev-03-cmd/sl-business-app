# Business News Feature Setup Guide

## Overview
This feature adds a Business News screen to the SL Business App, similar to the sl_business_index app. Users can browse the latest business news articles from Sri Lanka.

## Files Created/Modified

### New Files:
1. **`src/screens/News/BusinessNewsScreen.tsx`** - Main news screen component
2. **`supabase-migration-business-news.sql`** - Database migration script
3. **`BUSINESS_NEWS_SETUP.md`** - This setup guide

### Modified Files:
1. **`src/navigation/MainTabNavigator.tsx`** - Added stack navigator and news screen
2. **`src/screens/Home/HomeScreen.tsx`** - Connected "Explore Features" button to news screen

## Database Setup

### Step 1: Create the business_news table in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-migration-business-news.sql`
4. Paste and run the SQL script

This will:
- Create the `business_news` table
- Add indexes for performance
- Set up Row Level Security (RLS) policies
- Insert sample news articles
- Create auto-update triggers

### Table Schema:

```sql
business_news (
  id: bigint (primary key)
  title: text (required)
  description: text
  content: text
  image_url: text
  source: text
  source_url: text
  published_at: timestamp with time zone
  category: text (business, economy, technology, finance)
  views: integer (default: 0)
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
)
```

## Features Implemented

### 1. **Business News Screen**
- View latest business news articles
- Filter by category (All, Business, Economy, Technology, Finance)
- Pull-to-refresh functionality
- View counter for each article
- External link opening to source articles
- Featured article display
- Stats section showing total and today's articles

### 2. **Navigation**
- Accessible from Home screen via "Explore Features" button
- Uses stack navigator for seamless navigation
- Back button to return to home

### 3. **UI Components**
- Featured article with large image and gradient overlay
- Article cards with thumbnails
- Category filter chips
- View count indicators
- Date formatting (Today, Yesterday, X days ago)
- Source attribution with external link icon
- Stats cards showing article metrics

## Usage

### From User Perspective:
1. Open the app and navigate to the Home screen
2. Tap the **"Explore Features"** button in the gold card
3. Browse business news articles
4. Filter by category using the chips at the top
5. Tap any article to open the source link in browser
6. Pull down to refresh articles

### Adding News Articles:
You can add news articles through:

1. **Supabase Dashboard UI:**
   - Go to Table Editor → business_news
   - Click "Insert row"
   - Fill in the fields

2. **SQL Insert:**
```sql
INSERT INTO business_news (title, description, content, image_url, source, source_url, category)
VALUES (
  'Your Article Title',
  'Brief description...',
  'Full content...',
  'https://image-url.com/image.jpg',
  'Source Name',
  'https://source-url.com',
  'business'
);
```

3. **API/Admin Panel (Future Enhancement):**
   - Could create an admin interface to add/edit news
   - Could set up RSS feed integration
   - Could implement web scraping for automatic updates

## Categories Available:
- **all** - Shows all articles
- **business** - Business-related news
- **economy** - Economic updates and analysis
- **technology** - Tech sector news
- **finance** - Financial and banking news

## Testing

### Test the feature:
```bash
npm start
# or
npm run android
# or
npm run ios
```

### Test Checklist:
- [ ] Navigate from Home to Business News screen
- [ ] View featured article
- [ ] Filter by different categories
- [ ] Pull to refresh
- [ ] Tap article to open external link
- [ ] Check view counter increments
- [ ] Navigate back to home screen
- [ ] Check stats cards show correct counts

## Future Enhancements

1. **Article Detail Screen:**
   - Full article view within the app
   - Share functionality
   - Bookmark/save articles

2. **Search & Sort:**
   - Search articles by keyword
   - Sort by date, views, or relevance

3. **Notifications:**
   - Push notifications for breaking news
   - Daily digest option

4. **Personalization:**
   - Save favorite categories
   - Reading history
   - Recommended articles

5. **Content Management:**
   - Admin panel for adding/editing news
   - RSS feed integration
   - Automatic news aggregation

6. **Social Features:**
   - Comment on articles
   - Share to social media
   - Like/react to articles

## Troubleshooting

### Issue: News articles not loading
- Check Supabase connection in `.env` file
- Verify the table was created successfully
- Check RLS policies are set correctly
- Review console logs for errors

### Issue: Images not displaying
- Ensure image URLs are accessible
- Check CORS settings if using custom image server
- Verify image_url field contains valid URLs

### Issue: External links not opening
- Check device/emulator can access internet
- Verify source_url contains valid URLs
- Check if URL scheme is supported (http/https)

### Issue: Navigation error
- Ensure @react-navigation/stack is installed
- Check navigation types match screen names
- Verify Stack.Navigator is properly configured

## Dependencies Added
- `@react-navigation/stack` - For stack navigation

## API Reference

### Fetching News:
```typescript
// Get all news
const { data, error } = await supabase
  .from('business_news')
  .select('*')
  .order('published_at', { ascending: false });

// Filter by category
const { data, error } = await supabase
  .from('business_news')
  .select('*')
  .eq('category', 'technology')
  .order('published_at', { ascending: false });

// Update view count
await supabase
  .from('business_news')
  .update({ views: views + 1 })
  .eq('id', articleId);
```

## Support
For issues or questions, contact the development team or create an issue in the project repository.
