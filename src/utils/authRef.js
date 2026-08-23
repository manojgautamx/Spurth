// Lets non-component code (axiosInstance's refresh-failure handler) trigger
// the real AuthContext logout instead of only clearing AsyncStorage — a
// bare storage clear never updates AuthContext's live userToken state, so
// AppNavigator keeps rendering the logged-in screen set and an imperative
// navigate('Login') silently fails because that screen isn't registered yet.
// Same registration pattern as navigationRef.js.
let logoutImpl = null;

export function setAuthLogout(fn) {
  logoutImpl = fn;
}

export function triggerLogout() {
  return logoutImpl?.();
}
