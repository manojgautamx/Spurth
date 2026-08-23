import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthLogout } from '../utils/authRef';

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
    } catch (e) {
      console.error('Failed to save tokens:', e);
    }
  };
  
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      setUserToken(null); // Clear token from state
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

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
