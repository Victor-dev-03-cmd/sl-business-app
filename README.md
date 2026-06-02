# SL Business App

A React Native mobile application for discovering and managing businesses in Sri Lanka.

## 🚀 Quick Links

- **[Documentation Hub](./docs/README.md)** - Complete documentation index
- **[Quick Start Guide](./docs/guides/QUICK_START.md)** - Get started in 5 minutes
- **[Installation Guide](./docs/guides/INSTALLATION_GUIDE.md)** - Setup instructions
- **[Location Setup](./docs/location/LOCATION_QUICK_START.md)** - GPS & location implementation

## 📱 Features

- 🔍 **Smart Search** - Find businesses by name, category, or location
- 📍 **GPS Location** - High-accuracy location with automatic GPS fix waiting
- 🗺️ **Interactive Maps** - View businesses on map with filters
- 📰 **Business News** - Latest updates from businesses
- 🔐 **Authentication** - Secure login with Supabase
- 🌐 **Multi-language** - Support for multiple languages
- 📱 **QR Scanner** - Quick business lookup via QR codes
- ⭐ **Reviews & Ratings** - Rate and review businesses

## 🛠️ Tech Stack

- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Navigation:** React Navigation
- **State Management:** React Hooks
- **Backend:** Supabase
- **Maps:** React Native Maps
- **Location:** expo-location
- **Styling:** NativeWind (TailwindCSS)

## 📂 Project Structure

```
sl-business-app/
├── src/
│   ├── components/        # Reusable components
│   ├── screens/          # Screen components
│   ├── hooks/            # Custom hooks (useLocation, etc.)
│   ├── context/          # React context providers
│   ├── lib/              # Third-party library configs
│   ├── data/             # Static data (categories, towns)
│   ├── locales/          # Translations
│   └── theme/            # Theme configuration
├── assets/               # Images, fonts, etc.
├── docs/                 # Documentation
└── App.tsx               # Root component
```

## 📚 Documentation

All documentation is organized in the [`docs/`](./docs/) folder:

### 📍 Location & GPS
- [Location Quick Start](./docs/location/LOCATION_QUICK_START.md)
- [Complete Location Setup](./docs/location/LOCATION_SETUP.md)
- [GPS Troubleshooting](./docs/location/GPS_TROUBLESHOOTING.md)
- [Migration Guide](./docs/location/LOCATION_MIGRATION_GUIDE.md)

### 🎯 Features
- [Business Details](./docs/features/BUSINESS_DETAILS_GUIDE.md)
- [Search System](./docs/features/SMART_SEARCH_PARSER.md)
- [Language System](./docs/features/LANGUAGE_SYSTEM_README.md)
- [QR Scanner](./docs/features/QR_SCANNER_UPDATE.md)

### 📖 Guides
- [Installation](./docs/guides/INSTALLATION_GUIDE.md)
- [Quick Start](./docs/guides/QUICK_START.md)
- [Native Modules Setup](./docs/guides/SETUP_NATIVE_MODULES.md)

### 🔧 Fixes & Updates
- [Recent Fixes](./docs/fixes/)
- [Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sl-business-app

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Run on Device

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios

# Web (limited features)
npx expo start --web
```

## 📱 Testing

### Physical Device (Recommended)

1. Install Expo Go app from App Store/Play Store
2. Run `npx expo start`
3. Scan QR code with Expo Go

### Emulator/Simulator

```bash
# Android
npx expo run:android

# iOS (Mac only)
npx expo run:ios
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### App Configuration

Edit `app.json` for app-specific settings (name, icon, permissions, etc.)

## 📍 Location Features

The app uses enhanced GPS location with:
- ✅ High-accuracy GPS tracking
- ✅ Automatic GPS fix waiting
- ✅ Retry logic with exponential backoff
- ✅ Permission & GPS service detection
- ✅ Configurable accuracy thresholds

See [Location Documentation](./docs/location/) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation:** Check the [docs folder](./docs/)
- **Location Issues:** See [GPS Troubleshooting](./docs/location/GPS_TROUBLESHOOTING.md)
- **Installation Issues:** See [Installation Guide](./docs/guides/INSTALLATION_GUIDE.md)

## 📊 Project Status

**Version:** 1.0.0  
**Status:** Active Development  
**Last Updated:** June 2026
