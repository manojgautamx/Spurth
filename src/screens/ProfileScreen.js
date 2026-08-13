import React, { useState, useContext } from 'react';
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
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../utils/axiosInstance';
import { appendImageAsset } from '../utils/appendImageAsset';
import { ProfileStatusContext } from '../navigation/AppNavigator';
import { BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [step, setStep] = useState(1); // 1 = photo, 2 = details, 3 = interests

  // Step 1
  const [avatar, setAvatar] = useState(null);

  // Step 2
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');

  // Step 3
  const [interests, setInterests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');

  const { refreshProfileStatus, setProfileComplete } = useContext(ProfileStatusContext);

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
      interests.forEach(i => formData.append('favorite_sports', i.toLowerCase()));

      await axiosInstance.post('profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Cache first, then set state directly — no network re-fetch
      await AsyncStorage.setItem('profileComplete', 'true');
      setProfileComplete(true);  // ← triggers navigator re-render immediately

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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* ── STEP 1: Pick Interests ───────────────────────────────────────── */}
      {step === 1 && (
        <View style={styles.stepContainer}>
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

          <View style={styles.bottomAction}>
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
        <View style={styles.stepContainer}>
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

          <View style={styles.bottomAction}>
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
            contentContainerStyle={styles.stepContainer}
            keyboardShouldPersistTaps="handled"
          >
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
            {showDatePicker && (
              <DateTimePicker
                value={birthDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setBirthDate(date);
                }}
              />
            )}

            {/* Location */}
            <Text style={styles.fieldLabel}>Location</Text>
            <View style={styles.fieldInput}>
              <TextInput
                style={styles.fieldTextInput}
                placeholder="Where are you based?"
                placeholderTextColor="#555"
                value={location}
                onChangeText={setLocation}
              />
            </View>

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

            <View style={styles.bottomAction}>
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
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
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
  },
  stepSubtitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 32,
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
    position: 'absolute',
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