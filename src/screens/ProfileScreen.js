import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../utils/axiosInstance';
import { appendImageAsset } from '../utils/appendImageAsset';
import { ProfileStatusContext } from '../navigation/AppNavigator';
import { LocationContext } from '../context/LocationContext';
import { BASE_URL } from '../config';
import { useIsWideWeb } from '../utils/responsive';
import { Fonts } from '../theme/fonts';

// Most people creating a profile are adults — defaulting the picker to
// today (as `new Date()` did) forced everyone to scroll back decades.
const DEFAULT_BIRTH_DATE = new Date(2000, 0, 1);

// ── Interest categories from categoryMapper ──────────────────────────────────

const CATEGORY_GROUPS = {
  Sports: [
    'Football', 'Soccer', 'Futsal', 'Cricket', 'Basketball',
    'Volleyball', 'Badminton', 'Tennis', 'Table Tennis',
    'Baseball', 'Rugby', 'Hockey',
  ],
  Fitness: [
    'Gym', 'Fitness', 'Workout', 'Yoga', 'Pilates',
    'Crossfit', 'Cardio', 'Zumba',
  ],
  Adventure: [
    'Hiking', 'Trekking', 'Cycling', 'Biking', 'Running',
    'Marathon', 'Climbing', 'Camping', 'Rafting',
  ],
  Gaming: [
    'Esports', 'Gaming', 'Chess', 'Board Games', 'Poker',
  ],
  Arts: [
    'Music', 'Concert', 'Dance', 'Painting', 'Photography', 'Art',
  ],
  Education: [
    'Meetup', 'Workshop', 'Seminar', 'Networking', 'Study Group',
  ],
  Lifestyle: [
    'Food', 'Cooking', 'Coffee', 'Wine', 'BBQ',
  ],
  Tech: [
    'Startup', 'Tech', 'Coding', 'Hackathon', 'Business',
  ],
};

