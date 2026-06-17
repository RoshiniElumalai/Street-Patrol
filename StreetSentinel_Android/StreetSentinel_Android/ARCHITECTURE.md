# StreetSentinel Android - Technical Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  (Activities, Fragments, ViewModels, Adapters)              │
├─────────────────────────────────────────────────────────────┤
│                     Domain Layer                              │
│  (Use Cases, Business Logic, Managers)                       │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer                                │
│  (Repositories, Local DB, Remote API, Models)               │
├─────────────────────────────────────────────────────────────┤
│              Background Services & Tasks                      │
│  (Foreground Service, Audio Detection, Location Tracking)   │
├─────────────────────────────────────────────────────────────┤
│                  Firebase Backend                             │
│  (Firestore, Realtime DB, Cloud Messaging, Auth)            │
└─────────────────────────────────────────────────────────────┘
```

## Layer Details

### 1. UI Layer

**Components**:
- Activities: MainActivity, LoginActivity, RegisterActivity, EmergencyAlertActivity
- Fragments: HomeFragment, SafeWalkFragment, SOSFragment, AlertsFragment, ContactsFragment
- ViewModels: MainViewModel, HomeViewModel, SafeWalkViewModel, SOSViewModel, AlertsViewModel, ContactsViewModel
- Adapters: ContactsAdapter, AlertsAdapter

**Responsibilities**:
- Display user interface
- Handle user input
- Observe data changes via LiveData
- Navigate between screens
- Show notifications and dialogs

**Data Flow**:
```
User Interaction
    ↓
Fragment/Activity
    ↓
ViewModel (observes LiveData)
    ↓
Repository (fetches data)
    ↓
Firebase/Room DB
    ↓
LiveData update
    ↓
UI refreshes
```

### 2. Domain Layer

**Managers**:

#### EmergencyAlertManager
- Handles emergency workflow
- Coordinates threat detection
- Escalates to contacts
- Manages alert lifecycle

**Flow**:
```
Threat Detected
    ↓
Trigger Alert
    ↓
Show Notification
    ↓
Start Countdown (30s)
    ↓
User Response?
    ├─ Safe → Cancel
    ├─ Send Location → Escalate
    └─ No Response → Auto-Escalate
    ↓
Send to Contacts (SMS, Email, WhatsApp)
    ↓
Record Alert
```

#### AudioAnalysisManager
- Analyzes audio buffer for threats
- ML-based detection (with fallback rules)
- Calculates confidence scores
- Detects specific threat types

**Detection Logic**:
```
Audio Input → Frequency Analysis → ML Model
                                      ↓
                                 Scream/Help/Distress/Glass?
                                      ↓
                                 Confidence Score
                                      ↓
                                 If > Threshold → Alert
```

### 3. Data Layer

#### Repositories

**AlertRepository**:
- Save/retrieve alerts
- Update alert status
- Record contact notifications
- Query alert history

**LocationRepository**:
- Save location snapshots
- Create SafeWalk sessions
- Update session progress
- Mark arrival/completion

**ContactRepository**:
- Add/edit/delete contacts
- Fetch emergency contacts
- Sync with Firebase

**UserRepository**:
- Manage user profile
- Update preferences
- Handle authentication

#### Data Models

```
User
├── userId
├── name, email, phone
├── emergencyContactName
└── preferences (audio sensitivity, etc)

Alert
├── alertId, userId
├── threatType (scream, help, distress, glass)
├── threatLevel (critical, high, medium, low)
├── confidence (0.0-1.0)
├── latitude, longitude
├── timestamp
├── status (pending, escalated, cancelled)
└── delivery status

LocationSnapshot
├── id, userId
├── latitude, longitude
├── accuracy, altitude
├── bearing, speed
├── timestamp, provider
└── syncedToFirebase

SafeWalkSession
├── sessionId, userId
├── destination (name, lat, lng)
├── distance, eta
├── checkInTimeout
├── status (active, completed, cancelled)
├── routeHistory (list of lat,lng pairs)
└── guardians (user IDs)

Contact
├── contactId, userId
├── name, email, phone
├── relationship
├── isPrimary, isGuardian
├── canReceiveAlerts
└── addedAt
```

#### Local Database (Room)

**Tables**:
- alerts (indexed by userId, timestamp)
- location_snapshots (indexed by userId)
- safewalk_sessions (indexed by userId, status)
- checkins (indexed by userId, sessionId)
- evidence_vault (indexed by userId, alertId)

**Query Performance**:
- Location queries: O(log n) with index
- Alert queries: O(log n) with compound index
- Full sync: ~100-200ms

### 4. Services Layer

#### StreetSentinelForegroundService
- Main service running 24/7
- Manages all background operations
- Schedules WorkManager jobs
- Displays persistent notification

**Lifecycle**:
```
onCreate
  ├─ Initialize Timber
  ├─ Setup notification channels
  ├─ Initialize database
  └─ Initialize preferences

