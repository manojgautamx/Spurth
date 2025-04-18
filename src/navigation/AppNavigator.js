import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateLeagueScreen from '../screens/CreateLeagueScreen';
import MapPickerScreen from '../screens/MapPickerScreen';

const Stack = createNativeStackNavigator(); // ✅ This defines "Stack"

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
      <Stack.Screen name="MapPicker" component={MapPickerScreen} />
    </Stack.Navigator>
  );
}
