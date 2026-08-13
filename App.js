import 'react-native-gesture-handler'; // ✅ MUST be first line
import React from 'react';
import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { navigationRef } from './src/navigation/navigationRef';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LocationProvider } from './src/context/LocationContext';
import { DistanceProvider } from './src/context/DistanceContext';

import RNBootSplash from "react-native-bootsplash";


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
      <NavigationContainer ref={navigationRef}>
        <AuthProvider>
          <DistanceProvider>
            <LocationProvider>
              <AppNavigator />
            </LocationProvider>
          </DistanceProvider>
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}