import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDpqB5TNe0OcVzsfFyBeMxmVy1TgdO0zvw",
  authDomain: "spurthchat.firebaseapp.com",
  databaseURL: "https://spurthchat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "spurthchat",
  storageBucket: "spurthchat.firebasestorage.app",
  messagingSenderId: "23044304139",
  appId: "1:23044304139:web:452b650a69f00bed42460e",
  measurementId: "G-SEYKRKF0NZ"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// getAuth(app) alone is fine on web (the browser's own persistence is its
// default). On native it's NOT equivalent — @firebase/auth's own React
// Native build (resolved via its package.json's top-level "react-native"
// field, which @react-native/metro-config's resolverMainFields does pick
// up) explicitly detects when getAuth() is called before initializeAuth()
// and silently falls back to in-memory-only persistence, logging its own
// "Auth state will default to memory persistence" warning (confirmed by
// reading node_modules/@firebase/auth/dist/rn/index.js directly — this
// isn't speculative). That's the real explanation for chat getting
// permanently stuck loading on Android: without a persisted, properly
// tracked auth state, sign-in/onAuthStateChanged behavior degrades in
// ways the in-app fallback timeout (ChatContext.js, ChatConversationPanel.js)
// can only paper over, not fix at the source.
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : (() => {
      try {
        return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
      } catch (e) {
        // initializeAuth throws if this module re-evaluates after the app
        // was already initialized once (Fast Refresh during development) —
        // the existing instance from the first run is still perfectly usable.
        return getAuth(app);
      }
    })();