// screens/LeagueDescriptionScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const LeagueDescriptionScreen = ({ route }) => {
  const { league } = route.params;

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  label: { fontWeight: 'bold', marginTop: 10 },
  value: { marginBottom: 5 },
});

export default LeagueDescriptionScreen;
