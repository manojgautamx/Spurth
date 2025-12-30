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
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import MultiSelect from 'react-native-multiple-select';
import axiosInstance from '../utils/axiosInstance'; // Make sure this is correct
import { TextInput } from 'react-native';
import { ProfileStatusContext } from '../navigation/AppNavigator';

const sportsOptions = [
  { id: 'football', name: 'Football' },
  { id: 'basketball', name: 'Basketball' },
  { id: 'tennis', name: 'Tennis' },
  { id: 'cricket', name: 'Cricket' },
  { id: 'hockey', name: 'Hockey' },
];

export default function ProfileScreen({ navigation }) {
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [favoriteSports, setFavoriteSports] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bio, setBio] = useState('');
  const { refreshProfileStatus } = useContext(ProfileStatusContext);
  const [fullName, setFullName] = useState('');

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

      favoriteSports.forEach((sport) => {
        formData.append('favorite_sports', sport);
      });

      formData.append('bio', bio);

      await axiosInstance.post('profile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (refreshProfileStatus) {
        await refreshProfileStatus();
      }
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });

    } catch (error) {
      console.error('Profile update error:', error.response?.data || error.message);
      Alert.alert('Error', 'Could not update profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={styles.title}>Complete Your Profile</Text>

        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar.uri }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarText}>Upload Avatar</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Gender</Text>
        <Picker
          selectedValue={gender}
          onValueChange={(itemValue) => setGender(itemValue)}
          style={styles.picker}
        >
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
        <View style={styles.bioInputWrapper}>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us something about yourself..."
            multiline
            numberOfLines={4}
            style={styles.bioInput}
          />
        </View>

        <Text style={styles.label}>Favorite Sports</Text>
        <MultiSelect
          items={sportsOptions}
          uniqueKey="id"
          onSelectedItemsChange={(selected) => setFavoriteSports(selected)}
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
          searchInputStyle={{ color: '#CCC' }}
          submitButtonColor="#E81F89"
          submitButtonText="Submit"
          styleMainWrapper={styles.multiSelect}
        />

        <TouchableOpacity onPress={handleSubmit} style={styles.submitButton} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'Saving...' : 'Save Profile'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    height: 150,
    width: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    height: 150,
    width: 150,
    borderRadius: 75,
  },
  avatarText: {
    color: '#888',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  picker: {
    backgroundColor: '#f2f2f2',
    marginBottom: 10,
  },
  datePicker: {
    padding: 12,
    backgroundColor: '#f2f2f2',
    marginBottom: 10,
    borderRadius: 5,
  },
  multiSelect: {
    marginBottom: 10,
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#E81F89',
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  bioInputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 10,
    padding: 10,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

});
