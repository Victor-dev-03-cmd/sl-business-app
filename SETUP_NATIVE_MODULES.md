# Native Module Setup Guide

## Issue: expo-local-authentication Bundle Error

When you add a new native module like `expo-local-authentication`, you need to rebuild the native Android/iOS projects.

## Solution Steps

### Step 1: Clean and Rebuild (COMPLETED ✅)
```bash
npx expo prebuild --clean
```
This has already been done - the native code has been generated in `/android` and `/ios` folders.

### Step 2: Build and Run on Device

Choose your platform:

#### For Android:
```bash
# Option 1: Run on connected device or emulator
npx expo run:android

# Option 2: Build APK
eas build --platform android --profile development
```

#### For iOS (Mac only):
```bash
# Run on simulator
npx expo run:ios

# Or build for device
eas build --platform ios --profile development
```

### Step 3: Start Development Server
After building, start the dev server:
```bash
npx expo start --clear
```

## Why This Happens

**Native modules** like biometric authentication require:
- Native Android/iOS code compilation
- Platform-specific permissions
- Hardware access (fingerprint sensor, Face ID)

**JavaScript-only modules** work immediately without rebuild.

## Current Status

✅ Package installed: `expo-local-authentication@17.0.8`
✅ Native code generated: `/android` and `/ios` folders created
✅ Imports updated: Dynamic import to prevent build errors
⏳ **Next step:** Build app for Android/iOS

## Quick Fix for Development

The code has been updated to work without the native module for now:
- Privacy & Security screen loads without errors
- Biometric features show as "not available"
- All other features (encryption, privacy controls) work
- Build the app when ready to test biometrics

## Testing Without Native Build

You can test everything EXCEPT biometric authentication:
- ✅ E2E Encryption toggle
- ✅ Privacy controls (location, camera, etc.)
- ✅ Data management (export, delete)
- ✅ UI/UX and navigation
- ❌ Biometric lock (requires native build)
- ❌ Face ID / Fingerprint (requires native build)

## Build Commands Reference

### Development Build
```bash
# Android
npx expo run:android

# iOS (Mac only)
npx expo run:ios
```

### Production Build
```bash
# Configure EAS
eas build:configure

# Build Android APK
eas build --platform android --profile preview

# Build iOS
eas build --platform ios --profile preview
```

### Check Build Status
```bash
eas build:list
```

## Permissions Required

### Android (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

These are automatically added by `expo-local-authentication` plugin.

### iOS (ios/YourApp/Info.plist)
```xml
<key>NSFaceIDUsageDescription</key>
<string>We use Face ID to secure your account</string>
```

This is automatically added by the Expo config plugin.

## Troubleshooting

### Error: "expo-local-authentication not found"
**Solution:** Run native build
```bash
npx expo run:android
# or
npx expo run:ios
```

### Error: "Module not registered"
**Solution:** Clear cache and rebuild
```bash
npx expo start --clear
npx expo run:android --clear
```

### Biometric not working on emulator
**Note:** Biometric features don't work on emulators without special setup
- Android Emulator: Need to enable biometric in AVD settings
- iOS Simulator: Face ID can be tested (Hardware → Face ID)
- **Best:** Test on real device

### Build fails on macOS Catalina or later
**Solution:** Update CocoaPods
```bash
sudo gem install cocoapods
cd ios && pod install
```

## Next Steps

1. **Build the app:**
   ```bash
   npx expo run:android
   ```

2. **Test biometric features:**
   - Open Privacy & Security screen
   - Try enabling Face ID/Fingerprint
   - Verify auto-lock works

3. **Test on real device:**
   - Biometric features require real hardware
   - Emulators have limited biometric support

## Alternative: Remove Biometric Features

If you want to skip native modules for now:

1. **Comment out biometric section** in `PrivacySecurityScreen.tsx`
2. **Remove from navigation** if not needed
3. **Focus on other features** (encryption, privacy controls)

The dynamic import we added already handles this gracefully - biometric features simply won't show if the module isn't available.

## Support

- Expo Docs: https://docs.expo.dev/versions/latest/sdk/local-authentication/
- EAS Build: https://docs.expo.dev/build/introduction/
- Native Modules: https://docs.expo.dev/workflow/prebuild/

---

**Current Status:** App bundling should work now. Build the native app when ready to test biometric features! 🚀
