import React, { useEffect, useState, useContext, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import axiosInstance from '../utils/axiosInstance';
import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';
import { Fonts } from '../theme/fonts';
import LeagueCard from '../components/LeagueCard';
import { LocationContext, filterLeaguesByDistance } from '../context/LocationContext';
import { BASE_URL } from '../config';
import { useDistance } from '../context/DistanceContext';
import CreateIcon from '../assets/icons/CreateIcon';

const HomeScreen = () => {
  const [myLeagues, setMyLeagues] = useState([]);
  const [otherLeagues, setOtherLeagues] = useState([]);
  const [joinedLeagues, setJoinedLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Nearby');
  const { location } = useContext(LocationContext);

  const axios = axiosInstance;
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const { distanceKm } = useDistance();
  const [emailVerified, setEmailVerified] = useState(true); // default true to avoid flash
  const [resending, setResending] = useState(false);

  const rankByInterest = (leagues) => {
    const interests = (profile?.favorite_sports || []).map(i => i.toLowerCase());
    if (interests.length === 0) return leagues;

    return [...leagues].sort((a, b) => {
      const aMatch = interests.includes((a.sport || '').toLowerCase()) ? 1 : 0;
      const bMatch = interests.includes((b.sport || '').toLowerCase()) ? 1 : 0;
      return bMatch - aMatch; // matched ones float to top
    });
  };

  const fetchLeagues = async () => {
    try {
      setLoading(true);

      const [myRes, otherRes, joinedRes] = await Promise.all([
        axios.get(`/my-leagues/`),
        axios.get(`/public-leagues/`),
        axios.get(`/joined-leagues/`),
      ]);

      console.log('MY:', myRes.data);
      console.log('OTHER:', otherRes.data);
      console.log('JOINED:', joinedRes.data);

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

  useFocusEffect(
    useCallback(() => {
      axiosInstance.get('me/')
        .then(res => setEmailVerified(res.data.email_verified))
        .catch(() => {});
    }, [])
  );


  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchLeagues);
    return unsub;
  }, [navigation]);

  const handleResend = async () => {
    try {
      setResending(true);
      await axiosInstance.post('resend-verification/');
      Alert.alert('Email Sent', 'Check your inbox for the verification link.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not send email.');
    } finally {
      setResending(false);
    }
  };

  const isPastLeague = (l) => {
    if (l.is_concluded !== undefined) return l.is_concluded;
    return new Date(l.date_time) < new Date();
  };

  const isCancelledLeague = (l) => l.is_cancelled === true;

  const getActiveData = () => {

    // Nearby → NEVER show cancelled
    const upcomingNearby = otherLeagues.filter(
      l => !isPastLeague(l) && !isCancelledLeague(l)
    );

    // Going → joined + upcoming only (exclude cancelled)
    const upcomingJoined = joinedLeagues.filter(
      l => !isPastLeague(l) && !isCancelledLeague(l)
    );

    // Past → joined + (past OR cancelled)
    const pastJoined = joinedLeagues.filter(
      l => isPastLeague(l) || isCancelledLeague(l)
    );

    // Created by you → SHOW EVERYTHING you created
    const allCreated = myLeagues; // 🔥 no filtering

    switch (activeTab) {

      case 'Nearby':
        const nearbyFiltered = filterLeaguesByDistance(
          upcomingNearby,
          location?.latitude,
          location?.longitude,
          distanceKm
        );
        return rankByInterest(nearbyFiltered); // ← wrap with ranker
      
      case 'Going':
        return upcomingJoined;

      case 'Created by you':
        return allCreated;

      case 'Past':
        return pastJoined;

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

  const avatarUri =
    profile?.avatar &&
    (profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.topHeader}>
        <Text style={styles.headerText}>Home</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProfileView')}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person-circle-outline" size={36} color="#777" />
              )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {!emailVerified && (
          <TouchableOpacity
            style={styles.verifyBanner}
            onPress={() => navigation.navigate('EmailVerification')}
            activeOpacity={0.85}
          >
            <Ionicons name="mail-outline" size={18} color="#fff" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyBannerTitle}>Verify your email</Text>
              <Text style={styles.verifyBannerSub}>
                {resending ? 'Sending...' : 'Tap to resend verification link'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        )}
        {/* HERO */}
        <ImageBackground
          source={{
            uri: 'https://res.cloudinary.com/dppoa51hp/image/upload/v1780374905/ChatGPT_Image_Jun_2_2026_10_19_18_AM_hnh3k7.png',
          }}
          style={styles.heroCard}
          imageStyle={{ borderRadius: 18 }}
        >
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Jump in. Connect.</Text>
            <Text style={styles.heroDate}>Join or create an activity of your interest.</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Explore')}>
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
            <CreateIcon size={38} color="#c365e2" />
            <View style={{ marginLeft: 18 }}>
              <Text style={styles.createTitle}>Create an Activity</Text>
              <Text style={styles.createSubtitle}>Organize your own Activity</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>

        {/* LEAGUES TITLE */}
        <Text style={styles.leaguesTitle}>Activities</Text>

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
        {/* <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterItem}>
            <Text style={styles.filterText}>Filter</Text>
            <Ionicons name="filter-outline" size={14} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterItem}>
            <Text style={styles.filterText}>Sort by</Text>
            <Ionicons name="chevron-down" size={14} color="#999" />
          </TouchableOpacity>
        </View> */}

        {/* LIST */}
        <FlatList
          data={getActiveData()}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <LeagueCard league={item} />}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No Activities here. How about you lead the way?</Text>
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
    backgroundColor: '#6C5CE7',
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
  pillActive: { backgroundColor: '#ffffff' },
  pillText: {
    color: '#999',
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  pillTextActive: {
    color: '#000000',
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
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e69c2d',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
  },
  verifyBannerTitle: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 14,
    marginBottom: 2,
  },
  verifyBannerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
});


export default HomeScreen;