// Left navigation sidebar shown in place of the bottom tab bar on wide web
// viewports. Talks to navigation purely through the app's global
// navigationRef, so it works as a plain sibling of <Tab.Navigator> rather
// than needing to live inside its React Navigation context.
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../../theme/fonts';
import { navigationRef } from '../../navigation/navigationRef';
import axiosInstance from '../../utils/axiosInstance';

import HomeIcon from '../../assets/icons/HomeIcon';
import ExploreIcon from '../../assets/icons/ExploreIcon';
import ActivityIcon from '../../assets/icons/ActivityIcon';
import NotificationIcon from '../../assets/icons/NotificationIcon';
import ChatIcon from '../../assets/icons/ChatIcon';

export const SIDEBAR_WIDTH = 248;

// Same icon set the mobile bottom tab bar uses (AppNavigator.js), so the
// sidebar reads as the same app rather than an approximation of it.
const NAV_ITEMS = [
  { route: 'Home',         label: 'Home',         Icon: HomeIcon },
  { route: 'Explore',      label: 'Explore',       Icon: ExploreIcon },
  { route: 'Chat',         label: 'Messages',      Icon: ChatIcon },
  { route: 'Notification', label: 'Notifications', Icon: NotificationIcon },
  { route: 'Experience',   label: 'Experiences',   Icon: ActivityIcon },
];

// Own-account group, pinned to the bottom — same visual weight for all three.
const ACCOUNT_ITEMS = [
  { route: 'ProfileView',  label: 'Profile',         icon: 'person-outline' },
  { route: 'CreateActivity', label: 'Create Activity',  icon: 'add-circle-outline' },
  { route: 'Settings',     label: 'Settings',        icon: 'settings-outline' },
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

// Route names that live inside MainTabNavigator's nested Tab.Navigator
// rather than as top-level Stack.Screens. navigationRef.navigate(name) only
// resolves these when the currently-focused route is already inside that
// nested navigator — from a top-level sibling screen (ProfileView, Settings,
// ActivityViewerScreen, ...) it silently no-ops. Routing these through
// MainTabs explicitly makes sidebar nav work from every screen.
const TAB_ROUTES = new Set(['Home', 'Explore', 'Chat', 'Notification', 'Experience']);

export default function WebSidebar() {
  const activeRouteName = useActiveRouteName();
  // ProfileView's route is username-based (profile/:username), but this
  // sidebar only ever links to the viewer's OWN profile and has no reason
  // to already know their username — fetched once so that link lands on a
  // real /profile/<username> URL instead of falling back to a bare
  // /profile (which the linking config accepts, but username is nicer).
  const [myUsername, setMyUsername] = useState(null);

  useEffect(() => {
    let active = true;
    axiosInstance.get('profile/')
      .then((res) => { if (active) setMyUsername(res.data?.username || null); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const go = (name) => {
    if (!navigationRef.isReady()) return;
    if (TAB_ROUTES.has(name)) {
      navigationRef.navigate('MainTabs', { screen: name });
    } else if (name === 'ProfileView') {
      navigationRef.navigate('ProfileView', myUsername ? { username: myUsername } : undefined);
    } else {
      navigationRef.navigate(name);
    }
  };

  return (
    <View style={styles.sidebar}>
      <Image
        source={require('../../assets/logotext.png')}
        style={styles.brandLogo}
        resizeMode="contain"
      />

      <View style={styles.navList}>
        {NAV_ITEMS.map(({ route, label, Icon }) => {
          const isActive = activeRouteName === route;
          return (
            <TouchableOpacity
              key={route}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => go(route)}
              activeOpacity={0.7}
            >
              {/* The custom SVG icon components only accept size/color, not
                  style — wrapping in a View is what actually applies the gap. */}
              <View style={styles.navIcon}>
                <Icon size={22} color={isActive ? '#fff' : '#888'} />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.accountGroup}>
        {ACCOUNT_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.accountItem, i > 0 && styles.accountItemDivider]}
            onPress={() => go(item.route)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={20} color="#ccc" style={styles.navIcon} />
            <Text style={styles.accountLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    // A normal flex item now (not pinned to the viewport edge) — it's part
    // of the same centered [sidebar + content] block as everything else, so
    // it moves with the content instead of always hugging the true left edge.
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    // Matches HomeScreen's background (#0F0F0F) so sidebar/content/outer
    // margins read as one seamless surface instead of three shades of black.
    backgroundColor: '#0F0F0F',
    borderRightWidth: 1,
    borderRightColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  brandLogo: {
    height: 26,
    // Real logotext.png dimensions (1862x489) — the previous 528/182 value
    // didn't match the actual asset, and combined with the sidebar's default
    // stretch alignment (a column flex container with no alignItems set)
    // let the logo's box balloon to the sidebar's full width, centering the
    // correctly-proportioned image inside it and visually shifting it right.
    aspectRatio: 1862 / 489,
    alignSelf: 'flex-start',
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

  // ── Account group (Profile / Create Activity / Settings) ────────────────
  accountGroup: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  accountItemDivider: {
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  accountLabel: {
    color: '#ccc',
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
});
