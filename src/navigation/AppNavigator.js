import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
<<<<<<< HEAD
import JoinedScreen from '../screens/JoinedScreen';

=======
import CreateLeagueScreen from '../screens/CreateLeagueScreen';
<<<<<<< HEAD
import MapPickerScreen from '../screens/MapPickerScreen';
=======
>>>>>>> origin/main
>>>>>>> origin/kanin

const Stack = createNativeStackNavigator(); // ✅ This defines "Stack"

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
<<<<<<< HEAD
      <Stack.Screen name="Joined" component={JoinedScreen} />
=======
      <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
<<<<<<< HEAD
      <Stack.Screen name="MapPicker" component={MapPickerScreen} />
=======
>>>>>>> origin/main
>>>>>>> origin/kanin
    </Stack.Navigator>
  );
}
