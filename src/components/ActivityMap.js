import React from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const ActivityMap = ({ latitude, longitude, label }) => {
  const hasCoords = !!(latitude && longitude);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        region={
          hasCoords
            ? { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : { latitude: 27.7172, longitude: 85.3240, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      >
        {hasCoords && <Marker coordinate={{ latitude, longitude }} title={label} />}
      </MapView>
    </View>
  );
};

export default ActivityMap;
