// components/Navbar.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import axiosInstance from '../utils/axiosInstance';
import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BASE_URL = 'http://10.0.2.2:8000';

export default function Navbar() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigation = useNavigation();
  const axios = useAxios();
  const { logout, user } = useContext(AuthContext);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get('profile/');
        setProfile(res.data);
      } catch (err) {
        console.error('Navbar profile fetch error:', err);
      }
    };
    fetchProfile();
  }, []);

  const handleNavigate = (screen) => {
    setMenuVisible(false);
    navigation.navigate(screen);
  };

  const getAvatarUri = () => {
    if (!profile?.avatar) return null;
    return profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`;
  };

  return (
    <View style={styles.navbar}>
      <TouchableOpacity onPress={() => setMenuVisible(true)}>
        <Icon name="menu" size={28} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => handleNavigate('ProfileView')}>
        {getAvatarUri() ? (
          <Image source={{ uri: getAvatarUri() }} style={styles.avatar} />
        ) : (
          <Icon name="user" size={24} color="#fff" />
        )}
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setMenuVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.drawerLeft}>
            <TouchableOpacity onPress={() => handleNavigate('About')}>
              <Text style={styles.item}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleNavigate('ProfileEdit')}>
              <Text style={styles.item}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutItem}>
              <Ionicons name="log-out-outline" size={24} color="#E81F89" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#121212',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawerLeft: {
    width: 250,
    height: '100%',
    backgroundColor: '#1a1a1a',
    paddingTop: 60,
    paddingHorizontal: 20,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  item: {
    fontSize: 18,
    paddingVertical: 16,
    color: '#fff',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 18,
    marginLeft: 10,
    color: '#E81F89',
  },
});
