import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { AuthContext } from './AuthContext';

export const LocationContext = createContext();

// ── Haversine distance formula ──────────────────────────────────────────────
export const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Filter activities within a radius ────────────────────────────────────────
export const filterActivitiesByDistance = (activities, userLat, userLon, radiusKm = 50) => {
  if (!userLat || !userLon) return activities; // no location = show all
  return activities.filter(a => {
    const dist = getDistanceKm(userLat, userLon, a.latitude, a.longitude);
    return dist === null || dist <= radiusKm;
  });
};

// ── IP-based fallback location ───────────────────────────────────────────────
// Only ever used once real GPS has already failed (permission denied, timed
// out, or no fix available) — a plain keyless fetch to a public
// IP-geolocation API, the same "call a public geo API directly from the
// client" pattern this app already uses for Nominatim search/reverse-geocode
// in MapPickerScreen. City-level accuracy only, never used once GPS succeeds.
const fetchIpLocation = async () => {
  const res = await fetch('https://ipapi.co/json/');
  const data = await res.json();
  if (!data || !data.latitude || !data.longitude) {
    throw new Error('IP location lookup returned no coordinates');
  }
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.city || null,
  };
};

export const LocationProvider = ({ children }) => {
  const { userToken } = useContext(AuthContext);
  const [location, setLocation] = useState(null); // { latitude, longitude }
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  // 'gps' (exact, from the device) | 'ip' (approximate, city-level fallback)
  // | null (both failed — callers fall back to their own "show everything"
  // behavior, same as before this fallback existed).
  const [locationSource, setLocationSource] = useState(null);
  // City name from the IP lookup, for UI copy like "near Kathmandu" — only
  // ever set alongside locationSource === 'ip'.
  const [locationCity, setLocationCity] = useState(null);
  // True only when the OS won't let JS re-trigger its own permission prompt:
  // Android's "never ask again", or any denial at all on iOS/web (neither
  // re-shows its prompt once denied — Settings, or the browser's own
  // site-settings UI, is the only way back). Lets the UI choose between
  // "ask again" and "send them to Settings" for upgrading from
  // IP-approximate back to real GPS.
  const [permissionPermanentlyDenied, setPermissionPermanentlyDenied] = useState(false);

  // Never throws — on failure (network error, rate-limited, malformed
  // response), location simply stays null/unset, exactly as if this
  // fallback didn't exist. Wrapped in useCallback (deps: none — every
  // setter it calls is a useState setter, which React guarantees is
  // stable) so requestAndFetch below, and the useEffect that calls it, can
  // both depend on a reference that never actually changes between
  // renders — without this, satisfying exhaustive-deps on those would mean
  // re-running on every render instead of only when userToken changes.
  const fallBackToIpLocation = useCallback(async () => {
    try {
      const ipLocation = await fetchIpLocation();
      setLocation({ latitude: ipLocation.latitude, longitude: ipLocation.longitude });
      setLocationSource('ip');
      setLocationCity(ipLocation.city);
    } catch (err) {
      console.warn('IP location fallback failed:', err.message);
      setLocation(null);
      setLocationSource(null);
      setLocationCity(null);
    }
  }, []);

  const requestAndFetch = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      // ── Android permission request ────────────────────────────────────
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Spurth needs your location to show nearby events.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          // A plain one-time "deny" still lets request() re-show the native
          // dialog next time — only NEVER_ASK_AGAIN takes that away.
          setPermissionPermanentlyDenied(granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
          setLocationError('Permission denied');
          await fallBackToIpLocation();
          setLocationLoading(false);
          return;
        }
        setPermissionPermanentlyDenied(false);
      }

      // ── Fetch GPS position ────────────────────────────────────────────
      Geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setLocationSource('gps');
          setLocationCity(null);
          setLocationLoading(false);
        },
        async (err) => {
          console.warn('Location error:', err.message);
          setLocationError(err.message);
          // code 1 = PERMISSION_DENIED (W3C Geolocation codes, same on iOS
          // and web) — the one case here that means "no way to re-prompt".
          // 2 = POSITION_UNAVAILABLE and 3 = TIMEOUT are transient and can
          // still be retried via refreshLocation, so they don't flip this.
          // Android's own permission step above already set this correctly.
          if (Platform.OS !== 'android') {
            setPermissionPermanentlyDenied(err.code === 1);
          }
          await fallBackToIpLocation();
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000, // cache for 1 min
        }
      );
    } catch (err) {
      console.warn('Location permission error:', err);
      setLocationError(err.message);
      await fallBackToIpLocation();
      setLocationLoading(false);
    }
  }, [fallBackToIpLocation]);

  // Native only — react-native-web's Linking has no openSettings at all
  // (confirmed by reading its source directly), so this must never be
  // called on web; the UI shows a text tip there instead.
  const openLocationSettings = () => {
    if (Platform.OS === 'web') return;
    Linking.openSettings();
  };

  // Fetch location when user logs in
  useEffect(() => {
    if (userToken) {
      requestAndFetch();
    } else {
      setLocation(null);
      setLocationSource(null);
      setLocationCity(null);
    }
  }, [userToken, requestAndFetch]);

  return (
    <LocationContext.Provider
      value={{
        location,          // { latitude, longitude } or null
        locationLoading,
        locationError,
        locationSource,              // 'gps' | 'ip' | null
        locationCity,                // city name when locationSource === 'ip'
        permissionPermanentlyDenied,
        openLocationSettings,
        refreshLocation: requestAndFetch,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
