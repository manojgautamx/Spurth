// components/ActivityDetails.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ActivityDetails = ({ activity }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{activity.name}</Text>
      <Text style={styles.label}>Activity Type:</Text>
      <Text style={styles.value}>{activity.activity_type}</Text>
      <Text style={styles.label}>Location:</Text>
      <Text style={styles.value}>{activity.location}</Text>
      <Text style={styles.label}>Date & Time:</Text>
      <Text style={styles.value}>{activity.date_time}</Text>
      <Text style={styles.label}>Format:</Text>
      <Text style={styles.value}>{activity.format}</Text>
      <Text style={styles.label}>Max Players:</Text>
      <Text style={styles.value}>{activity.max_players}</Text>
      <Text style={styles.label}>Price:</Text>
      <Text style={styles.value}>₹{activity.price}</Text>
      <Text style={styles.label}>Description:</Text>
      <Text style={styles.value}>{activity.description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  label: { fontWeight: 'bold', marginTop: 10 },
  value: { marginBottom: 5 },
});

export default ActivityDetails;
