import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';

const ExploreMapScreen = ({ navigation, route }) => {
  const { activities = [], userLocation = null } = route.params;
  const webRef = useRef(null);


  // Build markers JS to inject after map loads
  const validActivities = activities.filter(
    a => a.latitude && a.longitude
  );

  const markersJson = JSON.stringify(
    validActivities.map(a => ({
      lat: a.latitude,
      lon: a.longitude,
      name: a.name,
      activityType: a.activity_type,
      id: a.id,
    }))
  );

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <style>
        html, body, #map {
          height: 100%;
          margin: 0;
          padding: 0;
          background: #121212;
        }
        .leaflet-popup-content-wrapper {
          background: #1A1A1A;
          color: #fff;
          border-radius: 10px;
          border: 1px solid #333;
        }
        .leaflet-popup-tip {
          background: #1A1A1A;
        }
        .leaflet-popup-content {
          margin: 10px 14px;
        }
        .popup-name {
          font-size: 14px;
          font-weight: bold;
          color: #fff;
          margin-bottom: 4px;
        }
        .popup-activity-type {
          font-size: 12px;
          color: #2CB9B0;
        }
        .popup-btn {
          display: inline-block;
          margin-top: 8px;
          background: #2CB9B0;
          color: #fff;
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 12px;
          cursor: pointer;
          border: none;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map').setView([20, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const markers = ${markersJson};

        if (markers.length > 0) {
          const bounds = [];

          markers.forEach(m => {
            const marker = L.marker([m.lat, m.lon]).addTo(map);

            marker.bindPopup(
              '<div class="popup-name">' + m.name + '</div>' +
              '<div class="popup-activity-type">' + m.activityType + '</div>' +
              '<button class="popup-btn" onclick="selectActivity(' + m.id + ')">View Event</button>'
            );

            bounds.push([m.lat, m.lon]);
          });

          ${userLocation ? `
            // Add user location marker
            L.circleMarker([${userLocation.latitude}, ${userLocation.longitude}], {
              radius: 10,
              fillColor: '#2CB9B0',
              color: '#fff',
              weight: 2,
              fillOpacity: 1,
            }).addTo(map).bindPopup('You are here');

            // Include user location in bounds
            bounds.push([${userLocation.latitude}, ${userLocation.longitude}]);
          ` : ''}

          // Fit map to show everything
          if (bounds.length === 1) {
            map.setView(bounds[0], 14);
          } else {
            map.fitBounds(bounds, { padding: [40, 40] });
          }
        }

        function selectActivity(id) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ activityId: id }));
        }
      </script>
    </body>
  </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.activityId) {
        const activity = validActivities.find(a => a.id === data.activityId);
        if (activity) {
          navigation.navigate('ActivityViewerScreen', { activity });
        }
      }
    } catch (e) {
      console.warn('Map message error', e);
    }
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
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          style={{ flex: 1 }}
        />
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