onStartCommand
  ├─ Start foreground (notification)
  ├─ Initialize all services
  ├─ Schedule workers
  └─ Return START_STICKY

onDestroy
  ├─ Cleanup services
  ├─ Cancel workers
  └─ Reschedule if protection enabled
```

#### AudioDetectionService
- Monitors microphone continuously
- Reads audio buffer every 100ms
- Analyzes audio for threats
- Triggers emergency alerts

**Process**:
```
Start Recording
    ↓
Read Audio Buffer (44.1kHz, 16-bit mono)
    ↓
Calculate Audio Level (dB)
    ↓
If dB >= 85:
    ├─ Analyze frequency characteristics
    ├─ Run ML detection
    ├─ Calculate threat confidence
    └─ If confidence > 0.7:
        ├─ Save audio event
        └─ Trigger emergency alert
    ↓
Broadcast audio level update
    ↓
Delay 100ms
    ↓
Repeat
```

#### LocationTrackingService
- Requests location updates (30s interval)
- Saves to local DB + Firebase
- Updates SafeWalk progress
- Checks for arrival

**Process**:
```
Request Location Updates
    ↓
Receive Location (FusedLocationProviderClient)
    ↓
Save to Room DB
    ↓
Sync to Firebase
    ↓
Update SafeWalk Session if active:
    ├─ Calculate distance to destination
    ├─ Update ETA
    ├─ Check for arrival (<50m)
    ├─ If arrived → Complete SafeWalk
    └─ Broadcast location update
    ↓
Every 30 seconds
```

#### NotificationService
- Manages all notifications
- Creates notification channels
- Handles notification actions
- Broadcasts intents for UI updates

### 5. Background Operation

#### WorkManager Jobs

**AudioDetectionWorker** (30-second interval)
- Ensures audio service running
- Restarts if crashed

**LocationTrackingWorker** (60-second interval)
- Ensures location service running
- Restarts if crashed

**HealthCheckWorker** (5-minute interval)
- Verifies system health
- Restarts services if needed

**SyncDataWorker** (15-minute interval)
- Syncs local data to Firebase
- Handles offline data

#### Broadcast Receivers

**BootCompletedReceiver**
- Triggered on device restart
- Restarts foreground service
- Restores protection state

**NotificationActionReceiver**
- Handles notification buttons
- Processes user responses
- Updates alert status

**LocationUpdateReceiver**
- Handles location provider changes
- Restarts location service

**LockScreenReceiver**
- Detects screen on/off
- Manages audio monitoring

## Data Flow Examples

### Emergency Alert Flow

```
User: Loud Scream
    ↓
AudioDetectionService reads buffer
    ↓
AudioAnalysisManager detects (95 dB, scream, confidence 0.95)
    ↓
ThreatAnalysis returned
    ↓
EmergencyAlertManager.triggerEmergencyAlert()
    ↓
Create Alert record
    ├─ Save to Room DB
    └─ Save to Firestore
    ↓
Get current location (FusedLocationProviderClient)
    ↓
NotificationService.showEmergencyAlert()
    ├─ Show lock screen notification
    ├─ Set full screen intent
    └─ Play alert sound
    ↓
EmergencyAlertActivity launches
    ├─ Display "Are you safe?"
    ├─ Start 30-second countdown
    └─ Show buttons: "I'm Safe" / "Send Location"
    ↓
User Response:
    ├─ "I'm Safe" → Cancel alert
    ├─ "Send Location" → Escalate immediately
    └─ Timeout → Auto-escalate
    ↓
Escalate to Contacts
    ├─ Get emergency contacts from Firebase
    ├─ Send SMS (Twilio/Firebase Function)
    ├─ Send Email (SendGrid/Firebase Function)
    ├─ Send WhatsApp (WhatsApp Business API)
    └─ Update alert delivery status
    ↓
Record contact notifications
    ├─ Save to Firestore
    └─ Save to Room DB
    ↓
Close EmergencyAlertActivity
```

### SafeWalk Flow

```
User: Enter destination & time
    ↓
SafeWalkViewModel.startSafeWalk()
    ↓
Geocode destination
    ↓
Create SafeWalkSession
    ├─ Calculate distance (Haversine)
    ├─ Calculate ETA
    ├─ Set check-in timer
    ├─ Save to Room
    └─ Save to Firestore
    ↓
