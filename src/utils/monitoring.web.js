// Browser counterpart of monitoring.js — same exports, built on @sentry/react
// (a browser SDK, no native module). See that file for why every call is a
// no-op until SENTRY_DSN is filled in.
import * as Sentry from '@sentry/react';
import { SENTRY_DSN } from '../config';

export function initMonitoring() {
  if (!SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    // Set at build time by webpack (GITHUB_SHA on CI) so each deploy's
    // errors group under the release that shipped them.
    release: typeof __SENTRY_RELEASE__ !== 'undefined' ? __SENTRY_RELEASE__ : undefined,
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

export function captureException(error, extra) {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}

export function setMonitoringUser(id) {
  if (!SENTRY_DSN) return;
  Sentry.setUser(id ? { id: String(id) } : null);
}

// The browser SDK needs no root wrapper — its global handlers already catch
// uncaught errors and unhandled rejections.
export function wrapRoot(Component) {
  return Component;
}
