# StreetSentinel Android Application - Complete Setup Guide

## Project Overview

StreetSentinel is a comprehensive Android personal safety application with:
- Real-time audio threat detection
- Continuous GPS location tracking
- Emergency alert system with multi-channel notifications
- SafeWalk mode with check-in verification
- Evidence vault and alert history
- Firebase cloud integration
- Background foreground service operation

## System Requirements

- **Android Studio**: 2023.1.0 or newer
- **Min SDK**: 26 (Android 8.0)
- **Target SDK**: 34 (Android 14)
- **Compile SDK**: 34
- **Java**: 11+
- **Gradle**: 8.1.0+
- **Kotlin**: 1.9.20

## Project Setup

### 1. Clone/Extract Project

```bash
cd StreetSentinel-Android
```

### 2. Configure Firebase

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project: "StreetSentinel"
3. Add Android app to the project
4. Download `google-services.json`

#### Place google-services.json
```
StreetSentinel-Android/app/google-services.json
```

#### Initialize Firebase Services
- Authentication (Email/Password)
- Firestore Database
- Realtime Database
- Cloud Storage
- Cloud Messaging

### 3. Configure gradle.properties

Edit `gradle.properties`:

```properties
# Firebase
firebase.api_key=YOUR_FIREBASE_API_KEY
firebase.project_id=YOUR_PROJECT_ID
firebase.app_id=YOUR_APP_ID
firebase.database_url=https://YOUR_PROJECT.firebaseio.com

# SendGrid (for email)
sendgrid.api_key=YOUR_SENDGRID_API_KEY

# Google Maps
google.maps.api_key=YOUR_GOOGLE_MAPS_API_KEY
```

### 4. Firebase Configuration

#### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Alerts collection
    match /alerts/{alertId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth.uid == resource.data.userId;
    }
    
    // Contacts collection
    match /contacts/{contactId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // SafeWalk sessions
    match /safewalk_sessions/{sessionId} {
      allow create, read, update: if request.auth.uid == resource.data.userId;
    }
    
    // Evidence vault
    match /evidence_vault/{evidenceId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // Locations
    match /locations/{locationId} {
      allow write: if request.auth != null;
      allow read: if request.auth.uid == resource.data.userId;
    }
  }
}
```

#### Realtime Database Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "fcmTokens": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### 5. API Keys Configuration

#### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps SDK for Android
3. Create API key for Android
4. Add to `gradle.properties`

#### SendGrid API (for email alerts)
1. Create SendGrid account
2. Generate API key
3. Add to `gradle.properties`

### 6. Build and Run

#### Clean Build
```bash
./gradlew clean build
```

#### Run Debug Build
```bash
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

