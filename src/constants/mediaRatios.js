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

// Activity covers render in landscape-leaning boxes everywhere today, so
// 9:16 (tall) is left out of the picker there — it's still a valid stored
// value (in case older data has it), just not offered as a choice.
export const COVER_MEDIA_RATIO_KEYS = ['original', '1:1', '4:5', '16:9', '4:3'];

// Nearest standard ratio to a natural width/height, comparing decimal
// ratios and picking the smallest absolute difference. 'original' is never
// auto-selected — it's a manual override only.
export function nearestRatioKey(width, height) {
  if (!width || !height) return 'original';
  const actual = width / height;
  let best = null;
  let bestDiff = Infinity;
  for (const r of MEDIA_RATIOS) {
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
