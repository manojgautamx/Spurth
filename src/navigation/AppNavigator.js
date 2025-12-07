import React, { useContext, useEffect, useState, createContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { AuthContext } from '../context/AuthContext';

import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateLeagueScreen from '../screens/CreateLeagueScreen';
import MapPickerScreen from '../screens/MapPickerScreen';
import LeagueOwnerScreen from '../screens/LeagueOwnerScreen';
import LeagueViewerScreen from '../screens/LeagueViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileViewScreen from '../screens/ProfileViewScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import LeagueChatScreen from '../screens/LeagueChatScreen';

export const ProfileStatusContext = createContext(); // ✅ Expose context

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);
  const [profileComplete, setProfileComplete] = useState(null);

  // ✅ This can be called from inside ProfileScreen
  const checkProfileStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get('http://10.0.2.2:8000/api/profile/status/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProfileComplete(response.data.profile_complete);
    } catch (err) {
      console.error('Failed to check profile status:', err.message);
      setProfileComplete(false);
    }
  };

  useEffect(() => {
    if (userToken) {
      checkProfileStatus();
    }
  }, [userToken]);

  if (isLoading || (userToken && profileComplete === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E81F89" />
      </View>
    );
  }

  return (
    <ProfileStatusContext.Provider value={{ refreshProfileStatus: checkProfileStatus }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken ? (
          profileComplete ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
              <Stack.Screen name="MapPicker" component={MapPickerScreen} />
              <Stack.Screen name="LeagueOwnerScreen" component={LeagueOwnerScreen} />
              <Stack.Screen name="LeagueViewerScreen" component={LeagueViewerScreen} />
              <Stack.Screen name="ProfileView" component={ProfileViewScreen} />
              <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
              <Stack.Screen name="LeagueChatScreen" component={LeagueChatScreen} />
            </>
          ) : (
            <Stack.Screen name="Profile" component={ProfileScreen} />
          )
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </ProfileStatusContext.Provider>
  );
}
