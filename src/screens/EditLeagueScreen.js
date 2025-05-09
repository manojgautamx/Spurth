import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import useAxios from '../utils/useAxios';
import { WebView } from 'react-native-webview';

const EditLeagueScreen = ({ route, navigation }) => {
  const { league } = route.params;
  const axios = useAxios();

  const [name, setName] = useState(league.name);
  const [sport, setSport] = useState(league.sport);
  const [location, setLocation] = useState(league.location);
  const [mapURL, setMapURL] = useState(`https://www.openstreetmap.org/search?query=${encodeURIComponent(league.location)}`);
  const [dateTime, setDateTime] = useState(new Date(league.date_time));
  const [showPicker, setShowPicker] = useState(false);
  const [leagueType, setLeagueType] = useState(league.league_type);
  const [maxPlayers, setMaxPlayers] = useState(String(league.max_players));
  const [price, setPrice] = useState(String(league.price));
  const [description, setDescription] = useState(league.description);

  const onChangeDateTime = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) setDateTime(selectedDate);
  };

  const handleLocationChange = (text) => {
    setLocation(text);
    setMapURL(`https://www.openstreetmap.org/search?query=${encodeURIComponent(text)}`);
  };

  const handleUpdate = async () => {
    try {
      const response = await axios.put(`http://10.0.2.2:8000/api/update-league/${league.id}/`, {
        name,
        sport,
        location,
        date_time: dateTime.toISOString(),
        league_type: leagueType,
        max_players: parseInt(maxPlayers),
        price: parseFloat(price),
        description,
      });
      Alert.alert('Success', 'League updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update league');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Edit League</Text>

      <TextInput style={styles.input} placeholder="League Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Sport" value={sport} onChangeText={setSport} />

      <TextInput
        style={styles.input}
        placeholder="Search Location"
        value={location}
        onChangeText={handleLocationChange}
      />
      <View style={{ height: 200, marginBottom: 10 }}>
        <WebView source={{ uri: mapURL }} style={{ flex: 1 }} />
      </View>

      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text>{dateTime.toLocaleString()}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={dateTime}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onChangeDateTime}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="League Type (e.g., knockout/round-robin)"
        value={leagueType}
        onChangeText={setLeagueType}
      />

      <TextInput
        style={styles.input}
        placeholder="Max Players"
        value={maxPlayers}
        onChangeText={setMaxPlayers}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />

      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={handleUpdate}>
        <Text style={styles.buttonText}>Update League</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#0d6efd',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default EditLeagueScreen;
