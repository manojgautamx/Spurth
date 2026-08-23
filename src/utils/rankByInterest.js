import { getMainCategory } from './categoryMapper';
import { getDistanceKm } from '../context/LocationContext';

// Three-tier priority, matching what CATEGORY_GROUPS (categoryMapper.js)
// already treats as "related": an exact interest match ranks highest
// (e.g. you picked Football, this activity IS football), then anything in
// the same broad category as one of your interests (you picked Football →
// other Sports activities; you picked Hiking → other Adventure activities
// like cycling), then everything else.
const scoreByInterest = (activity, interests, interestCategories) => {
  const type = (activity.activity_type || '').toLowerCase();
  if (interests.has(type)) return 2;
  if (interestCategories.has(getMainCategory(type))) return 1;
  return 0;
};

// With several selected interests (up to 5), more than one can plausibly
// match nearby activities at the same tier — e.g. football, yoga, hiking,
// dancing, and cafe hopping are five different categories. Distance breaks
// that tie: the closest one wins, so if hiking activities happen to be
// nearer than the football ones, hiking floats to the very top. Unknown
// distance (no coords, no location permission) sorts after known ones
// rather than winning ties by default.
export function rankByInterest(activities, rawInterests, userLocation) {
  if (!rawInterests || rawInterests.length === 0) return activities;

  const interests = new Set(rawInterests.map(i => i.trim().toLowerCase()));
  const interestCategories = new Set([...interests].map(getMainCategory));

  const distanceOf = (activity) => {
    if (!userLocation?.latitude || !userLocation?.longitude) return null;
    return getDistanceKm(
      userLocation.latitude, userLocation.longitude,
      activity.latitude, activity.longitude
    );
  };

  return [...activities].sort((a, b) => {
    const scoreDiff = (
      scoreByInterest(b, interests, interestCategories) -
      scoreByInterest(a, interests, interestCategories)
    );
    if (scoreDiff !== 0) return scoreDiff;

    const distA = distanceOf(a);
    const distB = distanceOf(b);
    if (distA === null && distB === null) return 0;
    if (distA === null) return 1;
    if (distB === null) return -1;
    return distA - distB;
  });
}
