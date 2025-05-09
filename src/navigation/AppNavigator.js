import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ActivityIndicator, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

import AsyncStorage from '@react-native-async-storage/async-storage';
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateLeagueScreen from '../screens/CreateLeagueScreen';
import MapPickerScreen from '../screens/MapPickerScreen';
import LeagueDescriptionScreen from '../screens/LeagueDescriptionScreen';
import EditLeagueScreen from '../screens/EditLeagueScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E81F89" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
          <Stack.Screen name="MapPicker" component={MapPickerScreen} />
          <Stack.Screen name="LeagueDescription" component={LeagueDescriptionScreen} />
          <Stack.Screen name="EditLeague" component={EditLeagueScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
