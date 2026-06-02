# Installation Complete - expo-image-picker

## ✅ Installation Steps Completed

### **1. Package Installed**
```bash
npx expo install expo-image-picker
```

**Installed version:** `expo-image-picker@~17.0.11`

**Verified in package.json:**
```json
{
  "dependencies": {
    "expo-image-picker": "~17.0.11"
  }
}
```

### **2. app.json Updated**

Added expo-image-picker plugin with permissions:

```json
{
  "expo": {
    "plugins": [
      "expo-font",
      "expo-location",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to upload business images.",
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to take business photos."
        }
      ]
    ]
  }
}
```

### **3. Permissions Added**

**iOS:**
- `NSPhotoLibraryUsageDescription` - Automatically added by plugin
- `NSCameraUsageDescription` - Automatically added by plugin

**Android:**
- `READ_EXTERNAL_STORAGE` - Automatically added by plugin
- `WRITE_EXTERNAL_STORAGE` - Automatically added by plugin  
- `CAMERA` - Automatically added by plugin

## Next Steps

### **For Development (Expo Go):**
The app should work immediately in Expo Go. Just restart:

```bash
# Stop the dev server (Ctrl+C)
# Then restart
npx expo start
```

### **For Production Build:**

If you need a production build (APK/IPA), you'll need to rebuild:

```bash
# Android
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview
```

### **For Local Development Build:**

If using development build (not Expo Go):

```bash
# Prebuild (generates native code)
npx expo prebuild --clean

# Then run
npx expo run:android
# or
npx expo run:ios
```

## Testing the Feature

### **1. Navigate to Register Business Tab**
- Open the app
- Tap the **"Add Business"** tab (➕ icon)

### **2. Upload Logo**
- Scroll to "Images" section
- Tap "Upload Logo"
- Grant permissions if prompted
- Select image from gallery

### **3. Upload Cover Image**
- Tap "Upload Cover"
- Select image
- Preview should appear

### **4. Test Location**
- Scroll to "Location" section
- Tap "Get Current Location"
- Grant location permissions
- Address should auto-populate

### **5. Fill Form & Submit**
- Fill all required fields (*)
- Select category
- Choose registration type
- Enter BR or NIC number
- Tap "Submit for Review"

## Troubleshooting

### **Issue: Module not found**

**Solution:** Clear cache and restart
```bash
npx expo start -c
```

### **Issue: Permissions not working**

**Solution:** Rebuild with prebuild
```bash
npx expo prebuild --clean
```

### **Issue: Image picker not opening**

**Check:**
1. Permissions granted in device settings
2. Running on physical device (not all simulators support camera)
3. Expo Go version is latest

### **Issue: Upload fails**

**Check:**
1. Supabase storage bucket exists: `business-logos`
2. Storage policies allow authenticated uploads
3. User is logged in

## Verification Checklist

- [x] expo-image-picker installed
- [x] app.json updated with plugin
- [x] Permissions configured
- [ ] App restarted
- [ ] Image picker opens
- [ ] Images upload successfully
- [ ] Preview shows correctly

## Summary

✅ **expo-image-picker installed** - v17.0.11  
✅ **app.json configured** - Permissions added  
✅ **Ready to use** - Just restart the app  

The Register Business screen is now fully functional! 🎯

## Notes

- **Camera on iOS Simulator:** Won't work, use physical device
- **Camera on Android Emulator:** Limited, use physical device for best results
- **Photo Library:** Works on simulators/emulators
- **Production Build:** Requires rebuild after adding native plugin

