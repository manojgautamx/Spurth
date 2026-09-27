import { getDistanceKm } from '../context/LocationContext';

// Whether a post belongs in a distance-scoped feed (the Experiences rail,
// the Experience tab's "Explore" section). A post from an activity you
// created or joined is meaningfully yours regardless of where you currently
// are, so it's exempt — everything else is scoped to the viewer's chosen
// radius, same as Explore/Nearby. Missing location (no permission yet) or a
// post with no coordinates shows it rather than guessing.
export function isPostVisible(post, myActivityIds, userLocation, radiusKm) {
  if (myActivityIds.has(post.activity_id)) return true;
  if (!userLocation?.latitude || !userLocation?.longitude) return true;
  const dist = getDistanceKm(
    userLocation.latitude, userLocation.longitude,
    post.latitude, post.longitude
  );
  return dist === null || dist <= radiusKm;
}
