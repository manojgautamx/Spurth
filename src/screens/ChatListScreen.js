import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';

import firestore from '@react-native-firebase/firestore';

import axiosInstance from '../utils/axiosInstance';
import { getSportImage } from '../utils/getSportImage';
import { Fonts } from '../theme/fonts';

export default function ChatListScreen() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    let unsubscribers = [];

    const fetchJoinedLeagues = async () => {
      try {
        const res = await axiosInstance.get('joined-leagues/');
        const leaguesData = res.data || [];

        // attach firestore listeners
        unsubscribers = leaguesData.map(league =>
          listenLatestMessage(league.id)
        );

        setLeagues(leaguesData);
      } catch (err) {
        console.log('Chat list error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJoinedLeagues();

    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, []);

  const listenLatestMessage = leagueId => {
    return firestore()
      .collection('leagues')
      .doc(`league_${leagueId}`)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const msg = snapshot.docs[0].data();

          setLeagues(prev =>
            prev.map(l =>
              l.id === leagueId
                ? { ...l, lastMessage: msg }
                : l
            )
          );
        }
      });
  };

  const renderItem = ({ item }) => {
    const last = item.lastMessage;

    return (
      <TouchableOpacity
        style={styles.chatCard}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('LeagueChatScreen', {
            leagueId: item.id,
            leagueName: item.name,
          })
        }
      >
        <Image
          source={{ uri: getSportImage(item.sport) }}
          style={styles.avatar}
        />

        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={styles.subtitle} numberOfLines={1}>
            {last
              ? `${last.senderName}: ${last.text}`
              : 'No messages yet'}
          </Text>
        </View>

        {last?.timestamp && (
          <Text style={styles.time}>
            {dayjs(last.timestamp.toDate()).format('HH:mm')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E81F89" />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <Text style={styles.header}>Chats</Text>

      <FlatList
        data={leagues}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.semibold,
    marginTop: 20,
    marginBottom: 16,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  textWrap: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
    marginBottom: 4,
  },
  subtitle: {
    color: '#bbb',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  time: {
    color: '#777',
    fontSize: 11,
    marginLeft: 6,
  },
});
