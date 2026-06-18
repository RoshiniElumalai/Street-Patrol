import { create } from 'zustand';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { io } from 'socket.io-client';

export const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SynthesisUtterance(text);
    // fallback if no voice synthesis needed
  }
};

// Safe voice synthesiser wrapper
const safeSpeak = (text) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis failed:", e);
    }
  }
};

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const useStore = create((set, get) => {

  // Real-time listeners storage
  let unsubContacts = null;
  let unsubAlerts = null;
  let unsubSettings = null;

  let unsubUser = null;

  // Listen to Auth State
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      
      // Setup real-time listeners for this user (subcollections)
      get().setupListeners(user.uid);
      get().initSocket(user);

      // Listen to user document in real-time to solve race conditions during Signup
      unsubUser = onSnapshot(userRef, (userSnap) => {
        if (userSnap.exists()) {
          const userData = { uid: user.uid, ...userSnap.data() };
          set({ currentUser: userData });
        } else {
          set({ currentUser: { uid: user.uid, email: user.email, name: 'Citizen', role: 'citizen' } });
        }
      }, (err) => {
        console.warn("Firestore user fetch permission denied:", err.message);
        set({ currentUser: { uid: user.uid, email: user.email, name: 'Citizen', role: 'citizen' } });
      });

    } else {
      get().disconnectSocket();
      set({ currentUser: null, contacts: [], alertHistory: [] });
      if (unsubUser) unsubUser();
      if (unsubContacts) unsubContacts();
      if (unsubAlerts) unsubAlerts();
      if (unsubSettings) unsubSettings();
    }
  });

  return {
    currentUser: null,
    contacts: [],
    alertHistory: [],
    settings: {
      mic: true,
      gps: true,
      notifications: true,
      emailAlerts: true,
      whatsappAlerts: true,
    },
    socket: null,
    isSocketConnected: false,

    initSocket: async (user) => {
      const existingSocket = get().socket;
      if (existingSocket) {
        existingSocket.disconnect();
      }

      try {
        const socketHost = backendUrl.startsWith('/') 
          ? window.location.origin 
          : backendUrl.replace(/\/api$/, '');
        const socket = io(socketHost, {
          auth: { token },
          transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
          set({ isSocketConnected: true });
        });

        socket.on('disconnect', () => {
          set({ isSocketConnected: false });
        });

        socket.on('connect_error', (err) => {
          console.warn("Socket connection error:", err.message);
          set({ isSocketConnected: false });
        });

        set({ socket });
      } catch (err) {
        console.error("Failed to initialize socket:", err);
      }
    },

    disconnectSocket: () => {
      const existingSocket = get().socket;
      if (existingSocket) {
        existingSocket.disconnect();
      }
      set({ socket: null, isSocketConnected: false });
    },

    setupListeners: (uid) => {
      // Listen for Contacts
      unsubContacts = onSnapshot(collection(db, 'users', uid, 'contacts'), (snapshot) => {
        const contactsList = [];
        snapshot.forEach((doc) => contactsList.push({ id: doc.id, ...doc.data() }));
        set({ contacts: contactsList });
      }, (err) => {
        console.warn("Failed to listen to contacts (permissions denied):", err.message);
      });

      // Listen for Alerts
      unsubAlerts = onSnapshot(collection(db, 'users', uid, 'alerts'), (snapshot) => {
        const alertsList = [];
        snapshot.forEach((doc) => alertsList.push({ id: doc.id, ...doc.data() }));
        // Sort by descending timestamp
        alertsList.sort((a, b) => b.timestamp - a.timestamp);
        set({ alertHistory: alertsList });
      }, (err) => {
        console.warn("Failed to listen to alerts (permissions denied):", err.message);
      });

      // Listen for Settings
      unsubSettings = onSnapshot(doc(db, 'users', uid, 'settings', 'default'), (docSnap) => {
        if (docSnap.exists()) {
          set({ settings: docSnap.data() });
        } else {
          // Initialize default settings
          const defaultSettings = get().settings;
          setDoc(doc(db, 'users', uid, 'settings', 'default'), defaultSettings).catch(() => { });
        }
      }, (err) => {
        console.warn("Failed to listen to settings (permissions denied):", err.message);
      });
    },

    updateSettings: async (newSettings) => {
      const uid = get().currentUser?.uid;
      if (!uid) return;
      const updated = { ...get().settings, ...newSettings };
      set({ settings: updated });
      await updateDoc(doc(db, 'users', uid, 'settings', 'default'), updated);
    },

    addContact: async (contact) => {
      const uid = get().currentUser?.uid;
      if (!uid) return;
      try {
        if (get().currentUser?.isMockUser) {
          throw new Error("Mock user mode active");
        }
        await addDoc(collection(db, 'users', uid, 'contacts'), contact);
      } catch (err) {
        console.warn("Firestore addContact failed, using local fallback:", err.message);
        const newContact = { id: 'local_' + Date.now(), ...contact };
        set({ contacts: [...get().contacts, newContact] });
      }
    },

    deleteContact: async (id) => {
      const uid = get().currentUser?.uid;
      if (!uid) return;
      try {
        if (get().currentUser?.isMockUser) {
          throw new Error("Mock user mode active");
        }
        await deleteDoc(doc(db, 'users', uid, 'contacts', id));
      } catch (err) {
        console.warn("Firestore deleteContact failed, using local fallback:", err.message);
        set({ contacts: get().contacts.filter(c => c.id !== id) });
      }
    },

    updateContact: async (id, updatedFields) => {
      const uid = get().currentUser?.uid;
      if (!uid) return;
      try {
        if (get().currentUser?.isMockUser) {
          throw new Error("Mock user mode active");
        }
        await updateDoc(doc(db, 'users', uid, 'contacts', id), updatedFields);
      } catch (err) {
        console.warn("Firestore updateContact failed, using local fallback:", err.message);
        set({
          contacts: get().contacts.map(c => c.id === id ? { ...c, ...updatedFields } : c)
        });
      }
    },

    globalRouteCoords: [],
    lastKnownLocation: null,
    gpsActive: false,
    lastGpsUpdateTime: 'N/A',
    setGpsActive: (status) => set({ gpsActive: status }),
    setLastGpsUpdateTime: (timeStr) => set({ lastGpsUpdateTime: timeStr }),

    // Auth is handled by Firebase via the onAuthStateChanged listener
    setCurrentUser: (user) => set({ currentUser: user }),
    logout: async () => {
      await auth.signOut();
      set({ currentUser: null });
    },

    // AI Threat Level System
    threatLevel: 'LOW', // LOW, MEDIUM, HIGH, CRITICAL
    aiMessage: 'Sentinel AI active. Environment stable.',
    riskScore: 0,
    audioLevel: -100,
    setAudioLevel: (db) => set({ audioLevel: db }),
    setThreatLevel: (level, message) => {
      set({ threatLevel: level, aiMessage: message });
      if (message) safeSpeak(message);
    },

    // Network State
    isOffline: !navigator.onLine,
    setOfflineStatus: (status) => set({ isOffline: status }),

    // Emergency Mode System
    isEmergencyMode: false,
    emergencyData: null,
    countdown: null,
    countdownTimer: null,
    smsDeliveryStatus: null,

    triggerEmergency: (reason, audioLabel = null, audioConfidence = null) => {
      if (get().isEmergencyMode || get().countdownTimer !== null) return;

      console.log("triggerEmergency called");

      set({
        threatLevel: 'CRITICAL',
        aiMessage: 'We detected a possible distress situation. Would you like to share your live location with your emergency contacts?',
        countdown: 15
      });
      safeSpeak('Potential Emergency Detected.');

      if ('Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification("StreetSentinel Alert", { 
          body: "Emergency detected! Click here if you are SAFE.",
          requireInteraction: true
        });
        notif.onclick = (e) => {
          e.preventDefault();
          window.focus();
          get().cancelEmergency();
          notif.close();
        };
      }

      if (navigator.vibrate) {
        navigator.vibrate([500, 250, 500]);
      }

      const timer = setInterval(() => {
        set((state) => {
          const nextCount = state.countdown - 1;
          if (nextCount <= 0) {
            clearInterval(timer);
            get().sendEmergencyAlert(reason, null, audioLabel, audioConfidence);
            return { countdown: null, countdownTimer: null };
          }
          return { countdown: nextCount };
        });
      }, 1000);

      set({ countdownTimer: timer });
    },

    sendEmergencyAlert: async (reason = "Manual SOS Override", forceLocation = null, audioLabel = null, audioConfidence = null, targetContact = null) => {
      console.log("Emergency escalation started");

      const dispatch = async (coords) => {
        const uid = get().currentUser?.uid;
        const finalCoords = coords || get().lastKnownLocation || { lat: 12.9716, lng: 77.5946 };
        const locationUrl = `https://maps.google.com/?q=${finalCoords.lat},${finalCoords.lng}`;

        const newAlert = {
          type: reason,
          timestamp: Date.now(),
          riskLevel: 'CRITICAL',
          location: finalCoords,
          smsStatus: 'PENDING',
          emailStatus: 'PENDING',
          whatsappShared: true,
          audioLabel: audioLabel || null,
          audioConfidence: audioConfidence || null,
          mapsLink: locationUrl
        };

        let alertId = null;
        if (uid) {
          try {
            // Write directly to Firestore
            const alertRef = await addDoc(collection(db, 'users', uid, 'alerts'), newAlert);
            alertId = alertRef.id;
          } catch (err) {
            console.warn("Failed to write emergency alert to Firestore:", err);
          }
        }

        set({
          countdown: null,
          countdownTimer: null,
          isEmergencyMode: true,
          emergencyData: { reason, startTime: Date.now(), assignedOfficer: null, eta: null, locationUrl },
          smsDeliveryStatus: { status: 'PENDING' },
          aiMessage: 'CRITICAL ALERT. Emergency Mode Activated. Dispatching authorities.'
        });

        safeSpeak('CRITICAL ALERT. Emergency Mode Activated. Dispatching nearest authorities immediately.');

        // Call backend to actually send Email / SMS
        try {
          // Get Firebase auth token for authenticated backend request
          const idToken = await auth.currentUser?.getIdToken();
          const res = await fetch(`${backendUrl}/emergency/dispatch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              reason,
              location: coords,
              mapsLink: locationUrl,
              contacts: targetContact ? [targetContact] : get().contacts,
              targetContactId: targetContact?.id || null,
              userName: get().currentUser?.name || 'Citizen',
              userPhone: get().currentUser?.phone || ''
            })
          });
          const data = await res.json();
          if (data.success) {
            set({ smsDeliveryStatus: { status: 'SUCCESS' } });
            // Update Firestore with final status
            if (uid && alertId) {
              const alertDocRef = doc(db, 'users', uid, 'alerts', alertId);
              await updateDoc(alertDocRef, {
                smsStatus: 'SUCCESS',
                emailStatus: 'SUCCESS'
              });
            }
          }
        } catch (e) {
          console.error("Backend dispatch failed", e);
        }

        try {
          const userName = get().currentUser?.name || 'Citizen';
          const whatsappMsg = `🚨 STREETSENTINEL ALERT\n\n${userName} may be unsafe.\n\nLive Location:\n${locationUrl}\n\nPlease contact immediately.`;
          window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
        } catch (err) {
          console.warn("Failed to open WhatsApp window (popup probably blocked):", err);
        }
      };

      if (forceLocation) {
        dispatch(forceLocation);
      } else if (navigator.geolocation) {
        try {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              dispatch({ lat: position.coords.latitude, lng: position.coords.longitude });
            },
            (err) => {
              dispatch(get().lastKnownLocation);
            },
            { timeout: 3000, enableHighAccuracy: true }
          );
        } catch (err) {
          console.warn("Geolocation query failed synchronously:", err);
          dispatch(get().lastKnownLocation);
        }
      } else {
        dispatch(get().lastKnownLocation);
      }
    },

    cancelEmergency: () => {
      const { countdownTimer } = get();
      if (countdownTimer) clearInterval(countdownTimer);

      set({
        isEmergencyMode: false,
        emergencyData: null,
        countdown: null,
        countdownTimer: null,
        smsDeliveryStatus: null,
        threatLevel: 'LOW',
        riskScore: 0,
        aiMessage: 'Emergency cancelled. System returning to normal.'
      });
      safeSpeak('Emergency cancelled. System returning to normal.');
    }
  };
});

if (typeof window !== 'undefined') {
  window.useStore = useStore;
}
