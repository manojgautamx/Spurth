// screens/ActivityOwnerScreen.js
import React, { useContext } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import ActivityDetails from '../components/ActivityDetails';
import { AuthContext } from '../context/AuthContext';
import useAxios from '../utils/useAxios';

const ActivityOwnerScreen = ({ route, navigation }) => {
  const { activity } = route.params;
  const { user } = useContext(AuthContext);
  const axios = useAxios();

  const handleDelete = async () => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this activity?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`/api/delete-activity/${activity.id}/`);
            Alert.alert('Deleted', 'Activity has been deleted.');
            navigation.goBack();
          } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to delete activity');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView>
      <ActivityDetails activity={activity} />
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('EditActivity', { activity })}
      >
        <Text style={styles.buttonText}>Edit Activity</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.buttonText}>Delete Activity fuck you </Text>
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

export default ActivityOwnerScreen;
