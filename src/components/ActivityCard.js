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

import { LocationContext, getDistanceKm } from '../context/LocationContext';
import { Fonts } from '../theme/fonts';
import { getActivityTypeIcon } from '../utils/activityTypeIcons';
import { getActivityTypeImage } from '../utils/getActivityTypeImage';
import { BASE_URL } from '../config';
import { useIsWideWeb } from '../utils/responsive';

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

const ActivityCard = ({ activity }) => {
  const isWideWeb = useIsWideWeb();
  const navigation = useNavigation();
  const { location } = useContext(LocationContext);

  // Comparing against AuthContext's `user` doesn't work — it never exposes
  // one (only { userToken, login, logout, isLoading }), so this was always
  // false and every tap (even on your own activity) opened the read-only
  // viewer instead of the owner/management screen. The backend already
  // computes ownership correctly per-request, so use that instead.
  const isOwner = activity.is_owner === true;

  const distance = useMemo(() => {
    if (!location?.latitude || !location?.longitude) return null;
    if (!activity.latitude || !activity.longitude) return null;
    return getDistanceKm(
      location.latitude,
      location.longitude,
      activity.latitude,
      activity.longitude
    );
  }, [location, activity.latitude, activity.longitude]);

  const distanceLabel = formatDistance(distance);

  const getCoverImageSource = () => {
    if (activity.cover_image) {
      const uri = activity.cover_image.startsWith('http')
        ? activity.cover_image
        : `${BASE_URL}${activity.cover_image}`;
      return { uri };
    }
    return { uri: getActivityTypeImage(activity.activity_type) };
  };

  const getAvatarSource = (avatarPath) => {
    if (!avatarPath) return { uri: 'https://via.placeholder.com/150' };
    const uri = avatarPath.startsWith('http')
      ? avatarPath
      : `${BASE_URL}${avatarPath}`;
    return { uri };
  };

  const displayedParticipants = useMemo(() => {
    const participants = activity.participants || [];
    if (participants.length === 0) return [];
    if (participants.length <= 3) return participants;
    return [...participants].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [activity.participants]);

  const handlePress = () => {
    navigation.navigate(
      isOwner ? 'ActivityOwnerScreen' : 'ActivityViewerScreen',
      { activity }
    );
  };

  // Web: a compact horizontal row (thumbnail + info side-by-side) instead of
  // the mobile card's full-width banner-then-stacked-rows layout — at desktop
  // widths that vertical layout stretches into an oddly tall, thin banner.
  // Mobile keeps its own unchanged layout below.
  if (isWideWeb) {
    return (
      <TouchableOpacity style={styles.cardWeb} onPress={handlePress} activeOpacity={0.85}>
        <View style={styles.imageWrapWeb}>
          <Image source={getCoverImageSource()} style={styles.cardImageWeb} />
          {distanceLabel && (
            <View style={styles.distancePillWeb}>
              <Ionicons name="navigate-outline" size={10} color="#fff" />
              <Text style={styles.distanceTextWeb}>{distanceLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContentWeb}>
          <View style={styles.headerRowWeb}>
            <Text style={styles.titleWeb} numberOfLines={1}>{activity.name}</Text>
            <Ionicons name="information-circle-outline" size={16} color="#999" />
          </View>

          <View style={styles.infoGridWeb}>
            <View style={styles.infoItemWeb}>
              {getActivityTypeIcon(activity.activity_type, 13, '#ccc')}
              <Text style={styles.infoTextWeb}>{activity.activity_type}</Text>
            </View>
            <View style={styles.infoItemWeb}>
              <Ionicons name="calendar-outline" size={13} color="#ccc" />
              <Text style={styles.infoTextWeb}>{formatDateTime(activity.date_time).date}</Text>
            </View>
            <View style={styles.infoItemWeb}>
              <Ionicons name="time-outline" size={13} color="#ccc" />
              <Text style={styles.infoTextWeb}>{formatDateTime(activity.date_time).time}</Text>
            </View>
            <View style={styles.infoItemWeb}>
              <Ionicons name="location-sharp" size={13} color="#ccc" />
              <Text style={styles.infoTextWeb} numberOfLines={1}>{activity.location}</Text>
            </View>
          </View>

          <View style={styles.joinedRowWeb}>
            <View style={styles.avatarStack}>
              {displayedParticipants.map((participant, index) => (
                <Image
                  key={participant.id || index}
                  source={getAvatarSource(participant.avatar)}
                  style={[
                    styles.avatarWeb,
                    index > 0 && { marginLeft: -8 },
                    { zIndex: 3 - index },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.joinedTextWeb}>
              {activity.participant_count}/{activity.max_players || '∞'} Joined
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

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
          <Text style={styles.title}>{activity.name}</Text>
          <Ionicons name="information-circle-outline" size={18} color="#999" />
        </View>

        <View style={styles.infoRow}>
          {getActivityTypeIcon(activity.activity_type, 14, '#ccc')}
          <Text style={styles.infoText}>{activity.activity_type}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#ccc" />
          <Text style={styles.infoText}>{formatDateTime(activity.date_time).date}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={14} color="#ccc" />
          <Text style={styles.infoText}>{formatDateTime(activity.date_time).time}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-sharp" size={14} color="#ccc" />
          <Text style={styles.infoText} numberOfLines={1}>
            {activity.location}
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
            {activity.participant_count}/{activity.max_players || '∞'} Joined
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ActivityCard;

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

  /* ───────── Web: compact horizontal row ───────── */
  cardWeb: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 12,
  },
  imageWrapWeb: {
    position: 'relative',
    width: 112,
    height: 112,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardImageWeb: {
    width: '100%',
    height: '100%',
  },
  distancePillWeb: {
    position: 'absolute',
    left: 6,
    top: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3CC884',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  distanceTextWeb: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Fonts.medium,
  },
  cardContentWeb: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  headerRowWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  titleWeb: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
  infoGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 5,
    columnGap: 16,
  },
  infoItemWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '48%',
  },
  infoTextWeb: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  joinedRowWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatarWeb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#121212',
    backgroundColor: '#555',
  },
  joinedTextWeb: {
    marginLeft: 8,
    color: '#aaa',
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
});
