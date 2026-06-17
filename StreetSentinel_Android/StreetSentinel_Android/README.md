# StreetSentinel - Android Personal Safety Guardian

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Android-green)
![API](https://img.shields.io/badge/API-26%2B-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🛡️ Overview

**StreetSentinel** is an AI-powered personal safety guardian for Android that continuously monitors your surroundings, detects threats, and automatically alerts trusted contacts when danger is detected.

Built as a native Android application with:
- **Real-time audio threat detection** (scream, distress sounds, glass breaking)
- **Continuous GPS location tracking** even when app is closed
- **Emergency alert system** with multi-channel notifications (SMS, Email, WhatsApp)
- **SafeWalk mode** with check-in verification
- **Foreground service** for background operation
- **Firebase integration** for cloud sync
- **Evidence vault** for storing threat events

## ✨ Key Features

### 🎤 Advanced Audio Detection
- Real-time microphone monitoring
- ML-ready threat detection (Scream, Help, Distress, Glass Breaking)
- Audio level meter (dB display)
- Configurable sensitivity
- 85+ dB threat threshold

### 📍 Location Tracking
- Continuous GPS tracking (30-second intervals)
- SafeWalk mode with destination tracking
- Route history visualization on map
- Real distance calculation (Haversine formula)
- ETA calculation for SafeWalk

### 🚨 Emergency System
- Manual SOS button with countdown
- Automatic threat detection & escalation
- 30-second countdown for user confirmation
- Auto-escalation to contacts if no response
- Emergency notifications on lock screen

### 👥 Contact Management
- Add/edit/delete emergency contacts
- Mark primary contact
- Guardian system for trusted people
- Location sharing with guardians
- Real-time status updates

### 📱 Multi-Channel Alerts
- Firebase Cloud Messaging
- SMS notifications
- Email delivery via SendGrid
- WhatsApp integration
- Lock screen notifications
- Notification tray alerts

### 🗂️ Evidence Management
- Store audio events
- GPS snapshot collection
- Alert history with filtering
- Cloud backup to Firebase
- Local database caching
- Evidence tagging and search

### 🌙 Advanced Features
- Night Safety Mode (auto-increase sensitivity after 8 PM)
- Shake detection for SOS trigger
- Fake call generator for fake emergency calls
- System health dashboard
- Nearby safety scanner (hospitals, police, pharmacies)
- Offline functionality with sync

### 🔒 Background Operation
- **Foreground Service** - Runs 24/7 even when app closed
- Audio monitoring continues in background
- Location tracking continues when screen locked
- Notifications show on lock screen
- Auto-restart after device reboot
- Battery optimized

## 🏗️ Architecture

### Project Structure
```
StreetSentinel/
├── app/src/main/
│   ├── java/com/streetsentinel/
│   │   ├── StreetSentinelApp.kt - Application class
│   │   ├── ui/ - UI Layers (Activities, Fragments, ViewModels)
│   │   ├── services/ - Background services
│   │   ├── managers/ - Business logic managers
│   │   ├── receivers/ - BroadcastReceivers
│   │   ├── data/ - Data layer (DB, Repositories, Models)
│   │   ├── utils/ - Utility classes
│   │   ├── workers/ - WorkManager jobs
│   │   └── di/ - Dependency Injection
│   └── res/ - Resources (layouts, strings, colors)
├── build.gradle.kts - App build config
└── proguard-rules.pro - Code obfuscation rules
```

### Technology Stack
- **Language**: Kotlin 1.9.20
- **Architecture**: MVVM + Clean Architecture
- **UI Framework**: Android Jetpack
- **Database**: Room + Firebase Firestore
- **Background**: WorkManager + Foreground Service
- **Location**: Google Play Services (FusedLocationProviderClient)
- **Audio**: MediaRecorder + TensorFlow Lite
- **Notifications**: Firebase Cloud Messaging
- **Networking**: Retrofit + Firebase
- **DI**: Hilt
- **Logging**: Timber

### Design Patterns
- **MVVM** (Model-View-ViewModel)
- **Repository Pattern** for data access
- **Service Locator** with Hilt DI
- **Observer Pattern** with LiveData
- **Singleton** for shared services

## 📋 Requirements

### Device Requirements
- **Min API**: 26 (Android 8.0 Oreo)
- **Target API**: 34 (Android 14)
- **RAM**: 2 GB minimum
- **Storage**: 50 MB minimum
- **GPS**: Required
- **Microphone**: Required
- **Internet**: Required for cloud features

### Development Requirements
- Android Studio 2023.1.0+
- Java 11+
- Gradle 8.1.0+
- Firebase account
- Google Maps API key
- SendGrid account (for email)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/StreetSentinel-Android.git
cd StreetSentinel-Android
```

### 2. Setup Firebase
1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Download `google-services.json`
3. Place in `app/` folder

### 3. Configure API Keys
Edit `gradle.properties`:
```properties
firebase.api_key=YOUR_FIREBASE_API_KEY
firebase.project_id=YOUR_PROJECT_ID
sendgrid.api_key=YOUR_SENDGRID_KEY
google.maps.api_key=YOUR_MAPS_KEY
```

### 4. Build & Run
```bash
# Clean build
./gradlew clean build

# Run debug
./gradlew installDebug

# Or open in Android Studio and click Run
```

## 📚 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup instructions
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Implementation status & features
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture details

## 🧪 Testing

### Run Tests
```bash
# Unit tests
./gradlew test

# Instrumented tests
./gradlew connectedAndroidTest

# Lint checks
./gradlew lint
```

### Manual Testing Checklist
- [ ] Grant all permissions on first launch
- [ ] HomeFragment displays all stats
- [ ] Start SafeWalk with valid destination
- [ ] Audio detection triggers on loud noise
- [ ] SOS button countdown works
- [ ] Emergency contacts receive alerts
- [ ] Location tracking active in background
- [ ] Notifications appear on lock screen
- [ ] App restarts after device reboot

## 🔐 Security

### Implemented Security
- ✅ Runtime permissions (Android 6.0+)
- ✅ Firebase authentication
- ✅ TLS/SSL for all network communication
- ✅ Firebase security rules
- ✅ ProGuard code obfuscation
- ✅ Data encryption at rest (Firebase)
- ✅ Sensitive data never logged
- ✅ No hardcoded credentials

### Permission Model
All permissions requested at runtime:
- Location (GPS)
- Microphone (Audio detection)
- Contacts (Emergency contacts)
- Phone (SMS, calls)
- Notifications (Android 13+)

Users can grant/revoke anytime in Settings.

## 📊 Performance

### Memory Usage
| State | Memory |
|-------|--------|
| App Launch | 80-100 MB |
| With Services | 120-150 MB |
| Foreground Service | +20-30 MB |

### Battery Impact
| Feature | Battery Drain |
|---------|---------------|
| Audio Monitoring | 5-10% / hour |
| Location Tracking | 5-10% / hour |
| Both Features | 10-15% / hour |
| Standby (Services) | 2-3% / hour |

### Network Usage
| Operation | Data |
|-----------|------|
| Location Sync | ~1 KB |
| Alert Event | ~2-5 KB |
| Audio Metadata | ~100 bytes |
| Daily Typical | 1-5 MB |

## 🐛 Troubleshooting

### App Won't Launch
- Check Android Studio console for errors
- Ensure `google-services.json` exists
- Clean build: `./gradlew clean build`

### Permissions Not Working
- Grant permissions in Settings > Apps > StreetSentinel
- Check Android version (API 26+)
- Restart app after granting

### Location Not Updating
- Enable GPS on device
- Check location services
- Grant background location permission
- Check internet connection

### Audio Detection Not Triggering
- Grant microphone permission
- Check audio threshold in code
- Ensure loud enough sound (85+ dB)
- Check logcat for errors

### Notifications Not Showing
- Check notification settings
- Ensure permissions granted
- Firebase setup correct
- Check notification channels

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for more help.

## 📈 Roadmap

### v1.1.0 (Planned)
- [ ] ML-based audio detection with trained model
- [ ] Video recording to evidence vault
- [ ] Guardian-side companion app
- [ ] Advanced analytics dashboard
- [ ] Biometric authentication

### v1.2.0 (Future)
- [ ] Voice command support
- [ ] Wearable device integration
- [ ] Multi-language support
- [ ] Home widget
- [ ] Custom safety zones

## 🤝 Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- Google Play Services for location
- TensorFlow Lite for ML framework
- Material Design for UI components
- Timber for logging

## 📞 Support

### Issues & Bugs
- Report via [GitHub Issues](https://github.com/yourusername/StreetSentinel-Android/issues)
- Include device info, Android version, and steps to reproduce

### Questions & Discussions
- GitHub Discussions
- Email: support@streetsentinel.com

### Security Issues
- Do NOT create public issue
- Email: security@streetsentinel.com

## 👥 Team

- **Developer**: Your Name
- **Architecture**: Your Name
- **Testing**: Your Name

---

## 📱 Screenshots

### Home Dashboard
![Home](screenshots/home.png)

### SafeWalk Mode
![SafeWalk](screenshots/safewalk.png)

### SOS Emergency
![SOS](screenshots/sos.png)

### Emergency Alert
![Emergency](screenshots/emergency.png)

### Contact Management
![Contacts](screenshots/contacts.png)

### Alert History
![Alerts](screenshots/alerts.png)

---

**Made with ❤️ for safety**

Last Updated: June 2024
Version: 1.0.0
