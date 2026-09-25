// Web fallback for @react-native-firebase/messaging.
//
// Unlike googleSignin.web.js, this ISN'T backed by a real implementation —
// browser push (via the Firebase JS SDK's `firebase/messaging` and a
// service worker) needs a VAPID key generated in Firebase console
// (Project settings -> Cloud Messaging -> Web Push certificates), which is
// a console action nobody's done yet. Rather than call getToken() with no
// key and fail confusingly, every method here resolves to "not available" —
// src/utils/pushNotifications.js checks Platform.OS === 'web' and skips
// calling into this at all, so in practice these bodies never run; they
// exist so the web bundle has something to import.
//
// To add real web push later: generate the VAPID key, swap this shim for
// one that wraps firebase/messaging's getToken/onMessage, add a
// firebase-messaging-sw.js service worker to web/, and register it.

const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

function messaging() {
  return {
    async requestPermission() {
      return AuthorizationStatus.DENIED;
    },
    async getToken() {
      return null;
    },
    async deleteToken() {},
    onTokenRefresh() {
      return () => {};
    },
    onMessage() {
      return () => {};
    },
    setBackgroundMessageHandler() {},
  };
}

messaging.AuthorizationStatus = AuthorizationStatus;

export default messaging;
