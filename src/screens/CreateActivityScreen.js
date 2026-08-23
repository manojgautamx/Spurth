import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axiosInstance from '../utils/axiosInstance';
import { appendImageAsset } from '../utils/appendImageAsset';
import * as ImagePicker from 'react-native-image-picker';
import { Fonts } from '../theme/fonts';
import { BASE_URL } from '../config';
import { useIsWideWeb } from '../utils/responsive';
import { ProfileStatusContext } from '../navigation/AppNavigator';

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

const TOTAL_STEPS = 3;

const CreateActivityScreen = ({ navigation, route }) => {
  const isWideWeb = useIsWideWeb();
  const { phoneVerified } = useContext(ProfileStatusContext);

  // 🔥 Detect Edit Mode
  const editingActivity = route?.params?.activity || null;
  const isEditing = !!editingActivity;

  // Hosting a NEW activity requires phone verification (editing an
  // existing one you already host does not — that hits update-activity/,
  // which isn't gated). This is a UX shortcut; the real enforcement is
  // server-side in CreateActivityView.
  useEffect(() => {
    if (!isEditing && !phoneVerified) {
      navigation.replace('PhoneVerification');
    }
  }, [isEditing, phoneVerified]);

  // 🔥 Step state
  const [step, setStep] = useState(1);

  // 🔥 Form fields
  const [location, setLocation] = useState(editingActivity?.location || '');
  const [latitude, setLatitude] = useState(editingActivity?.latitude || null);
  const [longitude, setLongitude] = useState(editingActivity?.longitude || null);
  const [activityType, setActivityType] = useState(editingActivity?.activity_type || '');
  const [activityName, setActivityName] = useState(editingActivity?.name || '');
  const [description, setDescription] = useState(editingActivity?.description || '');
  const [categoryInput, setCategoryInput] = useState(editingActivity?.activity_type || '');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [isCasual, setIsCasual] = useState(
    editingActivity?.format === 'competitive' ? false : true
  );
  const [maxPlayers, setMaxPlayers] = useState(
    editingActivity?.max_players?.toString() || ''
  );
  const [price, setPrice] = useState(
    editingActivity?.price === 0 ? 'Free' : editingActivity?.price?.toString() || ''
  );

  // 🔥 Date & time
  const initialDate = editingActivity?.date_time
    ? editingActivity.date_time.split('T')[0]
    : '';
  const initialTime = editingActivity?.date_time
    ? editingActivity.date_time.split('T')[1].slice(0, 5)
    : '';
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  const [coverImage, setCoverImage] = useState(
    editingActivity?.cover_image ? { uri: editingActivity.cover_image } : null
  );

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
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!location || location.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(location)}`,
          { headers: { 'User-Agent': 'StreetLeagueApp/1.0' } }
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

  // Called directly by MapPickerScreen via a callback passed through route
  // params, then it calls navigation.goBack() itself — this guarantees a
  // clean single pop off the stack instead of relying on navigate()'s
  // pop-to-existing-screen behavior, which wasn't reliably removing
  // MapPicker from the stack (pressing back afterwards re-opened the map).
  const handleLocationPicked = (loc) => {
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setLocation(loc.display_name);
    setSuggestions([]);
  };

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

  // 🔥 Step navigation
  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(step - 1);
    }
  };

  const handleContinueStep1 = () => {
    if (!location) {
      Alert.alert('Missing Field', 'Please enter a location.');
      return;
    }
    setStep(2);
  };

  const handleContinueStep2 = () => {
    if (!activityName || !activityType || !date || !time) {
      Alert.alert('Missing Fields', 'Please fill in all event details.');
      return;
    }
    setStep(3);
  };

  // 🔥 SUBMIT
  const handleSubmit = async () => {
    if (!maxPlayers) {
      Alert.alert('Missing Fields', 'Please enter maximum joinees.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('name', activityName);
    formData.append('description', description);
    formData.append('activity_type', activityType);
    formData.append('location', location);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('date_time', `${date}T${time}`);
    formData.append('format', isCasual ? 'casual' : 'competitive');
    formData.append('max_players', parseInt(maxPlayers));
    formData.append(
      'price',
      (!price || price.trim().toLowerCase() === 'free') ? 0 : price
    );

    appendImageAsset(formData, 'cover_image', coverImage, `event_${Date.now()}.jpg`);

    try {
      if (isEditing) {
        const res = await axiosInstance.put(
          `${BASE_URL}/api/update-activity/${editingActivity.id}/`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        Alert.alert('Success', 'Event updated!', [
          {
            text: 'OK',
            onPress: () => navigation.reset({
              index: 1,
              routes: [
                { name: 'MainTabs' },  // ← replace with your actual home screen name
                { name: 'ActivityViewerScreen', params: { activity: res.data } },
              ],
            }),
          },
        ]);
      } else {
        const res = await axiosInstance.post(
          `${BASE_URL}/api/create-activity/`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        Alert.alert('Success', 'Event created!', [
          {
            text: 'OK',
            onPress: () => navigation.reset({
              index: 1,
              routes: [
                { name: 'MainTabs' },  // ← replace with your actual home screen name
                { name: 'ActivityViewerScreen', params: { activity: res.data } },
              ],
            }),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save event.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step Dots ────────────────────────────────────────────────────────────
  const StepDots = () => (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const idx = i + 1;
        const isActive = idx === step;
        const isDone = idx < step;
        return (
          <View
            key={idx}
            style={[
              styles.dot,
              isActive && styles.dotActive,
              isDone && styles.dotDone,
            ]}
          />
        );
      })}
    </View>
  );

  // ── Shared header ────────────────────────────────────────────────────────
  const Header = ({ title, subtitle }) => (
    <>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
        <Icon name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>
      <StepDots />
      <Text style={styles.stepTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stepSubtitle}>{subtitle}</Text> : null}
    </>
  );

  // ════════════════════════════════════════════════════════════════════════
  // STEP 1 — Location
  // ════════════════════════════════════════════════════════════════════════
  if (step === 1) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.stepContainer, isWideWeb && styles.stepContainerWeb]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={isWideWeb && styles.webCenter}>
              <Header
                title={isEditing ? 'Edit Location' : 'Where are you\nhosting?'}
                subtitle="Step 1 of 3"
              />

              {/* Location input */}
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.fieldInput}>
                <Icon name="location-outline" size={16} color="#555" style={styles.fieldIcon} />
                <TextInput
                  style={styles.fieldTextInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Search location..."
                  placeholderTextColor="#555"
                />
              </View>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionPress(item)}
                    >
                      <Icon name="location-outline" size={13} color="#555" style={{ marginRight: 8, marginTop: 1 }} />
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Choose on Map */}
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => navigation.navigate('MapPicker', { onLocationPicked: handleLocationPicked })}
              >
                <Icon name="map-outline" size={14} color="#ce49d7" style={{ marginRight: 6 }} />
                <Text style={styles.mapBtnText}>Choose on Map</Text>
              </TouchableOpacity>

              {/* Map preview */}
              {latitude !== null && longitude !== null && (
                <View style={styles.mapPreviewContainer}>
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    region={{ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker coordinate={{ latitude, longitude }} />
                  </MapView>
                </View>
              )}

              <View style={{ height: 100 }} />
            </View>
          </ScrollView>

          {/* Continue CTA */}
          <View style={[styles.bottomAction, isWideWeb && styles.bottomActionWeb]}>
            <View style={isWideWeb && styles.webCenter}>
              <TouchableOpacity style={styles.continueBtn} onPress={handleContinueStep1}>
                <Text style={styles.continueBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP 2 — Event Details (Name, Category, Date & Time, Type)
  // ════════════════════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.stepContainer, isWideWeb && styles.stepContainerWeb]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={isWideWeb && styles.webCenter}>
              <Header title="Event Details" subtitle="Step 2 of 3" />

              {/* Event Name */}
              <Text style={styles.fieldLabel}>Event Name</Text>
              <View style={styles.fieldInput}>
                <TextInput
                  style={styles.fieldTextInput}
                  value={activityName}
                  onChangeText={setActivityName}
                  placeholder="eg. My Concert"
                  placeholderTextColor="#555"
                />
              </View>

              {/* Category */}
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.fieldInput}>
                <Icon name="grid-outline" size={16} color="#555" style={styles.fieldIcon} />
                <TextInput
                  style={styles.fieldTextInput}
                  value={categoryInput}
                  placeholder="Type or select a category..."
                  placeholderTextColor="#555"
                  onChangeText={text => {
                    setCategoryInput(text);
                    setActivityType(text);
                  }}
                />
              </View>

              {filteredCategories.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {filteredCategories.map(item => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setCategoryInput(item);
                        setActivityType(item);
                        setFilteredCategories([]);
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Category quick-tags */}
              <View style={styles.tagsWrap}>
                {CATEGORIES.map(cat => {
                  const selected = activityType === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.tag, selected && styles.tagSelected]}
                      onPress={() => {
                        setActivityType(cat);
                        setCategoryInput(cat);
                        setFilteredCategories([]);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Date & Time */}
              <Text style={styles.fieldLabel}>Date & Time</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.fieldInput, { flex: 1 }, isEditing && { opacity: 0.5 }]}
                  onPress={() => { if (!isEditing) setDatePickerVisibility(true); }}
                  disabled={isEditing}
                >
                  <Icon name="calendar-outline" size={16} color="#555" style={styles.fieldIcon} />
                  <Text style={[styles.fieldInputText, !date && styles.placeholderText]}>
                    {date || 'Select Date'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.fieldInput, { flex: 1 }, isEditing && { opacity: 0.5 }]}
                  onPress={() => { if (!isEditing) setTimePickerVisibility(true); }}
                  disabled={isEditing}
                >
                  <Icon name="time-outline" size={16} color="#555" style={styles.fieldIcon} />
                  <Text style={[styles.fieldInputText, !time && styles.placeholderText]}>
                    {time || 'Select Time'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 100 }} />
            </View>
          </ScrollView>

          <View style={[styles.bottomAction, isWideWeb && styles.bottomActionWeb]}>
            <View style={isWideWeb && styles.webCenter}>
              <TouchableOpacity style={styles.continueBtn} onPress={handleContinueStep2}>
                <Text style={styles.continueBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>

          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={(d) => {
              setDate(d.toISOString().split('T')[0]);
              setDatePickerVisibility(false);
            }}
            onCancel={() => setDatePickerVisibility(false)}
          />
          <DateTimePickerModal
            isVisible={isTimePickerVisible}
            mode="time"
            onConfirm={(t) => {
              setTime(t.toTimeString().slice(0, 5));
              setTimePickerVisibility(false);
            }}
            onCancel={() => setTimePickerVisibility(false)}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP 3 — Final Touches (Max Players, Price, Description, Cover Image)
  // ════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.stepContainer, isWideWeb && styles.stepContainerWeb]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={isWideWeb && styles.webCenter}>
            <Header title="Final Touches" subtitle="Step 3 of 3" />

            {/* Max Players */}
            <Text style={styles.fieldLabel}>Maximum Joinees</Text>
            <View style={styles.fieldInput}>
              <Icon name="people-outline" size={16} color="#555" style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldTextInput}
                value={maxPlayers}
                onChangeText={setMaxPlayers}
                placeholder="eg. 20"
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>

            {/* Price */}
            <Text style={styles.fieldLabel}>
              Price{' '}
              <Text style={styles.optionalLabel}>(leave empty if free)</Text>
            </Text>
            <View style={styles.fieldInput}>
              <Icon name="pricetag-outline" size={16} color="#555" style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldTextInput}
                value={price}
                onChangeText={setPrice}
                placeholder="Free"
                placeholderTextColor="#555"
              />
            </View>

            {/* Description */}
            <Text style={styles.fieldLabel}>Additional Info</Text>
            <View style={[styles.fieldInput, styles.textAreaInput]}>
              <TextInput
                style={styles.textAreaTextInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your event..."
                placeholderTextColor="#555"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Cover Image */}
            <Text style={styles.fieldLabel}>Cover Image</Text>
            <TouchableOpacity style={styles.imageUploadBox} onPress={pickCoverImage}>
              {coverImage ? (
                <Image
                  source={{ uri: coverImage.uri }}
                  style={styles.coverPreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Icon name="image-outline" size={28} color="#333" />
                  <Text style={styles.addImageText}>Add Cover Image</Text>
                </View>
              )}
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={{ height: 100 }} />
          </View>
        </ScrollView>

        <View style={[styles.bottomAction, isWideWeb && styles.bottomActionWeb]}>
          <View style={isWideWeb && styles.webCenter}>
            <TouchableOpacity
              style={[styles.continueBtn, styles.tealBtn]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.continueBtnText}>
                  {isEditing ? 'Save Changes' : 'Create Activity'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: (StatusBar.currentHeight || 44) + 8,
    paddingBottom: 20,
  },
  // Wide web: center the form as a fixed-width column (matches Home/Explore's
  // 680px center column) instead of letting fields stretch edge-to-edge.
  stepContainerWeb: {
    alignItems: 'center',
  },
  webCenter: {
    width: '100%',
    maxWidth: 680,
  },
  bottomActionWeb: {
    alignItems: 'center',
  },

  // ── Nav & Steps ───────────────────────────────────────────────────────────
  backBtn: {
    marginBottom: 24,
    width: 36,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#222',
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
    backgroundColor: '#8575ff',
  },
  dotDone: {
    backgroundColor: '#8575ff',
  },

  // ── Typography ────────────────────────────────────────────────────────────
  stepTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.2,
    fontFamily: Fonts.bold,
  },
  stepSubtitle: {
    color: '#555',
    fontSize: 13,
    marginBottom: 28,
    fontFamily: Fonts.regular,
  },
  fieldLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 20,
    fontFamily: Fonts.semibold,
  },
  optionalLabel: {
    color: '#555',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Fonts.regular,
  },

  // ── Inputs ────────────────────────────────────────────────────────────────
  fieldInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInputText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    fontFamily: Fonts.regular,
  },
  fieldTextInput: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    padding: 0,
    fontFamily: Fonts.regular,
  },
  placeholderText: {
    color: '#555',
  },
  textAreaInput: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  textAreaTextInput: {
    color: '#ccc',
    fontSize: 14,
    minHeight: 120,
    width: '100%',
    padding: 0,
    fontFamily: Fonts.regular,
  },

  // ── Suggestions ───────────────────────────────────────────────────────────
  suggestionsContainer: {
    backgroundColor: '#141414',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestionText: {
    color: '#ccc',
    fontSize: 13,
    flex: 1,
    fontFamily: Fonts.regular,
  },

  // ── Map ───────────────────────────────────────────────────────────────────
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c0732',
    marginTop: 14,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#c54ace',
  },
  mapBtnText: {
    color: '#D44FDD',
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  mapPreviewContainer: {
    height: 160,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },

  // ── Category Tags ─────────────────────────────────────────────────────────
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#111',
  },
  tagSelected: {
    backgroundColor: '#D44FDD',
    borderColor: '#ce49d7',
  },
  tagText: {
    color: '#666',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  tagTextSelected: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: Fonts.semibold,
  },

  // ── Event Type Toggle ─────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
    alignItems: 'center',
  },
  typeBtnSelected: {
    backgroundColor: '#D44FDD',
    borderColor: '#ce49d7',
  },
  typeBtnText: {
    color: '#555',
    fontSize: 14,
    fontFamily: Fonts.medium ?? Fonts.regular,
  },
  typeBtnTextSelected: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: Fonts.semibold,
  },

  // ── Cover Image ───────────────────────────────────────────────────────────
  imageUploadBox: {
    height: 150,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addImageText: {
    color: '#444',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorText: {
    color: '#ff5252',
    marginTop: 16,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 13,
  },

  // ── Bottom CTA ────────────────────────────────────────────────────────────
  bottomAction: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    paddingTop: 12,
    backgroundColor: '#0A0A0A',
  },
  continueBtn: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 40,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tealBtn: {
    backgroundColor: '#D44FDD',
    borderColor: '#ce49d7',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Fonts.semibold,
  },
});

export default CreateActivityScreen;