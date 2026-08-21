import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import dayjs from 'dayjs';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BASE_URL as baseURL } from '../config';

const useAxios = () => {
  const { userToken, login, logout } = useContext(AuthContext);

  const axiosInstance = axios.create({
    baseURL,
    headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
  });

  axiosInstance.interceptors.request.use(async req => {
    if (!userToken) return req;

    const user = jwtDecode(userToken);
    const isExpired = dayjs.unix(user.exp).diff(dayjs()) < 1;

    if (!isExpired) return req;

    const refreshToken = await AsyncStorage.getItem('refreshToken');

    try {
      const response = await axios.post(`${baseURL}/api/token/refresh/`, {
        refresh: refreshToken,
      });

      await AsyncStorage.setItem('accessToken', response.data.access);
      login(response.data.access, refreshToken); // update context

      req.headers.Authorization = `Bearer ${response.data.access}`;
      return req;
    } catch (error) {
      logout(); // refresh token failed or expired
      return Promise.reject(error);
    }
  });

  return axiosInstance;
};

export default useAxios;
