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
      ProfileView: 'profile/:userId',
      Comments: 'post/:postId',
      // Landing is the "nothing more specific requested" screen for a
      // logged-out web visitor — it should live at the bare root, not its
      // own auto-derived '/Landing' path (which is what it'd otherwise get,
      // same as every other unlisted screen below).
      Landing: '',
      // React Navigation only auto-derives a working path for TOP-LEVEL
      // screens. MainTabs' children are nested inside its own
      // Tab.Navigator, so without an explicit map here, navigating in-app
      // updates the URL fine (e.g. /Chat), but *reloading* that URL can't
      // resolve which tab was active and silently falls back to the first
      // one (Home) — the exact "reload always dumps me on Home" bug.
      MainTabs: {
        screens: {
          Home: 'Home',
          Explore: 'Explore',
          Experience: 'Experience',
          Notification: 'Notification',
          Chat: 'Chat',
        },
      },
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