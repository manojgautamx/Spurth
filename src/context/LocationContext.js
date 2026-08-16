import React, { createContext, useState, useEffect, useContext } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
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

export const LocationProvider = ({ children }) => {
  const { userToken } = useContext(AuthContext);
  const [location, setLocation] = useState(null); // { latitude, longitude }
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const requestAndFetch = async () => {
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
          setLocationError('Permission denied');
          setLocationLoading(false);
          return;
        }
      }

      // ── Fetch GPS position ────────────────────────────────────────────
      Geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setLocationLoading(false);
        },
        (err) => {
          console.warn('Location error:', err.message);
          setLocationError(err.message);
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
      setLocationLoading(false);
    }
  };

  // Fetch location when user logs in
  useEffect(() => {
    if (userToken) {
      requestAndFetch();
    } else {
      setLocation(null);
    }
  }, [userToken]);

  return (
    <LocationContext.Provider
      value={{
        location,          // { latitude, longitude } or null
        locationLoading,
        locationError,
        refreshLocation: requestAndFetch,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};