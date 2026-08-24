import 'react-native-gesture-handler'; // ✅ MUST be first line
import React from 'react';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { navigationRef } from './src/navigation/navigationRef';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LocationProvider } from './src/context/LocationContext';
import { DistanceProvider } from './src/context/DistanceContext';
import AppAlertModal from './src/components/AppAlertModal';
import { showAlert } from './src/utils/alertController';

import RNBootSplash from "react-native-bootsplash";

// Replaces the platform's native alert/confirm dialog with our own on-brand
// modal (AppAlertModal, rendered below) — applies on both web and native
// since every Alert.alert(...) call site across the app already goes
// through this single object, unmodified.
Alert.alert = (title, message, buttons) => showAlert(title, message, buttons);

// Maps shared/deep-link URLs straight to the screen + params that render
// them, on both web (browser URL) and native (spurth:// custom scheme).
// ActivityViewerScreen/ProfileView/Comments are always-registered screens
// (see AppNavigator.js) so this resolves correctly regardless of whether
// the visitor is logged in.
const linking = {
  prefixes: ['spurth://', 'https://spurth.com', 'https://www.spurth.com'],
  config: {
    screens: {
      ActivityViewerScreen: 'event/:activityId',
      // Optional — the "my own profile" nav (no route params) degrades to a
      // bare /profile instead of a broken /profile/undefined when the
      // caller doesn't have a username on hand yet.
      ProfileView: 'profile/:username?',
      Comments: 'post/:postId',
      // Landing is the "nothing more specific requested" screen for a
      // logged-out web visitor — it should live at the bare root, not its
      // own auto-derived '/Landing' path (which is what it'd otherwise get,
      // same as every other unlisted screen below).
      Landing: '',
      // React Navigation only reliably resolves a URL back into navigation
      // state — on a fresh page load/reload, not just in-app navigation —
      // for screens listed here. AppNavigator.js gates the whole
      // Stack.Navigator's mount behind an async auth-loading check, and any
      // top-level screen left OUT of this map falls back to whatever
      // `initialRouteName` resolves to once that finally mounts (Landing or
      // MainTabs), regardless of what the URL actually said. Confirmed
      // empirically: every one of these bounced to the fallback route on
      // reload before being added here — this isn't unique to one screen.
      MainTabs: {
        screens: {
          Home: 'Home',
          Explore: 'Explore',
          Experience: 'Experience',
          Notification: 'Notification',
          // Optional param so selecting a conversation in the wide-web split
          // pane (ChatListScreen) gives it a real, shareable/refreshable URL
          // instead of only living in local component state.
          Chat: 'Chat/:activityId?',
        },
      },
      // Logged-out branch (AppNavigator.js's `!userToken` screens)
      Welcome: 'Welcome',
      Login: 'Login',
      Signup: 'Signup',
      GoogleUsername: 'GoogleUsername',
      ForgotPassword: 'ForgotPassword',
      ResetPassword: 'ResetPassword',
      // Logged-in branch
      Profile: 'Profile',
      CreateActivity: 'CreateActivity',
      PhoneVerification: 'PhoneVerification',
      EmailVerification: 'EmailVerification',
      MapPicker: 'MapPicker',
      ProfileEdit: 'ProfileEdit',
      ActivityChatScreen: 'chat/:activityId',
      ParticipantsList: 'ParticipantsList',
      ExploreMap: 'ExploreMap',
      Settings: 'Settings',
    },
  },
};

export default function App() {
  useEffect(() => {
    const init = async () => {
      // load auth, profile, etc
    };

    init().finally(async () => {
      await RNBootSplash.hide({ fade: true });
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        documentTitle={{
          // Without this, React Navigation's web integration falls back to
          // the raw route name (e.g. "Landing", "ProfileView") as the
          // browser tab title. Screens set their own via
          // options={{ title: '...' }}; anything that doesn't just gets
          // the bare brand name instead of a leaked internal route name.
          formatter: (options) => options?.title ? `Spurth - ${options.title}` : 'Spurth',
        }}
      >
        <AuthProvider>
          <DistanceProvider>
            <LocationProvider>
              <AppNavigator />
            </LocationProvider>
          </DistanceProvider>
        </AuthProvider>
      </NavigationContainer>
      <AppAlertModal />
    </GestureHandlerRootView>
  );
}