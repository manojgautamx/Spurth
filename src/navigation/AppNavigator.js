import React, { useContext, useEffect, useState, createContext, useRef } from 'react';
import { ActivityIndicator, View, Alert, Linking, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';

import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ChatScreen from '../screens/ChatListScreen';
import CreateActivityScreen from '../screens/CreateActivityScreen';
import PhoneVerificationScreen from '../screens/PhoneVerificationScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import MapPickerScreen from '../screens/MapPickerScreen';
import ActivityViewerScreen from '../screens/ActivityViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileViewScreen from '../screens/ProfileViewScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import ActivityChatScreen from '../screens/ActivityChatScreen';
import ParticipantsListScreen from '../screens/ParticipantsListScreen';
import ExperienceScreen from '../screens/ExperienceScreen';
import CommentsScreen from '../screens/CommentScreen';
import ExploreMapScreen from '../screens/ExploreMapScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LandingScreen from '../screens/LandingScreen';
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

// ── Deep link parser (verify-email only) ────────────────────────────────────
// Profile/event/post links are now handled entirely by NavigationContainer's
// own `linking` config (App.js) — ActivityViewerScreen/ProfileView/Comments
// are always-registered screens (see the Stack.Navigator below), reachable
// regardless of auth state, so there's nothing left to hand-roll for those.
// verify-email isn't a navigation target (it just posts a token and shows an
// alert), so it stays as its own small listener here.
//
// Supported URL (both schemes): spurth://verify-email?token=xxx
const parseDeepLink = (url) => {
  if (!url) return null;
  const path = url
    .replace(/^spurth:\/\//, '')
    .replace(/^https?:\/\/[^/]+\//, '');

  if (path.startsWith('verify-email')) {
    // Keep the original URL so existing verification logic can parse the token
    return { type: 'verify-email', url };
  }

  return null;
};

/* ───────────────── TAB NAVIGATOR ───────────────── */

// Sidebar + center column + right rail, capped and centered as one block on
// wide viewports — matches HomeScreen's own center(680)+rail(360) cap so the
// sidebar aligns with where that content actually ends up.
const WEB_CONTENT_MAX_WIDTH = SIDEBAR_WIDTH + 680 + 360;

function MainTabNavigator() {
  const isWideWeb = useIsWideWeb();

  const tabs = (
    <View style={{ flex: 1, overflow: 'hidden' }}>
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
                case 'Experience':   return <ActivityIcon color={color} />;
                case 'Notification': return <NotificationIcon color={color} />;
                case 'Chat':         return <ChatIcon color={color} />;
              }
            },
          })}
        >
          <Tab.Screen name="Home"         component={HomeScreen} options={{ title: 'Home' }} />
          <Tab.Screen name="Explore"      component={ExploreScreen} options={{ title: 'Explore' }} />
          <Tab.Screen name="Experience"   component={ExperienceScreen} options={{ tabBarLabel: 'Experiences', title: 'Experiences' }} />
          <Tab.Screen name="Notification" component={NotificationScreen} options={{ title: 'Notifications' }} />
          <Tab.Screen name="Chat"         component={ChatScreen} options={{ title: 'Messages' }} />
        </Tab.Navigator>
    </View>
  );

  if (!isWideWeb) return tabs;

  // Wide web: sidebar + tab content form one block, capped and centered as a
  // unit — matches X's layout instead of pinning the sidebar to the true
  // viewport edge and leaving an uneven gap on one side.
  return (
    // Matches HomeScreen's own background (#0F0F0F) so the outer margins,
    // sidebar, and page content don't read as three different dark shades.
    // overflow:'hidden' on both rows keeps the sidebar pinned to the
    // viewport — without it, a tab screen taller than the available height
    // bubbles up and makes the whole page scroll instead of just that
    // screen's own inner ScrollView.
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', backgroundColor: '#0F0F0F', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', width: '100%', maxWidth: WEB_CONTENT_MAX_WIDTH, overflow: 'hidden' }}>
        <WebSidebar />
        {tabs}
      </View>
    </View>
  );
}

/* ───────────────── ROOT NAVIGATOR ───────────────── */

