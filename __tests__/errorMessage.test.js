import { getErrorMessage, isOffline } from '../src/utils/errorMessage';

// These messages are what a user actually reads when something fails, and
// the whole point of the helper is that a raw DRF payload never reaches
// them. Worth pinning down.

describe('isOffline', () => {
  it('treats a timeout as offline', () => {
    expect(isOffline({ code: 'ECONNABORTED' })).toBe(true);
  });

  it('treats a refused connection as offline', () => {
    expect(isOffline({ message: 'Network Error' })).toBe(true);
  });

  it('does not treat a server response as offline', () => {
    expect(isOffline({ response: { status: 500 } })).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('explains a lost connection rather than blaming the content', () => {
    expect(getErrorMessage({ message: 'Network Error' })).toMatch(/connection/i);
  });

  it('maps status codes to plain sentences', () => {
    expect(getErrorMessage({ response: { status: 401 } })).toMatch(/signed in/i);
    expect(getErrorMessage({ response: { status: 404 } })).toMatch(/no longer exists/i);
    expect(getErrorMessage({ response: { status: 429 } })).toMatch(/too many/i);
    expect(getErrorMessage({ response: { status: 503 } })).toMatch(/trouble/i);
  });

  it("surfaces DRF's own sentence from a field error", () => {
    const err = { response: { status: 400, data: { full_name: ['This field may not be blank.'] } } };
    expect(getErrorMessage(err)).toBe('This field may not be blank.');
  });

  it('never returns raw JSON', () => {
    const err = { response: { status: 400, data: { full_name: ['This field may not be blank.'] } } };
    expect(getErrorMessage(err)).not.toContain('{');
    expect(getErrorMessage(err)).not.toContain('[');
  });

  it('prefers detail over the generic fallback', () => {
    const err = { response: { status: 400, data: { detail: 'Verify your email address before posting.' } } };
    expect(getErrorMessage(err, 'fallback')).toBe('Verify your email address before posting.');
  });

  it('falls back when the payload carries nothing readable', () => {
    expect(getErrorMessage({ response: { status: 400, data: {} } }, 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
