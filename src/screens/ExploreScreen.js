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
import { useNavigation } from '@react-navigation/native';

import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';
import LeagueCard from '../components/LeagueCard'; 
import { Fonts } from '../theme/fonts';

const DATE_FILTERS = ['Upcoming', 'Today', 'Tomorrow', 'This Week', 'This Weekend'];

const MAIN_SPORTS = [
  'All Sports',
  'Football',
  'Cricket',
  'Basketball',
  'Badminton',
  'Futsal',
  'Other' 
];

const getTabIcon = (sport, active) => {
  const color = active ? '#fff' : '#aaa';
  const size = 20;

  switch (sport) {
    case 'All Sports': return <Ionicons name="trophy-outline" size={size} color={color} />;
    case 'Football': return <Ionicons name="football-outline" size={size} color={color} />;
    case 'Cricket': return <MaterialCommunityIcons name="cricket" size={size} color={color} />;
    case 'Basketball': return <Ionicons name="basketball-outline" size={size} color={color} />;
    case 'Badminton': return <MaterialCommunityIcons name="badminton" size={size} color={color} />;
    case 'Futsal': return <MaterialCommunityIcons name="soccer" size={size} color={color} />;
    case 'Other': return <Ionicons name="grid-outline" size={size} color={color} />;
    default: return <Ionicons name="ellipse-outline" size={size} color={color} />;
  }
};

