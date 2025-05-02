// components/Navbar.js
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const Navbar = ({ onMenuPress, onProfilePress, title }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onMenuPress}>
        <Icon name="menu" size={28} color="black" />
      </TouchableOpacity>

      <Text style={styles.title}>{title || 'StreetLeague'}</Text>

      <TouchableOpacity onPress={onProfilePress}>
        <Image
          source={{ uri: 'https://i.pravatar.cc/300' }} // Replace with actual profile image if available
          style={styles.profileImage}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    paddingHorizontal: 16,
    paddingVertical: 200,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

export default Navbar;
