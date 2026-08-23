// Web fallback for react-native-maps. Loads the Google Maps JavaScript API
// directly — no npm dependency — the same dynamic-<script>-injection
// pattern already used by src/shims/googleSignin.web.js. Implements only
// the subset of react-native-maps' API this app actually uses (MapView +
// Marker), matching its prop/event shapes so call sites work unmodified
// on both native and web.
import React, {
  createContext, forwardRef, useContext, useEffect,
  useImperativeHandle, useRef, useState,
} from 'react';
import { View } from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '../config';

let loadPromise = null;
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

// Rough heuristic converting a react-native-maps style region's
// latitudeDelta (how many degrees of latitude are visible) into a Google
// Maps zoom level — there's no exact conversion, but this reads close
// enough for the deltas this app actually passes (small, single-city).
const regionToZoom = (latitudeDelta) => {
  if (!latitudeDelta) return 13;
  return Math.max(1, Math.round(Math.log2(360 / latitudeDelta)));
};

const DEFAULT_CENTER = { lat: 27.7172, lng: 85.3240 }; // Kathmandu — matches the native map.html's fallback view

const MapContext = createContext(null);

const MapView = forwardRef(function MapView({ style, initialRegion, region, onPress, children }, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;
      const initial = initialRegion || region;
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        center: initial ? { lat: initial.latitude, lng: initial.longitude } : DEFAULT_CENTER,
        zoom: initial ? regionToZoom(initial.latitudeDelta) : 13,
        streetViewControl: false,
        mapTypeControl: false,
      });
      mapRef.current.addListener('click', (e) => {
        onPressRef.current?.({
          nativeEvent: { coordinate: { latitude: e.latLng.lat(), longitude: e.latLng.lng() } },
        });
      });
      setReady(true);
    }).catch((err) => console.warn('Google Maps failed to load', err));
    return () => { cancelled = true; };
  }, []);

  // Controlled `region` prop — recenters an already-mounted map (e.g. once
  // the user's live location resolves after the map already rendered).
  useEffect(() => {
    if (!ready || !region || !mapRef.current) return;
    mapRef.current.panTo({ lat: region.latitude, lng: region.longitude });
    if (region.latitudeDelta) mapRef.current.setZoom(regionToZoom(region.latitudeDelta));
  }, [ready, region?.latitude, region?.longitude, region?.latitudeDelta]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (r) => {
      if (!mapRef.current) return;
      mapRef.current.panTo({ lat: r.latitude, lng: r.longitude });
      if (r.latitudeDelta) mapRef.current.setZoom(regionToZoom(r.latitudeDelta));
    },
  }));

  return (
    <View style={style}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {ready && <MapContext.Provider value={mapRef.current}>{children}</MapContext.Provider>}
    </View>
  );
});

function Marker({ coordinate, title, pinColor, onPress }) {
  const map = useContext(MapContext);

  useEffect(() => {
    if (!map || !coordinate) return;
    const marker = new window.google.maps.Marker({
      position: { lat: coordinate.latitude, lng: coordinate.longitude },
      map,
      title,
      icon: pinColor ? {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: pinColor,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        scale: 8,
      } : undefined,
    });
    const listener = onPress ? marker.addListener('click', () => onPress()) : null;
    return () => {
      listener?.remove();
      marker.setMap(null);
    };
  }, [map, coordinate?.latitude, coordinate?.longitude, title, pinColor, onPress]);

  return null;
}

export const PROVIDER_GOOGLE = 'google';
export { Marker };
export default MapView;