const ExploreScreen = () => {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Filter State
  const [activeDate, setActiveDate] = useState('Upcoming');
  const [activeSport, setActiveSport] = useState('All Sports');

  const axios = useAxios();
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  // 1. Fetch Leagues (Initial Load)
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

  // 2. Search Users Effect (Debounced ideally, simple here)
  useEffect(() => {
    if (searchQuery.length > 2) {
      const searchUsers = async () => {
        try {
          setSearchingUsers(true);
          // Assuming endpoint: /api/users/?search=query OR /api/public-users/
          // Adjust URL to match your Django User ViewSet
          const res = await axios.get(`http://10.0.2.2:8000/api/users/?search=${searchQuery}`); 
          setUserResults(res.data);
        } catch (e) {
          console.log('User search error', e);
          setUserResults([]);
        } finally {
          setSearchingUsers(false);
        }
      };
      
      const timer = setTimeout(searchUsers, 500); // 500ms debounce
      return () => clearTimeout(timer);
    } else {
      setUserResults([]);
    }
  }, [searchQuery]);

  // 3. Filtering Logic (Handles Search Mode vs Browse Mode)
  const filteredLeagues = useMemo(() => {
    // A. SEARCH MODE: Filter by text (Name or Sport)
    if (searchQuery.length > 0) {
      const lowerQ = searchQuery.toLowerCase();
      return leagues.filter(item => 
        item.name.toLowerCase().includes(lowerQ) || 
        item.sport.toLowerCase().includes(lowerQ)
      );
    }

    // B. BROWSE MODE: Filter by Date & Sport Pills
    const now = dayjs();
    let data = leagues.filter(item => {
      const eventDate = dayjs(item.date_time);
      switch (activeDate) {
        case 'Today': return eventDate.isSame(now, 'day');
        case 'Tomorrow': return eventDate.isSame(now.add(1, 'day'), 'day');
        case 'This Week': 
          return eventDate.isAfter(now.startOf('week')) && eventDate.isBefore(now.endOf('week'));
        case 'This Weekend':
          const saturday = now.day(6).startOf('day');
          const sunday = now.day(6).add(1, 'day').endOf('day');
          return (eventDate.isSame(saturday) || eventDate.isAfter(saturday)) && 
                 (eventDate.isSame(sunday) || eventDate.isBefore(sunday));
        case 'Upcoming':
        default: return eventDate.isAfter(now);
      }
    });

    if (activeSport !== 'All Sports') {
      if (activeSport === 'Other') {
        const explicitSports = MAIN_SPORTS.filter(s => s !== 'All Sports' && s !== 'Other');
        data = data.filter(item => !explicitSports.includes(item.sport));
      } else {
        data = data.filter(item => item.sport === activeSport);
      }
    }

    return data;
  }, [leagues, activeDate, activeSport, searchQuery]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2CB9B0" />
      </View>
    );
  }

  // 4. Header Component for FlatList (Swaps between Search Results and Filters)
  const ListHeader = () => {
    if (searchQuery.length > 0) {
      // SEARCH MODE HEADER
      return (
        <View style={styles.searchResultsHeader}>
           {/* People Section */}
           {searchingUsers ? (
             <ActivityIndicator size="small" color="#2CB9B0" style={{ alignSelf: 'flex-start', marginLeft: 20 }} />
           ) : userResults.length > 0 ? (
             <View style={styles.peopleSection}>
               <Text style={styles.sectionTitle}>People</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }}>
                 {userResults.map((u) => (
                   <TouchableOpacity 
                      key={u.id} 
                      style={styles.userCard}
                      onPress={() => navigation.navigate('ProfileView', { userId: u.id })}
                   >
                     <Image 
                       source={u.avatar ? { uri: u.avatar } : { uri: 'https://via.placeholder.com/150' }} 
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

           {/* Matches Title */}
           <Text style={[styles.sectionTitle, { marginLeft: 20, marginTop: 10, marginBottom: 10 }]}>Matches</Text>
        </View>
      );
    }

    // BROWSE MODE HEADER (Filters)
    return (
      <View>
        {/* Date Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScrollContent}>
          {DATE_FILTERS.map(item => {
            const isActive = activeDate === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setActiveDate(item)}
                style={[styles.datePill, isActive && styles.datePillActive]}
              >
                <Text style={[styles.dateText, isActive && styles.dateTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sport Tabs */}
        <View style={styles.sportContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportScrollContent}>
            {MAIN_SPORTS.map(sport => {
              const isActive = activeSport === sport;
              return (
                <TouchableOpacity
                  key={sport}
                  style={styles.sportTab}
                  onPress={() => setActiveSport(sport)}
                >
                  {getTabIcon(sport, isActive)}
                  <Text style={[styles.sportText, isActive && styles.sportTextActive]}>{sport}</Text>
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
      
      {/* Search Input */}
      <View style={styles.headerContainer}>
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#888" style={{marginLeft: 10}} />
            <TextInput
                placeholder="Search leagues, sports or people"
                placeholderTextColor="#666"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#666" style={{marginRight: 10}}/>
                </TouchableOpacity>
            )}
        </View>
        <TouchableOpacity style={styles.filterButton}>
             <Ionicons name="options-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <FlatList
        data={filteredLeagues}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={ListHeader} // Dynamic Header
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
                    {searchQuery.length > 0 ? "No matches found." : "No events found."}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 10,
    gap: 12,
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
    marginLeft: 8,
  },
  filterButton: {
    padding: 4
  },
  
  // Search Results Specific
  searchResultsHeader: {
    marginTop: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.bold, // Make sure Fonts.bold exists or use fontWeight: 'bold'
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 20
  },
  peopleSection: {
    marginBottom: 20,
  },
  userCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
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
  userName: {
    color: '#ccc',
    fontSize: 11,
    textAlign: 'center'
  },

  // Date Pills
  dateScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  datePill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#1C1C1E', 
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333'
  },
  datePillActive: {
    backgroundColor: '#2CB9B0', 
    borderColor: '#2CB9B0',
  },
  dateText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
  dateTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sportTab: {
    alignItems: 'center',
    marginRight: 24,
    paddingBottom: 12,
    position: 'relative',
  },
  sportText: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 6,
    fontFamily: Fonts.regular,
  },
  sportTextActive: {
    color: '#fff',
    fontFamily: Fonts.semibold,
  },
  activeLine: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    opacity: 0.5,
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
});

export default ExploreScreen;