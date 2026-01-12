import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import axiosInstance from '../utils/axiosInstance';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';
import { getSportImage } from '../utils/getSportImage';

const BASE_URL = 'http://10.0.2.2:8000';

export default function ProfileViewScreen({ route }) {
  const navigation = useNavigation();
  const { logout, user } = useContext(AuthContext);

  // ✅ userId passed when clicking host
  const userId = route?.params?.userId || null;

  const isMyProfile = !userId || user?.user_id === userId;

  const [myLeagues, setMyLeagues] = useState([]);
  const [joinedLeagues, setJoinedLeagues] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const fetchProfile = async () => {
        try {
          setLoading(true);

          // ✅ PROFILE (works for self + others)
          const profileRes = await axiosInstance.get(
            isMyProfile ? 'profile/' : `profile/${userId}/`
          );

          if (!active) return;
          setProfile(profileRes.data);

          // ✅ ONLY fetch leagues for own profile
          if (isMyProfile) {
            const [myRes, joinedRes] = await Promise.all([
              axiosInstance.get('my-leagues/'),
              axiosInstance.get('joined-leagues/'),
            ]);

            if (!active) return;
            setMyLeagues(myRes.data);
            setJoinedLeagues(joinedRes.data);
          } else {
            // viewing someone else → empty but valid
            setMyLeagues([]);
            setJoinedLeagues([]);
          }
        } catch (err) {
          console.log('Profile fetch error:', err);
          Alert.alert('Error', 'Profile not found');
        } finally {
          if (active) setLoading(false);
        }
      };

      fetchProfile();
      return () => (active = false);
    }, [userId])
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const avatarUri =
    profile?.avatar &&
    (profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#36ACA6" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff' }}>Failed to load profile</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.safe}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* ❌ Hide edit/settings for other users */}
          {isMyProfile && (
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ProfileEdit', { profile })}
              >
                <Ionicons name="create-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <Image
            source={
              avatarUri
                ? { uri: avatarUri }
                : require('../assets/avatar-placeholder.png')
            }
            style={styles.avatar}
          />
          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="#888" />
            <Text style={styles.locationText}>
              {profile.location || '—'}
            </Text>
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <StatBox label="Age" value={profile.age} />
            <StatBox
              label="Joined Plays"
              value={profile.leagues_joined}
            />
            <StatBox
              label="Created Plays"
              value={profile.leagues_created}
            />
          </View>
        </View>

        {/* BIO */}
        <Section title="Bio">
          <Text style={styles.bioText}>{profile.bio || '—'}</Text>
        </Section>

        {/* FAVORITE SPORTS */}
        <Section
          title="Favourite Sports"
          count={profile.favorite_sports?.length || 0}
        >
          <View style={styles.chipsWrap}>
            {profile.favorite_sports?.map((sport) => (
              <View key={sport} style={styles.chip}>
                <Text style={styles.chipText}>{sport}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* ORGANIZER – only show for self */}
        {isMyProfile && (
          <Section title="Organizer" count={myLeagues.length}>
            <ListCard data={myLeagues} />
          </Section>
        )}

        {/* JOINED – only show for self */}
        {isMyProfile && (
          <Section title="Joined" count={joinedLeagues.length}>
            <ListCard data={joinedLeagues} />
          </Section>
        )}

        {/* LOGOUT – only for self */}
        {isMyProfile && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

/* HELPERS (unchanged UI) */

const Section = ({ title, count, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <Text style={styles.sectionCount}>{count}</Text>
      )}
    </View>
    {children}
  </View>
);

const StatBox = ({ label, value }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ListCard = ({ data = [] }) => {
  if (data.length === 0) {
    return (
      <View style={styles.listCard}>
        <Text style={{ color: '#777', textAlign: 'center' }}>
          No plays found
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listCard}>
      {data.map((item) => (
        <View key={item.id} style={styles.listItem}>
          <Image
            source={{ uri: getSportImage(item.sport) }}
            style={styles.listImage}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.listDate}>
              {new Date(item.date_time).toLocaleDateString('en-GB')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

/* STYLES */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safe: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  profileCard: {
    backgroundColor: '#041211',
    margin: 20,
    borderRadius: 35,
    alignItems: 'center',
    padding: 24,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 16,
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.semibold,
  },
  username: {
    color: '#888',
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    color: '#888',
    marginLeft: 6,
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 25,
    gap: 10,
  },
  statBox: {
    backgroundColor: '#071F1E',
    borderRadius: 20,
    paddingVertical: 18,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontFamily: Fonts.semibold,
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
    fontFamily: Fonts.regular,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
    gap: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: Fonts.semibold,
  },
  sectionCount: {
    color: '#444',
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  bioText: {
    color: '#fff',
    lineHeight: 22,
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  chipText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.medium,
  },
  listCard: {
    backgroundColor: '#181818ff',
    borderRadius: 25,
    padding: 16,
    gap: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  listImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#222',
  },
  listTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
  listDate: {
    color: '#666',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#C90000',
    marginHorizontal: 20,
    marginTop: 40,
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: '#C90000',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
});