import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';

const LeagueDescriptionScreen = ({ route, navigation }) => {
  const { league } = route.params;
  const axios = useAxios();
  const [joining, setJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(league.is_joined);
  const { user } = useContext(AuthContext);

  const isCreator = user?.username === league.created_by;

  const handleJoinLeague = async () => {
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

  const handleDeleteLeague = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this league?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`http://10.0.2.2:8000/api/delete-league/${league.id}/`);
              Alert.alert('Deleted', 'League deleted successfully.');
              navigation.goBack();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete league');
            }
          },
        },
      ],
      { cancelable: true }
    );
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

      {isCreator ? (
        <>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditLeague', { league })}
          >
            <Text style={styles.buttonText}>Edit League</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteLeague}
          >
            <Text style={styles.buttonText}>Delete League</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={isJoined ? styles.messageButton : styles.joinButton}
          onPress={!isJoined ? handleJoinLeague : null}
          disabled={joining || isJoined}
        >
          <Text style={styles.buttonText}>
            {isJoined ? 'Message' : joining ? 'Joining...' : 'Join League'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    padding: 16,
    marginTop: 200,
  },
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
    backgroundColor: '#198754',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    marginTop: 20,
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LeagueDescriptionScreen;
