import React, { useContext, useEffect, useState, createContext, useRef } from 'react';
import { ActivityIndicator, View, Alert, Linking } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import { navigationRef } from './navigationRef'; // ← NEW

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
import ActivityScreen from '../screens/ActivityScreen';
import CommentsScreen from '../screens/CommentScreen';
import ExploreMapScreen from '../screens/ExploreMapScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import GoogleUsernameScreen from '../screens/GoogleUsernameScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { BASE_URL } from '../config';

import HomeIcon from '../assets/icons/HomeIcon';
import ExploreIcon from '../assets/icons/ExploreIcon';
import ActivityIcon from '../assets/icons/ActivityIcon';
import NotificationIcon from '../assets/icons/NotificationIcon';
import ChatIcon from '../assets/icons/ChatIcon';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import WebSidebar, { SIDEBAR_WIDTH } from '../components/web/WebSidebar';
import { useIsWideWeb } from '../utils/responsive';

export const ProfileStatusContext = createContext();

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Deep link parser ──────────────────────────────────────────────────────────
// Returns { type, ... } describing the link, or null if unrecognised.
//
// Supported URLs (both schemes):
//   spurth://verify-email?token=xxx
//   spurth://profile/42             → ProfileView    { userId: '42' }
//   spurth://event/17               → LeagueViewerScreen { leagueId: '17' }
//   https://spurth.com/profile/42   → same
//   https://spurth.com/event/17     → same
const parseDeepLink = (url) => {
  if (!url) return null;

  // Normalise to a bare path string by stripping scheme + host
  const path = url
    .replace(/^spurth:\/\//, '')
    .replace(/^https?:\/\/spurth\.com\//, '');

  if (path.startsWith('verify-email')) {
    // Keep the original URL so existing verification logic can parse the token
    return { type: 'verify-email', url };
  }

  const profileMatch = path.match(/^profile\/([^/?#]+)/);
  if (profileMatch) {
    return { type: 'profile', userId: profileMatch[1] };
  }

  const eventMatch = path.match(/^event\/([^/?#]+)/);
  if (eventMatch) {
    return { type: 'event', leagueId: eventMatch[1] };
  }

  return null;
};

// ── Navigate using the ref (safe to call before the navigator is ready) ───────
const navigate = (screen, params) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(screen, params);
  }
};

/* ───────────────── TAB NAVIGATOR ───────────────── */

function MainTabNavigator() {
  const isWideWeb = useIsWideWeb();

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {isWideWeb && <WebSidebar />}
      <View style={{ flex: 1, marginLeft: isWideWeb ? SIDEBAR_WIDTH : 0 }}>
        <Tab.Navigator
          // On wide web the sidebar replaces the tab bar entirely; on mobile
          // (and narrow web) this is left as-is so the default bottom tab
          // bar renders exactly as it always has.
          tabBar={isWideWeb ? () => null : undefined}
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
            tabBarActiveTintColor: '#8575ff',
            tabBarInactiveTintColor: '#FFFFFF',
            tabBarIcon: ({ color }) => {
              switch (route.name) {
                case 'Home':         return <HomeIcon color={color} />;
                case 'Explore':      return <ExploreIcon color={color} />;
                case 'Activity':     return <ActivityIcon color={color} />;
                case 'Notification': return <NotificationIcon color={color} />;
                case 'Chat':         return <ChatIcon color={color} />;
              }
            },
          })}
        >
          <Tab.Screen name="Home"         component={HomeScreen} />
          <Tab.Screen name="Explore"      component={ExploreScreen} />
          <Tab.Screen name="Activity"     component={ActivityScreen} />
          <Tab.Screen name="Notification" component={NotificationScreen} />
          <Tab.Screen name="Chat"         component={ChatScreen} />
        </Tab.Navigator>
      </View>
    </View>
  );
}

/* ───────────────── ROOT NAVIGATOR ───────────────── */

export default function AppNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);
  const [profileComplete, setProfileComplete] = useState(null);

  // Stores a parsed deep link that arrived before the user was logged in
  // or before their profile was complete. Consumed once the stack is ready.
  const [pendingDeepLink, setPendingDeepLink] = useState(null);

  // ── Unified deep link handler ─────────────────────────────────────────────
  const handleUrl = async ({ url }) => {
    const parsed = parseDeepLink(url);
    if (!parsed) return;

    // ── Email verification (existing logic, unchanged) ──────────────────────
    if (parsed.type === 'verify-email') {
      try {
        const token = new URL(parsed.url).searchParams.get('token');
        if (!token) return;
        await axiosInstance.post('verify-email/', { token });
        Alert.alert('Email Verified!', 'Your email has been verified successfully.');
      } catch (err) {
        Alert.alert(
          'Verification Failed',
          err.response?.data?.detail || 'Invalid or expired link.'
        );
      }
      return;
    }

    // ── Profile / event links ───────────────────────────────────────────────
    // If the user is fully authenticated and their profile is set up, navigate
    // immediately. Otherwise, park the link and navigate once they're ready.
    const canNavigate = userToken && profileComplete;

    if (parsed.type === 'profile') {
      if (canNavigate) {
        navigate('ProfileView', { userId: parsed.userId });
      } else {
        setPendingDeepLink(parsed);
      }
      return;
    }

    if (parsed.type === 'event') {
      if (canNavigate) {
        navigate('LeagueViewerScreen', { leagueId: parsed.leagueId });
      } else {
        setPendingDeepLink(parsed);
      }
    }
  };

  // ── Listen for links while the app is open + handle cold-start link ───────
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL().then(url => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [userToken, profileComplete]); // re-register when auth state changes

  // ── Consume a deferred deep link once the stack is ready ──────────────────
  // Runs whenever profileComplete flips to true (i.e. user just finished
  // onboarding or returned to an already-authenticated session).
  useEffect(() => {
    if (!userToken || !profileComplete || !pendingDeepLink) return;

    // Small delay so the authenticated stack has time to mount
    const timer = setTimeout(() => {
      if (pendingDeepLink.type === 'profile') {
        navigate('ProfileView', { userId: pendingDeepLink.userId });
      } else if (pendingDeepLink.type === 'event') {
        navigate('LeagueViewerScreen', { leagueId: pendingDeepLink.leagueId });
      }
      setPendingDeepLink(null);
    }, 300);

    return () => clearTimeout(timer);
  }, [userToken, profileComplete, pendingDeepLink]);

  // ── Profile status check (unchanged) ─────────────────────────────────────
  const checkProfileStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const cached = await AsyncStorage.getItem('profileComplete');
      if (cached !== null) setProfileComplete(cached === 'true');

      const response = await axios.get(
        `${BASE_URL}/api/profile/status/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const isComplete = response.data.profile_complete;
      setProfileComplete(isComplete);
      await AsyncStorage.setItem('profileComplete', String(isComplete));
    } catch (err) {
      console.error('Profile status error:', err.message);
      const cached = await AsyncStorage.getItem('profileComplete');
      if (cached !== null) setProfileComplete(cached === 'true');
      else setProfileComplete(false);
    }
  };

  useEffect(() => {
    if (userToken) checkProfileStatus();
  }, [userToken]);

  if (isLoading || (userToken && profileComplete === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#8575ff" />
      </View>
    );
  }

  return (
    <ProfileStatusContext.Provider
      value={{ refreshProfileStatus: checkProfileStatus, setProfileComplete }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken ? (
          profileComplete ? (
            <>
              <Stack.Screen name="MainTabs"          component={MainTabNavigator} />
              <Stack.Screen name="CreateLeague"      component={CreateLeagueScreen} />
              <Stack.Screen name="MapPicker"         component={MapPickerScreen} />
              <Stack.Screen name="LeagueOwnerScreen" component={LeagueOwnerScreen} />
              <Stack.Screen name="LeagueViewerScreen" component={LeagueViewerScreen} />
              <Stack.Screen name="ProfileView"       component={ProfileViewScreen} />
              <Stack.Screen name="ProfileEdit"       component={ProfileEditScreen} />
              <Stack.Screen name="LeagueChatScreen"  component={LeagueChatScreen} />
              <Stack.Screen name="ParticipantsList"  component={ParticipantsListScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Comments"          component={CommentsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ExploreMap"        component={ExploreMapScreen} />
              <Stack.Screen name="Settings"          component={SettingsScreen} />
            </>
          ) : (
            <Stack.Screen name="Profile" component={ProfileScreen} />
          )
        ) : (
          <>
            <Stack.Screen name="Welcome"        component={WelcomeScreen} />
            <Stack.Screen name="Login"          component={LoginScreen} />
            <Stack.Screen name="Signup"         component={SignupScreen} />
            <Stack.Screen name="GoogleUsername" component={GoogleUsernameScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </ProfileStatusContext.Provider>
  );
}