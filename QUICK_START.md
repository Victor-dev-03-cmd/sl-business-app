# 🚀 Quick Start - Business News Feature

## Step 1: Setup Database (5 minutes)

1. Open your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **"+ New query"**
5. Copy the entire contents of `supabase-migration-business-news.sql`
6. Paste into the SQL editor
7. Click **"Run"** (or press Ctrl+Enter)
8. ✅ You should see "Success. No rows returned"

## Step 2: Run the App (2 minutes)

```bash
# Start the development server
npm start

# Or run on Android
npm run android

# Or run on iOS
npm run ios
```

## Step 3: Test the Feature (3 minutes)

1. **Open the app** on your device/emulator
2. You should see the **Home screen**
3. Look for the **dark blue card** with "SL Business Index" and a gold button
4. Tap the **"Explore Features"** button
5. **Business News screen** should open! 🎉

## Step 4: Explore Features

### Try These Actions:
- ✅ **Scroll through articles** - See the featured article at top
- ✅ **Filter by category** - Tap category chips (Business, Economy, etc.)
- ✅ **Pull to refresh** - Swipe down to reload articles
- ✅ **Tap an article** - Opens source URL in browser
- ✅ **Check stats** - View total articles and today's count
- ✅ **Navigate back** - Tap arrow icon to return to home

## Troubleshooting

### ❌ "No articles available"
**Solution:** Make sure you ran the SQL migration script in Supabase.

### ❌ "Failed to load news articles"
**Solution:** Check your `.env` file has correct Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### ❌ Navigation error
**Solution:** Make sure you installed the stack navigator:
```bash
npm install @react-navigation/stack
```

### ❌ Images not loading
**Solution:** Sample data uses Unsplash images. Check internet connection.

## Adding Your Own News

### Method 1: Supabase Dashboard
1. Go to **Table Editor** → `business_news`
2. Click **"Insert row"**
3. Fill in the fields:
   - **title** (required)
   - **description**
   - **image_url** (use any image URL)
   - **source** (e.g., "Daily FT")
   - **source_url** (full article link)
   - **category** (business/economy/technology/finance)
4. Click **"Save"**
5. Pull to refresh in the app!

### Method 2: SQL Insert
```sql
INSERT INTO business_news (
  title,
  description,
  image_url,
  source,
  source_url,
  category
) VALUES (
  'Your Headline Here',
  'Brief description of the article...',
  'https://your-image-url.com/image.jpg',
  'Your Source Name',
  'https://link-to-full-article.com',
  'business'
);
```

## What's Next?

Check out these files for more details:
- 📖 **BUSINESS_NEWS_SETUP.md** - Complete setup guide
- 📊 **IMPLEMENTATION_SUMMARY.md** - Technical details
- 🗄️ **supabase-migration-business-news.sql** - Database schema

## Need Help?

Common questions:
- **Can I change categories?** Yes, edit the `categories` array in `BusinessNewsScreen.tsx`
- **Can I add more fields?** Yes, update the table schema and TypeScript interface
- **Can I customize the UI?** Yes, all styling uses Tailwind classes
- **Can I add authentication?** RLS policies already support it

Happy coding! 🎉
