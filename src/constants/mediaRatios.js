// Standard crop ratios offered for post/cover media.
// Keep in sync with MEDIA_RATIO_CHOICES in spurth_backend/api/models.py.
export const MEDIA_RATIOS = [
  { key: 'original', label: 'Original', value: null },
  { key: '1:1', label: '1:1', value: 1 },
  { key: '4:5', label: '4:5', value: 4 / 5 },
  { key: '9:16', label: '9:16', value: 9 / 16 },
  { key: '16:9', label: '16:9', value: 16 / 9 },
  { key: '4:3', label: '4:3', value: 4 / 3 },
];

// Nearest standard ratio to a natural width/height, comparing decimal
// ratios and picking the smallest absolute difference. 'original' is never
// auto-selected — it's a manual override only. Pass `allowedKeys` (e.g.
// PHOTO_RATIO_KEYS) to pick the nearest match among just that subset,
// rather than every MEDIA_RATIOS entry.
export function nearestRatioKey(width, height, allowedKeys) {
  if (!width || !height) return 'original';
  const actual = width / height;
  const candidates = allowedKeys
    ? MEDIA_RATIOS.filter((r) => allowedKeys.includes(r.key))
    : MEDIA_RATIOS;
  let best = null;
  let bestDiff = Infinity;
  for (const r of candidates) {
    if (r.value == null) continue;
    const diff = Math.abs(actual - r.value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }
  return best ? best.key : 'original';
}

export function ratioValue(key) {
  const r = MEDIA_RATIOS.find((r) => r.key === key);
  return r ? r.value : null;
}

// The only two ratios the Experience post composer offers for photos —
// landscape-ish shapes a normal camera photo already roughly matches.
// (1:1/4:5/9:16/original are still valid MEDIA_RATIOS, e.g. for activity
// cover images — just not offered here.)
export const PHOTO_RATIO_KEYS = ['4:3', '16:9'];

// Fixed display "stage" for every video post — never user-chosen. A
// video's own frame is always shown uncropped (resizeMode="contain")
// inside this shape, so a landscape video ends up letterboxed into a
// 16:9 area within the taller 9:16 frame instead of having its top and
// bottom cropped away to fill it.
export const VIDEO_STAGE_RATIO_KEY = '9:16';
