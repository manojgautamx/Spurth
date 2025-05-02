import { View, Text, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Correct


const LeagueCard = ({ name, sport, location, leagueType, playersJoined, maxPlayers, price }) => {
  // Show only first two words of the location
  const shortLocation = location.split(' ').slice(0, 2).join(' ');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.subTitle}>{sport} • {leagueType}</Text>
      <Text style={styles.details}>📍 {shortLocation}</Text>
      <Text style={styles.details}>
        👥 {playersJoined}/{maxPlayers} {playersJoined >= maxPlayers ? '(Full)' : ''}
      </Text>
      <Text style={styles.details}>💰 Rs. {price}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 4,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 6,
    color: '#222',
  },
  subTitle: {
    fontSize: 14,
    marginBottom: 6,
    color: '#444',
  },
  details: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
});

export default LeagueCard;
