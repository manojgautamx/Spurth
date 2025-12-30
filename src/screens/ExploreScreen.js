import React, { useEffect, useState, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  TextInput,
  ImageBackground,
  SafeAreaView,
} from 'react-native';


import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { useNavigation } from '@react-navigation/native';

import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';
import { Fonts } from '../theme/fonts';
import { getSportIcon } from '../utils/sportIcons';
import { getSportImage } from '../utils/getSportImage';

const DATE_FILTERS = ['Upcoming', 'Today', 'Tomorrow', 'This Week'];

const SPORTS = [
  'All Sports',
  'Football',
  'Cricket',
  'Basketball',
  'Badminton',
  'Futsal',
  'Volleyball',
  'Tennis',
];

const ExploreScreen = () => {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState('Upcoming');
  const [activeSport, setActiveSport] = useState('All Sports');

  const axios = useAxios();
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://10.0.2.2:8000/api/public-leagues/');
      setLeagues(res.data);
    } catch (e) {
      console.log('Explore fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchLeagues);
    return unsub;
  }, [navigation]);

  // ───────── FILTERING LOGIC ─────────
  const filteredLeagues = useMemo(() => {
    const now = dayjs();

    let data = leagues.filter(item => {
      const eventDate = dayjs(item.date_time);

      switch (activeDate) {
        case 'Today':
          return eventDate.isSame(now, 'day');
        case 'Tomorrow':
          return eventDate.isSame(now.add(1, 'day'), 'day');
        case 'This Week':
          return (
            eventDate.isAfter(now.startOf('week')) &&
            eventDate.isBefore(now.endOf('week'))
          );
        case 'Upcoming':
        default:
          return eventDate.isAfter(now);
      }
    });

    if (activeSport !== 'All Sports') {
      data = data.filter(item => item.sport === activeSport);
    }

    return data;
  }, [leagues, activeDate, activeSport]);

  // ───────── CARD (SAME AS HOME) ─────────
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
      <ImageBackground
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
      {/* SEARCH */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          placeholder="Search"
          placeholderTextColor="#777"
          style={styles.searchInput}
        />
        <Ionicons name="options-outline" size={20} color="#999" />
      </View>

      {/* DATE FILTER */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateScroll}
      >
        {DATE_FILTERS.map(item => (
          <TouchableOpacity
            key={item}
            onPress={() => setActiveDate(item)}
            style={[
              styles.dateTab,
              activeDate === item && styles.dateTabActive,
            ]}
          >
            <Text
              style={[
                styles.dateText,
                activeDate === item && styles.dateTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* SPORT FILTER */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sportScroll}
      >
        {SPORTS.map(sport => (
          <TouchableOpacity
            key={sport}
            style={styles.sportTab}
            onPress={() => setActiveSport(sport)}
          >
            {sport === 'All Sports' ? (
              <MaterialCommunityIcons
                name="trophy-outline"
                size={18}
                color={activeSport === sport ? '#fff' : '#aaa'}
              />
            ) : (
              getSportIcon(
                sport,
                18,
                activeSport === sport ? '#fff' : '#aaa'
              )
            )}
            <Text
              style={[
                styles.sportText,
                activeSport === sport && styles.sportTextActive,
              ]}
            >
              {sport}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* LIST */}
      <FlatList
        data={filteredLeagues}
        keyExtractor={item => item.id.toString()}
        renderItem={renderLeagueCard}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No events found.</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },

  /* SEARCH */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    marginHorizontal: 8,
    fontSize: 14,
  },

  /* DATE FILTER */
  dateScroll: {
    marginTop: 16,
    paddingLeft: 20,
  },
  dateTab: {
    marginRight: 20,
    paddingBottom: 6,
  },
  dateTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#36ACA6',
  },
  dateText: {
    fontSize: 14,
    color: '#999',
  },
  dateTextActive: {
    color: '#fff',
  },

  /* SPORT FILTER */
  sportScroll: {
    marginTop: 16,
    paddingLeft: 20,
  },
  sportTab: {
    alignItems: 'center',
    marginRight: 18,
  },
  sportText: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  sportTextActive: {
    color: '#fff',
  },

  /* CARD */
  card: {
    backgroundColor: '#181818',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardImage: {
    width: '100%',
    height: 130,
  },
  cardContent: {
    padding: 15,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
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
  },

  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
});


export default ExploreScreen;