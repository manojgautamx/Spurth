const MAX_BYTES = 100 * 1024 * 1024;
const MAX_SECONDS = 60;

// Returns an error message string if the picked video asset exceeds the
// app's limits, or null if it's fine. Checked client-side before upload
// starts; the server re-checks duration as a backstop (see PostSerializer).
export function validateVideoAsset(asset) {
  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    return 'Video must be under 100MB.';
  }
  if (asset.duration && asset.duration > MAX_SECONDS) {
    return 'Video must be 60 seconds or shorter.';
  }
  return null;
}
