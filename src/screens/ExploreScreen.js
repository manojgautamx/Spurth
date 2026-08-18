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
import ActivityCard from '../components/ActivityCard';
import { Fonts } from '../theme/fonts';
import { getMainCategory } from '../utils/categoryMapper';
import { BASE_URL } from '../config';
import { LocationContext, filterActivitiesByDistance, getDistanceKm } from '../context/LocationContext';
import { useIsWideWeb } from '../utils/responsive';
import PostsRail from '../components/web/PostsRail';
import ExploreSkeleton from '../components/skeletons/ExploreSkeleton';

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
        case 'This Weekend': {
          // dayjs .day() only ever returns 0–6, so `now.day() > 6` here was
          // dead code that could never fire. The real edge case is Sunday
          // (day 0): now.day(6) jumps forward to *next* Saturday instead of
          // recognizing the weekend already in progress (yesterday).
          const weekendSaturday = now.day() === 0 ? now.subtract(1, 'day') : now.day(6);
          const weekendSunday = weekendSaturday.add(1, 'day');

          return eventDate.isBetween(
            weekendSaturday.startOf('day'),
            weekendSunday.endOf('day'),
            null,
            '[]'
          );
        }
        case 'Upcoming':
        default:
          // "Upcoming" means not-yet-happened — it was previously returning
          // true unconditionally, which let already-past activities through.
          return eventDate.isAfter(now);
      }
    });

    // CATEGORY FILTER — activeCategory was only ever compared against
    // 'All Categories' to gate the distance filter below; it was never
    // actually used to exclude non-matching items, so picking any specific
    // category tab had no effect on the list.
    if (activeCategory !== 'All Categories') {
      data = data.filter(item => item.mainCategory === activeCategory);
    }

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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <ExploreSkeleton />
      </SafeAreaView>
    );
  }

  // Only the search-mode results (People carousel + "Matches" label) —
  // these scroll away with the list, unlike the filter row below, which
  // stays pinned alongside the search bar (see stickyHeader).
  const SearchResultsHeader = () => {
    if (searchQuery.length === 0) return null;
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
  };

  // Shared between the mobile and wide-web layouts. The search bar and the
  // filter row (date pills + category tabs) are grouped into one sticky
  // block (index 0) — the filter row hides while actively searching, same
  // as before, but now pins alongside the search bar instead of scrolling
  // away with the list.
  const stickyHeader = (
    <View style={styles.stickyHeaderBg}>
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

      {searchQuery.length === 0 && (
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
      )}
    </View>
  );

  // A FlatList nested inside a ScrollView (even with scrollEnabled={false})
  // doesn't reliably pass touch/wheel scroll gestures up to the parent on
  // web — the list area becomes a dead zone once your gesture starts over
  // it. Folding everything into ONE FlatList sidesteps that class of bug
  // entirely: stickyHeader rides along as a regular item at a fixed index,
  // with stickyHeaderIndices pinning it.
  const listData = [
    { key: 'sticky', kind: 'sticky' },
    ...(searchQuery.length > 0 ? [{ key: 'search-results', kind: 'search-results' }] : []),
    ...(filteredActivities.length === 0
      ? [{ key: 'empty', kind: 'empty' }]
      : filteredActivities.map(item => ({ key: item.id.toString(), kind: 'card', activity: item }))),
  ];

  const renderListItem = ({ item }) => {
    if (item.kind === 'sticky') return stickyHeader;
    if (item.kind === 'search-results') return <SearchResultsHeader />;
    if (item.kind === 'empty') {
      return (
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
      );
    }
    return <ActivityCard activity={item.activity} />;
  };

  const list = (
    <FlatList
      data={listData}
      keyExtractor={item => item.key}
      renderItem={renderListItem}
      stickyHeaderIndices={[0]}
      style={isWideWeb ? styles.webCenter : undefined}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    />
  );

  if (isWideWeb) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <View style={styles.webRow}>
          <View style={styles.webContent}>
            {list}
            <PostsRail />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      {list}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212', overflow: 'hidden' },

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
  // Opaque background for the sticky search-bar+filters block — without
  // it, activity cards scrolling underneath would show through once pinned.
  // paddingTop (rather than headerContainer's old marginTop) keeps that top
  // inset covered by the same background once this block is pinned.
  stickyHeaderBg: {
    backgroundColor: '#121212',
    paddingTop: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
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
