import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import { LocationContext } from '../context/LocationContext';
import { Fonts } from '../theme/fonts';

// Used only when the viewer's own location isn't available yet (permission
// still pending, or denied) — never shown to someone whose location we do
// have, however far from Kathmandu they actually are.
const KATHMANDU = { latitude: 27.7172, longitude: 85.3240, latitudeDelta: 0.05, longitudeDelta: 0.05 };

const MapPickerScreen = ({ navigation, route }) => {
  const { location } = useContext(LocationContext);
  const mapRef = useRef(null);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [mapReady, setMapReady] = useState(false);

  // Read once, at mount, on purpose: initialRegion (below) really is only
  // read on the map's first paint by both react-native-maps and the web
  // shim (src/shims/maps.web.js) — reacting to `location` changing after
  // that would need the controlled `region` prop instead, which the effect
  // below handles for the one case that matters (location resolves shortly
  // after this screen opens, not before).
  const initialRegionRef = useRef(
    location?.latitude && location?.longitude
      ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
      : KATHMANDU
  );
  // If location was still resolving when this screen mounted (so the map
  // opened centered on the Kathmandu fallback), recenter the moment it
  // arrives — but only that once, and only if the viewer hasn't already
  // picked a point, so it can never yank the map away from a deliberate
  // choice. Gated on mapReady too: location typically resolves almost
  // instantly (often cached), well before the map itself has finished
  // loading and can accept an animateToRegion call — calling it earlier is
  // silently dropped (real react-native-maps queues nothing either), so
  // without this the recenter simply never happened.
  const recenteredOnUser = useRef(false);
  useEffect(() => {
    if (recenteredOnUser.current || selectedCoords) return;
    if (!mapReady || !location?.latitude || !location?.longitude) return;
    recenteredOnUser.current = true;
    mapRef.current?.animateToRegion({
      latitude: location.latitude, longitude: location.longitude,
      latitudeDelta: 0.05, longitudeDelta: 0.05,
    });
  }, [mapReady, location?.latitude, location?.longitude, selectedCoords]);

  // Suggestions as you type, same debounce-then-Nominatim-search pattern as
  // CreateActivityScreen's own location field — this search box didn't have
  // one at all before, so typing a query only ever did anything once you
  // pressed Search/submit and jumped straight to its first result.
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(searchQuery.trim())}`,
          { headers: { 'User-Agent': 'StreetLeagueApp/1.0' } }
        );
        const data = await res.json();
        setSuggestions(data || []);
      } catch (err) {
        console.error('Location suggestions failed:', err);
      }
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
    setSuggestions([]);
    reverseGeocode(latitude, longitude);
  };

  // Same reverse-geocode round trip as tapping the map or pressing Search
  // (see the comment on handleSearch below) — a suggestion, a search and a
  // map tap all resolve their address the same way.
  const handleSuggestionPress = (item) => {
    const latitude = parseFloat(item.lat);
    const longitude = parseFloat(item.lon);
    setSuggestions([]);
    setSearchQuery(item.display_name);
    mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
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
    setSuggestions([]);
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
    <KeyboardAvoidingWrapper style={{ flex: 1 }} scroll={false}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={initialRegionRef.current}
        onPress={handleMapPress}
        onMapReady={() => setMapReady(true)}
      >
        {selectedCoords && <Marker coordinate={selectedCoords} />}
      </MapView>

      {/* Only the genuinely rare case now — GPS denied/unavailable AND the
          IP-based fallback (LocationContext) also failed, e.g. fully
          offline. Whenever the IP fallback succeeds, `location` already
          carries those approximate coordinates and this never shows. */}
      {!(location?.latitude && location?.longitude) && (
        <View style={styles.locationFallbackNotice}>
          <Ionicons name="information-circle-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.locationFallbackText}>
            Location unavailable — showing Kathmandu. Search to find your area.
          </Text>
        </View>
      )}

      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.searchCol}>
          <View style={styles.searchPill}>
            <TouchableOpacity
              onPress={handleSearch}
              disabled={searching}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Search"
            >
              {searching
                ? <ActivityIndicator size="small" color="#888" />
                : <Ionicons name="search" size={18} color="#888" />}
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a place"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearchQuery(''); setSuggestions([]); }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color="#bbb" />
              </TouchableOpacity>
            )}
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={item.place_id ?? index}
                  style={[
                    styles.suggestionItem,
                    index === suggestions.length - 1 && styles.suggestionItemLast,
                  ]}
                  onPress={() => handleSuggestionPress(item)}
                >
                  <Ionicons name="location-outline" size={16} color="#999" style={styles.suggestionIcon} />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.confirmText}>Confirm Location</Text>
      </TouchableOpacity>
    </KeyboardAvoidingWrapper>
  );
};

const styles = StyleSheet.create({
  locationFallbackNotice: {
    position: 'absolute',
    top: 104,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,20,0.85)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locationFallbackText: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  topRow: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,20,20,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  searchCol: {
    flex: 1,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    color: '#111',
    fontSize: 15,
    fontFamily: Fonts.medium,
    paddingVertical: 0,
  },
  suggestionsBox: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    maxHeight: 260,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    marginTop: 1,
  },
  suggestionText: {
    flex: 1,
    color: '#222',
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  confirmBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF2E94',
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  confirmText: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
});

export default MapPickerScreen;
