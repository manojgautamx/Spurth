import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, Alert, Platform, KeyboardAvoidingView, TextInput
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import MultiSelect from 'react-native-multiple-select';
import axiosInstance from '../utils/axiosInstance';

const BASE_URL = 'http://10.0.2.2:8000';

const sportsOptions = [
  { id: 'football', name: 'Football' },
  { id: 'basketball', name: 'Basketball' },
  { id: 'tennis', name: 'Tennis' },
  { id: 'cricket', name: 'Cricket' },
  { id: 'hockey', name: 'Hockey' },
];

export default function ProfileEditScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [bio, setBio] = useState('');
  const [favoriteSports, setFavoriteSports] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get('profile/');
        const profile = res.data;
        setFullName(profile.full_name || '');
        setGender(profile.gender || '');
        setBirthDate(new Date(profile.birth_date));
        setBio(profile.bio || '');
        setFavoriteSports(profile.favorite_sports || []);
        if (profile.avatar) {
          setAvatarUrl(profile.avatar.startsWith('http') ? profile.avatar : `${BASE_URL}${profile.avatar}`);
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

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 600,
        maxWidth: 600,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Image Picker Error', response.errorMessage || 'Unknown error');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setAvatar(response.assets[0]);
          setAvatarUrl(null); // Clear existing URL when new image is picked
        }
      }
    );
  };

  const handleSubmit = async () => {
    if (!fullName || !gender || !birthDate || favoriteSports.length === 0) {
      Alert.alert('Incomplete', 'Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();

      if (avatar) {
        const uri = avatar.uri;
        const name = uri.split('/').pop();
        const type = avatar.type || 'image/jpeg';
        formData.append('avatar', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name,
          type,
        });
      }

      formData.append('full_name', fullName);
      formData.append('gender', gender);
      formData.append('birth_date', birthDate.toISOString().split('T')[0]);
      formData.append('bio', bio);
      favoriteSports.forEach((sport) => {
        formData.append('favorite_sports', sport);
      });

      await axiosInstance.put('profile/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch (err) {
      console.error('Update failed:', err.response?.data || err.message);
      Alert.alert('Error', 'Could not update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Edit Profile</Text>

        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar.uri }} style={styles.avatar} />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarText}>Upload Avatar</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

        <Text style={styles.label}>Gender</Text>
        <Picker selectedValue={gender} onValueChange={setGender} style={styles.picker}>
          <Picker.Item label="Select Gender" value="" />
          <Picker.Item label="Male" value="male" />
          <Picker.Item label="Female" value="female" />
          <Picker.Item label="Other" value="other" />
        </Picker>

        <Text style={styles.label}>Birth Date</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePicker}>
          <Text>{birthDate.toDateString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={birthDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setBirthDate(selectedDate);
            }}
            maximumDate={new Date()}
          />
        )}

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <Text style={styles.label}>Favorite Sports</Text>
        <MultiSelect
          items={sportsOptions}
          uniqueKey="id"
          onSelectedItemsChange={setFavoriteSports}
          selectedItems={favoriteSports}
          selectText="Pick Sports"
          searchInputPlaceholderText="Search sports..."
          tagRemoveIconColor="#E81F89"
          tagBorderColor="#E81F89"
          tagTextColor="#E81F89"
          selectedItemTextColor="#E81F89"
          selectedItemIconColor="#E81F89"
          itemTextColor="#000"
          displayKey="name"
          submitButtonColor="#E81F89"
          submitButtonText="Submit"
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20,
  },
  avatarContainer: {
    alignSelf: 'center', marginBottom: 20,
    borderRadius: 75, backgroundColor: '#f0f0f0',
    height: 150, width: 150, justifyContent: 'center', alignItems: 'center',
  },
  avatar: {
    height: 150, width: 150, borderRadius: 75,
  },
  avatarText: {
    color: '#888',
  },
  label: {
    fontWeight: 'bold', marginTop: 10, marginBottom: 5,
  },
  input: {
    backgroundColor: '#f2f2f2', padding: 10, borderRadius: 5, marginBottom: 10,
  },
  picker: {
    backgroundColor: '#f2f2f2', marginBottom: 10,
  },
  datePicker: {
    padding: 12, backgroundColor: '#f2f2f2', marginBottom: 10, borderRadius: 5,
  },
  bioInput: {
    minHeight: 80, textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#E81F89', padding: 12, borderRadius: 8, marginTop: 20,
  },
  submitText: {
    color: '#fff', textAlign: 'center', fontWeight: 'bold',
  },
});
