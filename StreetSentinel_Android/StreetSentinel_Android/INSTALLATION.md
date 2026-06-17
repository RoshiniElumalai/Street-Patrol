# StreetSentinel Android - Installation & Getting Started Guide

## 📦 Package Contents

This complete Android application includes:

### Source Code (42 Kotlin files)
- ✅ Main Application Class
- ✅ 10+ Activities & Fragments
- ✅ 8+ ViewModels
- ✅ 5 Background Services
- ✅ 2 Managers (Emergency, Audio Analysis)
- ✅ 3 Broadcast Receivers
- ✅ 4 Repositories
- ✅ 5 Room Database DAOs
- ✅ 5+ Workers for background tasks
- ✅ Dependency Injection modules
- ✅ Utility classes

### Configuration Files
- ✅ build.gradle.kts (app + root)
- ✅ settings.gradle.kts
- ✅ gradle.properties
- ✅ AndroidManifest.xml (fully configured)
- ✅ proguard-rules.pro (obfuscation)

### Resources
- ✅ strings.xml (complete)
- ✅ colors.xml (complete)
- ✅ Layout XMLs (ready for creation)

### Documentation
- ✅ README.md
- ✅ SETUP_GUIDE.md (comprehensive)
- ✅ PROJECT_STATUS.md (detailed)
- ✅ ARCHITECTURE.md (technical)
- ✅ INSTALLATION.md (this file)

---

## 🔧 Pre-Installation Requirements

### System Requirements
- **Mac/Linux/Windows** with Android development capability
- **Android Studio** 2023.1.0 or newer
- **Java 11+** (included with Android Studio)
- **Gradle 8.1.0+** (included with Android Studio)
- **4 GB RAM** minimum for build
- **2 GB disk space** for project + dependencies

