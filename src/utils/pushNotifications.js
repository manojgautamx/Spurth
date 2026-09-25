import { Platform, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import axiosInstance from './axiosInstance';

// Web has no working push path yet (see src/shims/push.web.js — it needs a
// VAPID key nobody has generated), so every function here is a no-op on
// web rather than calling into a shim that would just resolve to nothing
// anyway. Only Android is real right now; iOS is parked with the rest of
// iOS work.
const SUPPORTED = Platform.OS === 'android';

let unsubscribeForeground = null;
let unsubscribeTokenRefresh = null;

// Best-effort everywhere in this file: a push-registration failure must
// never block login, and unregistering must never block logout. Losing
// push for a session is a much smaller problem than losing the ability to
// sign in or out because a notification token call threw.

export async function registerForPushNotifications() {
  if (!SUPPORTED) return;
  try {
    const authStatus = await messaging().requestPermission();
    const granted =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!granted) return;

    const token = await messaging().getToken();
    if (token) {
      await axiosInstance.post('push-token/', { token, platform: Platform.OS });
    }

    // FCM can rotate the token under us (reinstall, restored backup, cleared
    // app data) — without re-registering on refresh, the backend keeps
    // pushing to a token that's gone and the account silently stops
    // receiving notifications until the next cold start happens to get a
    // fresh one some other way.
    unsubscribeTokenRefresh?.();
    unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      try {
        await axiosInstance.post('push-token/', { token: newToken, platform: Platform.OS });
      } catch (e) {
        // Registration is retried on the next app open regardless.
      }
    });

    // A push delivered while the app is open never becomes a system
    // notification on its own — FCM only auto-displays one when the app is
    // backgrounded or killed. Without this, a foreground push would arrive
    // and simply do nothing visible. Routes through the app's own alert
    // modal (Alert.alert is monkey-patched in App.js) rather than
    // introducing a second notification UI.
    unsubscribeForeground?.();
    unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage?.notification?.title;
      const body = remoteMessage?.notification?.body;
      if (title || body) {
        Alert.alert(title || 'Spurth', body || '');
      }
    });
  } catch (e) {
    // No permission, no Play Services, or a flaky first call — the rest of
    // the app works the same either way.
  }
}

export async function unregisterPushNotifications() {
  if (!SUPPORTED) return;
  try {
    const token = await messaging().getToken();
    if (token) {
      await axiosInstance.post('push-token/unregister/', { token });
    }
  } catch (e) {
    // Logging out must succeed whether or not this call does.
  } finally {
    unsubscribeForeground?.();
    unsubscribeForeground = null;
    unsubscribeTokenRefresh?.();
    unsubscribeTokenRefresh = null;
  }
}
