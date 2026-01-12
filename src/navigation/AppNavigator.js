import React, { useContext, useEffect, useState, createContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- Context ---
import { AuthContext } from '../context/AuthContext';

// --- Screens ---
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ChatScreen from '../screens/ChatListScreen';
import CreateLeagueScreen from '../screens/CreateLeagueScreen';
import MapPickerScreen from '../screens/MapPickerScreen';
import LeagueOwnerScreen from '../screens/LeagueOwnerScreen';
import LeagueViewerScreen from '../screens/LeagueViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileViewScreen from '../screens/ProfileViewScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import LeagueChatScreen from '../screens/LeagueChatScreen';
import ParticipantsListScreen from '../screens/ParticipantsListScreen';

export const ProfileStatusContext = createContext();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ───────────────── TAB NAVIGATOR ───────────────── */

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#222222',
          height: 64,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginBottom: 6,
        },
        tabBarActiveTintColor: '#36ACA6',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarIcon: ({ color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = 'home-outline';
              break;
            case 'Explore':
              iconName = 'search-outline';
              break;
            case 'Notification':
              iconName = 'notifications-outline';
              break;
            case 'Chat':
              iconName = 'chatbubble-ellipses-outline';
              break;
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Notification" component={NotificationScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
    </Tab.Navigator>
  );
}

/* ───────────────── ROOT NAVIGATOR ───────────────── */

export default function AppNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);
  const [profileComplete, setProfileComplete] = useState(null);

  const checkProfileStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get(
        'http://10.0.2.2:8000/api/profile/status/',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfileComplete(response.data.profile_complete);
    } catch (err) {
      console.error('Profile status error:', err.message);
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
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000',
        }}
      >
        <ActivityIndicator size="large" color="#36ACA6" />
      </View>
    );
  }

  return (
    <ProfileStatusContext.Provider
      value={{ refreshProfileStatus: checkProfileStatus }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken ? (
          profileComplete ? (
            <>
              {/* Bottom Tabs */}
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />

              {/* Screens ABOVE tabs */}
              <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
              <Stack.Screen name="MapPicker" component={MapPickerScreen} />
              <Stack.Screen name="LeagueOwnerScreen" component={LeagueOwnerScreen} />
              <Stack.Screen name="LeagueViewerScreen" component={LeagueViewerScreen} />
              <Stack.Screen name="ProfileView" component={ProfileViewScreen} />
              <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
              <Stack.Screen name="LeagueChatScreen" component={LeagueChatScreen} />
              <Stack.Screen name="ParticipantsList" component={ParticipantsListScreen} options={{ headerShown: false }} />
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
