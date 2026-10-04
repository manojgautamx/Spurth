// Lets non-component code (pushNotifications.js's foreground message
// handler) trigger an immediate NotificationContext refresh instead of
// waiting for its next poll tick — a push arriving while the app is open
// should bump the navbar badge right away, not up to 30s later. Same
// registration pattern as authRef.js.
let refreshImpl = null;

export function setNotificationRefresh(fn) {
  refreshImpl = fn;
}

export function triggerNotificationRefresh() {
  return refreshImpl?.();
}
