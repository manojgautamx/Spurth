import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext'; 
import useAxios from '../utils/useAxios';
import { getSportImage } from '../utils/getSportImage'; 
import { Fonts } from '../theme/fonts';

import { useMemo } from 'react';
import LeafletMap from '../components/LeafletMap';

const BASE_URL = 'http://10.0.2.2:8000';

const geocodeLocation = async (location) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    );
    const data = await res.json();

    if (data.length === 0) return null;

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch (err) {
    console.warn('Geocoding failed', err);
    return null;
  }
};



const LeagueViewerScreen = ({ route, navigation }) => {
  const { league } = route.params;
  const { user } = useContext(AuthContext); 
  const axios = useAxios();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [canChat, setCanChat] = useState(false);
  
  const leagueType = (league.league_type || '').toLowerCase();
  const isComp = leagueType.includes('comp') || leagueType.includes('pro');
  const isOwner = league.is_owner; // Uses backend flag
  const [coords, setCoords] = useState(
    league.latitude && league.longitude
      ? { latitude: league.latitude, longitude: league.longitude }
      : null
  );

  useEffect(() => {
    if (coords) return; // already cached

    let mounted = true;

    const fetchCoords = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            league.location
          )}`
        );
        const data = await res.json();

        if (mounted && data.length) {
          setCoords({
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          });
        }
      } catch (e) {
        console.warn('Geocode failed');
      }
    };

    fetchCoords();
    return () => (mounted = false);
  }, []);


  
  // Avatar resolver
  const getAvatarSource = (avatarPath) => {
    if (!avatarPath) {
      return require('../assets/avatar-placeholder.png'); // local asset preferred
    }

    if (avatarPath.startsWith('http')) {
      return { uri: avatarPath };
    }

    return { uri: `${BASE_URL}${avatarPath}` };
  };


  const getAvatarUri = (avatar_url) => {
    if (!avatar_url) return null;

    return avatar_url.startsWith('http')
      ? avatar_url
      : `${BASE_URL}${avatar_url}`;
  };



  // --- LOGIC SECTION ---

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        const statusRes = await axios.get(
          `http://10.0.2.2:8000/api/league-status/${league.id}/`
        );
        const chatRes = await axios.get(
          `http://10.0.2.2:8000/api/can-enter-chat/${league.id}/`
        );
        if (!mounted) return;
        setIsJoined(statusRes.data.joined);
        setCanChat(chatRes.data.can_chat);
      } catch (err) {
        console.warn("Failed to fetch league state");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, [league.id]);

  // Join League
  const handleJoin = async () => {
    try {
      setJoining(true);
      await axios.post(`http://10.0.2.2:8000/api/join-league/${league.id}/`);
      Alert.alert('Success', 'You joined the league!');
      setIsJoined(true);
      setCanChat(true); 
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to join league');
    } finally {
      setJoining(false);
    }
  };

  // Leave League
  const handleLeave = async () => {
    Alert.alert("Leave League", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Leave", 
        style: "destructive", 
        onPress: async () => {
          try {
            setJoining(true);
            await axios.post(`http://10.0.2.2:8000/api/leave-league/${league.id}/`);
            setIsJoined(false);
            setCanChat(false);
            Alert.alert('Left League', 'You have left the league.');
          } catch (error) {
            Alert.alert('Error', 'Failed to leave league');
          } finally {
            setJoining(false);
          }
        }
      }
    ]);
  };

  // Delete League (Owner Only)
  const deleteLeague = async () => {
    try {
      await axios.delete(`http://10.0.2.2:8000/api/delete-league/${league.id}/`);
      Alert.alert('Event Deleted', 'The league has been deleted successfully.');
      navigation.goBack(); 
    } catch (err) {
      Alert.alert("Error", err.response?.data?.detail || "Delete failed");
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete League",
      "This action cannot be undone",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteLeague }
      ]
    );
  };

  const goToChat = () => {
    if (canChat || isOwner) {
      navigation.navigate('LeagueChatScreen', {
        leagueId: league.id,
        leagueName: league.name,
      });
    } else {
      Alert.alert('Access Denied', 'You must join this league to chat.');
    }
  };


  const handleEdit = () => {
    navigation.navigate("CreateLeague", {
      editMode: true,
      league: league,
    });
  };

  const displayedParticipants = useMemo(() => {
    const participants = league.participants || [];
    if (participants.length === 0) return [];

    if (participants.length <= 3) return participants;

    return [...participants]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  }, [league.participants]);


  // --- RENDER HELPERS ---

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#E81F89" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION */}
        <View style={styles.imageContainer}>
          <ImageBackground
            source={{ uri: getSportImage(league.sport) }}
            style={styles.headerImage}
            resizeMode="cover"
          >
            <View style={styles.headerOverlay}>
              <View style={styles.headerTopRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerRightIcons}>
                  <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="share-social-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                  
                  {/* Edit Icon for Owner */}
                  <TouchableOpacity style={styles.iconButton} onPress={isOwner ? handleEdit : null}>
                    <Ionicons 
                      name={isOwner ? "pencil" : "bookmark-outline"} 
                      size={24} 
                      color="#fff" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.badgesContainer}>
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate-outline" size={12} color="#fff" />
                  <Text style={styles.badgeText}>4 Km Away</Text>
                </View>
                <View style={[styles.proBadge, { backgroundColor: isComp ? '#F2994A' : '#27AE60' }]}>
                   <Ionicons 
                    name={isComp ? "trophy-outline" : "person-outline"} 
                    size={12} 
                    color="#fff" 
                    style={{marginRight: 4}}
                   />
                  <Text style={styles.badgeText}>{isComp ? 'Pro' : 'Casual'}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* CONTENT BODY */}
        <View style={styles.body}>
          <Text style={styles.title}>{league.name}</Text>

          {/* Info Cards Row */}
          <View style={styles.infoStack}>
            {/* Date */}
            <View style={styles.infoCard}>
              <View style={styles.iconCircle}>
                 <Ionicons name="time-outline" size={20} color="#2CB9B0" />
              </View>
              <View>
                <Text style={styles.infoValue}>{new Date(league.date_time).toDateString()}</Text>
                <Text style={styles.infoSubValue}>
                    {new Date(league.date_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} Onwards
                </Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.infoCard}>
              <View style={styles.iconCircle}>
                 <Ionicons name="location-outline" size={20} color="#2CB9B0" />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.infoLabel}>{league.location}</Text>
              </View>
            </View>

            {/* Sport */}
            <View style={styles.infoCard}>
              <View style={styles.iconCircle}>
                 <Ionicons name="football-outline" size={20} color="#2CB9B0" />
              </View>
              <View>
                <Text style={styles.infoValue}>{league.sport}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.description}>
            {league.description || "No description provided for this league."}
          </Text>
          {/* Host and Joined Row */}
            <View style={styles.hostRow}>
              {/* Left Column: Host */}
              <View style={styles.column}>
                <Text style={styles.sectionHeader}>Host</Text>
                <TouchableOpacity
                  style={styles.hostProfile}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('ProfileView', { userId: league.created_by?.id })}
                >
                  <View style={styles.hostAvatar}>
                    <Image
                      source={league.created_by?.avatar ? { uri: league.created_by.avatar } : { uri: 'https://via.placeholder.com/50' }}
                      style={styles.fullImage}
                    />
                  </View>
                  <Text style={styles.hostName} numberOfLines={1}>
                    @{league.created_by?.username || 'user'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Right Column: Joined */}
              <View style={styles.column}>
                <Text style={styles.sectionHeader}>Joined</Text>
                <TouchableOpacity
                  style={styles.joinedPill}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (league.participants?.length > 0) {
                      navigation.navigate('ParticipantsList', {
                        participants: league.participants,
                        leagueName: league.name
                      });
                    } else {
                      Alert.alert("Info", "No participants have joined yet.");
                    }
                  }}
                >
                  <View style={styles.avatarStack}>
                    {displayedParticipants.map((participant, index) => (
                      <Image
                        key={participant.id || index}
                        source={getAvatarSource(participant.avatar)}
                        style={[
                          styles.avatar,
                          { marginLeft: index === 0 ? 0 : -12 }, // Overlap effect
                          { zIndex: 10 - index },
                        ]}
                      />
                    ))}
                  </View>

                  <Text style={styles.joinedText}>
                    {league.participant_count}/{league.max_players || '22'} Players
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          {/* Map Image Placeholder */}
          <View style={styles.mapContainer}>
            <LeafletMap
              latitude={coords?.latitude}
              longitude={coords?.longitude}
              label={league.location}
            />
          </View>


          
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* STICKY FOOTER */}
      <View style={styles.stickyFooter}>
        <View>
            <Text style={styles.footerLabel}>Price</Text>
            <Text style={styles.footerPrice}>
                {league.price && league.price > 0 ? `Rs. ${league.price}` : 'Free'}
            </Text>
        </View>

        <View style={styles.footerButtonContainer}>
            {/* Logic for Secondary Button (Delete or Leave) */}
            {isOwner ? (
                <TouchableOpacity style={styles.secondaryButtonDestructive} onPress={confirmDelete}>
                    <Ionicons name="trash-outline" size={20} color="#FF453A" />
                </TouchableOpacity>
            ) : isJoined ? (
                <TouchableOpacity style={styles.secondaryButton} onPress={handleLeave}>
                     <Ionicons name="log-out-outline" size={20} color="#aaa" />
                </TouchableOpacity>
            ) : null}

            {/* Logic for Primary Button (Chat or Join) */}
            {(isJoined || isOwner) ? (
                <TouchableOpacity style={styles.actionButtonChat} onPress={goToChat}>
                    <Text style={styles.actionButtonText}>Chat</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity 
                    style={styles.actionButtonJoin} 
                    onPress={handleJoin}
                    disabled={joining}
                >
                    <Text style={styles.actionButtonText}>
                        {joining ? "Joining..." : "Join"}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header Styles
  imageContainer: {
    height: 280,
    width: '100%',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingTop: StatusBar.currentHeight || 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRightIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    padding: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  distanceBadge: {
    backgroundColor: '#2CB9B0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },

  // Body Styles
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
    fontFamily: Fonts.semibold,
  },
  infoStack: {
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(44, 185, 176, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  infoSubValue: {
    color: '#777',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 30,
    fontFamily: Fonts.regular,
  },
  readMore: {
    color: '#2CB9B0',
    fontSize: 14,
    marginBottom: 24,
    fontFamily: Fonts.medium,
  },

  // Host & Joined
  hostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 30,
  },
  column: {
    flex: 1,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    fontFamily: Fonts.semibold,
  },
  hostProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    height: 54,
    borderRadius: 16,
  },
  joinedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    height: 54,
    borderRadius: 16,
  },
  hostAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    marginRight: 8,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  hostName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
    flexShrink: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  joinedText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },

  // Map
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
    backgroundColor: '#222',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  mapMarker: {
    position: 'absolute',
    top: '40%',
    left: '45%',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    color: '#aaa',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 4,
    fontFamily: Fonts.regular,
  },

  // Sticky Footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#121212',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    elevation: 10,
  },
  footerLabel: {
    color: '#aaa',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  footerPrice: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.semibold,
  },

  // Footer Buttons
  footerButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: '#1C1C1E',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryButtonDestructive: {
    backgroundColor: '#321',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#522',
  },
  actionButtonJoin: {
    backgroundColor: '#E81F89',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  actionButtonChat: {
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
});


export default LeagueViewerScreen;