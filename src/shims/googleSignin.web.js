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
// Set only by mountWebButton below — handleCredentialResponse routes a
// credential to whichever of these two is currently waiting.
let buttonCallback = null;

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

function ensureInitialized() {
  if (initialized) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleCredentialResponse,
    // Opts both the auto one-tap prompt() (below) and the rendered button
    // (mountWebButton) into FedCM explicitly — without this, Chrome logs
    // "...may stop functioning when FedCM becomes mandatory" and, on a
    // browser where FedCM already governs this silently, prompt() can
    // report itself as skipped/not-displayed with no further signal at all.
    use_fedcm_for_prompt: true,
  });
  initialized = true;
}

function handleCredentialResponse(response) {
  if (buttonCallback) {
    const cb = buttonCallback;
    buttonCallback = null;
    cb(response.credential);
    return;
  }
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
  // Not used by WelcomeScreen's own button anymore (see mountWebButton) —
  // kept for API parity with the native module. Google's auto one-tap
  // "moment" this drives can be silently suppressed for several completely
  // legitimate, undetectable-by-us reasons (recently dismissed, third-party
  // cookies/FedCM disabled in the browser, no active Google session,
  // incognito) — when that happens it reports itself as skipped/not-shown
  // and nothing else, which is exactly why "Continue with Google" could
  // previously do nothing at all with zero error.
  async signIn() {
    await loadGis();
    ensureInitialized();
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
  // Mounts Google's own real "Sign in with Google" button into `container`
  // (a plain DOM node — a react-native-web View's ref resolves to exactly
  // this) and calls `onIdToken(idToken)` once the user actually completes
  // sign-in through it. This is a real rendered button, not the auto
  // one-tap "moment" prompt() drives above — a genuine click on it isn't
  // subject to that moment's silent suppression, which is the whole reason
  // it exists: WelcomeScreen positions this invisibly over its own
  // custom-styled pill, so what the user sees is unchanged but the actual
  // click lands on Google's real button underneath.
  mountWebButton(container, onIdToken) {
    if (!container) return;
    loadGis()
      .then(() => {
        ensureInitialized();
        buttonCallback = onIdToken;
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          width: Math.max(1, Math.round(container.getBoundingClientRect().width) || 320),
          use_fedcm_for_button: true,
        });
      })
      .catch((err) => console.warn('Google Sign-In button failed to load:', err.message));
  },
};

export default GoogleSignin;
