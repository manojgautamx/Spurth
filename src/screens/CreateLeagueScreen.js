import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import axiosInstance from '../utils/axiosInstance';
import * as ImagePicker from 'react-native-image-picker';
import { Fonts } from '../theme/fonts';

const { height } = Dimensions.get('window');

const CATEGORIES = [
  'Music',
  'Tech',
  'Business',
  'Art & Culture',
  'Fitness',
  'Food & Drinks',
  'Networking',
  'Workshops',
  'Community',
  'Other',
];


const CreateLeagueScreen = ({ navigation, route }) => {

  // 🔥 Detect Edit Mode
  const editingLeague = route?.params?.league || null;
  const isEditing = !!editingLeague;

  // 🔥 Form fields
  const [location, setLocation] = useState(editingLeague?.location || '');
  const [latitude, setLatitude] = useState(editingLeague?.latitude || null);
  const [longitude, setLongitude] = useState(editingLeague?.longitude || null);
  const [sport, setSport] = useState(editingLeague?.sport || '');
  const [leagueName, setLeagueName] = useState(editingLeague?.name || '');
  const [description, setDescription] = useState(editingLeague?.description || '');
  const [categoryInput, setCategoryInput] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);

  
  // Defaulting to "Music" category style for the demo, but keeping logic generic
  const [isCasual, setIsCasual] = useState(
    editingLeague?.league_type === 'competitive' ? false : true
  );
  
  const [maxPlayers, setMaxPlayers] = useState(
    editingLeague?.max_players?.toString() || ''
  );
  const [price, setPrice] = useState(
    editingLeague?.price === 0 ? 'Free' : editingLeague?.price?.toString() || ''
  );

  // 🔥 Date & time
  const initialDate = editingLeague?.date_time
    ? editingLeague.date_time.split('T')[0]
    : '';
  const initialTime = editingLeague?.date_time
    ? editingLeague.date_time.split('T')[1].slice(0, 5)
    : '';

  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  // 🔥 Cover image
  const [coverImage, setCoverImage] = useState(null);

  // UI states
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🔥 Image picker
  const pickCoverImage = () => {
    ImagePicker.launchImageLibrary(
      { mediaType: 'photo', quality: 0.9 },
      res => {
        if (res.assets?.length) {
          setCoverImage(res.assets[0]);
        }
      }
    );
  };

  // 📍 Location autocomplete
  // 📍 Location autocomplete (FIXED)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!location || location.trim().length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(
            location
          )}`,
          {
            headers: {
              'User-Agent': 'StreetLeagueApp/1.0',
            },
          }
        );

        const data = await res.json();
        setSuggestions(data || []);
      } catch (err) {
        console.error('Location search failed:', err);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(timeoutId);
  }, [location]);


  useEffect(() => {
    if (route.params?.selectedLocation) {
      const { latitude, longitude, display_name } = route.params.selectedLocation;
      setLatitude(latitude);
      setLongitude(longitude);
      setLocation(display_name);
      setSuggestions([]);
    }
  }, [route.params?.selectedLocation]);

  const handleSuggestionPress = (item) => {
    setLocation(item.display_name);
    setLatitude(parseFloat(item.lat));
    setLongitude(parseFloat(item.lon));
    setSuggestions([]);
  };

  useEffect(() => {
    if (!categoryInput) {
      setFilteredCategories([]);
      return;
    }

    const matches = CATEGORIES.filter(cat =>
      cat.toLowerCase().includes(categoryInput.toLowerCase())
    );

    setFilteredCategories(matches);
  }, [categoryInput]);


  // 🔥 SUBMIT
  const handleSubmit = async () => {
    if (!leagueName || !location || !sport || !date || !time || !maxPlayers) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();

    formData.append('name', leagueName);
    formData.append('description', description);
    formData.append('sport', sport);
    formData.append('location', location);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('date_time', `${date}T${time}`);
    formData.append('league_type', isCasual ? 'casual' : 'competitive');
    formData.append('max_players', parseInt(maxPlayers));
    formData.append(
      'price',
      (!price || price.trim().toLowerCase() === 'free') ? 0 : price
    );

    if (coverImage) {
      formData.append('cover_image', {
        uri: coverImage.uri,
        name: coverImage.fileName || 'event.jpg',
        type: coverImage.type,
      });
    }

    try {
      if (isEditing) {
        await axiosInstance.put(
          `http://10.0.2.2:8000/api/update-league/${editingLeague.id}/`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        Alert.alert("Success", "Event updated!");
      } else {
        await axiosInstance.post(
          'http://10.0.2.2:8000/api/create-league/',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        Alert.alert("Success", "Event created!");
      }

      navigation.navigate('Home', { refresh: true });
    } catch (err) {
      console.error(err);
      setError('Failed to save event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <Text style={styles.screenTitle}>
          {isEditing ? "Edit Event" : "Create an Event"}
        </Text>

        {/* Location */}
        <Text style={styles.label}>Where are you hosting?</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Location"
          placeholderTextColor="#666"
        />

        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
             {suggestions.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
              >
                <Text style={{ color: '#fff' }}>{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Choose on Map Button */}
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('MapPicker')}
        >
          <Text style={styles.mapBtnText}>Choose on Map</Text>
        </TouchableOpacity>

        {/* Map Preview (Only if selected) */}
        {latitude !== null && longitude !== null && (
          <View style={styles.mapPreviewContainer}>
             <WebView
              source={{
                html: `
                  <html><body style="margin:0;">
                    <div id="map" style="height:400px;width:100%"></div>
                    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
                    <script>
                      var map = L.map('map').setView([${latitude}, ${longitude}], 13);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                      L.marker([${latitude}, ${longitude}]).addTo(map);
                    </script>
                  </body></html>
                `,
              }}
              style={{ flex: 1 }}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Date & Time */}
        <Text style={styles.label}>Time & Date</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.dateTimeInput,
              isEditing && { opacity: 0.5 }
            ]}
            onPress={() => {
              if (!isEditing) setDatePickerVisibility(true);
            }}
            disabled={isEditing}
          >
            <Icon name="calendar-outline" size={18} color="#666" style={{marginRight: 8}} />
            <Text style={[styles.dateTimeText, !date && styles.placeholderText]}>
              {date || 'Select Date'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dateTimeInput,
              isEditing && { opacity: 0.5 }
            ]}
            onPress={() => {
              if (!isEditing) setTimePickerVisibility(true);
            }}
            disabled={isEditing}
          >
            <Icon name="time-outline" size={18} color="#666" style={{marginRight: 8}} />
            <Text style={[styles.dateTimeText, !time && styles.placeholderText]}>
              {time || 'Select Time'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <Text style={styles.label}>Name your Event</Text>
        <TextInput
          style={styles.input}
          value={leagueName}
          onChangeText={setLeagueName}
          placeholder="eg. My Concert"
          placeholderTextColor="#666"
        />

        {/* Category */}
        <Text style={styles.label}>Category</Text>

        <View>
          <TextInput
            style={styles.input}
            value={categoryInput}
            placeholder="Type category..."
            placeholderTextColor="#666"
            onChangeText={text => {
              setCategoryInput(text);
              setSport(text); // keeps backend field intact
            }}
          />

          {filteredCategories.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {filteredCategories.map(item => (
                <TouchableOpacity
                  key={item}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setCategoryInput(item);
                    setSport(item);
                    setFilteredCategories([]);
                  }}
                >
                  <Text style={{ color: '#fff' }}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>


        {/* Max Joinees */}
        <Text style={styles.label}>Maximum Joinees</Text>
        <View style={styles.inputWithIcon}>
            <TextInput
            style={styles.flexInput}
            value={maxPlayers}
            onChangeText={setMaxPlayers}
            placeholder="eg. 20"
            keyboardType="numeric"
            placeholderTextColor="#666"
            />
            <Icon name="chevron-expand" size={20} color="#666" /> 
        </View>

        {/* Price */}
        <Text style={styles.label}>Price <Text style={styles.subLabel}>(Leave empty if Free)</Text></Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="Free"
          placeholderTextColor="#666"
        />

        {/* Info */}
        <Text style={styles.label}>Additional Info</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor="#666"
          multiline
        />

        {/* Cover Image */}
        <Text style={styles.label}>Cover Image</Text>
        <TouchableOpacity
          style={styles.imageUploadBox}
          onPress={pickCoverImage}
        >
          {coverImage ? (
            <Image
              source={{ uri: coverImage.uri }}
              style={styles.coverPreview}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.addImageText}>Add Image</Text>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createText}>
              {isEditing ? "Save Changes" : "Create"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Pickers */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={(d) => {
            // Format: Feb 24, 2026, Wednesday
            const options = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'long' };
            // Store ISO for logic, but could format for display if needed. 
            // For now keeping simple ISO split or custom format:
            setDate(d.toISOString().split('T')[0]); 
            setDatePickerVisibility(false);
          }}
          onCancel={() => setDatePickerVisibility(false)}
        />

        <DateTimePickerModal
          isVisible={isTimePickerVisible}
          mode="time"
          onConfirm={(t) => {
            // Format: 8:00 PM
            setTime(t.toTimeString().slice(0, 5));
            setTimePickerVisibility(false);
          }}
          onCancel={() => setTimePickerVisibility(false)}
        />

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },

  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 5,
  },

  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  screenTitle: {
    fontSize: 26,
    color: '#fff',
    marginTop: 10,
    marginBottom: 20,
    fontFamily: Fonts.bold,
  },

  label: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
    fontFamily: Fonts.semibold,
  },

  subLabel: {
    fontSize: 12,
    color: '#888',
    fontFamily: Fonts.regular,
  },

  input: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },

  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
  },

  flexInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },

  suggestionsContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 150,
  },

  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  mapBtn: {
    backgroundColor: '#2E7D32',
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  mapBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },

  mapPreviewContainer: {
    height: 150,
    marginTop: 15,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  dateTimeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  dateTimeText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.medium ?? Fonts.regular,
  },

  placeholderText: {
    color: '#666',
    fontFamily: Fonts.regular,
  },

  textArea: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 15,
    height: 120,
    textAlignVertical: 'top',
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },

  imageUploadBox: {
    height: 140,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },

  addImageText: {
    color: '#888',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },

  coverPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },

  createBtn: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 40,
    width: '100%',
  },

  createText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.bold,
  },

  errorText: {
    color: '#ff5252',
    marginTop: 15,
    textAlign: 'center',
    fontFamily: Fonts.regular,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  categoryModal: {
    backgroundColor: '#1C1C1E',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  modalTitle: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 16,
    fontFamily: Fonts.semibold,
  },

  categoryItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  categoryText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.regular,
  },

});


export default CreateLeagueScreen;