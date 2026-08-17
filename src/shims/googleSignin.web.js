// Web fallback for @react-native-google-signin/google-signin, which has no
// real web implementation — its own web stub just logs "Web support is only
// available to sponsors" and does nothing. Backed by Google Identity
// Services (GIS) instead, using the same webClientId already passed to
// GoogleSignin.configure() for the native flows, so the backend's
// google_auth view (which verifies the ID token's audience against that
// same client ID) needs no changes.
let clientId = null;
let initialized = false;
let pendingResolve = null;
let pendingReject = null;

function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById('gsi-client-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

function handleCredentialResponse(response) {
  if (!pendingResolve) return;
  // Match the {data:{idToken}} shape the native library returns on newer
  // versions — WelcomeScreen already reads `userInfo.data?.idToken ||
  // userInfo.idToken`, so this works without touching that call site.
  pendingResolve({ data: { idToken: response.credential } });
  pendingResolve = null;
  pendingReject = null;
}

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
};

export const GoogleSignin = {
  configure({ webClientId }) {
    clientId = webClientId;
  },
  async hasPlayServices() {
    // Android-only concept — no-op on web.
    return true;
  },
  async signIn() {
    await loadGis();
    if (!initialized) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });
      initialized = true;
    }
    return new Promise((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      window.google.accounts.id.prompt((notification) => {
        const skipped = notification.isNotDisplayed?.() || notification.isSkippedMoment?.();
        if (skipped && pendingReject) {
          pendingResolve = null;
          pendingReject = null;
          const err = new Error('Google Sign-In was cancelled or not shown');
          err.code = statusCodes.SIGN_IN_CANCELLED;
          reject(err);
        }
      });
    });
  },
};

export default GoogleSignin;
