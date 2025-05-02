// utils/logout.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const logout = async (navigation) => {
  try {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    // Optional: Clear user info if stored
    // await AsyncStorage.removeItem('user');

    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  } catch (error) {
    console.error('Error during logout:', error);
  }
};
