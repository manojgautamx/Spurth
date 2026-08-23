import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';

// Center + zoom-ish delta that includes every point (markers + optional
// user location), replacing Leaflet's map.fitBounds(). Padding multiplier
// keeps points off the very edge; the floor keeps a single point (or
// tightly clustered points) from producing an unusably tight zoom.
const regionFromPoints = (points) => {
  if (points.length === 0) return null;
  const lats = points.map(p => p.latitude);
  const lons = points.map(p => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.05),
    longitudeDelta: Math.max((maxLon - minLon) * 1.4, 0.05),
  };
};

const ExploreMapScreen = ({ navigation, route }) => {
  const { activities = [], userLocation = null } = route.params;

  const validActivities = activities.filter(a => a.latitude && a.longitude);

  const initialRegion = useMemo(() => {
    const points = validActivities.map(a => ({ latitude: a.latitude, longitude: a.longitude }));
    if (userLocation) points.push(userLocation);
    return regionFromPoints(points);
  }, [validActivities, userLocation]);

  const goToActivity = (activityId) => {
    // activityId only — see ActivityCard.js's handlePress for why the
    // full object isn't passed alongside it.
    navigation.navigate('ActivityViewerScreen', { activityId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events Near You</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{validActivities.length}</Text>
        </View>
      </View>

      {/* Map */}
      {validActivities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={54} color="#333" />
          <Text style={styles.emptyText}>No events with location data</Text>
        </View>
      ) : (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
        >
          {validActivities.map(a => (
            <Marker
              key={a.id}
              coordinate={{ latitude: a.latitude, longitude: a.longitude }}
              title={a.name}
              onPress={() => goToActivity(a.id)}
            />
          ))}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="You are here"
              pinColor="#2CB9B0"
            />
          )}
        </MapView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#2CB9B0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#555',
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
});

export default ExploreMapScreen;
