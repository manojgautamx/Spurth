// Crash and error reporting for the Android/iOS app. The web build has its
// own copy of this module (monitoring.web.js) built on @sentry/react
// instead — webpack resolves the .web.js file first, so this one, and the
// native-module-backed SDK it imports, never reaches the web bundle.
//
// Everything here is a no-op until SENTRY_DSN (src/config) is filled in, so
// call sites never have to check whether monitoring is on.
import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '../config';

export function initMonitoring() {
  if (!SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    // Off deliberately: with it on, events carry the user's IP address.
    // Turn it on only after deciding that belongs in the privacy policy.
    sendDefaultPii: false,
    // A launch-sized user base can afford to trace a fifth of sessions;
    // raise it if the allowance is going unused.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Debug builds report too (tagged "development" above, so they can be
    // filtered out of the production issue list) — that's what lets a
    // developer confirm the wiring works without cutting a release build.
  });
}

export function captureException(error, extra) {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}

// Only the numeric id, never a username or email — enough to ask "did this
// hit one user or many?" without putting personal data on Sentry's servers.
export function setMonitoringUser(id) {
  if (!SENTRY_DSN) return;
  Sentry.setUser(id ? { id: String(id) } : null);
}

// Wraps the root component so touches become breadcrumbs and app start /
// screen load show up as traces.
export function wrapRoot(Component) {
  return SENTRY_DSN ? Sentry.wrap(Component) : Component;
}
