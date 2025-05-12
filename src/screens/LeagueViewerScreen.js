// screens/LeagueViewerScreen.js
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import LeagueDetails from '../components/LeagueDetails';
import useAxios from '../utils/useAxios';

const LeagueViewerScreen = ({ route, navigation }) => {
  const { league } = route.params;
  const axios = useAxios();
  const [joining, setJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(league.is_joined);

  const handleJoin = async () => {
    try {
      setJoining(true);
      await axios.post(`http://10.0.2.2:8000/api/join-league/${league.id}/`);
      Alert.alert('Success', 'You joined the league!');
      setIsJoined(true);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to join league');
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView>
      <LeagueDetails league={league} />
      <TouchableOpacity
        style={isJoined ? styles.messageButton : styles.joinButton}
        onPress={!isJoined ? handleJoin : null}
        disabled={joining || isJoined}
      >
        <Text style={styles.buttonText}>
          {isJoined ? 'Message' : joining ? 'Joining...' : 'Join League'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  joinButton: {
    marginTop: 20,
    backgroundColor: '#E81F89',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  messageButton: {
    marginTop: 20,
    backgroundColor: '#198754',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default LeagueViewerScreen;