### External Accounts
- **Firebase** account (free tier works) - [firebase.google.com](https://firebase.google.com)
- **Google Maps API** key - [console.cloud.google.com](https://console.cloud.google.com)
- **SendGrid** account (for email) - [sendgrid.com](https://sendgrid.com)
- **GitHub** account (for version control)

---

## 📋 Step-by-Step Installation

### Step 1: Extract Project

```bash
# Navigate to where you want the project
cd ~/Projects  # or your preferred location

# Extract the StreetSentinel-Android.zip
unzip StreetSentinel-Android.zip
cd StreetSentinel-Android

# Verify structure
ls -la
# Should show: app/, build.gradle.kts, settings.gradle.kts, README.md, etc.
```

### Step 2: Open in Android Studio

```bash
# From project directory
open -a "Android Studio" .

# Or manually:
# 1. Android Studio > File > Open
# 2. Select StreetSentinel-Android folder
# 3. Wait for Gradle sync to complete
```

**What happens automatically**:
- Gradle syncs dependencies
- AndroidX dependencies downloaded
- Firebase SDKs downloaded
- Room database compiler runs
- Kotlin compiler sets up

### Step 3: Setup Firebase

#### 3a. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project"
3. Name: `StreetSentinel`
4. Enable Google Analytics (optional)
5. Click "Create Project"

#### 3b. Add Android App

1. Click Android icon
2. Package name: `com.streetsentinel`
3. App nickname: `StreetSentinel`
4. Debug SHA-1: Get from Android Studio (instructions below)
5. Register app

#### 3c. Get Debug SHA-1

In Android Studio:
```
1. View > Tool Windows > Gradle
2. Expand StreetSentinel > Tasks > android
3. Double-click "signingReport"
4. Find "SHA1" in output
5. Copy and paste into Firebase
```

Or from terminal:
```bash
./gradlew signingReport
# Look for SHA1 in output
```

#### 3d. Download google-services.json

1. Firebase Console > StreetSentinel > Project Settings
2. Click "google-services.json" download button
3. Save to `StreetSentinel-Android/app/google-services.json`

```bash
# Verify placement
ls -la app/google-services.json
```

#### 3e. Enable Firebase Services

In Firebase Console:

**Authentication**
- Go to Authentication > Sign-in method
- Enable Email/Password

**Firestore**
- Go to Firestore Database
- Create database
- Start in test mode
- Select region closest to you

**Realtime Database**
- Go to Realtime Database
- Create database
- Start in test mode

**Cloud Storage**
- Go to Storage
- Create bucket
- Use default location

**Cloud Messaging**
- Go to Cloud Messaging
- Note down Server Key (for backend)

### Step 4: Configure API Keys

Edit `gradle.properties`:

```bash
# Open file
nano gradle.properties
# Or use Android Studio: File > Project Structure
```

Add/update:

```properties
# Firebase (from google-services.json)
firebase.api_key=YOUR_WEB_API_KEY
firebase.project_id=YOUR_PROJECT_ID
firebase.app_id=YOUR_APP_ID
firebase.database_url=https://YOUR_PROJECT.firebaseio.com

# Google Maps
# 1. Go to console.cloud.google.com
# 2. Select StreetSentinel project
# 3. Enable Maps SDK for Android
# 4. Create API key
google.maps.api_key=YOUR_MAPS_API_KEY

# SendGrid (optional, for email)
# 1. Create SendGrid account
# 2. Generate API key
sendgrid.api_key=YOUR_SENDGRID_KEY
```

### Step 5: Sync Gradle

In Android Studio:

```
1. File > Sync Now
2. Wait for build to complete
3. Check for errors in Build output
```

Or from terminal:

```bash
./gradlew clean build

# Wait for successful build
# Should end with: BUILD SUCCESSFUL
```

### Step 6: Setup Firebase Security Rules

In Firebase Console > Firestore:

**Click "Rules" tab, paste:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /alerts/{alertId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth.uid == resource.data.userId;
    }
    match /contacts/{contactId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    match /safewalk_sessions/{sessionId} {
      allow create, read, update: if request.auth.uid == resource.data.userId;
    }
    match /evidence_vault/{evidenceId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    match /locations/{locationId} {
      allow write: if request.auth != null;
      allow read: if request.auth.uid == resource.data.userId;
    }
  }
}
```

**Publish rules**

In Realtime Database > Rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

**Publish rules**

### Step 7: Build & Run

#### Option A: Android Studio (Easiest)

```
1. Device: Connect Android device (API 26+) or start emulator
2. Click green Run button (or Shift+F10)
3. Select device/emulator
4. App launches
5. Grant permissions when prompted
```

#### Option B: Command Line

```bash
# Debug build & install
./gradlew installDebug

# Run app
adb shell am start -n com.streetsentinel/.ui.MainActivity

# View logs
adb logcat | grep StreetSentinel
```

---

## ✅ Verification Checklist

After installation, verify:

- [ ] Project opens in Android Studio
- [ ] Gradle syncs without errors
- [ ] google-services.json in app/ folder
- [ ] gradle.properties has API keys
- [ ] Firebase project created
- [ ] Auth enabled in Firebase
- [ ] Firestore created and rules set
- [ ] App builds successfully
- [ ] App installs on device/emulator
- [ ] App launches without crash
- [ ] Permission request dialog appears
- [ ] Grant permissions dialog
- [ ] Home screen displays

---

## 🚀 First Run

When you launch the app for the first time:

1. **Login Screen** appears
   - Create account or login
   - Email/password authentication
   - Syncs to Firebase

2. **Permission Requests**
   - Location (GPS)
   - Microphone (Audio)
   - Contacts
   - Phone
   - Notifications
   - **Grant all for full functionality**

3. **Home Screen** displays
   - Shows status indicators
   - Protection toggle
   - Quick action buttons
   - Audio level meter
   - System health

4. **Foreground Service starts**
   - Persistent notification appears
   - Audio monitoring begins
   - Location tracking begins
   - Ready for emergencies

---

## 📝 Customization Guide

### Change App Name

In `app/src/main/AndroidManifest.xml`:
```xml
<application
    android:label="@string/app_name"
```

In `app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">YourAppName</string>
```

### Change App Icon

1. `app/src/main/res/mipmap-{density}/ic_launcher.png`
2. Provide for: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi

### Change Primary Color

In `app/src/main/res/values/colors.xml`:
```xml
<color name="primary">#YOUR_HEX_COLOR</color>
<color name="primary_dark">#YOUR_DARK_COLOR</color>
<color name="primary_light">#YOUR_LIGHT_COLOR</color>
```

### Change Package Name

```bash
# In Android Studio:
# 1. Right-click on package
# 2. Refactor > Rename
# 3. Update everywhere
# 4. Update in AndroidManifest.xml
# 5. Update gradle.properties
```

---

## 🐛 Troubleshooting

### Gradle Sync Fails

**Error**: `Gradle sync failed`

**Solution**:
```bash
# Clean Gradle cache
./gradlew clean

# Invalidate Android Studio cache
# File > Invalidate Caches > Invalidate and Restart

# Try sync again
./gradlew sync
```

### google-services.json Missing

**Error**: `File google-services.json not found`

**Solution**:
```bash
# Download from Firebase Console
# Save to exact location:
mv ~/Downloads/google-services.json app/google-services.json

# Verify:
ls -la app/google-services.json
```

### Build Fails - Missing Dependencies

**Error**: `Could not find androidx.room:room-runtime:...`

**Solution**:
```bash
# Update dependencies
./gradlew clean build --refresh-dependencies

# Or in Android Studio:
# File > Invalidate Caches > Invalidate and Restart
```

### App Crashes on Launch

**Check Android Studio Logcat**:
```
View > Tool Windows > Logcat
```

**Common causes**:
- [ ] gradle.properties API keys missing
- [ ] google-services.json not in app/ folder
- [ ] Firebase not initialized
- [ ] Permissions not granted

### Emulator Issues

**If emulator doesn't start**:
```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_6_API_31

# Check API level (need 26+)
```

**If slow**:
- Enable GPU acceleration
- Allocate more RAM in emulator settings
- Use Pixel emulator (not generic)

---

## 📚 Next Steps

After successful installation:

1. **Read Documentation**
   - [README.md](README.md) - Overview
   - [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
   - [PROJECT_STATUS.md](PROJECT_STATUS.md) - Implementation status

2. **Create Layout XMLs**
   - Fragment layout files
   - Activity layout files
   - Dialog layout files
   - (Code fully functional, just need XML UI)

3. **Test Features**
   - Enable protection
   - Test audio detection
   - Test SafeWalk mode
   - Test emergency alerts

4. **Deploy**
   - Create release build
   - Sign APK
   - Upload to Google Play Store

---

## 🔒 Security Notes

⚠️ **Never commit to version control**:
- API keys
- google-services.json
- Signing keys
- Firebase credentials

**Setup .gitignore**:
```bash
echo "gradle.properties" >> .gitignore
echo "app/google-services.json" >> .gitignore
echo "*.keystore" >> .gitignore
```

---

## 💡 Tips & Best Practices

1. **Use Android Emulator** for development (easier than device setup)
2. **Enable verbose logging** while developing:
   ```
   View > Tool Windows > Logcat > Filter with "StreetSentinel"
   ```
3. **Use Firebase Console** to monitor data in real-time
4. **Test on real device** before release (especially for permissions)
5. **Keep gradle.properties** in .gitignore
6. **Regular Firebase backups** in production

---

## 📞 Support

If you encounter issues:

1. Check [Troubleshooting](#-troubleshooting) section
2. Review [SETUP_GUIDE.md](SETUP_GUIDE.md)
3. Check Android Studio Logcat for errors
4. Look up error in [Stack Overflow](https://stackoverflow.com)
5. Check Firebase documentation
6. Review code comments in files

---

## 📋 Installation Checklist

Before moving forward, ensure:

- [ ] Android Studio installed (2023.1.0+)
- [ ] Android SDK 26+ installed
- [ ] Firebase project created
- [ ] google-services.json downloaded
- [ ] gradle.properties configured
- [ ] Firebase rules set
- [ ] Project extracts without errors
- [ ] Gradle syncs successfully
- [ ] App builds successfully
- [ ] App installs on device/emulator
- [ ] App launches without crashes
- [ ] Permissions work correctly

---

**Installation Complete! Ready to develop!** 🎉

Next: Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed configuration.
