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
import ActivityCard from '../components/ActivityCard';
import { Fonts } from '../theme/fonts';
import { getMainCategory } from '../utils/categoryMapper';
import { BASE_URL } from '../config';
import { LocationContext, filterActivitiesByDistance, getDistanceKm } from '../context/LocationContext';
import { useIsWideWeb } from '../utils/responsive';
import PostsRail from '../components/web/PostsRail';

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
  const isWideWeb = useIsWideWeb();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [activeDate, setActiveDate] = useState('Upcoming');
  const [activeCategory, setActiveCategory] = useState('All Categories');

  const axios = useAxios();
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { location } = useContext(LocationContext);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/public-activities/`);

      const processed = res.data.map(item => ({
        ...item,
        mainCategory: getMainCategory(item.activity_type)
      }));

      setActivities(processed);
    } catch (e) {
      console.log('Explore fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchActivities);
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const searchUsers = async () => {
        try {
          setSearchingUsers(true);
          const res = await axios.get(`${BASE_URL}/api/users/?search=${searchQuery}`);
          
          // Fix: Check if data is in .results (paginated) or just the array
          const data = res.data.results || res.data; 
          setUserResults(Array.isArray(data) ? data : []);
          
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

  const filteredActivities = useMemo(() => {
    // SEARCH MODE
    if (searchQuery.length > 0) {
      const lowerQ = searchQuery.toLowerCase();
      return activities.filter(item =>
        item.name?.toLowerCase().includes(lowerQ) ||
        item.activity_type?.toLowerCase().includes(lowerQ)
      );
    }

    const now = dayjs();

    let data = activities.filter(item => {
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
    if (
      activeCategory === 'All Categories' &&
      activeDate === 'Upcoming' &&
      searchQuery.length === 0
    ) {
      // default view — filter by distance
      data = filterActivitiesByDistance(
        data,
        location?.latitude,
        location?.longitude,
        50
      );
    }

    return data;
  }, [activities, activeDate, activeCategory, searchQuery, location]);


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

        <View style={styles.categoryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {MAIN_CATEGORIES.map(category => {
              const isActive = activeCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryTab}
                  onPress={() => setActiveCategory(category)}
                >
                  {getTabIcon(category, isActive)}
                  <Text
                    style={[
                      styles.categoryText,
                      isActive && styles.categoryTextActive
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

  // Shared between the mobile and wide-web layouts.
  const header = (
    <View style={styles.headerContainer}>
      <View style={styles.searchBar}>
        <Ionicons
          name="search"
          size={20}
          color="#888"
          style={{ marginLeft: 10 }}
        />
        <TextInput
          placeholder="Search Activities or People"
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
      <TouchableOpacity
        style={styles.mapToggleBtn}
        onPress={() => navigation.navigate('ExploreMap', { activities: filteredActivities })}
      >
        <Ionicons name="map-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.mapToggleText}>Map</Text>
      </TouchableOpacity>
    </View>
  );

  const list = (
    <FlatList
      data={filteredActivities}
      keyExtractor={item => item.id.toString()}
      ListHeaderComponent={ListHeader}
      renderItem={({ item }) => (
        <ActivityCard
          activity={item}
          onPress={() =>
            navigation.navigate(
              user?.username === item.created_by?.username
                ? 'ActivityOwnerScreen'
                : 'ActivityViewerScreen',
              { activity: item }
            )
          }
        />
      )}
      style={isWideWeb ? styles.webList : undefined}
      // The browser's native scrollbar looked out of place next to the
      // custom UI — hide it on web only; mobile keeps its default indicator.
      showsVerticalScrollIndicator={!isWideWeb}
      contentContainerStyle={{ paddingBottom: 100 }}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          {!loading && (
            <>
              <Ionicons name="search-outline" size={50} color="#333" />
              <Text style={styles.emptyText}>
                {searchQuery.length > 0
                  ? 'No matches found.'
                  : 'No Activities found.'}
              </Text>
            </>
          )}
        </View>
      }
    />
  );

  if (isWideWeb) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <View style={styles.webRow}>
          <View style={styles.webContent}>
            <View style={styles.webCenter}>
              {header}
              {list}
            </View>
            <PostsRail />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      {header}
      {list}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212', overflow: 'hidden' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212'
  },

  /* ───────── WIDE WEB: 3-column layout (matches HomeScreen) ───────── */
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
  webList: {
    flex: 1,
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
    backgroundColor: '#6C5CE7',
    borderColor: '#4738c0'
  },
  dateText: { color: '#aaa', fontSize: 13, fontWeight: '500' },
  dateTextActive: { color: '#fff', fontWeight: '700' },
  categoryContainer: {
    marginLeft: 15,
  },
  categoryTab: {
    alignItems: 'center',
    marginRight: 20,
    marginTop: 15,
    marginBottom: 0,
    paddingBottom: 12,
    position: 'relative'
  },
  categoryText: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 6,
    fontFamily: Fonts.regular
  },
  categoryTextActive: {
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
  },
  mapToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#333',
  },
  mapToggleText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
});

export default ExploreScreen;
