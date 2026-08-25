// Classifies an axios error from a login/signup request. Only a genuine
// rejection from the server (wrong credentials, taken username, etc.)
// should count toward the brute-force lockout counter and warn the user
// about remaining attempts — a network hiccup, a timeout, or the server
// erroring out isn't something repeating the same login/signup caused,
// and telling the user they're "N attempts from lockout" for those is
// both wrong and needlessly alarming.
export function classifyAuthError(error, fieldNames = []) {
  if (!error.response) {
    const isTimeout = error.code === 'ECONNABORTED';
    return {
      countsAsFailure: false,
      message: isTimeout
        ? 'The request timed out. Please check your connection and try again.'
        : 'Network error. Please check your internet connection and try again.',
    };
  }

  const { status, data } = error.response;

  if (status >= 500) {
    return {
      countsAsFailure: false,
      message: 'Something went wrong on our end. Please try again in a moment.',
    };
  }

  if (status === 429) {
    return {
      countsAsFailure: false,
      message: data?.detail || 'Too many requests. Please wait a moment and try again.',
    };
  }

  const fieldMessage = fieldNames.map(name => data?.[name]?.[0]).find(Boolean);
  const message = data?.detail || fieldMessage || error.message || 'Something went wrong. Please try again.';

  return { countsAsFailure: true, message };
}
