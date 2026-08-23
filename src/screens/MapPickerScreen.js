import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const KATHMANDU = { latitude: 27.7172, longitude: 85.3240, latitudeDelta: 0.05, longitudeDelta: 0.05 };

const MapPickerScreen = ({ navigation, route }) => {
  const mapRef = useRef(null);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const reverseGeocode = async (latitude, longitude) => {
    setSelectedCoords({ latitude, longitude });
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { 'User-Agent': 'StreetLeagueApp/1.0', 'Accept': 'application/json' } }
      );
      const json = await response.json();
      setAddress(json.display_name || 'Unnamed location');
    } catch (err) {
      console.error('Error fetching address:', err);
      setAddress('Unnamed location');
    }
  };

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    reverseGeocode(latitude, longitude);
  };

  // Same forward-search-then-reverse-geocode round trip the original
  // mapPickerHtml.js search box did — kept as one behavior (not shortcut
  // to the forward result's own display_name) so a searched point and a
  // tapped point always resolve their address the same way.
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 3) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'StreetLeagueApp/1.0' } }
      );
      const data = await res.json();
      if (!data.length) return;
      const latitude = parseFloat(data[0].lat);
      const longitude = parseFloat(data[0].lon);
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      reverseGeocode(latitude, longitude);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    if (selectedCoords) {
      // Hand the result straight to the screen that opened the picker via a
      // callback in route params, then pop exactly one screen off the stack.
      // (Previously used navigate('CreateActivity', params) hoping it would
      // pop back to the existing screen — it didn't reliably remove this
      // screen from the stack, so pressing back afterwards reopened the map.)
      route?.params?.onLocationPicked?.({
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
        display_name: address || 'Unnamed location',
      });
      navigation.goBack();
    } else {
      Alert.alert('No location selected', 'Please tap on the map to select a location.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={KATHMANDU}
        onPress={handleMapPress}
      >
        {selectedCoords && <Marker coordinate={selectedCoords} />}
      </MapView>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search place..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
          {searching
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.searchBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
        <Text style={styles.confirmText}>Confirm Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  searchBox: {
    position: 'absolute',
    top: 80,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    color: '#000',
  },
  searchBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#ff2e94',
    borderRadius: 8,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
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
