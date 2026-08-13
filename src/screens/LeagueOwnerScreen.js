// screens/LeagueOwnerScreen.js
import React, { useContext } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import LeagueDetails from '../components/LeagueDetails';
import { AuthContext } from '../context/AuthContext';
import useAxios from '../utils/useAxios';

const LeagueOwnerScreen = ({ route, navigation }) => {
  const { league } = route.params;
  const { user } = useContext(AuthContext);
  const axios = useAxios();

  const handleDelete = async () => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this league?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`/api/delete-league/${league.id}/`);
            Alert.alert('Deleted', 'League has been deleted.');
            navigation.goBack();
          } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to delete league');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView>
      <LeagueDetails league={league} />
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('EditLeague', { league })}
      >
        <Text style={styles.buttonText}>Edit League</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.buttonText}>Delete League fuck you </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  editButton: {
    marginTop: 20,
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default LeagueOwnerScreen;
