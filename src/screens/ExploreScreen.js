import React, { useEffect, useState, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  Image
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useNavigation } from '@react-navigation/native';

import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';
import LeagueCard from '../components/LeagueCard';
import { Fonts } from '../theme/fonts';
import { getMainCategory } from '../utils/categoryMapper';

const DATE_FILTERS = ['Upcoming', 'Today', 'Tomorrow', 'This Week', 'This Weekend'];
dayjs.extend(isBetween);


const MAIN_CATEGORIES = [
  'All Categories',
  'Fitness',
  'Adventure',
  'Gaming',
  'Sports',
  'Arts',
  'Education',
  'Lifestyle',
  'Tech',
  'Other'
];

const getTabIcon = (category, active) => {
  const color = active ? '#fff' : '#aaa';
  const size = 20;

  switch (category) {
    case 'All Categories': return <Ionicons name="grid-outline" size={size} color={color} />;
    case 'Fitness': return <Ionicons name="barbell-outline" size={size} color={color} />;
    case 'Adventure': return <Ionicons name="trail-sign-outline" size={size} color={color} />;
    case 'Gaming': return <Ionicons name="game-controller-outline" size={size} color={color} />;
    case 'Sports': return <Ionicons name="football-outline" size={size} color={color} />;
    case 'Arts': return <Ionicons name="color-palette-outline" size={size} color={color} />;
    case 'Education': return <Ionicons name="school-outline" size={size} color={color} />;
    case 'Lifestyle': return <Ionicons name="cafe-outline" size={size} color={color} />;
    case 'Tech': return <Ionicons name="laptop-outline" size={size} color={color} />;
    case 'Other': return <Ionicons name="ellipse-outline" size={size} color={color} />;
    default: return <Ionicons name="ellipse-outline" size={size} color={color} />;
  }
};

