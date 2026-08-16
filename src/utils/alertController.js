// Minimal imperative pub-sub so any code — including non-component code
// like axiosInstance.js's session-expiry handler — can trigger the app's
// custom alert modal, the same way navigationRef.js's navigate() lets any
// code trigger navigation.
let listener = null;

export function setAlertListener(fn) {
  listener = fn;
}

export function showAlert(title, message, buttons) {
  if (listener) listener({ title, message, buttons });
}
