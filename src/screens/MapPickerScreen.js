import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

const MapPickerScreen = ({ navigation, route }) => {
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 27.700769, // Kathmandu default
    longitude: 85.300140,
  });

  const onMapPress = (e) => {
    setSelectedLocation(e.nativeEvent.coordinate);
  };

  const handleConfirm = () => {
    navigation.navigate('CreateLeague', { coords: selectedLocation });
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider={null} // Important: to allow custom tiles
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...selectedLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={onMapPress}
      >
        <UrlTile
          urlTemplate="http://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        <Marker coordinate={selectedLocation} />
      </MapView>

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
