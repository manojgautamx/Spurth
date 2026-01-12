import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BASE_URL = 'http://10.0.2.2:8000';

const ParticipantsListScreen = ({ route, navigation }) => {
  // Get data passed from the previous screen
  const { participants = [], leagueName } = route.params;

  // Helper to resolve avatar (same logic as your viewer)
  const getAvatarSource = (avatarPath) => {
    if (!avatarPath) return require('../assets/avatar-placeholder.png');
    if (avatarPath.startsWith('http')) return { uri: avatarPath };
    return { uri: `${BASE_URL}${avatarPath}` };
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => navigation.navigate('ProfileView', { userId: item.id })}
    >
      <Image 
        source={getAvatarSource(item.avatar)} 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.fullName}>{item.full_name || item.username}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#555" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Participants</Text>
        <View style={{width: 24}} /> 
      </View>

      <Text style={styles.subHeader}>People joined in {leagueName}</Text>

      <FlatList
        data={participants}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
            <Text style={styles.emptyText}>No one has joined yet.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: StatusBar.currentHeight || 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subHeader: {
    color: '#aaa',
    paddingHorizontal: 20,
    marginBottom: 10,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullName: {
    color: '#aaa',
    fontSize: 12,
  },
  emptyText: {
    color: '#777',
    textAlign: 'center',
    marginTop: 50,
    fontStyle: 'italic',
  }
});

export default ParticipantsListScreen;