import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '../firebase/firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import axiosInstance from '../utils/axiosInstance';
import { getActivityTypeImage } from '../utils/getActivityTypeImage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';
import { BASE_URL } from '../config';
import { useIsWideWeb } from '../utils/responsive';
import ChatConversationPanel from '../components/ChatConversationPanel';
import ChatListSkeleton from '../components/skeletons/ChatListSkeleton';

const STORAGE_KEY = 'chat_last_read';

const getCoverSource = (item) => {
  if (item.cover_image) {
    const uri = item.cover_image.startsWith('http')
      ? item.cover_image
      : `${BASE_URL}${item.cover_image}`;
    return { uri };
  }
  return { uri: getActivityTypeImage(item.activity_type) };
};

const FILTERS = ['All', 'Unread', 'Read'];

export default function ChatListScreen() {
  const isWideWeb = useIsWideWeb();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [lastRead, setLastRead] = useState({});
  // Wide web only — selecting a chat opens it in the adjoining panel
  // instead of navigating to a separate screen (see renderItem below).
  const [selectedActivity, setSelectedActivity] = useState(null);
  const navigation = useNavigation();
  const unsubscribersRef = useRef([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => raw ? setLastRead(JSON.parse(raw)) : null)
      .catch(() => {});
  }, []);

  const markAsRead = async (activityId, lastMsgTimestamp) => {
    if (!lastMsgTimestamp) return;
    const ms = lastMsgTimestamp.toDate
      ? lastMsgTimestamp.toDate().getTime()
      : new Date(lastMsgTimestamp).getTime();
    const updated = { ...lastRead, [activityId]: ms };
    setLastRead(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const isUnread = (activity) => {
    const last = activity.lastMessage;
    if (!last?.timestamp) return false;
    const lastReadMs = lastRead[activity.id] || 0;
    const msgMs = last.timestamp.toDate
      ? last.timestamp.toDate().getTime()
      : new Date(last.timestamp).getTime();
    return msgMs > lastReadMs;
  };

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const [createdRes, joinedRes] = await Promise.all([
          axiosInstance.get('my-activities/'),
          axiosInstance.get('joined-activities/'),
        ]);

        const created = createdRes.data || [];
        const joined = joinedRes.data || [];
        const merged = [
          ...created,
          ...joined.filter(j => !created.some(c => c.id === j.id)),
        ];

        setActivities(merged);

        unsubscribersRef.current.forEach(u => u && u());
        unsubscribersRef.current = [];

        // Firestore chat threads were created under a 'leagues'/'league_<id>'
        // path before this rename — kept as-is so existing chat history
        // isn't orphaned under a path no longer written to.
        unsubscribersRef.current = merged.map(activity => {
          const lastMessageQuery = query(
            collection(db, 'leagues', `league_${activity.id}`, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          return onSnapshot(lastMessageQuery, snapshot => {
            if (!snapshot.empty) {
              const msg = snapshot.docs[0].data();
              setActivities(prev =>
                prev.map(a =>
                  a.id === activity.id ? { ...a, lastMessage: msg } : a
                )
              );
            }
          });
        });
      } catch (err) {
        console.log('Chat list error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
    return () => { unsubscribersRef.current.forEach(u => u && u()); };
  }, []);

  const getFilteredActivities = () => {
    const sorted = [...activities].sort((a, b) => {
      const tsA = a.lastMessage?.timestamp?.toDate?.()?.getTime?.() || 0;
      const tsB = b.lastMessage?.timestamp?.toDate?.()?.getTime?.() || 0;
      return tsB - tsA;
    });
    if (activeFilter === 'Unread') return sorted.filter(isUnread);
    if (activeFilter === 'Read') return sorted.filter(a => !isUnread(a));
    return sorted;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) return dayjs(date).format('HH:mm');
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return dayjs(date).format('DD/MM/YY');
    } catch { return ''; }
  };

  const renderItem = ({ item }) => {
    const last = item.lastMessage;
    const unread = isUnread(item);
    const isSelected = isWideWeb && selectedActivity?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.chatCard, isSelected && styles.chatCardSelected]}
        activeOpacity={0.8}
        onPress={() => {
          markAsRead(item.id, last?.timestamp);
          if (isWideWeb) {
            setSelectedActivity(item);
          } else {
            navigation.navigate('ActivityChatScreen', {
              activityId: item.id,
              activityName: item.name,
            });
          }
        }}
      >
        <View style={styles.avatarWrap}>
          <Image source={getCoverSource(item)} style={styles.avatar} />
          {unread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.time, unread && styles.timeUnread]}>
              {formatTime(last?.timestamp)}
            </Text>
          </View>
          <View style={styles.subtitleRow}>
            <Text style={[styles.subtitle, unread && styles.subtitleUnread]} numberOfLines={1}>
              {last ? `${last.senderName}: ${last.text}` : 'No messages yet'}
            </Text>
            {unread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>NEW</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
        <ChatListSkeleton />
      </View>
    );
  }

  const filterRow = (
    <View style={[styles.filterRow, isWideWeb && styles.filterRowWeb]}>
      {FILTERS.map(f => (
        <TouchableOpacity
          key={f}
          style={[styles.pill, activeFilter === f && styles.pillActive]}
          onPress={() => setActiveFilter(f)}
          activeOpacity={0.75}
        >
          <Text style={[styles.pillText, activeFilter === f && styles.pillTextActive]}>
            {f}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const list = (
    <FlatList
      style={isWideWeb ? styles.webListFlex : undefined}
      data={getFilteredActivities()}
      keyExtractor={item => item.id.toString()}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={isWideWeb ? { paddingBottom: 40, paddingHorizontal: 20 } : { paddingBottom: 120 }}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {activeFilter === 'Unread'
            ? 'No unread messages'
            : activeFilter === 'Read'
            ? 'No read chats'
            : 'No activities yet. Join or create one!'}
        </Text>
      }
    />
  );

  // Wide web: the same outer paddingHorizontal:20 that `safe` bakes in for
  // mobile would also squeeze the right rail and fight the row's own
  // centering, so this branch uses an unpadded outer container instead and
  // pushes the 20px inset down to just the header/filters/list.
  if (isWideWeb) {
    return (
      <View style={styles.webSafe}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
        <Text style={[styles.header, styles.headerWeb]}>Chats</Text>
        <View style={styles.webRow}>
          <View style={styles.webContent}>
            <View style={styles.webCenter}>
              {filterRow}
              {list}
            </View>
            <View style={styles.conversationPane}>
              {selectedActivity ? (
                <ChatConversationPanel
                  key={selectedActivity.id}
                  activityId={selectedActivity.id}
                  activityName={selectedActivity.name}
                  onBack={() => setSelectedActivity(null)}
                  embedded
                />
              ) : (
                <View style={styles.conversationEmpty}>
                  <Ionicons name="chatbubbles-outline" size={40} color="#333" />
                  <Text style={styles.conversationEmptyText}>
                    Select a chat to start messaging
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      <Text style={styles.header}>Chats</Text>
      {filterRow}
      {list}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F', paddingHorizontal: 20 },
  header: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.semibold,
    marginTop: (StatusBar.currentHeight || 44) + 8,
    marginBottom: 16,
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },

  /* ───────── WIDE WEB: split-pane layout — chat list (narrow, fixed) +
     conversation (wide, flexible), like a typical desktop chat client
     rather than the list+rail pattern used on Home/Explore. overflow:'hidden'
     keeps the sidebar pinned to the viewport — without it, a chat list
     taller than the available height bubbles up and makes the whole page
     scroll instead of just the list itself. webListFlex gives the FlatList
     a bounded height so it scrolls internally instead of rendering at full
     content height. */
  webSafe: { flex: 1, backgroundColor: '#0F0F0F', overflow: 'hidden' },
  headerWeb: { paddingHorizontal: 20 },
  filterRowWeb: { paddingHorizontal: 20 },
  webRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webContent: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1100,
    overflow: 'hidden',
  },
  webCenter: {
    width: 380,
    flexShrink: 0,
    overflow: 'hidden',
  },
  conversationPane: {
    flex: 1,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderLeftColor: '#1A1A1A',
  },
  conversationEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  conversationEmptyText: {
    color: '#444',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  webListFlex: {
    flex: 1,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  pillActive: { backgroundColor: '#2CB9B0', borderColor: '#2CB9B0' },
  pillText: { color: '#666', fontSize: 13, fontFamily: Fonts.medium },
  pillTextActive: { color: '#fff', fontFamily: Fonts.semibold },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chatCardSelected: {
    borderColor: '#2CB9B0',
    backgroundColor: '#1E2828',
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#2A2A2A' },
  unreadDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#2CB9B0',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  textWrap: { flex: 1, marginLeft: 14 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { color: '#aaa', fontSize: 15, fontFamily: Fonts.semibold, flex: 1, marginRight: 8 },
  titleUnread: { color: '#fff' },
  time: { color: '#444', fontSize: 11, fontFamily: Fonts.regular },
  timeUnread: { color: '#2CB9B0', fontFamily: Fonts.semibold },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subtitle: { color: '#555', fontSize: 13, fontFamily: Fonts.regular, flex: 1, marginRight: 8 },
  subtitleUnread: { color: '#bbb', fontFamily: Fonts.medium },
  unreadBadge: { backgroundColor: '#2CB9B0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontFamily: Fonts.semibold, letterSpacing: 0.5 },
  empty: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 14, fontFamily: Fonts.regular },
});