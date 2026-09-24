// Turns whatever a failed request threw into something worth showing a
// person. Screens were previously swallowing these into console.log and
// falling through to an empty state, so a network blip read as "nothing
// here" — or, on detail screens, as "not found".

export function isOffline(error) {
  // axios reports a dropped/refused connection with no response attached;
  // a timeout comes through as its own code.
  return !error?.response && (error?.code === 'ECONNABORTED' || error?.message === 'Network Error');
}

export function getErrorMessage(error, fallback = 'Something went wrong.') {
  if (isOffline(error)) {
    return "Can't reach Spurth right now. Check your connection and try again.";
  }

  const status = error?.response?.status;
  if (status === 401 || status === 403) {
    return 'You need to be signed in to see this.';
  }
  if (status === 404) {
    return 'This no longer exists — it may have been deleted.';
  }
  if (status === 429) {
    return 'Too many tries. Give it a minute and try again.';
  }
  if (status >= 500) {
    return 'Spurth is having trouble right now. Try again in a moment.';
  }

  // DRF puts its own message in one of a few shapes depending on how the
  // error was raised; prefer a real one over the generic fallback.
  const data = error?.response?.data;
  if (typeof data === 'string' && data.length < 200) return data;
  if (data?.detail) return data.detail;
  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return data.non_field_errors[0];
  }
  if (data && typeof data === 'object') {
    // e.g. {"full_name": ["This field may not be blank."]} — surface the
    // first real sentence rather than dumping raw JSON at the user, which
    // is what ProfileEditScreen used to do.
    const firstKey = Object.keys(data)[0];
    const firstVal = firstKey ? data[firstKey] : null;
    if (typeof firstVal === 'string') return firstVal;
    if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') return firstVal[0];
  }

  return fallback;
}
