# Multi-Language System (English, Sinhala, Tamil)

## Overview
Complete multi-language support for SL Business mobile app with English, Sinhala (සිංහල), and Tamil (தமிழ்) languages tailored for Sri Lankan users.

## Features Implemented

### 1. Language Selection Screen
- **Beautiful UI** with flag indicators 🇬🇧 🇱🇰
- **Native language names** displayed (English, සිංහල, தமிழ්)
- **Instant language switching** - no app restart required
- **Persistent storage** via AsyncStorage
- **Current selection indicator** with visual feedback

### 2. Language Context Provider
- **Global language state management**
- **Translation function** `t(key)` for easy text localization
- **Automatic persistence** to AsyncStorage
- **Real-time updates** across entire app

### 3. Font Rendering Optimization
- **Tamil/Sinhala font weight adjustment** - prevents overly bold text
- **Custom font helpers** for language-specific rendering
- **Proper letter spacing** for Indian scripts
- **Responsive font sizing** based on character set

### 4. Comprehensive Translations
Over 60+ translation keys covering:
- Navigation labels (Home, Map, Search, Account)
- Settings options (Appearance, Notifications, Language, etc.)
- Theme modes (Light, Dark, System)
- Account types (User, Vendor, Admin)
- Business details
- Search functionality
- Common actions (Save, Cancel, Edit, Delete, etc.)

## Files Created/Modified

### New Files

1. **`src/context/LanguageContext.tsx`** (NEW)
   - Language context provider
   - Translation function `t()`
   - AsyncStorage persistence
   - Language state management

2. **`src/locales/translations.ts`** (NEW)
   - Complete translation strings for all 3 languages
   - Typed translation keys for TypeScript safety
   - Organized by feature area

3. **`src/screens/Settings/LanguageScreen.tsx`** (NEW)
   - Language selection UI
   - Flag indicators and native names
   - Instant switching functionality

4. **`src/utils/fontHelpers.ts`** (NEW)
   - Font weight adjustment for Tamil/Sinhala
   - Text styling helpers
   - Font size optimization

5. **`src/components/LocalizedText.tsx`** (NEW)
   - Reusable text component with automatic font adjustment
   - Handles Tamil/Sinhala bold rendering properly

6. **`LANGUAGE_SYSTEM_README.md`** (NEW - this file)
   - Complete documentation
   - Usage examples
   - Troubleshooting guide

### Modified Files

1. **`src/navigation/MainTabNavigator.tsx`**
   - Added language context import
   - Tab labels now use translations
   - Font rendering optimization for tabs

2. **`src/screens/Settings/SettingsScreen.tsx`**
   - All text uses translation function
   - Current language display
   - Navigation to LanguageScreen
   - Font weight adjustments

3. **`App.tsx`**
   - Wrapped with LanguageProvider
   - Language context available app-wide

## Language Codes

- **`en`** - English
- **`si`** - Sinhala (සිංහල)
- **`ta`** - Tamil (தமிழ்)

## Usage Examples

### 1. Using Translations in Components

```typescript
import { useLanguage } from '../context/LanguageContext';

function MyComponent() {
  const { t, language } = useLanguage();

  return (
    <View>
      <Text>{t('home.hello')}</Text>
      <Text>{t('home.search.placeholder')}</Text>
      <Text>{t('settings.notifications')}</Text>
    </View>
  );
}
```

### 2. Using LocalizedText Component

```typescript
import { LocalizedText } from '../components/LocalizedText';

function MyComponent() {
  return (
    <View>
      {/* Regular text */}
      <LocalizedText style={{ color: '#000' }}>
        Regular text that adapts to language
      </LocalizedText>

      {/* Bold text */}
      <LocalizedText bold style={{ color: '#000' }}>
        Bold text with proper Tamil/Sinhala rendering
      </LocalizedText>

      {/* Semi-bold text */}
      <LocalizedText semiBold style={{ color: '#000' }}>
        Semi-bold text
      </LocalizedText>
    </View>
  );
}
```

### 3. Changing Language Programmatically

```typescript
import { useLanguage } from '../context/LanguageContext';

function LanguageChanger() {
  const { language, setLanguage } = useLanguage();

  const switchToTamil = async () => {
    await setLanguage('ta');
  };

  const switchToSinhala = async () => {
    await setLanguage('si');
  };

  return (
    <View>
      <Button onPress={switchToTamil}>Switch to Tamil</Button>
      <Button onPress={switchToSinhala}>Switch to Sinhala</Button>
    </View>
  );
}
```

### 4. Adding New Translations

Edit `src/locales/translations.ts`:

```typescript
export const translations = {
  en: {
    // ... existing translations
    'myFeature.title': 'My Feature',
    'myFeature.description': 'This is my new feature',
  },
  si: {
    // ... existing translations
    'myFeature.title': 'මගේ විශේෂාංගය',
    'myFeature.description': 'මෙය මගේ නව විශේෂාංගයයි',
  },
  ta: {
    // ... existing translations
    'myFeature.title': 'எனது அம்சம்',
    'myFeature.description': 'இது எனது புதிய அம்சமாகும்',
  }
};
```

## Font Rendering Solutions

### Problem: Tamil/Sinhala Text Appears Too Bold

**Cause:** Tamil and Sinhala Unicode fonts render heavier than Latin characters.

**Solution:** Use font helpers to adjust weight:

```typescript
import { getTextStyles } from '../utils/fontHelpers';
import { useLanguage } from '../context/LanguageContext';

function MyComponent() {
  const { language } = useLanguage();

  return (
    <Text style={{
      ...getTextStyles(language, true), // true for bold
      color: '#000',
      fontSize: 16
    }}>
      This text will render properly in all languages
    </Text>
  );
}
```

### Available Font Helpers

