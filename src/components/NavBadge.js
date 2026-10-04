// Small unread-count pill overlaid on a nav icon. Used by WebSidebar (not a
// Tab.Navigator, so it has no equivalent of React Navigation's built-in
// tabBarBadge — BottomTabs uses that instead and doesn't need this).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NavBadge({ count }) {
  if (!count || count <= 0) return null;
  const label = count > 9 ? '9+' : String(count);

  return (
    <View style={styles.badge}>
      <Text style={styles.text} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#FF4C4C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
