import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '../firebase/firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import axiosInstance from '../utils/axiosInstance';
import { getSportImage } from '../utils/getSportImage';
import { Fonts } from '../theme/fonts';
import { BASE_URL } from '../config';

const STORAGE_KEY = 'chat_last_read';

const getCoverSource = (item) => {
  if (item.cover_image) {
    const uri = item.cover_image.startsWith('http')
      ? item.cover_image
      : `${BASE_URL}${item.cover_image}`;
    return { uri };
  }
  return { uri: getSportImage(item.sport) };
};

const FILTERS = ['All', 'Unread', 'Read'];

export default function ChatListScreen() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [lastRead, setLastRead] = useState({});
  const navigation = useNavigation();
  const unsubscribersRef = useRef([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => raw ? setLastRead(JSON.parse(raw)) : null)
      .catch(() => {});
  }, []);

  const markAsRead = async (leagueId, lastMsgTimestamp) => {
    if (!lastMsgTimestamp) return;
    const ms = lastMsgTimestamp.toDate
      ? lastMsgTimestamp.toDate().getTime()
      : new Date(lastMsgTimestamp).getTime();
    const updated = { ...lastRead, [leagueId]: ms };
    setLastRead(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const isUnread = (league) => {
    const last = league.lastMessage;
    if (!last?.timestamp) return false;
    const lastReadMs = lastRead[league.id] || 0;
    const msgMs = last.timestamp.toDate
      ? last.timestamp.toDate().getTime()
      : new Date(last.timestamp).getTime();
    return msgMs > lastReadMs;
  };

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const [createdRes, joinedRes] = await Promise.all([
          axiosInstance.get('my-leagues/'),
          axiosInstance.get('joined-leagues/'),
        ]);

        const created = createdRes.data || [];
        const joined = joinedRes.data || [];
        const merged = [
          ...created,
          ...joined.filter(j => !created.some(c => c.id === j.id)),
        ];

        setLeagues(merged);

        unsubscribersRef.current.forEach(u => u && u());
        unsubscribersRef.current = [];

        unsubscribersRef.current = merged.map(league => {
          const lastMessageQuery = query(
            collection(db, 'leagues', `league_${league.id}`, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          return onSnapshot(lastMessageQuery, snapshot => {
            if (!snapshot.empty) {
              const msg = snapshot.docs[0].data();
              setLeagues(prev =>
                prev.map(l =>
                  l.id === league.id ? { ...l, lastMessage: msg } : l
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

    fetchLeagues();
    return () => { unsubscribersRef.current.forEach(u => u && u()); };
  }, []);

  const getFilteredLeagues = () => {
    const sorted = [...leagues].sort((a, b) => {
      const tsA = a.lastMessage?.timestamp?.toDate?.()?.getTime?.() || 0;
      const tsB = b.lastMessage?.timestamp?.toDate?.()?.getTime?.() || 0;
      return tsB - tsA;
    });
    if (activeFilter === 'Unread') return sorted.filter(isUnread);
    if (activeFilter === 'Read') return sorted.filter(l => !isUnread(l));
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

    return (
      <TouchableOpacity
        style={styles.chatCard}
        activeOpacity={0.8}
        onPress={() => {
          markAsRead(item.id, last?.timestamp);
          navigation.navigate('LeagueChatScreen', {
            leagueId: item.id,
            leagueName: item.name,
          });
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2CB9B0" />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      <Text style={styles.header}>Chats</Text>

      <View style={styles.filterRow}>
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

      <FlatList
        data={getFilteredLeagues()}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {activeFilter === 'Unread'
              ? 'No unread messages'
              : activeFilter === 'Read'
              ? 'No read chats'
              : 'No leagues yet. Join or create one!'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F', paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F0F' },
  header: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.semibold,
    marginTop: (StatusBar.currentHeight || 44) + 8,
    marginBottom: 16,
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
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