```typescript
// Get proper font weight
getFontWeight(language: 'en' | 'si' | 'ta', isBold: boolean)

// Get complete text styles
getTextStyles(language: 'en' | 'si' | 'ta', isBold: boolean)

// Get adjusted header font size
getHeaderFontSize(language: 'en' | 'si' | 'ta', baseFontSize: number)
```

## Translation Keys Reference

### Navigation
- `nav.home` - Home
- `nav.map` - Map
- `nav.search` - Search
- `nav.account` - Account

### Home Screen
- `home.hello` - Hello/greeting
- `home.welcome` - Welcome back
- `home.search.placeholder` - Search placeholder
- `home.categories` - Browse by Category
- `home.news` - Latest Business News
- `home.featured` - Featured Businesses
- `home.seeAll` - See all

### Settings
- `settings.title` - Settings
- `settings.appearance` - Appearance
- `settings.notifications` - Notifications
- `settings.accountInfo` - Account Info
- `settings.language` - Language
- `settings.privacy` - Privacy & Security
- `settings.help` - Help Center
- `settings.logout` - Log Out

### Theme
- `theme.light` - Light
- `theme.dark` - Dark
- `theme.system` - System
- `theme.lightMode` - Light mode
- `theme.darkMode` - Dark mode
- `theme.systemMode` - System mode

### Account
- `account.premiumMember` - Premium Member
- `account.userAccount` - User Account
- `account.vendorAccount` - Vendor Account
- `account.adminAccount` - Admin Account

### Common
- `common.save` - Save
- `common.cancel` - Cancel
- `common.edit` - Edit
- `common.delete` - Delete
- `common.loading` - Loading...
- `common.error` - Error
- `common.success` - Success
- `common.close` - Close
- `common.back` - Back

## Testing Checklist

- [x] Language persists after app restart
- [x] Language changes instantly without restart
- [x] English displays correctly
- [x] Sinhala displays correctly with proper font weight
- [x] Tamil displays correctly with proper font weight
- [x] Tab navigation labels translate
- [x] Settings screen labels translate
- [x] Theme mode labels translate
- [x] Account type labels translate
- [x] Language selector shows current selection
- [x] Font weights are appropriate for each language
- [x] Text alignment is correct in all languages
- [x] No text overflow issues

## Troubleshooting

### Language doesn't change immediately
**Problem:** Language only changes after app restart
**Solution:** 
- Ensure `LanguageProvider` wraps the entire app in `App.tsx`
- Use `useLanguage()` hook instead of directly accessing AsyncStorage
- Check that `setLanguage()` function is being called correctly

### Tamil/Sinhala text too bold
**Problem:** Tamil or Sinhala text appears too heavy/bold
**Solution:**
```typescript
// Use getTextStyles helper
import { getTextStyles } from '../utils/fontHelpers';
import { useLanguage } from '../context/LanguageContext';

const { language } = useLanguage();
<Text style={{ ...getTextStyles(language, false), color: '#000' }}>
  Your text here
</Text>

// Or use LocalizedText component
<LocalizedText style={{ color: '#000' }}>
  Your text here
</LocalizedText>
```

### Missing translations
**Problem:** Text shows translation key instead of actual text
**Solution:**
- Add the missing key to `src/locales/translations.ts` for all 3 languages
- Ensure the key path is correct (e.g., `home.hello` not `hello`)
- Check for typos in the translation key

### Font alignment issues
**Problem:** Text alignment looks wrong in Tamil/Sinhala
**Solution:**
```typescript
// Remove letter spacing for Tamil/Sinhala
import { getTextStyles } from '../utils/fontHelpers';

<Text style={{
  ...getTextStyles(language, false),
  letterSpacing: 0, // This is already included in getTextStyles
}}>
```

## Best Practices

### 1. Always Use Translation Function
```typescript
// ✅ Good
<Text>{t('home.hello')}</Text>

// ❌ Bad
<Text>Hello</Text>
```

### 2. Use LocalizedText for Bold Text
```typescript
// ✅ Good
<LocalizedText bold>{t('settings.title')}</LocalizedText>

// ❌ Bad (will be too bold in Tamil/Sinhala)
<Text style={{ fontWeight: '700' }}>{t('settings.title')}</Text>
```

### 3. Keep Translation Keys Organized
```typescript
// ✅ Good - organized by feature
'home.hello'
'home.search.placeholder'
'settings.title'
'settings.appearance'

// ❌ Bad - flat structure
'hello'
'searchPlaceholder'
'settingsTitle'
```

### 4. Add Translations for All Languages
Always add a key to all 3 language objects:
```typescript
// ✅ Good
en: { 'feature.title': 'Title' }
si: { 'feature.title': 'ශීර්ෂය' }
ta: { 'feature.title': 'தலைப்பு' }

// ❌ Bad - missing languages
en: { 'feature.title': 'Title' }
// si and ta missing!
```

## Future Enhancements

- [ ] **RTL Support** - Right-to-left text for future languages
- [ ] **Dynamic translations** - Load from server instead of bundle
- [ ] **Translation caching** - Improve performance
- [ ] **Fallback languages** - English fallback for missing translations
- [ ] **Pluralization** - Handle singular/plural forms
- [ ] **Number formatting** - Language-specific number formats
- [ ] **Date formatting** - Language-specific date formats
- [ ] **Currency formatting** - Sri Lankan Rupee display

## Support

For issues or questions:
1. Check translation key exists in all 3 languages
2. Verify LanguageProvider is wrapping the app
3. Use font helpers for Tamil/Sinhala text
4. Test in all 3 languages
5. Check AsyncStorage permissions

---

**Language System Complete!** 🌍

Sri Lankan users can now use the app in their preferred language with proper font rendering and instant switching!
