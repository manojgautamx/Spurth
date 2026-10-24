import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
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

// getFirestore(app) alone defaults to Firestore's WebChannel transport,
// which streams over the Fetch API's readable-body support — real
// browsers have that; React Native's fetch polyfill doesn't, so on native
// the realtime Listen RPC just errors ("WebChannelConnection... RPC
// 'Listen' stream transport errored", confirmed in logcat on a real
// device) and every onSnapshot listener fails silently, no matter how
// correct the auth/rules side of it is — the exact "chat still doesn't
// load on Android, works fine on web" split this was causing. Forcing
// long-polling instead of the streaming transport is Firestore's own
// documented fix for non-browser JS environments; web keeps the default
// (long-polling there would just be slower for no reason).
export const db = Platform.OS === 'web'
  ? getFirestore(app)
  : (() => {
      try {
        return initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true,
          useFetchStreams: false,
        });
      } catch (e) {
        // Same Fast Refresh re-evaluation case as `auth` below.
        return getFirestore(app);
      }
    })();

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