import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView, // <-- Added for scrollable container
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Navbar from '../components/Navbar';
import { SafeAreaView } from 'react-native';
import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';

const HomeScreen = () => {
  const [myLeagues, setMyLeagues] = useState([]);
  const [otherLeagues, setOtherLeagues] = useState([]);
  const [joinedLeagues, setJoinedLeagues] = useState([]); // <-- NEW STATE
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const axios = useAxios();
  const { logout } = useContext(AuthContext);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      
      // <-- Modified: Fetch both my leagues and other leagues
      const [myResponse, otherResponse, joinedResponse] = await Promise.all([
        axios.get('http://10.0.2.2:8000/api/my-leagues/'),
        axios.get('http://10.0.2.2:8000/api/public-leagues/'),
        axios.get('http://10.0.2.2:8000/api/joined-leagues/'),
      ]);

      setMyLeagues(myResponse.data);
      setOtherLeagues(otherResponse.data); // <-- Save other leagues
      setJoinedLeagues(joinedResponse.data); // <-- Set joined leagues
    } catch (err) {
      console.error('Error fetching leagues:', err);
      setError(err.response?.data?.detail || 'Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchLeagues); // refresh when screen is focused
    return unsubscribe;
  }, [navigation]);

  const renderLeagueCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('LeagueDescription', { league: item })}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Ionicons name="trophy" size={24} color="#E81F89" />
        <Text style={styles.cardTitle}>{item.name}</Text>
      </View>
      <Text style={styles.cardDetail}>🏅 Sport: {item.sport}</Text>
      <Text style={styles.cardDetail}>📍 Location: {item.location}</Text>
      <Text style={styles.cardDetail}>🗓 Date & Time: {item.date_time}</Text>
      <Text style={styles.cardDetail}>🎮 League Type: {item.league_type}</Text>
      <Text style={styles.cardDetail}>👥 Max Players: {item.max_players}</Text>
      <Text style={styles.cardDetail}>💰 Price: ₹{item.price}</Text>
      <Text style={styles.cardDetail}>Created by {item.created_by}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E81F89" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchLeagues} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 46, backgroundColor: '#000' }}>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>StreetLeague</Text>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#E81F89" />
        </TouchableOpacity>
      </View>

      {/* <-- Wrapped main content in ScrollView */}
      <ScrollView style={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateLeague')}
          style={styles.createLeagueBtn}
        >
          <Text style={styles.createLeagueText}>Create your league</Text>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* -- My Leagues Section -- */}
        <Text style={styles.sectionTitle}>My Leagues</Text>
        {myLeagues.length === 0 ? (
          <Text style={styles.emptyText}>You haven’t created any leagues yet.</Text>
        ) : (
          <FlatList
            data={myLeagues}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLeagueCard}
            scrollEnabled={false} // <-- Allow ScrollView to handle scrolling
          />
        )}

        {/* -- Other Leagues Section (Newly added) -- */}
        <Text style={styles.sectionTitle}>Other Leagues</Text>
        {otherLeagues.length === 0 ? (
          <Text style={styles.emptyText}>No public leagues available right now.</Text>
        ) : (
          <FlatList
            data={otherLeagues}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLeagueCard}
            scrollEnabled={false} // <-- Allow ScrollView to handle scrolling
          />
        )}

        {/* Joined Leagues */}
        <Text style={styles.sectionTitle}>Joined Leagues</Text>
        {joinedLeagues.length === 0 ? (
          <Text style={styles.emptyText}>You haven’t joined any leagues yet.</Text>
        ) : (
          <FlatList
            data={joinedLeagues}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLeagueCard}
            scrollEnabled={false}
          />
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

// Styles remain unchanged except where noted
const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E81F89',
  },
  createLeagueBtn: {
    backgroundColor: '#E81F89',
    padding: 12,
    borderRadius: 10,
    marginVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createLeagueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  cardDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#E81F89',
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#888',
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#E81F89',
    padding: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
