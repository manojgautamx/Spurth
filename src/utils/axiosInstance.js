import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { navigate } from '../navigation/navigationRef';
import { BASE_URL } from '../config';

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
        // ❌ Logout if refresh fails
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');

        Alert.alert('Session expired', 'Please log in again.');
        navigate('Login');

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;