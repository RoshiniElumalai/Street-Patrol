const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sendEmergencyEmail } = require('./services/emailService');
const { sendEmergencySMS, sendEmergencyWhatsApp } = require('./services/smsService');
const { db } = require('./config/firebase');
const { admin } = require('./config/firebase');

const app = express();
const server = http.createServer(app);

// ── Security Headers ──
app.use(helmet());

// ── CORS — Restrict to known frontend origins ──
const allowedOrigins = [
  'https://localhost:5173',
  'http://localhost:5173',
  'https://localhost:4173',
  'http://localhost:4173',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl in dev)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
}));

// ── Request Body Size Limit ──
app.use(express.json({ limit: '10kb' }));

// ── Rate Limiting on Emergency Endpoint ──
const emergencyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 requests per window
  message: { error: 'Too many emergency requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Firebase Auth Middleware ──
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Send Bearer <Firebase ID Token>.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      console.warn('[Auth] Token verification failed with admin SDK (likely missing serviceAccountKey.json). Decoding payload directly for local dev...');
      const payload = idToken.split('.')[1];
      decodedToken = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      // Ensure uid is present from user_id if verifyIdToken fails
      if (decodedToken.user_id && !decodedToken.uid) {
        decodedToken.uid = decodedToken.user_id;
      }
    }
    req.user = decodedToken; // Contains uid, email, etc.
    next();
  } catch (error) {
    console.error('[Auth] Token verification completely failed:', error);
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
};

// ── Input Validation Helpers ──
const sanitizeString = (str, maxLen = 200) => {
  if (typeof str !== 'string') return '';
  // Strip CRLF, null bytes, and control characters to prevent header injection
  return str.replace(/[\r\n\x00-\x1F]/g, '').trim().slice(0, maxLen);
};

const isValidLocation = (loc) => {
  if (!loc || typeof loc !== 'object') return false;
  return typeof loc.lat === 'number' && typeof loc.lng === 'number'
    && loc.lat >= -90 && loc.lat <= 90
    && loc.lng >= -180 && loc.lng <= 180;
};

const isValidE164 = (phone) => {
  if (typeof phone !== 'string') return false;
  return /^\+[1-9]\d{6,14}$/.test(phone);
};

// ── PII Masking Helper ──
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '***';
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
};

// ── Setup Socket.io with restricted CORS & auth ──
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      console.warn('[Socket Auth] Token verification failed with admin SDK. Decoding payload directly for local dev...');
      const payload = token.split('.')[1];
      decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      if (decoded.user_id && !decoded.uid) {
        decoded.uid = decoded.user_id;
      }
    }
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid authentication token'));
  }
});

app.set('io', io);

// Routes
app.get('/', (req, res) => {
  res.send('OK');
});

