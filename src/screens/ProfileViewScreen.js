import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView } from 'react-native';
import axiosInstance from '../utils/axiosInstance';
import { Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const BASE_URL = 'http://10.0.2.2:8000';

export default function ProfileViewScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();


  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchProfile = async () => {
        try {
          setLoading(true);
          const res = await axiosInstance.get('profile/');
          if (isActive) {
            setProfile(res.data);
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchProfile();

      return () => {
        isActive = false;
      };
    }, [])
  );


  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E81F89" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text>Could not load profile.</Text>
      </View>
    );
  }

   const getAvatarUri = () => {
    if (!profile.avatar) return null;
    return profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {getAvatarUri() ? (
        <Image source={{ uri: getAvatarUri() }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Avatar</Text>
        </View>
      )}
      
      <Button title="Edit Profile" onPress={() => navigation.navigate('ProfileEdit', { profile })} />
      <Text style={styles.name}>{profile.full_name || 'No Name'}</Text>
      <Text style={styles.label}><Text style={styles.value}>{profile.username}</Text></Text>
      <Text style={styles.label}>Age: <Text style={styles.value}>{profile.age}</Text></Text>
      <Text style={styles.label}>Gender: <Text style={styles.value}>{profile.gender}</Text></Text>
      <Text style={styles.label}>Birth Date: <Text style={styles.value}>{profile.birth_date}</Text></Text>
      <Text style={styles.label}>Bio: <Text style={styles.value}>{profile.bio || '—'}</Text></Text>
      <Text style={styles.label}>Favorite Sports:</Text>
      <View style={styles.chipContainer}>
        {profile.favorite_sports.length > 0 ? (
          profile.favorite_sports.map((sport) => (
            <View key={sport} style={styles.chip}>
              <Text style={styles.chipText}>{sport}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.value}>None</Text>
        )}
      </View>

      <Text style={styles.stat}>Leagues Created: <Text style={styles.statNumber}>{profile.leagues_created}</Text></Text>
      <Text style={styles.stat}>Leagues Joined: <Text style={styles.statNumber}>{profile.leagues_joined}</Text></Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    backgroundColor: '#eee',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#888',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  value: {
    fontWeight: '400',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: '#E81F89',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    margin: 4,
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
  },
  stat: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  statNumber: {
    color: '#E81F89',
  },
});
