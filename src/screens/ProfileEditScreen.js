import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../utils/axiosInstance';
import { appendImageAsset } from '../utils/appendImageAsset';
import { BASE_URL } from '../config';

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

export default function ProfileEditScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get('profile/');
        const p = res.data;
        setFullName(p.full_name || '');
        setGender(p.gender || '');
        if (p.birth_date) setBirthDate(new Date(p.birth_date));
        setBio(p.bio || '');
        setLocation(p.location || '');
        if (p.favorite_sports) {
          // stored as comma-separated string or array
          const parsed = Array.isArray(p.favorite_sports)
            ? p.favorite_sports
            : p.favorite_sports.split(',').map(s => s.trim()).filter(Boolean);
          // Capitalise first letter to match CATEGORY_GROUPS keys
          setInterests(parsed.map(s => s.charAt(0).toUpperCase() + s.slice(1)));
        }
        if (p.avatar) {
          setAvatarUrl(p.avatar.startsWith('http') ? p.avatar : `${BASE_URL}${p.avatar}`);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        Alert.alert('Error', 'Could not load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const showPhotoPicker = () => {
    Alert.alert('Upload Photo', null, [
      {
        text: 'Camera', onPress: () => {
          launchCamera({ mediaType: 'photo', maxHeight: 800, maxWidth: 800 }, res => {
            if (res.assets?.[0]) { setAvatar(res.assets[0]); setAvatarUrl(null); }
          });
        },
      },
      {
        text: 'Gallery', onPress: () => {
          launchImageLibrary({ mediaType: 'photo', maxHeight: 800, maxWidth: 800 }, res => {
            if (res.assets?.[0]) { setAvatar(res.assets[0]); setAvatarUrl(null); }
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

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

  const handleSubmit = async () => {
    if (!fullName || !gender || !birthDate) {
      Alert.alert('Incomplete', 'Please fill in full name, gender and date of birth');
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();

      appendImageAsset(formData, 'avatar', avatar);

      formData.append('full_name', fullName);
      formData.append('gender', gender);
      formData.append('birth_date', birthDate.toISOString().split('T')[0]);
      formData.append('bio', bio);
      formData.append('location', location);
      interests.forEach(i => formData.append('favorite_sports', i.toLowerCase()));

      await axiosInstance.put('profile/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error('Update failed:', detail);
      Alert.alert('Error', `Could not update profile: ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2CB9B0" />
      </View>
    );
  }

  const avatarSource = avatar
    ? { uri: avatar.uri }
    : avatarUrl
    ? { uri: avatarUrl }
    : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrapper} onPress={showPhotoPicker} activeOpacity={0.8}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={40} color="#444" />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

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
          <TouchableOpacity style={styles.fieldInput} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#888" style={styles.fieldIcon} />
            <Text style={styles.fieldInputText}>
              {birthDate.toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric', weekday: 'long',
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

          {/* Interests */}
          <View style={styles.interestHeader}>
            <Text style={styles.fieldLabel}>Interests</Text>
            <Text style={styles.interestCount}>{interests.length}/{MAX_INTERESTS}</Text>
          </View>

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

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.saveBtnText}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 44) + 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // ── Avatar ───────────────────────────────────────────────────────────────
  avatarWrapper: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2CB9B0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Fields ───────────────────────────────────────────────────────────────
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

  // ── Gender ───────────────────────────────────────────────────────────────
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

  // ── Interests ────────────────────────────────────────────────────────────
  interestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 4,
  },
  interestCount: {
    color: '#888',
    fontSize: 13,
    marginTop: 6,
  },
  categorySection: {
    marginTop: 16,
  },
  categoryLabel: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
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

  // ── Save Button ───────────────────────────────────────────────────────────
  saveBtn: {
    marginTop: 32,
    backgroundColor: '#2CB9B0',
    borderRadius: 40,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});