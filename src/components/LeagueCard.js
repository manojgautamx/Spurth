import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import { AuthContext } from '../context/AuthContext';
import { LocationContext, getDistanceKm } from '../context/LocationContext';
import { Fonts } from '../theme/fonts';
import { getSportIcon } from '../utils/sportIcons';
import { getSportImage } from '../utils/getSportImage';
import { BASE_URL } from '../config';

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return { date: '', time: '' };
  const date = new Date(dateTimeStr);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date: formattedDate, time: formattedTime };
};

const formatDistance = (km) => {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
};

const LeagueCard = ({ league }) => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { location } = useContext(LocationContext);

  const isOwner = user?.username === league.created_by?.username;

  const distance = useMemo(() => {
    if (!location?.latitude || !location?.longitude) return null;
    if (!league.latitude || !league.longitude) return null;
    return getDistanceKm(
      location.latitude,
      location.longitude,
      league.latitude,
      league.longitude
    );
  }, [location, league.latitude, league.longitude]);

  const distanceLabel = formatDistance(distance);

  const getCoverImageSource = () => {
    if (league.cover_image) {
      const uri = league.cover_image.startsWith('http')
        ? league.cover_image
        : `${BASE_URL}${league.cover_image}`;
      return { uri };
    }
    return { uri: getSportImage(league.sport) };
  };

  const getAvatarSource = (avatarPath) => {
    if (!avatarPath) return { uri: 'https://via.placeholder.com/150' };
    const uri = avatarPath.startsWith('http')
      ? avatarPath
      : `${BASE_URL}${avatarPath}`;
    return { uri };
  };

  const displayedParticipants = useMemo(() => {
    const participants = league.participants || [];
    if (participants.length === 0) return [];
    if (participants.length <= 3) return participants;
    return [...participants].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [league.participants]);

  const handlePress = () => {
    navigation.navigate(
      isOwner ? 'LeagueOwnerScreen' : 'LeagueViewerScreen',
      { league }
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.imageWrap}>
        <Image source={getCoverImageSource()} style={styles.cardImage} />

        {/* Only show distance pill if we have a real distance */}
        {distanceLabel && (
          <View style={styles.distancePill}>
            <Ionicons name="navigate-outline" size={12} color="#fff" />
            <Text style={styles.distanceText}>{distanceLabel}</Text>
          </View>
        )}
      </View> 

      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{league.name}</Text>
          <Ionicons name="information-circle-outline" size={18} color="#999" />
        </View>

        <View style={styles.infoRow}>
          {getSportIcon(league.sport, 14, '#ccc')}
          <Text style={styles.infoText}>{league.sport}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#ccc" />
          <Text style={styles.infoText}>{formatDateTime(league.date_time).date}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={14} color="#ccc" />
          <Text style={styles.infoText}>{formatDateTime(league.date_time).time}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-sharp" size={14} color="#ccc" />
          <Text style={styles.infoText} numberOfLines={1}>
            {league.location}
          </Text>
        </View>

        <View style={styles.joinedRow}>
          <View style={styles.avatarStack}>
            {displayedParticipants.map((participant, index) => (
              <Image
                key={participant.id || index}
                source={getAvatarSource(participant.avatar)}
                style={[
                  styles.avatar,
                  index > 0 && { marginLeft: -10 },
                  { zIndex: 3 - index },
                ]}
              />
            ))}
          </View>
          <Text style={styles.joinedText}>
            {league.participant_count}/{league.max_players || '∞'} Joined
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default LeagueCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#121212',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#262626',
  },
  imageWrap: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  distancePill: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3CC884',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  distanceText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  cardContent: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  infoText: {
    color: '#ccc',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#121212',
    backgroundColor: '#555',
  },
  joinedText: {
    marginLeft: 10,
    color: '#aaa',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
});