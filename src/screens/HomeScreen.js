import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  ImageBackground,
  SafeAreaView,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import axiosInstance from '../utils/axiosInstance';
import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';
import { Fonts } from '../theme/fonts';
import { getSportIcon } from '../utils/sportIcons';
import { getSportImage } from '../utils/getSportImage';


const BASE_URL = 'http://10.0.2.2:8000';

const HomeScreen = () => {
  const [myLeagues, setMyLeagues] = useState([]);
  const [otherLeagues, setOtherLeagues] = useState([]);
  const [joinedLeagues, setJoinedLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Nearby');

  const axios = useAxios();
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);

  const fetchLeagues = async () => {
    try {
      setLoading(true);

      const [myRes, otherRes, joinedRes] = await Promise.all([
        axios.get('http://10.0.2.2:8000/api/my-leagues/'),
        axios.get('http://10.0.2.2:8000/api/public-leagues/'),
        axios.get('http://10.0.2.2:8000/api/joined-leagues/'),
      ]);

      const joinedIds = joinedRes.data.map(l => l.id);
      const filteredOther = otherRes.data.filter(
        l => !joinedIds.includes(l.id)
      );

      setMyLeagues(myRes.data);
      setJoinedLeagues(joinedRes.data);
      setOtherLeagues(filteredOther);
    } catch (e) {
      console.log('Fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchLeagues);
    return unsub;
  }, [navigation]);

  const getActiveData = () => {
    switch (activeTab) {
      case 'Nearby':
        return otherLeagues;
      case 'Going':
        return joinedLeagues;
      case 'Created by you':
        return myLeagues;
      default:
        return [];
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get('profile/');
        setProfile(res.data);
      } catch (err) {
        console.error('Navbar profile fetch error:', err);
      }
    };
    fetchProfile();
  }, []);

  const getAvatarUri = () => {
    if (!profile?.avatar) return null;
    return profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`;
  };

  const renderLeagueCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate(
          user?.username === item.created_by?.username
            ? 'LeagueOwnerScreen'
            : 'LeagueViewerScreen',
          { league: item }
        )
      }
    >
      <Image
        source={{ uri: getSportImage(item.sport) }}
        style={styles.cardImage}
      />


      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#999"
          />
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            {getSportIcon(item.sport, 16, '#ccc')}
            <Text style={styles.infoText}>{item.sport}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="location-sharp" size={16} color="#ccc" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#ccc" />
            <Text style={styles.infoText}>{item.date_time}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="people-outline" size={16} color="#ccc" />
            <Text style={styles.infoText}>{item.league_type}</Text>
          </View>
        </View>

        <View style={styles.joinedRow}>
          <View style={styles.avatarStack}>
            <View style={[styles.avatar, { backgroundColor: '#555' }]} />
            <View
              style={[
                styles.avatar,
                { backgroundColor: '#777', marginLeft: -10 },
              ]}
            />
          </View>
          <Text style={styles.joinedText}>
            1/{item.max_players} Joined
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#36ACA6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.topHeader}>
        <Text style={styles.headerText}>Home</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProfileView')}>
            {getAvatarUri() ? (
              <Image source={{ uri: getAvatarUri() }} style={styles.profileImage} />
            ) : (
              <Ionicons name="user" size={24} color="#fff" />
            )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
          }}
          style={styles.heroCard}
          imageStyle={{ borderRadius: 18 }}
        >
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Find a game. Jump in.</Text>
            <Text style={styles.heroDate}>Join casual or competitive games nearby.</Text>
            <TouchableOpacity style={styles.exploreBtn}>
              <Text style={styles.exploreText}>Explore</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* CREATE LEAGUE */}
        <TouchableOpacity
          style={styles.createCard}
          onPress={() => navigation.navigate('CreateLeague')}
        >
          <View style={styles.createLeft}>
            <MaterialCommunityIcons
              name="trophy-outline"
              size={28}
              color="#65AEE2"
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.createTitle}>Create your league</Text>
              <Text style={styles.createSubtitle}>
                Organize your own league
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>

        {/* LEAGUES TITLE */}
        <Text style={styles.leaguesTitle}>Leagues</Text>

        {/* PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
        >
          {['Nearby', 'Going', 'Past', 'Created by you'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.pill,
                activeTab === tab && styles.pillActive,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.pillText,
                  activeTab === tab && styles.pillTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FILTER */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterItem}>
            <Text style={styles.filterText}>Filter</Text>
            <Ionicons name="filter-outline" size={14} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterItem}>
            <Text style={styles.filterText}>Sort by</Text>
            <Ionicons name="chevron-down" size={14} color="#999" />
          </TouchableOpacity>
        </View>

        {/* LIST */}
        <FlatList
          data={getActiveData()}
          keyExtractor={item => item.id.toString()}
          renderItem={renderLeagueCard}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No leagues found.</Text>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F0F0F' },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },

  /* ───────── HEADER ───────── */
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  headerText: {
    fontSize: 26,
    color: '#fff',
    fontFamily: Fonts.extrabold, // Manrope-Bold
  },

  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fff',
  },

  /* ───────── HERO ───────── */
  heroCard: {
    height: 200,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    paddingBottom: 40,
    paddingTop: 60,
    paddingLeft: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  heroDate: {
    color: '#ddd',
    marginTop: 4,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  exploreBtn: {
    backgroundColor: '#31c1baff',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 18,
    alignSelf: 'flex-start',
  },
  exploreText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },

  /* ───────── CREATE LEAGUE ───────── */
  createCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createLeft: { flexDirection: 'row', alignItems: 'center' },
  createTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
  createSubtitle: {
    color: '#AAA',
    fontSize: 13,
    marginTop: 2,
    fontFamily: Fonts.regular,
  },

  /* ───────── LEAGUES TITLE ───────── */
  leaguesTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.bold,
    marginHorizontal: 20,
    marginTop: 28,
  },

  /* ───────── TABS ───────── */
  tabScroll: { paddingLeft: 20, marginTop: 16 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    marginRight: 10,
  },
  pillActive: { backgroundColor: '#36ACA6' },
  pillText: {
    color: '#999',
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  pillTextActive: {
    color: '#fff',
    fontFamily: Fonts.semibold,
  },

  /* ───────── FILTER ROW ───────── */
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
  },
  filterText: {
    color: '#999',
    fontSize: 13,
    marginRight: 6,
    fontFamily: Fonts.regular,
  },

  /* ───────── CARD ───────── */
  card: {
    backgroundColor: '#181818',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardImage: { width: '100%', height: 130 },
  cardContent: { padding: 15 },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
  },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  infoText: {
    color: '#BDBDBD',
    fontSize: 12,
    marginLeft: 6,
    fontFamily: Fonts.regular,
  },

  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  avatarStack: { flexDirection: 'row' },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#181818',
  },
  joinedText: {
    color: '#9A9A9A',
    fontSize: 12,
    marginLeft: 10,
    fontFamily: Fonts.medium,
  },

  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    fontFamily: 'Fonts.regular',
  },
});


export default HomeScreen;
