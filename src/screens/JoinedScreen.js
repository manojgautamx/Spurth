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

const LeagueCard = ({ type = 'message' }) => (
  <View style={styles.card}>
    <View>
      <Image
        source={require('../assets/futsal.png')}
        style={styles.cardImage}
        resizeMode="cover"
      />
      {type === 'edit' && (
        <TouchableOpacity style={styles.editButton}>
          <Text style={{ color: '#fff', fontSize: 12 }}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>

    <Text style={styles.title}>Futsal Play</Text>

    <View style={styles.row}>
      <View style={styles.iconRow}>
        <Ionicons name="football-outline" size={14} color="gray" />
        <Text style={styles.infoText}>Futsal</Text>
      </View>
      <View style={styles.iconRow}>
        <Ionicons name="location-outline" size={14} color="gray" />
        <Text style={styles.infoText}>1.2 km away</Text>
      </View>
    </View>

    <View style={styles.row}>
      <View style={styles.iconRow}>
        <Ionicons name="calendar-outline" size={14} color="gray" />
        <Text style={styles.infoText}>12th Apr, 2025</Text>
      </View>
      <View style={styles.iconRow}>
        <Ionicons name="time-outline" size={14} color="gray" />
        <Text style={styles.infoText}>8:00 PM</Text>
      </View>
    </View>

    {type !== 'edit' && (
      <View style={styles.row}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.messageButton}>
          <Text style={styles.messageText}>Message</Text>
        </TouchableOpacity>
      </View>
    )}
    {type === 'edit' && (
      <View style={styles.row}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.messageButton}>
          <Text style={styles.messageText}>Message</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

const Joined = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => console.log('Menu clicked')}>
          <Icon name="menu" size={28} color="#fff" />
        </TouchableOpacity>

        <Image source={require('../assets/image.png')} style={styles.logo} />

        {/* Profile Placeholder */}
        <TouchableOpacity style={styles.profilePlaceholder} />
      </View>

      {/* Create League Button */}
      <TouchableOpacity
        style={styles.createLeague}
        onPress={() => navigation.navigate('CreateLeague')}
      >
        <Text style={styles.createLeagueText}>Create your league</Text>
        <Icon name="chevron-right" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.tabText}>Nearby</Text>
        </TouchableOpacity>
        <Text style={[styles.tabText, styles.activeTab]}>Joined Leagues</Text>
      </View>

      {/* Filter */}
      <TouchableOpacity
        style={styles.filterRow}
        onPress={() => console.log('Filter clicked')}
      >
        <Ionicons name="filter-outline" size={16} color="#fff" />
        <Text style={styles.filterText}>Filter</Text>
      </TouchableOpacity>

      {/* League Cards */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingBottom: 80 }}>
          {[...Array(2)].map((_, idx) => (
            <LeagueCard key={idx} />
          ))}

          <Text style={styles.sectionTitle}>My leagues</Text>
          <LeagueCard type="edit" />
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home-outline" size={24} color="#fff" />
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

export default Joined;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
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
    marginBottom: 16,
  },
  createLeagueText: {
    color: '#fff',
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 6,
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterText: {
    color: 'gray',
    fontSize: 14,
    marginLeft: 6,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 10,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 10,
    width: '100%',
    marginBottom: 12,
  },
  cardImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 6,
  },
  editButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e91e63',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  infoText: {
    color: 'gray',
    fontSize: 11,
    marginLeft: 4,
  },
  messageButton: {
    backgroundColor: '#e91e63',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  messageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#121212',
  },
});
