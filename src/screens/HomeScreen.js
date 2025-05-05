import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Navbar from '../components/Navbar';
import { SafeAreaView } from 'react-native';
import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext'

const API_URL = 'http://10.0.2.2:8000/api/my-leagues/';

const HomeScreen = () => {
  const [myLeagues, setMyLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const axios = useAxios();
  const { logout } = useContext(AuthContext);


  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://10.0.2.2:8000/api/my-leagues/');
      setMyLeagues(response.data);
    } catch (err) {
      console.error('Error fetching leagues:', err);
      setError(err.response?.data?.detail || 'Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  };  

  useEffect(() => {
    fetchLeagues();
  }, []);

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
    <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>My Leagues</Text>
          <TouchableOpacity onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color="#E81F89" />
          </TouchableOpacity>
        </View>
        <View style={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateLeague')}
          style={styles.createLeagueBtn}
        >
          <Text style={styles.createLeagueText}>Create your league</Text>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterOption}>
            <Ionicons name="filter" size={20} color="#fff" />
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterOption}>
            <Ionicons name="swap-vertical" size={20} color="#fff" />
            <Text style={styles.filterText}>Sort by</Text>
          </TouchableOpacity>
        </View>

        {myLeagues.length === 0 ? (
          <Text style={styles.emptyText}>You haven’t created any leagues yet.</Text>
        ) : (
          <FlatList
            data={myLeagues}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLeagueCard}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
    
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
    paddingTop: 40, // <-- Adjust this value as needed
  },
  createLeagueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E81F89',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  createLeagueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterText: {
    color: '#fff',
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDetail: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#121212',
  },
  errorText: {
    color: '#FF5C5C',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#E81F89',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
