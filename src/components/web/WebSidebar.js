// Left navigation sidebar shown in place of the bottom tab bar on wide web
// viewports (X/Twitter-style). Talks to navigation purely through the app's
// global navigationRef, so it works as a plain sibling of <Tab.Navigator>
// rather than needing to live inside its React Navigation context.
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../../theme/fonts';
import { navigationRef } from '../../navigation/navigationRef';

export const SIDEBAR_WIDTH = 248;

const NAV_ITEMS = [
  { route: 'Home',         label: 'Home',          icon: 'home-outline',          activeIcon: 'home' },
  { route: 'Explore',      label: 'Explore',        icon: 'compass-outline',       activeIcon: 'compass' },
  { route: 'Chat',         label: 'Messages',       icon: 'chatbubble-outline',    activeIcon: 'chatbubble' },
  { route: 'Notification', label: 'Notifications',  icon: 'notifications-outline', activeIcon: 'notifications' },
  { route: 'Activity',     label: 'Activity',       icon: 'flame-outline',         activeIcon: 'flame' },
];

function useActiveRouteName() {
  const [routeName, setRouteName] = useState(
    () => navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null
  );

  useEffect(() => {
    const unsubscribe = navigationRef.addListener('state', () => {
      setRouteName(navigationRef.getCurrentRoute()?.name);
    });
    return unsubscribe;
  }, []);

  return routeName;
}

export default function WebSidebar() {
  const activeRouteName = useActiveRouteName();

  const go = (name) => {
    if (navigationRef.isReady()) navigationRef.navigate(name);
  };

  return (
    <View style={styles.sidebar}>
      <Text style={styles.brand}>Spurth</Text>

      <View style={styles.navList}>
        {NAV_ITEMS.map(item => {
          const isActive = activeRouteName === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => go(item.route)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={24}
                color={isActive ? '#fff' : '#888'}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => go('CreateLeague')}
        activeOpacity={0.85}
      >
        <Text style={styles.createBtnText}>Create Event</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.accountBtn}
        onPress={() => go('Settings')}
        activeOpacity={0.7}
      >
        <Ionicons name="person-circle-outline" size={30} color="#fff" />
        <Text style={styles.accountLabel}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#0A0A0A',
    borderRightWidth: 1,
    borderRightColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  brand: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.extrabold,
    marginBottom: 28,
    marginLeft: 12,
  },
  navList: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 24,
  },
  navItemActive: {
    backgroundColor: '#1A1A1A',
  },
  navIcon: {
    marginRight: 16,
  },
  navLabel: {
    color: '#888',
    fontSize: 17,
    fontFamily: Fonts.medium,
  },
  navLabelActive: {
    color: '#fff',
    fontFamily: Fonts.semibold,
  },
  createBtn: {
    marginTop: 24,
    backgroundColor: '#2CB9B0',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
  accountBtn: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
    gap: 10,
  },
  accountLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
});
