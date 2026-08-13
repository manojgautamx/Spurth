import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISTANCE_KEY = 'user_distance_km';
const DEFAULT_DISTANCE = 10;

const DistanceContext = createContext({
  distanceKm: DEFAULT_DISTANCE,
  setDistanceKm: () => {},
});

export const DistanceProvider = ({ children }) => {
  const [distanceKm, setDistanceKmState] = useState(DEFAULT_DISTANCE);

  // Load persisted value on mount
  useEffect(() => {
    AsyncStorage.getItem(DISTANCE_KEY)
      .then(val => {
        if (val !== null) setDistanceKmState(Number(val));
      })
      .catch(() => {});
  }, []);

  const setDistanceKm = async (value) => {
    setDistanceKmState(value);
    await AsyncStorage.setItem(DISTANCE_KEY, String(value));
  };

  return (
    <DistanceContext.Provider value={{ distanceKm, setDistanceKm }}>
      {children}
    </DistanceContext.Provider>
  );
};

export const useDistance = () => useContext(DistanceContext);