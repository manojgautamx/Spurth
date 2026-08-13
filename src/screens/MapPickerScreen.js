import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { MAP_PICKER_HTML } from '../assets/mapPickerHtml';

const MapPickerScreen = ({ navigation }) => {
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [address, setAddress] = useState('');

  const handleMessage = async (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    const { latitude, longitude } = data;

    setSelectedCoords(data);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'StreetLeagueApp/1.0',
            'Accept': 'application/json',
          },
        }
      );
      const json = await response.json();
      const displayName = json.display_name || 'Unnamed location';
      setAddress(displayName);
    } catch (err) {
      console.error('Error fetching address:', err);
      setAddress('Unnamed location');
    }
  };

  const handleConfirm = () => {
    if (selectedCoords) {
      navigation.navigate('CreateLeague', {
        selectedLocation: {
          latitude: selectedCoords.latitude,
          longitude: selectedCoords.longitude,
          display_name: address || 'Unnamed location',
        },
      });
    } else {
      Alert.alert('No location selected', 'Please tap on the map to select a location.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={
          Platform.OS === 'web'
            ? { html: MAP_PICKER_HTML }
            : { uri: 'file:///android_asset/map.html' }
        }
        onMessage={handleMessage}
        originWhitelist={['*']}
        allowFileAccess
        javaScriptEnabled
      />

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
        <Text style={styles.confirmText}>Confirm Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  confirmBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#FF2E94',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MapPickerScreen;