export default function AppNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);
  const [profileComplete, setProfileComplete] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // ── Email verification deep link ─────────────────────────────────────────
  // Not a navigation target — just posts the token and shows a result alert.
  // Profile/event/post links are handled by NavigationContainer's own
  // `linking` config (App.js) instead of here.
  const handleUrl = async ({ url }) => {
    const parsed = parseDeepLink(url);
    if (parsed?.type !== 'verify-email') return;

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
  };

  // ── Listen for links while the app is open + handle cold-start link ───────
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL().then(url => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, []);

  // ── Profile status check — also carries host-verification status
  // (phone_verified) from the same response, so screens that need to gate
  // on it (CreateActivityScreen) can read it via ProfileStatusContext
  // without a separate network round-trip. ─────────────────────────────────
  const checkProfileStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const cached = await AsyncStorage.getItem('profileComplete');
      if (cached !== null) setProfileComplete(cached === 'true');
      const cachedPhone = await AsyncStorage.getItem('phoneVerified');
      if (cachedPhone !== null) setPhoneVerified(cachedPhone === 'true');

      const response = await axios.get(
        `${BASE_URL}/api/profile/status/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const isComplete = response.data.profile_complete;
      setProfileComplete(isComplete);
      await AsyncStorage.setItem('profileComplete', String(isComplete));

      const isPhoneVerified = !!response.data.phone_verified;
      setPhoneVerified(isPhoneVerified);
      await AsyncStorage.setItem('phoneVerified', String(isPhoneVerified));
    } catch (err) {
      console.error('Profile status error:', err.message);
      const cached = await AsyncStorage.getItem('profileComplete');
      if (cached !== null) setProfileComplete(cached === 'true');
      else setProfileComplete(false);
      const cachedPhone = await AsyncStorage.getItem('phoneVerified');
      if (cachedPhone !== null) setPhoneVerified(cachedPhone === 'true');
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

  // Governs only the "no matching deep-link path" fallback (a bare `/`, or
  // native opened with no URL) — `linking` takes precedence whenever the
  // requested URL actually matches a configured screen path. Computed
  // explicitly (not left as `undefined`) because the content screens above
  // are now the first children in JSX; without this, Stack.Navigator would
  // default to whichever of those happens to be first, which crashes on a
  // plain cold-boot (no params to render).
  const initialRouteName = userToken
    ? (profileComplete ? 'MainTabs' : 'Profile')
    : (Platform.OS === 'web' ? 'Landing' : 'Welcome');

  return (
    <ProfileStatusContext.Provider
      value={{
        refreshProfileStatus: checkProfileStatus,
        setProfileComplete,
        phoneVerified,
        refreshVerificationStatus: checkProfileStatus,
      }}
    >
      {/* cardStyle:{flex:1} — @react-navigation/stack's web Card wrapper
          otherwise shrink-wraps to its content's natural height instead of
          stretching to fill the viewport, which breaks every screen's
          internal ScrollView bounding and makes the whole page scroll
          instead of just that screen's own scrollable content. */}
      <Stack.Navigator
        screenOptions={{ headerShown: false, cardStyle: { flex: 1 } }}
        initialRouteName={initialRouteName}
      >
        {/* Always registered — deep-link targets (shared activity/profile/
            post links), reachable regardless of auth state. Each screen
            renders real content publicly and gates its own interactive
            actions (join/like/vote/comment/invite) behind a sign-in prompt. */}
        <Stack.Screen name="ActivityViewerScreen" component={ActivityViewerScreen} options={{ title: 'Activity' }} />
        <Stack.Screen name="ProfileView"          component={ProfileViewScreen} options={{ title: 'Profile' }} />
        <Stack.Screen name="Comments"              component={CommentsScreen} options={{ headerShown: false, title: 'Post' }} />

        {userToken ? (
          profileComplete ? (
            <>
              <Stack.Screen name="MainTabs"          component={MainTabNavigator} options={{ title: 'Home' }} />
              <Stack.Screen name="CreateActivity"    component={CreateActivityScreen} options={{ title: 'Create Activity' }} />
              <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} options={{ title: 'Verify Phone' }} />
              <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: 'Verify Email' }} />
              <Stack.Screen name="MapPicker"         component={MapPickerScreen} options={{ title: 'Choose Location' }} />
              <Stack.Screen name="ProfileEdit"       component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
              <Stack.Screen name="ActivityChatScreen" component={ActivityChatScreen} options={{ title: 'Chat' }} />
              <Stack.Screen name="ParticipantsList"  component={ParticipantsListScreen} options={{ headerShown: false, title: 'Participants' }} />
              <Stack.Screen name="ExploreMap"        component={ExploreMapScreen} options={{ title: 'Map' }} />
              <Stack.Screen name="Settings"          component={SettingsScreen} options={{ title: 'Settings' }} />
            </>
          ) : (
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Set Up Your Profile' }} />
          )
        ) : (
          <>
            <Stack.Screen name="Welcome"        component={WelcomeScreen} options={{ title: 'Get Started' }} />
            <Stack.Screen name="Landing"        component={LandingScreen} options={{ title: 'Jump In. Connect.' }} />
            <Stack.Screen name="Login"          component={LoginScreen} options={{ title: 'Log In' }} />
            <Stack.Screen name="Signup"         component={SignupScreen} options={{ title: 'Sign Up' }} />
            <Stack.Screen name="GoogleUsername" component={GoogleUsernameScreen} options={{ title: 'Choose a Username' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
            <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
          </>
        )}
      </Stack.Navigator>
    </ProfileStatusContext.Provider>
  );
}