const ExploreScreen = () => {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [activeDate, setActiveDate] = useState('Upcoming');
  const [activeCategory, setActiveCategory] = useState('All Categories');

  const axios = useAxios();
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://10.0.2.2:8000/api/public-leagues/');

      const processed = res.data.map(item => ({
        ...item,
        mainCategory: getMainCategory(item.sport)
      }));

      setLeagues(processed);
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

  useEffect(() => {
    if (searchQuery.length > 2) {
      const searchUsers = async () => {
        try {
          setSearchingUsers(true);
          const res = await axios.get(
            `http://10.0.2.2:8000/api/users/?search=${searchQuery}`
          );
          setUserResults(res.data);
        } catch (e) {
          console.log('User search error', e);
          setUserResults([]);
        } finally {
          setSearchingUsers(false);
        }
      };

      const timer = setTimeout(searchUsers, 500);
      return () => clearTimeout(timer);
    } else {
      setUserResults([]);
    }
  }, [searchQuery]);

  const filteredLeagues = useMemo(() => {
    // SEARCH MODE
    if (searchQuery.length > 0) {
      const lowerQ = searchQuery.toLowerCase();
      return leagues.filter(item =>
        item.name?.toLowerCase().includes(lowerQ) ||
        item.sport?.toLowerCase().includes(lowerQ)
      );
    }

    const now = dayjs();

    let data = leagues.filter(item => {
      const eventDate = dayjs(item.date_time);

      switch (activeDate) {
        case 'Today':
          return eventDate.isSame(now, 'day');
        case 'Tomorrow':
          return eventDate.isSame(now.add(1, 'day'), 'day');
        case 'This Week':
          return eventDate.isAfter(now.startOf('week')) &&
                eventDate.isBefore(now.endOf('week'));
        case 'This Weekend':
          const saturday = now.day(6);
          
          const weekendSaturday =
            now.day() > 6 ? saturday.add(7, 'day') : saturday;

          const weekendSunday = weekendSaturday.add(1, 'day');

          return eventDate.isBetween(
            weekendSaturday.startOf('day'),
            weekendSunday.endOf('day'),
            null,
            '[]'
          );
        case 'Upcoming':
        default:
          return true; // ← IMPORTANT: do NOT block everything
      }
    });

    // CATEGORY FILTER
    if (activeCategory !== 'All Categories') {
      data = data.filter(item => {
        const derived = getMainCategory(item.sport);
        return derived === activeCategory;
      });
    }

    return data;
  }, [leagues, activeDate, activeCategory, searchQuery]);


  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2CB9B0" />
      </View>
    );
  }

  const ListHeader = () => {
    if (searchQuery.length > 0) {
      return (
        <View style={styles.searchResultsHeader}>
          {searchingUsers ? (
            <ActivityIndicator
              size="small"
              color="#2CB9B0"
              style={{ alignSelf: 'flex-start', marginLeft: 20 }}
            />
          ) : userResults.length > 0 ? (
            <View style={styles.peopleSection}>
              <Text style={styles.sectionTitle}>People</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20 }}
              >
                {userResults.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.userCard}
                    onPress={() =>
                      navigation.navigate('ProfileView', { userId: u.id })
                    }
                  >
                    <Image
                      source={
                        u.avatar
                          ? { uri: u.avatar }
                          : { uri: 'https://via.placeholder.com/150' }
                      }
                      style={styles.userAvatar}
                    />
                    <Text style={styles.userName} numberOfLines={1}>
                      {u.full_name || u.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Text
            style={[
              styles.sectionTitle,
              { marginLeft: 20, marginTop: 10, marginBottom: 10 }
            ]}
          >
            Matches
          </Text>
        </View>
      );
    }

    return (
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScrollContent}
        >
          {DATE_FILTERS.map(item => {
            const isActive = activeDate === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setActiveDate(item)}
                style={[styles.datePill, isActive && styles.datePillActive]}
              >
                <Text
                  style={[styles.dateText, isActive && styles.dateTextActive]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sportContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sportScrollContent}
          >
            {MAIN_CATEGORIES.map(category => {
              const isActive = activeCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={styles.sportTab}
                  onPress={() => setActiveCategory(category)}
                >
                  {getTabIcon(category, isActive)}
                  <Text
                    style={[
                      styles.sportText,
                      isActive && styles.sportTextActive
                    ]}
                  >
                    {category}
                  </Text>
                  {isActive && <View style={styles.activeLine} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      <View style={styles.headerContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="#888"
            style={{ marginLeft: 10 }}
          />
          <TextInput
            placeholder="Search events or people"
            placeholderTextColor="#666"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons
                name="close-circle"
                size={18}
                color="#666"
                style={{ marginRight: 10 }}
              />
            </TouchableOpacity>
          )}
        </View>
        {/* <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#fff" />
        </TouchableOpacity> */}
      </View>

      <FlatList
        data={filteredLeagues}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <LeagueCard
            league={item}
            onPress={() =>
              navigation.navigate(
                user?.username === item.created_by?.username
                  ? 'LeagueOwnerScreen'
                  : 'LeagueViewerScreen',
                { league: item }
              )
            }
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {!loading && (
              <>
                <Ionicons name="search-outline" size={50} color="#333" />
                <Text style={styles.emptyText}>
                  {searchQuery.length > 0
                    ? 'No matches found.'
                    : 'No events found.'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212'
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 30,
    gap: 12
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 30,
    height: 46,
    paddingHorizontal: 10
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    marginLeft: 8
  },
  filterButton: { padding: 4 },
  searchResultsHeader: { marginTop: 10 },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 20
  },
  peopleSection: { marginBottom: 20 },
  userCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 70
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#444'
  },
  userName: { color: '#ccc', fontSize: 11, textAlign: 'center' },
  dateScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  datePill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    marginTop: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333'
  },
  datePillActive: {
    backgroundColor: '#2CB9B0',
    borderColor: '#2CB9B0'
  },
  dateText: { color: '#aaa', fontSize: 13, fontWeight: '500' },
  dateTextActive: { color: '#fff', fontWeight: '700' },
  sportContainer: {
    marginLeft: 15,
  },
  sportTab: {
    alignItems: 'center',
    marginRight: 20,
    marginTop: 15,
    marginBottom: 0,
    paddingBottom: 12,
    position: 'relative'
  },
  sportText: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 6,
    fontFamily: Fonts.regular
  },
  sportTextActive: {
    color: '#fff',
    fontFamily: Fonts.semibold
  },
  activeLine: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    opacity: 0.5
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
    fontSize: 16,
    fontFamily: Fonts.regular
  }
});

export default ExploreScreen;
