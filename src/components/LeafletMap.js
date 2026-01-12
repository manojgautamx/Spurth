import React, { useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

const LeafletMap = ({ latitude, longitude, label }) => {
  const webRef = useRef(null);

  const injectedJS = latitude && longitude
    ? `
      window.setMarker(${latitude}, ${longitude}, "${label}");
      true;
    `
    : '';

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <style>
        html, body, #map { height: 100%; margin: 0; background:#121212 }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map').setView([27.7172, 85.3240], 13); // instant fallback
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        let marker;

        window.setMarker = (lat, lon, label) => {
          map.setView([lat, lon], 15);
          if (marker) map.removeLayer(marker);
          marker = L.marker([lat, lon]).addTo(map).bindPopup(label).openPopup();
        };
      </script>
    </body>
  </html>
  `;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        injectedJavaScript={injectedJS}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
};

export default LeafletMap;