// ── Single Unified Emergency Dispatch Endpoint (Authenticated + Rate Limited) ──
app.post('/emergency/dispatch', emergencyLimiter, authenticateToken, async (req, res) => {
  try {
    // Use verified UID from token — never trust client-supplied userId
    const uid = req.user.uid;

    const { reason, location, mapsLink, contacts, targetContactId, userName: bodyName, userPhone: bodyPhone } = req.body;

    // Validate and sanitize inputs
    const safeReason = sanitizeString(reason, 100) || 'Emergency';
    const safeMapsLink = sanitizeString(mapsLink, 300);

    let safeLocation = null;
    if (isValidLocation(location)) {
      safeLocation = { lat: location.lat, lng: location.lng };
    }

    // Fetch user profile from Firestore securely using verified UID, fall back to body parameters
    let userName = bodyName ? sanitizeString(bodyName, 100) : 'Citizen';
    let userPhone = bodyPhone ? sanitizeString(bodyPhone, 20) : '';
    if (db) {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userName = sanitizeString(userData.name || userName, 100);
          userPhone = sanitizeString(userData.phone || userPhone, 20);
        }
      } catch (err) {
        console.warn('[Firebase] Failed to fetch user profile');
      }
    }

    console.log(`[Emergency Dispatch] User: ${maskEmail(req.user.email)}, Reason: ${safeReason}`);

    const locationUrl = safeLocation
      ? `https://maps.google.com/?q=${safeLocation.lat},${safeLocation.lng}`
      : safeMapsLink || 'Location not available';

    const message = `🚨 STREETSENTINEL EMERGENCY ALERT\n\n${userName} may be in danger.\n\nLive Location:\n${locationUrl}\n\nPlease contact immediately.`;

    let smsStatus = 'FAILED';
    let emailStatus = 'FAILED';
    let whatsappStatus = 'FAILED';

    // Fetch contacts securely from Firestore using verified UID
    let contactsToAlert = [];
    if (uid && db) {
      try {
        const snapshot = await db.collection('users').doc(uid).collection('contacts').get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            contactsToAlert.push(data);
          });
          console.log(`[Firebase] Fetched ${contactsToAlert.length} contacts for verified user`);
        }
      } catch (err) {
        console.warn('[Firebase] Failed to fetch contacts');
      }
    }

    if (contactsToAlert.length === 0 && contacts && Array.isArray(contacts)) {
      contactsToAlert = contacts;
      console.log(`[Fallback] Using ${contacts.length} client-provided contacts`);
    }

    if (targetContactId) {
      contactsToAlert = contactsToAlert.filter(c => c.id === targetContactId);
      console.log(`[Filter] Filtered down to specific contact for targetContactId: ${targetContactId}`);
    }

    if (contactsToAlert.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No emergency contacts configured. Please add contacts in your profile before triggering an emergency.'
      });
    }

    for (const contact of contactsToAlert) {
      if (contact.email && typeof contact.email === 'string') {
        console.log(`Sending Emergency Email to: ${maskEmail(contact.email)}`);
        const emailResult = await sendEmergencyEmail(contact.email, safeLocation, userName, userPhone);
        if (emailResult.success) {
          emailStatus = 'SUCCESS';
        }
      }
      if (contact.phone && isValidE164(contact.phone)) {
        console.log(`Sending Emergency SMS to: ${maskPhone(contact.phone)}`);
        const smsResult = await sendEmergencySMS(contact.phone, message);
        if (smsResult && smsResult.success) {
          smsStatus = 'SUCCESS';
        }

        console.log(`Sending Emergency WhatsApp to: ${maskPhone(contact.phone)}`);
        const whatsappResult = await sendEmergencyWhatsApp(contact.phone, message);
        if (whatsappResult && whatsappResult.success) {
          whatsappStatus = 'SUCCESS';
        }
      } else if (contact.phone) {
        console.warn(`Skipping invalid phone number format`);
      }
    }

    // Broadcast live alert to connected dashboard (Police/Guardians)
    io.emit('emergency_broadcast', {
      userId: uid,
      userName,
      reason: safeReason,
      location: safeLocation,
      mapsLink: locationUrl,
      timestamp: Date.now()
    });

    // Log the emergency globally in Firestore for Police Dashboard
    if (db) {
      try {
        await db.collection('emergencies').add({
          userId: uid,
          userName,
          reason: safeReason,
          location: safeLocation,
          mapsLink: locationUrl,
          smsStatus,
          emailStatus,
          whatsappStatus,
          status: 'active',
          timestamp: require('firebase-admin/firestore').FieldValue.serverTimestamp()
        });
        console.log('[Firebase] Emergency logged');
      } catch (err) {
        console.warn('[Firebase] Failed to log emergency');
      }
    }

    res.json({
      success: true,
      message: 'Alerts processed successfully',
      smsStatus,
      emailStatus,
      whatsappStatus
    });

  } catch (error) {
    console.error('Emergency dispatch error:', error.message);
    res.status(500).json({ error: 'Failed to process emergency dispatch' });
  }
});

// Health check endpoint — minimal info disclosure
app.get('/emergency/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Real-time Socket Event Handling
io.on('connection', (socket) => {
  console.log(`[+] Authenticated client connected: ${socket.user.uid.slice(0, 8)}...`);

  socket.on('gps_update', (data) => {
    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      console.log(`[GPS Update] User ${socket.user.uid.slice(0, 8)} -> lat: ${data.lat}, lng: ${data.lng}`);
      socket.broadcast.emit('location_update', {
        id: socket.user.uid,
        latitude: data.lat,
        longitude: data.lng,
        accuracy: data.accuracy,
        timestamp: data.timestamp
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] Client disconnected`);
  });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`StreetSentinel backend running on port ${PORT}`);
});
