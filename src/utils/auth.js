import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import axiosInstance from './axiosInstance';
import { BASE_URL } from '../config';

export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('accessToken');
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

export const signIntoFirebase = async () => {
  try {
    const res = await axiosInstance.get(`${BASE_URL}/api/firebase-token/`);
    await signInWithCustomToken(auth, res.data.firebase_token);
    console.log('Firebase sign-in successful');
  } catch (err) {
    console.error('Firebase sign-in failed:', err);
  }
};