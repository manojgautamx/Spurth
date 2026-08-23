// src/config/index.js
import { Platform } from 'react-native';

// Android emulator can't reach the host machine via `localhost` — it needs the
// special 10.0.2.2 alias. Web and iOS simulator both run on the same machine
// as the backend, so `localhost` works directly for them.
const DEV_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const BASE_URL = __DEV__ ? DEV_BASE_URL : "https://api.spurth.com";

// Google Maps keys are meant to be embedded client-side (unlike a backend
// secret) — restricted instead by platform: HTTP referrer for web,
// package name + SHA-1 for Android, bundle ID for iOS, all set in Google
// Cloud Console. Native reads its own copy directly from
// AndroidManifest.xml / AppDelegate.swift; this is the one JS-side copy,
// used by the web maps shim (src/shims/maps.web.js).
export const GOOGLE_MAPS_API_KEY = 'AIzaSyA3_dtp1rNdfWEWaEfEZBPrPKtfL1ddlsk';