const MAX_INTERESTS = 5;

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const isWideWeb = useIsWideWeb();
  const [step, setStep] = useState(1); // 1 = photo, 2 = details, 3 = interests

  // Step 1
  const [avatar, setAvatar] = useState(null);

  // Step 2
  const [birthDate, setBirthDate] = useState(DEFAULT_BIRTH_DATE);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');

  // Step 3
  const [interests, setInterests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');

  const { refreshProfileStatus } = useContext(ProfileStatusContext);

  // ── Location: auto-fill from device GPS, fall back to search-as-you-type ────
  const { location: deviceLocation } = useContext(LocationContext);
  const [autoFillingLocation, setAutoFillingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const locationAutoFillTried = useRef(false);
  // Distinguishes the user typing from the reverse-geocode effect writing to
  // `location` itself — only the former should trigger a suggestions search.
  const userEditedLocation = useRef(false);

  useEffect(() => {
    if (!deviceLocation || location || locationAutoFillTried.current) return;
    locationAutoFillTried.current = true;
    setAutoFillingLocation(true);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${deviceLocation.latitude}&lon=${deviceLocation.longitude}`,
      { headers: { 'User-Agent': 'StreetLeagueApp/1.0' } }
    )
      .then(res => res.json())
      .then(data => {
        const addr = data?.address || {};
        const place = addr.city || addr.town || addr.village || addr.county || addr.state;
        const label = [place, addr.country].filter(Boolean).join(', ');
        if (label) setLocation(label);
      })
      .catch(err => console.warn('Reverse geocode failed:', err))
      .finally(() => setAutoFillingLocation(false));
  }, [deviceLocation]);

  useEffect(() => {
    if (!userEditedLocation.current) return;
    if (!location || location.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(location)}`,
          { headers: { 'User-Agent': 'StreetLeagueApp/1.0' } }
        );
        const data = await res.json();
        setLocationSuggestions(data || []);
      } catch (err) {
        console.warn('Location search failed:', err);
      }
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [location]);

  const handleLocationChange = (text) => {
    userEditedLocation.current = true;
    setLocation(text);
  };

  const handleLocationSuggestionPress = (item) => {
    userEditedLocation.current = false;
    setLocation(item.display_name);
    setLocationSuggestions([]);
  };

  // ── Step 1: Photo ──────────────────────────────────────────────────────────

  const pickFromLibrary = () => {
    launchImageLibrary({ mediaType: 'photo', maxHeight: 800, maxWidth: 800 }, res => {
      if (res.assets?.[0]) setAvatar(res.assets[0]);
    });
  };

  const pickFromCamera = () => {
    launchCamera({ mediaType: 'photo', maxHeight: 800, maxWidth: 800 }, res => {
      if (res.assets?.[0]) setAvatar(res.assets[0]);
    });
  };

  const showPhotoPicker = () => {
    Alert.alert('Upload Photo', null, [
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Gallery', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Step 3: Interests ──────────────────────────────────────────────────────

  const toggleInterest = (item) => {
    if (interests.includes(item)) {
      setInterests(interests.filter(i => i !== item));
    } else {
      if (interests.length >= MAX_INTERESTS) {
        Alert.alert('Limit reached', `You can only pick ${MAX_INTERESTS} interests.`);
        return;
      }
      setInterests([...interests, item]);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const formData = new FormData();

      appendImageAsset(formData, 'avatar', avatar);

      formData.append('birth_date', birthDate.toISOString().split('T')[0]);
      formData.append('full_name', fullName);
      formData.append('gender', gender);
      formData.append('location', location);
      formData.append('bio', bio);
      interests.forEach(i => formData.append('interests', i.toLowerCase()));

      await axiosInstance.post('profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Re-check with the server rather than optimistically assuming
      // success — keeps the client's notion of "complete" from drifting
      // out of sync with whatever the backend actually requires (that
      // exact drift was previously bouncing users back to onboarding on
      // their next session/reload, even though they'd already finished it).
      await refreshProfileStatus();

    } catch (err) {
      const detail = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      console.error('Profile error:', detail);
      Alert.alert('Error', `Could not save profile: ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };
  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* ── STEP 1: Pick Interests ───────────────────────────────────────── */}
      {step === 1 && (
        <View style={[styles.stepContainer, isWideWeb && styles.stepContainerWeb]}>
          <View style={[{ flex: 1, width: '100%' }, isWideWeb && styles.webCenter]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.interestHeader}>
              <Text style={styles.stepTitle}>Pick your Interest</Text>
              <Text style={styles.interestCount}>
                {interests.length}/{MAX_INTERESTS} Selected
              </Text>
            </View>

            <ScrollView
              style={styles.interestScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.interestScroll}
            >
              {Object.entries(CATEGORY_GROUPS).map(([category, items]) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryLabel}>{category}</Text>
                  <View style={styles.tagsWrap}>
                    {items.map(item => {
                      const selected = interests.includes(item);
                      return (
                        <TouchableOpacity
                          key={item}
                          style={[styles.tag, selected && styles.tagSelected]}
                          onPress={() => toggleInterest(item)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          </View>

          <View style={[styles.bottomAction, isWideWeb && styles.bottomActionWeb]}>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => setStep(2)}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── STEP 2: Upload Photo ─────────────────────────────────────────── */}
      {step === 2 && (
        <View style={[styles.stepContainer, isWideWeb && styles.stepContainerWeb]}>
          <View style={[{ width: '100%' }, isWideWeb && styles.webCenter]}>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.stepTitle}>Upload your Photo</Text>
            <Text style={styles.stepSubtitle}>Upload or Capture Now</Text>

            <TouchableOpacity style={styles.photoBox} onPress={showPhotoPicker} activeOpacity={0.8}>
              {avatar ? (
                <Image source={{ uri: avatar.uri }} style={styles.photoPreview} />
              ) : (
                <Ionicons name="add" size={52} color="#333" />
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.bottomAction, isWideWeb && styles.bottomActionWeb]}>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => setStep(3)}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── STEP 3: Personal Details ─────────────────────────────────────── */}
      {step === 3 && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.stepContainer, isWideWeb && styles.stepContainerWeb]}
            keyboardShouldPersistTaps="handled"
          >
          <View style={[{ width: '100%' }, isWideWeb && styles.webCenter]}>
            <TouchableOpacity onPress={() => setStep(2)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.stepTitle}>Personal Details</Text>

            {/* Full Name */}
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.fieldInput}>
              <TextInput
                style={styles.fieldTextInput}
                placeholder="Enter your full name"
                placeholderTextColor="#555"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Gender */}
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {['male', 'female', 'other'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, gender === g && styles.genderBtnSelected]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextSelected]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date of Birth */}
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.fieldInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#888" style={styles.fieldIcon} />
              <Text style={styles.fieldInputText}>
                {birthDate.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  weekday: 'long',
                })}
              </Text>
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={showDatePicker}
              mode="date"
              date={birthDate}
              maximumDate={new Date()}
              onConfirm={(date) => {
                setShowDatePicker(false);
                setBirthDate(date);
              }}
              onCancel={() => setShowDatePicker(false)}
            />

            {/* Location */}
            <Text style={styles.fieldLabel}>Location</Text>
            <View style={styles.fieldInput}>
              <Ionicons name="location-outline" size={18} color="#888" style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldTextInput}
                placeholder={autoFillingLocation ? 'Detecting your location…' : 'Where are you based?'}
                placeholderTextColor="#555"
                value={location}
                onChangeText={handleLocationChange}
              />
            </View>
            {locationSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {locationSuggestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleLocationSuggestionPress(item)}
                  >
                    <Ionicons name="location-outline" size={13} color="#555" style={{ marginRight: 8, marginTop: 1 }} />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Bio */}
            <Text style={styles.fieldLabel}>Bio</Text>
            <View style={[styles.fieldInput, styles.bioInput]}>
              <TextInput
                style={styles.bioTextInput}
                placeholder="What's your line?"
                placeholderTextColor="#555"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <View style={[styles.bottomAction, isWideWeb && styles.bottomActionWeb]}>
              <TouchableOpacity
                style={[styles.continueBtn, styles.tealBtn]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.continueBtnText}>
                  {submitting ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: (StatusBar.currentHeight || 44) + 8,
    paddingBottom: 20,
  },
  // Wide web: center the form as a fixed-width column (matches
  // CreateActivityScreen's 680px center column) instead of letting fields
  // stretch edge-to-edge across a wide desktop viewport.
  stepContainerWeb: {
    alignItems: 'center',
  },
  webCenter: {
    width: '100%',
    maxWidth: 680,
  },
  // bottomAction below is `position: fixed` (see its own comment), so
  // alignItems doesn't center it the way it does on CreateActivityScreen —
  // it needs to be centered directly via left/width/marginLeft instead.
  bottomActionWeb: {
    left: '50%',
    right: 'auto',
    width: 680,
    marginLeft: -340,
  },

  // ── Nav ──────────────────────────────────────────────────────────────────
  backBtn: {
    marginBottom: 24,
    width: 36,
  },

  // ── Typography ───────────────────────────────────────────────────────────
  stepTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.2,
    fontFamily: Fonts.bold,
  },
  stepSubtitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 32,
    fontFamily: Fonts.regular,
  },

  // ── Step 1: Photo ─────────────────────────────────────────────────────────
  photoBox: {
    width: '100%',
    // Caps how large the square box gets on a wide desktop browser — on a
    // real phone width this is always well under the cap, so no-op there.
    maxWidth: 360,
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: 20,
    backgroundColor: '#161616',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },

  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
    alignItems: 'center',
  },
  genderBtnSelected: {
    backgroundColor: '#2CB9B0',
    borderColor: '#2CB9B0',
  },
  genderBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  genderBtnTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },

  // ── Step 2: Fields ────────────────────────────────────────────────────────
  fieldLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 20,
    fontFamily: Fonts.semibold,
  },
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
  },
  fieldTextInput: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    padding: 0,
  },
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
  bioInput: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  bioTextInput: {
    color: '#ccc',
    fontSize: 14,
    minHeight: 120,
    width: '100%',
    padding: 0,
  },

  // ── Step 3: Interests ─────────────────────────────────────────────────────
  interestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  interestCount: {
    color: '#888',
    fontSize: 13,
    marginTop: 6,
  },
  interestScrollView: {
    flex: 1,
  },
  interestScroll: {
    paddingBottom: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    backgroundColor: '#2CB9B0',
    borderColor: '#2CB9B0',
  },
  tagText: {
    color: '#888',
    fontSize: 13,
  },
  tagTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },

  // ── Bottom CTA ────────────────────────────────────────────────────────────
  bottomAction: {
    // 'fixed' anchors to the actual viewport instead of the nearest
    // positioned ancestor — on web, a tall scrollable child (the interest
    // tag grid) can inflate that ancestor's box well past the viewport
    // height, which would otherwise carry this button down off-screen with it.
    position: 'fixed',
    bottom: 30,
    left: 24,
    right: 24,
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
    backgroundColor: '#2CB9B0',
    borderColor: '#2CB9B0',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});