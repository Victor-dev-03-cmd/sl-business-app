# SL Business App - Installation & Setup Guide

## Prerequisites
- Node.js 18+ installed
- Expo CLI installed globally (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Physical device with Expo Go app (recommended for testing camera)

## Installation Steps

### 1. Install Dependencies
```bash
cd /home/laxsan_victor/projects/sl-business-app
npm install
```

### 2. Verify Camera Package
The `expo-camera` package should already be installed. If not:
```bash
npx expo install expo-camera
```

### 3. Configure Environment Variables
Create a `.env` file in the project root (if not exists):
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### 4. Update app.json (Camera Permissions)
Add camera permissions to your `app.json`:
```json
{
  "expo": {
    "name": "SL Business App",
    "slug": "sl-business-app",
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to scan business QR codes."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to scan business QR codes."
      }
    },
    "android": {
      "permissions": [
        "CAMERA"
      ]
    }
  }
}
```

### 5. Database Setup (Notifications Table)
Run this SQL in your Supabase SQL Editor:

```sql
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'ceo')
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 6. Start Development Server
```bash
npm start
# or
npx expo start
```

### 7. Run on Device/Simulator

**iOS Simulator:**
```bash
npm run ios
# or press 'i' in the Expo dev server
```

**Android Emulator:**
```bash
npm run android
# or press 'a' in the Expo dev server
```

**Physical Device:**
1. Install Expo Go from App Store / Play Store
2. Scan QR code from terminal
3. App will load on your device

**Important Note for Camera Testing:**
- iOS Simulator does NOT support camera
- Android Emulator has limited camera support
- **Use a physical device** for full camera functionality

## Testing the Features

### QR Scanner
1. Open the app
2. Tap the scan icon (top right on home screen)
3. Point camera at a QR code
4. Test with these QR formats:
   - Business URL: `https://slbusinessindex.com/business/[slug]`
   - Any URL starting with http/https

**Generate Test QR Code:**
```bash
# Use online QR generator or install qr-code-generator
npm install -g qrcode-generator
echo "https://slbusinessindex.com/business/test-business" | qrcode
```

### Notifications
1. Create a test notification via SQL:
```sql
INSERT INTO notifications (user_id, title, message, type)
VALUES (
  'your-user-id',  -- Replace with actual user ID
  'Test Notification',
  'This is a test notification to verify the system works!',
  'info'
);
```

2. Check the app:
   - Bell icon should show red badge
   - Tap bell to see notification
   - Pull down to refresh
   - Tap notification to mark as read

3. Test real-time updates:
   - Keep app open
   - Insert another notification via SQL
   - Badge should update automatically

## Troubleshooting

### Camera Issues

**Problem:** Camera not working on simulator
**Solution:** Use a physical device - simulators don't support camera

**Problem:** Permission denied
**Solution:**
1. Go to device Settings
2. Find the app
3. Enable Camera permission
4. Restart the app

**Problem:** Black screen in camera
**Solution:**
1. Check app.json has camera plugin configured
2. Rebuild the app: `expo start -c`
3. Check console for errors

### Notification Issues

**Problem:** Notifications not showing
**Solution:**
1. Verify user is logged in
2. Check userId is correct
3. Verify notifications exist in database for that user

**Problem:** Badge not updating
**Solution:**
1. Check Supabase Realtime is enabled
2. Verify RLS policies allow read access
3. Check console for subscription errors

**Problem:** Real-time not working
**Solution:**
1. Enable Realtime in Supabase dashboard:
   - Go to Database → Replication
   - Enable realtime for `notifications` table
2. Verify `ALTER PUBLICATION` was run

### Build Issues

**Problem:** Module not found
**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start -c
```

**Problem:** TypeScript errors
**Solution:**
```bash
# Regenerate types
npx expo customize tsconfig.json
```

## Project Structure

```
sl-business-app/
├── src/
│   ├── screens/
│   │   ├── Home/
│   │   │   └── HomeScreen.tsx (✅ Updated with notifications badge)
│   │   ├── QRScanner/
│   │   │   └── QRScannerScreen.tsx (✅ NEW - QR scanning)
│   │   ├── Notifications/
│   │   │   └── NotificationsScreen.tsx (✅ NEW - Notifications list)
│   │   ├── Business/
│   │   ├── BusinessDetails/
│   │   ├── News/
│   │   └── Settings/
│   ├── navigation/
│   │   └── MainTabNavigator.tsx (✅ Updated with new screens)
│   ├── lib/
│   │   └── supabase.ts
│   ├── data/
│   └── utils/
├── package.json (✅ Updated with expo-camera)
├── app.json
└── tsconfig.json
```

## Dependencies Added
```json
{
  "expo-camera": "~17.0.10"
}
```

## Features Checklist

- [x] QR Code Scanner
  - [x] Camera permission handling
  - [x] QR detection
  - [x] Business navigation
  - [x] Flashlight toggle
  - [x] Error handling

- [x] Real-Time Notifications
  - [x] Fetch notifications from database
  - [x] Real-time subscription
  - [x] Unread badge on bell icon
  - [x] Mark as read
  - [x] Mark all as read
  - [x] Pull to refresh

- [x] Home Screen Integration
  - [x] Scan icon button
  - [x] Bell icon with badge
  - [x] Real-time badge updates

## Next Steps

1. **Test on Physical Device**
   - Install Expo Go
   - Scan QR code
   - Test camera scanning
   - Test notifications

2. **Create Test Data**
   - Add test notifications
   - Generate business QR codes
   - Test real-time updates

3. **Production Build**
   ```bash
   # For iOS
   expo build:ios
   
   # For Android
   expo build:android
   ```

## Support Resources

- Expo Camera Docs: https://docs.expo.dev/versions/latest/sdk/camera/
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- React Navigation: https://reactnavigation.org/

## Known Limitations

1. **Camera on Simulators:**
   - iOS Simulator: No camera support
   - Android Emulator: Limited support
   - **Solution:** Use physical device

2. **QR Code Formats:**
   - Currently supports business URLs and generic URLs
   - Custom QR formats can be added in `handleBarCodeScanned`

3. **Notification Storage:**
   - Limited to 50 most recent notifications
   - Can be increased in fetch query

## Performance Tips

1. **Camera Performance:**
   - Close scanner when not in use
   - Flashlight drains battery quickly

2. **Realtime Performance:**
   - Subscriptions are cleaned up on unmount
   - Multiple subscriptions are avoided

3. **Notification Performance:**
   - Database is indexed for fast queries
   - Badge count uses count query (not full fetch)

## Success Criteria

✅ QR scanner opens from home screen
✅ Camera permissions work
✅ QR codes are detected and processed
✅ Business navigation works
✅ Notifications load from database
✅ Unread badge shows on bell icon
✅ Real-time updates work
✅ Mark as read functionality works
✅ App doesn't crash on any feature

---

**Installation Complete!** 🎉

The app now has full QR scanning and real-time notification capabilities, synced with the web version's database.
