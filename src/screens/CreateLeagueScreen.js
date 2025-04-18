import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';

const { height } = Dimensions.get('window');

const CreateLeagueScreen = ({ navigation, route }) => {
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [sport, setSport] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [description, setDescription] = useState('');
  const [isCasual, setIsCasual] = useState(true);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (route.params?.coords) {
      const { latitude, longitude } = route.params.coords;
      setLatitude(latitude);
      setLongitude(longitude);
      setLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
    }
  }, [route.params?.coords]);


  const handleCalendarMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.date && data.time) {
        setDate(data.date);
        setTime(data.time);
      }
      setShowCalendar(false);
    } catch (error) {
      console.error('Invalid calendar data:', error);
    }
  };

  const onCreate = async () => {
    const payload = {
      name: leagueName,
      description,
      sport,
      location,
      latitude,
      longitude,
      date_time: `${date}T${time}`, // Combine properly or use a date library
      league_type: isCasual ? 'casual' : 'competitive',
    };
  
    try {
      const response = await fetch('http://127.0.0.1:8000/api/create-league/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) throw new Error('Something went wrong');
  
      const data = await response.json();
      console.log('League created!', data);
      // You can navigate or show success toast
    } catch (err) {
      console.error('Error creating league:', err);
    }
  };
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Where are you hosting?</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Location"
        placeholderTextColor="#888"
      />

      <TouchableOpacity style={styles.mapBtn} onPress={() => navigation.navigate('MapPicker')}>
        <Text style={styles.mapBtnText}>Choose on Map</Text>
      </TouchableOpacity>


      <Text style={styles.label}>Choose the Sport</Text>
      <TextInput
        style={styles.input}
        value={sport}
        onChangeText={setSport}
        placeholder="Type a sport..."
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Time & Date</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCalendar(true)}>
          <Icon name="calendar-outline" size={20} color="#fff" />
          <Text style={styles.dateText}>{date || 'Select Date'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCalendar(true)}>
          <Icon name="time-outline" size={20} color="#fff" />
          <Text style={styles.dateText}>{time || 'Select Time'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Name your League</Text>
      <TextInput
        style={styles.input}
        value={leagueName}
        onChangeText={setLeagueName}
        placeholder="Name"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Casual or Competitive</Text>
      <TouchableOpacity
        style={styles.casualBtn}
        onPress={() => setIsCasual(!isCasual)}
      >
        <Text style={styles.casualText}>
          {isCasual ? '⚪ Casual' : '🏆 Competitive'}
        </Text>
        <Icon name="chevron-forward-outline" size={20} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.textArea}
        value={description}
        onChangeText={setDescription}
        placeholder="Tell more about the event..."
        placeholderTextColor="#888"
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.createBtn} onPress={onCreate}>
        <Text style={styles.createText}>CREATE</Text>
      </TouchableOpacity>

      <Modal visible={showCalendar} animationType="slide">
        <WebView
          source={{ uri: 'https://cal.com/sanji-62/30min' }}
          onMessage={handleCalendarMessage}
          injectedJavaScript={`
            setTimeout(() => {
              const btns = document.querySelectorAll('button');
              btns.forEach(btn => {
                btn.addEventListener('click', () => {
                  const selected = document.querySelector('[data-testid="selected-date"]');
                  const timeSlot = document.querySelector('[data-testid="selected-time"]');
                  if (selected && timeSlot) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      date: selected.textContent,
                      time: timeSlot.textContent
                    }));
                  }
                });
              });
            }, 2000);
            true;
          `}
        />
        <TouchableOpacity
          onPress={() => setShowCalendar(false)}
          style={{ position: 'absolute', top: 40, right: 20, zIndex: 99 }}
        >
          <Icon name="close-circle" size={30} color="#FF2E94" />
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    padding: 20,
    paddingBottom: 60,
    minHeight: height,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
  },
  mapBtn: {
    backgroundColor: '#FF2E94',
    marginTop: 10,
    padding: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  mapBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  dateText: {
    color: '#fff',
  },
  casualBtn: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  casualText: {
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    color: '#fff',
  },
  createBtn: {
    backgroundColor: '#FF2E94',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 30,
  },
  createText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CreateLeagueScreen;