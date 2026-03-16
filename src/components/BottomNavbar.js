import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BottomNavbar = () => {
  // 'Home' is set as the default active tab to match the image
  const [activeTab, setActiveTab] = useState('Home');

  const tabs = [
    {
      name: 'Home',
      iconName: 'home-outline',
      label: 'Home',
    },
    {
      name: 'Explore',
      iconName: 'search-outline',
      label: 'Explore',
    },
    {
      name: 'Activity',
      iconName: 'pulse-outline',
      label: 'Activity',
    },
    {
      name: 'Notification',
      iconName: 'notifications-outline',
      label: 'Notification',
    },
    {
      name: 'Chat',
      iconName: 'chatbubble-ellipses-outline',
      label: 'Chat',
    },
  ];


  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabButton}
              onPress={() => setActiveTab(tab.name)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.iconName}
                size={26}
                // If active, use Pink. If inactive, use White.
                color={isActive ? '#5AA3FF' : '#FFFFFF'}
                style={styles.icon}
              />
              <Text style={styles.tabLabel}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Safe Area View for iPhone X+ devices to handle the bottom notch */}
      <SafeAreaView style={{ backgroundColor: '#222222' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#222222', // Dark background matching the image
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribute items evenly
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 0,
    backgroundColor: '#222222',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, 
  },
  icon: {
    marginBottom: 4, // Spacing between icon and text
  },
  tabLabel: {
    color: '#FFFFFF', // Text is always white in the image
    fontSize: 10,
    fontWeight: '400',
    fontFamily: 'System', // Use default system font
  },
});

export default BottomNavbar;