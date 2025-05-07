import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';

const LeagueDescriptionScreen = ({ route, navigation }) => {
  const { league } = route.params;
  const axios = useAxios();
  const [joining, setJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(league.is_joined); // <-- New state

  const handleJoinLeague = async () => {
    try {
      setJoining(true);
      const response = await axios.post(`http://10.0.2.2:8000/api/join-league/${league.id}/`);
      Alert.alert('Success', 'You joined the league!');
      setIsJoined(true); // <-- Update UI
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to join league');
    } finally {
      setJoining(false);
    }
  };

  const handleMessage = () => {
    navigation.navigate('ChatScreen', { leagueId: league.id }); // <-- Your chat screen
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{league.name}</Text>
      <Text style={styles.label}>Sport:</Text>
      <Text style={styles.value}>{league.sport}</Text>
      <Text style={styles.label}>Location:</Text>
      <Text style={styles.value}>{league.location}</Text>
      <Text style={styles.label}>Date & Time:</Text>
      <Text style={styles.value}>{league.date_time}</Text>
      <Text style={styles.label}>League Type:</Text>
      <Text style={styles.value}>{league.league_type}</Text>
      <Text style={styles.label}>Max Players:</Text>
      <Text style={styles.value}>{league.max_players}</Text>
      <Text style={styles.label}>Price:</Text>
      <Text style={styles.value}>₹{league.price}</Text>
      <Text style={styles.label}>Description:</Text>
      <Text style={styles.value}>{league.description}</Text>

      {isJoined ? (
        <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
          <Text style={styles.joinButtonText}>Message</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={handleJoinLeague}
          disabled={joining}
        >
          <Text style={styles.joinButtonText}>{joining ? 'Joining...' : 'Join League'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  label: { fontWeight: 'bold', marginTop: 10 },
  value: { marginBottom: 5 },
  joinButton: {
    marginTop: 20,
    backgroundColor: '#E81F89',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageButton: {
    marginTop: 20,
    backgroundColor: '#198754', // green
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LeagueDescriptionScreen;
