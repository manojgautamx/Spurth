import React from 'react';
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

const LeagueCard = () => (
  <View style={styles.card}>
    <Image
      source={require('../assets/futsal.png')}
      style={styles.cardImage}
      resizeMode="cover"
    />
    <Text style={styles.title}>Futsal Play</Text>
    <View style={styles.row}>
      <Text style={styles.infoText}>⚽ Futsal</Text>
      <Text style={styles.infoText}>1/22</Text>
      <Text style={styles.infoText}>📍 4 km away</Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.infoText}>🗓 13 Feb, 2025, 8:00 PM</Text>
      <Text style={styles.infoText}>⭐ Pro</Text>
    </View>
  </View>
);

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="menu" size={28} color="#fff" />
        <Image source={require('../assets/image.png')} style={styles.logo} />
        <View style={styles.profilePlaceholder} />
      </View>

      {/* Create League Button */}
      <TouchableOpacity style={styles.createLeague}>
        <Text style={styles.createLeagueText}>Create your league</Text>
        <Icon name="chevron-right" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Text style={styles.activeTab}>Nearby</Text>
        <Text style={styles.inactiveTab}>Joined Leagues</Text>
        <Icon name="filter-list" size={20} color="#fff" style={{ marginLeft: 'auto' }} />
      </View>

      {/* League Cards Grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.cardGrid}>
          {[...Array(6)].map((_, idx) => (
            <LeagueCard key={idx} />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Ionicons name="home-outline" size={24} color="#e91e63" />
        <Ionicons name="search-outline" size={24} color="#fff" />
        <Ionicons name="notifications-outline" size={24} color="#fff" />
        <Ionicons name="chatbubble-outline" size={24} color="#fff" />
      </View>

    </View>
  );
};

export default HomeScreen;

const cardWidth = (screenWidth - 48) / 2;

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
  tabs: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  activeTab: {
    color: '#e91e63',
    marginRight: 20,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#e91e63',
    paddingBottom: 4,
  },
  inactiveTab: { color: 'gray', marginRight: 20 },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoText: { color: 'gray', fontSize: 11 },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#121212',
  },
});