LocationTrackingService updates route
    ├─ Every 30 seconds get GPS
    ├─ Add point to route history
    ├─ Update session in Room & Firestore
    ├─ Calculate distance to destination
    └─ Check if arrived
    ↓
Check-in Timer (5 minutes default)
    ├─ Countdown every second
    ├─ On timeout:
    │   ├─ Show check-in reminder
    │   ├─ Ask "Have you arrived?"
    │   └─ If no response → Trigger emergency
    └─ User confirms safe → Mark completed
    ↓
User arrives (within 50m)
    ├─ Auto-detect arrival
    ├─ Show arrival notification
    ├─ Mark session completed
    └─ Record check-in
    ↓
End SafeWalk
    ├─ Save route history
    ├─ Store evidence
    └─ Record statistics
```

### Authentication & User Setup Flow

```
Launch App
    ↓
Check Firebase Auth
    ├─ User logged in? → Go to Home
    └─ Not logged in? → Go to Login
    ↓
LoginActivity / RegisterActivity
    ├─ Email authentication
    └─ Firebase Auth
    ↓
Create User Document in Firestore
    ├─ userId
    ├─ name, email, phone
    └─ preferences
    ↓
First Run Setup
    ├─ Request permissions
    ├─ Add emergency contacts
    ├─ Configure settings
    └─ Enable protection
    ↓
Start Foreground Service
    ├─ Audio detection
    ├─ Location tracking
    └─ Show persistent notification
    ↓
Go to Home Fragment
```

## Synchronization Strategy

### Local-Cloud Sync

```
Offline Operation:
┌─────────────────────────┐
│   Local Room Database   │
│                         │
│ ✓ Alerts               │
│ ✓ Locations            │
│ ✓ SafeWalk Sessions    │
│ ✓ Contacts             │
└─────────────────────────┘
        ↓ (Auto-sync when online)
┌─────────────────────────┐
│  Firebase Firestore     │
│  + Realtime Database    │
└─────────────────────────┘
```

### Sync Mechanism

1. **Automatic**: WorkManager job every 15 minutes
2. **On Demand**: User pulls to refresh
3. **On Data Change**: Immediate push to Firebase
4. **Conflict Resolution**: Last-write-wins

### Data Consistency

```
Create Alert
    ├─ Write to Room (immediate)
    ├─ Write to Firebase (async)
    ├─ Mark as synced (on success)
    └─ Retry on failure
```

## Error Handling

### Network Errors
- Offline operation with local DB
- Automatic retry with exponential backoff
- User notification on persistent failure

### Permission Errors
- Request at runtime (Android 6.0+)
- Graceful degradation if denied
- Setting link in app for manual grant

### Audio/Location Errors
- Try alternative providers
- Log to Crashlytics
- Show user-friendly error message

## Performance Optimizations

### Memory
- SharedPreferences for small data
- Room for structured data
- Firebase for cloud sync
- Limit audio buffer to 44.1kHz

### Battery
- Location: 30-second intervals (vs continuous)
- Audio: Event-based processing
- Foreground service: Persistent (shows notification)
- WorkManager: Batches work

### Network
- Local-first: Save locally, sync later
- Compression: Audio metadata only
- Delta sync: Only changed data
- Caching: Firebase offline persistence

### Storage
- Auto-delete old locations (30+ days)
- Archive old alerts
- Clean up evidence (user selectable)

## Security Architecture

### Authentication
```
Email/Password
    ↓
Firebase Auth
    ↓
Get Auth Token
    ↓
All Requests → Bearer token in header
```

### Firestore Security Rules
```
Users: Only own data
Alerts: Create if auth, read/update if owner
Contacts: Read/write if owner
Locations: Only owner reads
```

### Data Encryption
- TLS 1.2+ for all network
- Firebase encryption at rest
- Room encryption (optional)
- No sensitive data in logs

### Code Protection
- ProGuard obfuscation in release
- String encryption for API keys
- No hardcoded credentials
- Environment variables for secrets

## Testing Strategy

### Unit Tests
- ViewModel logic
- Repository logic
- Utility functions
- Audio analysis algorithm

### Integration Tests
- Database operations
- Firebase operations
- Service interactions
- Notification delivery

### UI Tests
- Fragment navigation
- Button interactions
- Form validation
- Data display

### End-to-End Tests
- Full alert workflow
- Full SafeWalk flow
- Background service restart
- Offline sync

---

**Last Updated**: June 2024
**Version**: 1.0.0
**Architect**: Your Name
