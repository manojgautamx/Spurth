import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ActivityScreen from '../screens/ActivityScreen';

import HomeIcon from '../assets/icons/HomeIcon';
import ExploreIcon from '../assets/icons/ExploreIcon';
import ActivityIcon from '../assets/icons/ActivityIcon';
import NotificationIcon from '../assets/icons/NotificationIcon';
import ChatIcon from '../assets/icons/ChatIcon';

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Notification" component={NotificationScreen} />
      <Tab.Screen name="Chat" component={ChatListScreen} />
    </Tab.Navigator>
  );
};

export default BottomTabs;