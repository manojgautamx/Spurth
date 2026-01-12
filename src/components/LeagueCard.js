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
import { Fonts } from '../theme/fonts';
import { getSportIcon } from '../utils/sportIcons';
import { getSportImage } from '../utils/getSportImage';

// Define your Base URL here (or import it from your config file)
const BASE_URL = 'http://10.0.2.2:8000';

const LeagueCard = ({ league }) => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const isOwner = user?.username === league.created_by?.username;

  const leagueType = (league.league_type || '').toLowerCase();
  const isComp =
    leagueType === 'competitive' ||
    leagueType === 'comp' ||
    leagueType === 'pro';

  // --- NEW LOGIC START ---

  // 1. Helper to construct image URI
  const getAvatarSource = (avatarPath) => {
    if (!avatarPath) {
        // Return a placeholder image from assets or a default URL if needed
        return { uri: 'https://via.placeholder.com/150' }; 
    }
    const uri = avatarPath.startsWith('http')
      ? avatarPath
      : `${BASE_URL}${avatarPath}`;
    return { uri };
  };

  // 2. Logic to determine which avatars to show
  const displayedParticipants = useMemo(() => {
    // Check if participants array exists, default to empty array
    const participants = league.participants || []; 
    const count = participants.length;

    if (count === 0) return [];

    if (count <= 3) {
      // If 3 or fewer, show everyone
      return participants;
    } else {
      // If more than 3, shuffle and pick 3 random ones
      // We use [...participants] to create a copy before sorting to avoid mutating props
      return [...participants]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
    }
  }, [league.participants]); // Recalculate only when participants change

  // --- NEW LOGIC END ---

  const handlePress = () => {
    navigation.navigate(
      isOwner ? 'LeagueOwnerScreen' : 'LeagueViewerScreen',
      { league }
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: getSportImage(league.sport) }}
          style={styles.cardImage}
        />

        <View style={styles.distancePill}>
          <Ionicons name="navigate-outline" size={12} color="#fff" />
          <Text style={styles.distanceText}>4 Km Away</Text>
        </View>

        <View
          style={[
            styles.typeBadge,
            isComp ? styles.compBadge : styles.casualBadge,
          ]}
        >
          <Ionicons
            name={isComp ? 'trophy-outline' : 'person-outline'}
            size={12}
            color="#fff"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.badgeText}>
            {isComp ? 'Comp' : 'Casual'}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{league.name}</Text>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#999"
          />
        </View>

        <View style={styles.infoRow}>
          {getSportIcon(league.sport, 14, '#ccc')}
          <Text style={styles.infoText}>{league.sport}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#ccc" />
          <Text style={styles.infoText}>{league.date_time}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-sharp" size={14} color="#ccc" />
          <Text style={styles.infoText} numberOfLines={1}>
            {league.location}
          </Text>
        </View>

        <View style={styles.joinedRow}>
          {/* Dynamic Avatar Stack */}
          <View style={styles.avatarStack}>
            {displayedParticipants.map((participant, index) => (
              <Image
                key={participant.id || index} // Prefer a unique ID from DB
                source={getAvatarSource(participant.avatar)}
                style={[
                  styles.avatar,
                  // Add negative margin to everyone except the first one
                  index > 0 && { marginLeft: -10 },
                  // Add a zIndex to make sure the first one is on top (optional, or flip order)
                  { zIndex: 3 - index } 
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
    backgroundColor: '#2CB9B0',
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

  typeBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  compBadge: {
    backgroundColor: '#F2994A',
  },

  casualBadge: {
    backgroundColor: '#27AE60',
  },

  badgeText: {
    color: '#fff',
    fontSize: 11,
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
    // No specific width/height here, let it grow with content
  },

  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#121212',
    backgroundColor: '#555', // Fallback color while image loads
  },

  joinedText: {
    marginLeft: 10,
    color: '#aaa',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
});