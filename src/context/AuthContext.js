import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthLogout } from '../utils/authRef';
import { registerForPushNotifications, unregisterPushNotifications } from '../utils/pushNotifications';
import { jwtDecode } from 'jwt-decode';
import { setMonitoringUser } from '../utils/monitoring';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const access = await AsyncStorage.getItem('accessToken');
        if (access) {
          setUserToken(access);
          // Covers everyone who was already signed in before this feature
          // shipped, or who just reopened the app — login() only fires on
          // a fresh sign-in, not on an existing session resuming.
          registerForPushNotifications();
        } else {
          setUserToken(null);
        }
      } catch (e) {
        console.error('Error checking login status:', e);
      } finally {
        setIsLoading(false); // ✅ important
      }
    };

    checkLoginStatus();
  }, []);

  const login = async (accessToken, refreshToken) => {
    try {
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      setUserToken(accessToken);
      registerForPushNotifications(); // fire-and-forget; never blocks login
    } catch (e) {
      console.error('Failed to save tokens:', e);
    }
  };

  const logout = async () => {
    try {
      // Tell the backend to stop pushing to this device before the token
      // that authenticates the request is gone — the unregister call
      // itself is best-effort and never blocks the rest of logout.
      await unregisterPushNotifications();
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      setUserToken(null); // Clear token from state
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // One place covers every way the session changes — fresh login, a stored
  // session resuming on launch, logout, and forced expiry — so error reports
  // always say which account they came from (id only; see monitoring.js).
  useEffect(() => {
    try {
      setMonitoringUser(userToken ? jwtDecode(userToken).user_id : null);
    } catch (e) {
      setMonitoringUser(null);
    }
  }, [userToken]);

  // Registered so axiosInstance's session-expiry handler can trigger a real
  // logout (state included), not just clear storage out from under React.
  useEffect(() => {
    setAuthLogout(logout);
    return () => setAuthLogout(null);
  }, []);

  return (
    <AuthContext.Provider value={{ userToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