#### Run Release Build
```bash
./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

#### Run on Emulator
```bash
./gradlew installDebug
```

### 7. Required Permissions

The app requires the following permissions (handled via runtime permissions):

**Location**
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION

**Audio**
- RECORD_AUDIO
- MODIFY_AUDIO_SETTINGS

**Contacts & Phone**
- READ_CONTACTS
- WRITE_CONTACTS
- CALL_PHONE
- SEND_SMS
- READ_PHONE_STATE

**Notifications**
- POST_NOTIFICATIONS

**Foreground Service**
- FOREGROUND_SERVICE
- FOREGROUND_SERVICE_LOCATION
- FOREGROUND_SERVICE_MICROPHONE

**System**
- WAKE_LOCK
- VIBRATE
- INTERNET
- ACCESS_NETWORK_STATE

## Database Setup

### Local Database (Room)

The app uses Room for local caching with these tables:

- **alerts** - Local alert history
- **location_snapshots** - GPS snapshots
- **safewalk_sessions** - SafeWalk sessions
- **checkins** - Check-in records
- **evidence_vault** - Local evidence storage

Database auto-migrates with `fallbackToDestructiveMigration()`.

### Firebase Integration

All data syncs to Firebase Firestore and Realtime Database:
- User data
- Alert events
- Location history
- Contacts list
- Evidence metadata

## Feature Configuration

### Audio Detection Sensitivity

Edit `PreferencesManager.getAudioSensitivity()` to adjust:
- Range: 0.0 to 1.0
- Default: 0.7
- Higher = More sensitive to quiet sounds

### Auto-Escalation Time

Default: 30 seconds

Change via:
```kotlin
preferencesManager.setAutoEscalateTime(30000L) // milliseconds
```

### Check-in Timeout

Default: 5 minutes per SafeWalk session

Configurable per session when starting SafeWalk.

### Night Safety Mode

Auto-increases monitoring sensitivity after 8 PM.

### Notification Channels

Android 8.0+ uses notification channels:
- Emergency Alerts (MAX priority, sound, vibration)
- Protection Active (LOW priority, silent)
- Location Updates (LOW priority, silent)
- Audio Alerts (HIGH priority, vibration)
- General Alerts (DEFAULT priority)

## Testing

### Unit Tests
```bash
./gradlew test
```

### Instrumented Tests
```bash
./gradlew connectedAndroidTest
```

### Permissions Test
- Grant location permissions
- Grant audio permissions
- Grant contacts permissions
- Grant phone permissions

### Audio Detection Test
1. Enable Protection
2. Record loud sound
3. Check if alert triggers

### Location Tracking Test
1. Enable Location Tracking
2. Check location updates in logcat
3. Verify position on map

### Emergency Workflow Test
1. Trigger SOS button
2. Verify countdown
3. Verify location sent
4. Check Firebase alerts collection

## Troubleshooting

### Build Fails

**Issue**: Gradle sync fails
**Solution**: 
- Clean: `./gradlew clean`
- Invalidate cache: File > Invalidate Caches > Restart

**Issue**: Firebase configuration missing
**Solution**:
- Ensure `google-services.json` in `app/` folder
- Re-sync Gradle

### Runtime Issues

**Issue**: Permissions not granted
**Solution**:
- App asks for permissions on first launch
- Manually grant in Settings > Apps > StreetSentinel

**Issue**: Location not updating
**Solution**:
- Enable GPS on device
- Check location services enabled
- Grant background location permission
- Check logcat for errors

**Issue**: Audio detection not working
**Solution**:
- Grant RECORD_AUDIO permission
- Enable microphone on device
- Check audio levels in Home screen
- Verify audio threshold in code

**Issue**: Notifications not showing
**Solution**:
- Ensure notifications enabled for app
- Check notification channels created
- Verify POST_NOTIFICATIONS permission granted

### Firebase Issues

**Issue**: Firestore write fails
**Solution**:
- Check Firebase security rules
- Verify user authenticated
- Check internet connection

**Issue**: FCM token not updating
**Solution**:
- Check Firebase Messaging dependency
- Verify google-services.json
- Check device has Google Play Services

## Performance Optimization

### Audio Processing
- Uses 44100 Hz sample rate (standard)
- 16-bit mono audio
- Processes in 100ms chunks
- CPU usage: ~5-10%

### Location Tracking
- 30 second update interval
- 10 second fastest interval
- Battery drain: ~5-10% per hour

### Background Service
- Uses WorkManager for reliability
- Foreground service notification always visible
- Continues when device locked/screen off

## Security Considerations

### Data Encryption
- All data in transit uses HTTPS/TLS
- Firebase provides encryption at rest
- Local database uses encryption (optional)

### Authentication
- Uses Firebase Authentication
- Email/password or OAuth
- Session tokens managed by Firebase

### Permissions
- Runtime permissions (Android 6.0+)
- Minimum required permissions only
- Users can revoke anytime

### Code Obfuscation
- Release builds use ProGuard
- Sensitive strings obfuscated
- Reduces APK size

## Deployment

### Google Play Store

1. **Prepare Release**
   ```bash
   ./gradlew bundleRelease
   ```
   Creates `app/build/outputs/bundle/release/app-release.aab`

2. **Create Signing Key**
   ```bash
   keytool -genkey -v -keystore streetsentinel-release.keystore \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias streetsentinel-key
   ```

3. **Configure Signing**
   Edit `app/build.gradle.kts`:
   ```kotlin
   signingConfigs {
       release {
           storeFile = file("path/to/keystore")
           storePassword = "..."
           keyAlias = "streetsentinel-key"
           keyPassword = "..."
       }
   }
   buildTypes {
       release {
           signingConfig = signingConfigs.release
       }
   }
   ```

4. **Upload to Play Store**
   - Create app listing
   - Upload AAB file
   - Configure store listing
   - Submit for review

## Monitoring & Analytics

### Firebase Analytics
- Auto-tracks user events
- Custom events for alerts
- Dashboard in Firebase Console

### Crash Reporting
- Firebase Crashlytics integrated
- Auto-reports exceptions
- Accessible via Firebase Console

### Performance Monitoring
- Firebase Performance Monitoring
- Tracks screen load times
- Network latency

## Support & Documentation

### Code Documentation
- Javadoc comments on all public APIs
- README files in each module
- Inline comments for complex logic

### Architecture
- MVVM pattern
- Clean architecture layers
- Dependency injection with Hilt

### Git Workflow
- Main branch: stable production code
- Dev branch: development builds
- Feature branches: new features

## Contact & Support

For issues, questions, or contributions:
- GitHub Issues
- Documentation Wiki
- Development Team

---

## Version History

### v1.0.0 (Initial Release)
- Core safety features
- Audio detection
- Emergency alerts
- SafeWalk mode
- Contact management
- Firebase integration
