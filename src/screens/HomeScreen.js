<<<<<<< HEAD
import React, { useState } from 'react';
=======
import { useNavigation } from '@react-navigation/native';
import React from 'react';
>>>>>>> origin/main
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialIcons';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 48) / 2;

const LeagueCard = () => (
  <View style={styles.card}>
    <Image
      source={require('../assets/futsal.png')}
      style={styles.cardImage}
      resizeMode="cover"
    />
    <Text style={styles.title}>Futsal Play</Text>

    <View style={styles.row}>
      <View style={styles.iconRow}>
        <Ionicons name="football-outline" size={12} color="gray" />
        <Text style={styles.infoText}>Futsal</Text>
      </View>
      <Text style={styles.infoText}>1/22</Text>
      <View style={styles.iconRow}>
        <Ionicons name="location-outline" size={12} color="gray" />
        <Text style={styles.infoText}>4 km</Text>
      </View>
    </View>

    <View style={styles.row}>
      <View style={styles.iconRow}>
        <Ionicons name="calendar-outline" size={12} color="gray" />
        <Text style={styles.infoText}>13 Feb, 2025, 8:00 PM</Text>
      </View>
      <View style={styles.iconRow}>
        <Ionicons name="star-outline" size={12} color="gray" />
        <Text style={styles.infoText}>Pro</Text>
      </View>
    </View>
  </View>
);

<<<<<<< HEAD
const HomeScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Nearby');

  const handleCardPress = () => {
    navigation.navigate('LeagueDetails');
  };

  const handleCreateLeague = () => {
    navigation.navigate('CreateLeague');
  };

=======
const HomeScreen = () => {
  const navigation = useNavigation(); // ✅ add this
>>>>>>> origin/main
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => console.log('Menu clicked')}>
          <Icon name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Image source={require('../assets/image.png')} style={styles.logo} />
        <TouchableOpacity style={styles.profilePlaceholder} />
      </View>

      {/* Create League Button */}
<<<<<<< HEAD
      <TouchableOpacity style={styles.createLeague} onPress={handleCreateLeague}>
=======
      <TouchableOpacity onPress={() => navigation.navigate('CreateLeague')}>
>>>>>>> origin/main
        <Text style={styles.createLeagueText}>Create your league</Text>
        <Icon name="chevron-right" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setActiveTab('Nearby')}>
          <Text style={[styles.tabText, activeTab === 'Nearby' && styles.activeTab]}>
            Nearby
            </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Joined')}>
              <Text style={styles.tabText}>Joined Leagues</Text>
              </TouchableOpacity>
              </View>

      {/* Filter & Sort */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterOption}>
          <Icon name="filter-list" size={20} color="#fff" />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterOption}>
          <Icon name="sort" size={20} color="#fff" />
          <Text style={styles.filterText}>Sort by</Text>
        </TouchableOpacity>
      </View>

      {/* League Cards */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.cardGrid}>
          {activeTab === 'Nearby'
            ? [...Array(6)].map((_, idx) => (
                <TouchableOpacity key={idx} onPress={handleCardPress}>
                  <LeagueCard />
                </TouchableOpacity>
              ))
            : (
              <Text style={{ color: 'gray', marginTop: 20 }}>
                You haven't joined any leagues yet.
              </Text>
            )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity>
          <Ionicons name="home-outline" size={24} color="#e91e63" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="search-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="chatbubble-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingTop: 40, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: { width: 30, height: 30, borderRadius: 15 },
  profilePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'gray',
    borderWidth: 1,
    borderColor: '#fff',
  },
  createLeague: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  createLeagueText: { color: '#fff', fontSize: 16 },

  // Tabs
  tabs: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  tabText: {
    color: 'gray',
    marginRight: 24,
    fontSize: 14,
  },
  activeTab: {
    color: '#e91e63',
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#e91e63',
    paddingBottom: 4,
  },

  // Filter Row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 24,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    color: 'gray',
    fontSize: 12,
    marginLeft: 6,
  },

  // Cards
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 10,
    width: cardWidth,
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    marginBottom: 8,
  },
  title: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    alignItems: 'center',
  },
  infoText: { color: 'gray', fontSize: 11 },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#121212',
  },
});
