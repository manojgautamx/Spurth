import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axiosInstance from '../utils/axiosInstance';
import { Fonts } from '../theme/fonts';
import { useIsWideWeb } from '../utils/responsive';
import ActivitiesRail from '../components/web/ActivitiesRail';
import NotificationSkeleton from '../components/skeletons/NotificationSkeleton';

// ── Icon + colour per notification type ────────────────────────────────────────
const TYPE_CONFIG = {
  reschedule: { icon: 'calendar-outline',      color: '#F2994A', label: 'Rescheduled' },
  cancel:     { icon: 'close-circle-outline',  color: '#FF4C4C', label: 'Cancelled'   },
  new_event:  { icon: 'flash-outline',         color: '#2CB9B0', label: 'New Event'   },
  message:    { icon: 'chatbubble-outline',    color: '#8575ff', label: 'Message'     },
  // ── ADD ──────────────────────────────────────────────────────────────────────
  invite:     { icon: 'person-add-outline',    color: '#36ACA6', label: 'Invited'     },
  // ─────────────────────────────────────────────────────────────────────────────
};

const formatTime = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// ── Single notification row ────────────────────────────────────────────────────
const NotificationItem = ({ item, onPress, onMarkRead }) => {
  const config = TYPE_CONFIG[item.notification_type] || TYPE_CONFIG.new_event;

  return (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.itemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: config.color + '22' }]}>
        <Ionicons name={config.icon} size={22} color={config.color} />
      </View>

      {/* Content */}
      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.typeLabel}>{config.label}</Text>
          <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────────
const NotificationScreen = () => {
  const isWideWeb = useIsWideWeb();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get('notifications/');
      setNotifications(res.data.results || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.warn('Fetch notifications error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh when tab gains focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.post('notifications/read-all/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Mark all read error', err);
    }
  };

  const handlePress = async (item) => {
    // Mark as read
    if (!item.is_read) {
      try {
        await axiosInstance.post(`notifications/${item.id}/read/`);
        setNotifications(prev =>
          prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.warn('Mark read error', err);
      }
    }

    // Navigate to activity if attached
    if (item.activity_id) {
      navigation.navigate('ActivityViewerScreen', { activityId: item.activity_id });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.skeletonContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
        <NotificationSkeleton />
      </SafeAreaView>
    );
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>
      {unreadCount > 0 && (
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const list = (
    <FlatList
      style={isWideWeb ? styles.webListFlex : undefined}
      data={notifications}
      keyExtractor={item => item.id.toString()}
      renderItem={({ item }) => (
        <NotificationItem
          item={item}
          onPress={handlePress}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2CB9B0"
        />
      }
      contentContainerStyle={
        notifications.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyInner}>
          <Ionicons name="notifications-off-outline" size={54} color="#2A2A2A" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>
            You'll be notified about event changes,{'\n'}new events matching your interests,{'\n'}and messages.
          </Text>
        </View>
      }
    />
  );

  if (isWideWeb) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
        <View style={styles.webRow}>
          <View style={styles.webContent}>
            <View style={styles.webCenter}>
              {header}
              {list}
            </View>
            <ActivitiesRail />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      {header}
      {list}
    </SafeAreaView>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    overflow: 'hidden',
  },

  /* ───────── WIDE WEB: 3-column layout (matches Home/Explore/Chat) ────────
     overflow:'hidden' keeps the sidebar pinned to the viewport — without
     it, a notification list taller than the available height bubbles up
     and makes the whole page scroll instead of just the list itself.
     webListFlex gives the FlatList a bounded height so it scrolls
     internally instead of rendering at full content height. */
  webRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webContent: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 680 + 360,
    overflow: 'hidden',
  },
  webCenter: {
    flex: 1,
    maxWidth: 680,
    overflow: 'hidden',
  },
  webListFlex: {
    flex: 1,
  },

  skeletonContainer: { flex: 1, backgroundColor: '#0F0F0F' },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    color: '#fff',
    fontFamily: Fonts.bold,
  },
  badge: {
    backgroundColor: '#2CB9B0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2CB9B0',
  },
  markAllText: {
    color: '#2CB9B0',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },

  // ── Notification item ────────────────────────────────────────────────────
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  itemUnread: {
    backgroundColor: 'rgba(44,185,176,0.05)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notifTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2CB9B0',
    flexShrink: 0,
  },
  notifBody: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 19,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeLabel: {
    color: '#555',
    fontSize: 11,
    fontFamily: Fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    color: '#444',
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  separator: {
    height: 1,
    backgroundColor: '#141414',
    marginLeft: 78, // aligns with text, not icon
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
  },
  emptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    gap: 12,
  },
  emptyTitle: {
    color: '#444',
    fontSize: 17,
    fontFamily: Fonts.semibold,
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#333',
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});