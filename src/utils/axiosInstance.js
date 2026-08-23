import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { BASE_URL } from '../config';
import { triggerLogout } from './authRef';

// 🔥 Create instance (NO default Content-Type)
const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/`,
});

// 🔐 Attach access token
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ IMPORTANT: Handle FormData correctly
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🔁 Handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // A 401 from the login/token endpoint itself means "invalid credentials",
    // not "expired session" — don't try to refresh, just let it surface.
    const isAuthEndpoint = originalRequest?.url?.includes('/token/');

    // ❗ Prevent infinite loop
    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        // 🔄 Request new access token
        const res = await axios.post(`${BASE_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = res.data.access;

        // 💾 Save new token
        await AsyncStorage.setItem('accessToken', newAccessToken);

        // 🔁 Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);

      } catch (refreshError) {
        // ❌ Logout if refresh fails — go through AuthContext's real logout
        // (updates its live userToken state) instead of just clearing
        // storage. A bare storage clear leaves AppNavigator still rendering
        // the logged-in screen set, so an imperative navigate('Login') here
        // silently fails (that screen isn't registered yet) and the user
        // gets stuck. Flipping userToken to null both swaps in the
        // logged-out screen set AND fires AppNavigator's own redirect-to
        // -Landing/Welcome effect, the same path the explicit Log Out
        // button already uses correctly.
        await triggerLogout();

        Alert.alert('Session expired', 'Please log in again.');

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;