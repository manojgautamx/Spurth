import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Image,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import useAxios from '../utils/useAxios';
import { getActivityTypeImage } from '../utils/getActivityTypeImage';
import { Fonts } from '../theme/fonts';
import LeafletMap from '../components/LeafletMap';
import { getActivityTypeIcon } from '../utils/activityTypeIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import PostCard from '../components/PostCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';
import { LocationContext, getDistanceKm } from '../context/LocationContext';
import { Share } from 'react-native';
import { useIsWideWeb } from '../utils/responsive';
import PostsRail from '../components/web/PostsRail';
import WebSidebar from '../components/web/WebSidebar';

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

const ActivityViewerScreen = ({ route, navigation }) => {
  const isWideWeb = useIsWideWeb();
  const { activity: initialActivity, activityId } = route.params;
  const [activity, setActivity] = useState(initialActivity);
  const { user } = useContext(AuthContext);
  const axios = useAxios();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [canChat, setCanChat] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  // Menu dropdown position is measured from the kebab button itself rather
  // than assumed from a fixed StatusBar-height offset — the button's actual
  // on-screen position shifts with the wide-web centered layout (and could
  // just as easily shift on mobile if the header ever changes height), and
  // a Modal renders as a viewport-level overlay independent of that layout.
  const [menuAnchor, setMenuAnchor] = useState({ top: 60, right: 16 });
  const menuBtnRef = useRef(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Comment state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  // Reschedule + map state — ALL before early return
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [coords, setCoords] = useState(null);
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const { location } = useContext(LocationContext);

  const distance = useMemo(() => {
    if (!location?.latitude || !location?.longitude) return null;
    if (!activity?.latitude || !activity?.longitude) return null;
    return getDistanceKm(
      location.latitude,
      location.longitude,
      activity.latitude,
      activity.longitude
    );
  }, [location, activity?.latitude, activity?.longitude]);

  const distanceLabel = distance === null
    ? null
    : distance < 1
      ? `${Math.round(distance * 1000)} m away`
      : `${distance.toFixed(1)} km away`;

  // ALL useEffects before early return
  useEffect(() => {
    if (!activity && activityId) {
      axios.get(`${BASE_URL}/api/activity-detail/${activityId}/`)
        .then(res => setActivity(res.data))
        .catch(() => {
          Alert.alert('Error', 'Failed to load activity.');
          navigation.goBack();
        });
    }
  }, [activityId]);

  const handleShare = async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        title: activity.name,
        message: `Check out "${activity.name}" on Spurth!\n\nJoin this event: spurth://event/${activity.id}\n\nWeb: https://spurth.com/event/${activity.id}`,
      });
    } catch (err) {
      console.warn('Share failed', err);
    }
  };
  useEffect(() => {
    if (!activity) return;
    if (activity.latitude && activity.longitude) {
      setCoords({ latitude: activity.latitude, longitude: activity.longitude });
    }
    if (activity.date_time) {
      setNewDate(new Date(activity.date_time));
    }
  }, [activity?.id]);

  useEffect(() => {
    if (coords || !activity?.location) return;
    let mounted = true;
    const fetchCoords = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(activity.location)}`
        );
        const data = await res.json();
        if (mounted && data.length) {
          setCoords({ latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) });
        }
      } catch (e) {
        console.warn('Geocode failed');
      }
    };
    fetchCoords();
    return () => { mounted = false; };
  }, [activity?.location]);

  useEffect(() => {
    if (!activity?.id) return;
    let mounted = true;
    const fetchAll = async () => {
      try {
        const statusRes = await axios.get(`${BASE_URL}/api/activity-status/${activity.id}/`);
        const chatRes = await axios.get(`${BASE_URL}/api/can-enter-chat/${activity.id}/`);
        if (!mounted) return;
        setIsJoined(statusRes.data.joined);
        setCanChat(chatRes.data.can_chat);
      } catch (err) {
        console.warn('Failed to fetch activity state');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, [activity?.id]);

  useEffect(() => {
    if (!activity?.id) return;
    fetchActivityPosts();
  }, [activity?.id]);

  const displayedParticipants = useMemo(() => {
    const participants = (activity?.participants) || [];
    if (participants.length === 0) return [];
    if (participants.length <= 3) return participants;
    return [...participants].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [activity?.participants]);

  // ── EARLY RETURN — safe, all hooks above ────────────────────────────────
  if (!activity) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#E81F89" />
      </View>
    );
  }

  // Derived values — not hooks, safe after early return
  const isConcluded = activity.is_concluded;
  const isCancelled = activity.is_cancelled;
  const activityFormat = (activity.format || '').toLowerCase();
  const isOwner = activity.is_owner;

  const getAvatarSource = (avatarPath) => {
    if (!avatarPath) return require('../assets/avatar-placeholder.png');
    if (avatarPath.startsWith('http')) return { uri: avatarPath };
    return { uri: `${BASE_URL}${avatarPath}` };
  };

  const handleJoin = async () => {
    try {
      setJoining(true);
      await axios.post(`${BASE_URL}/api/join-activity/${activity.id}/`);
      Alert.alert('Success', 'You joined the activity!');
      setIsJoined(true);
      setCanChat(true);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to join activity');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    Alert.alert('Leave Activity', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            setJoining(true);
            await axios.post(`${BASE_URL}/api/leave-activity/${activity.id}/`);
            setIsJoined(false);
            setCanChat(false);
            Alert.alert('Left Activity', 'You have left the activity.');
          } catch (error) {
            Alert.alert('Error', 'Failed to leave activity');
          } finally {
            setJoining(false);
          }
        },
      },
    ]);
  };

  const deleteActivity = async () => {
    try {
      await axios.delete(`${BASE_URL}/api/delete-activity/${activity.id}/`);
      Alert.alert('Event Deleted', 'The activity has been deleted successfully.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Delete failed');
    }
  };

  const confirmDelete = () => {
    setMenuVisible(false);
    Alert.alert('Delete Activity', 'This action cannot be undone', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteActivity },
    ]);
  };

  const goToChat = () => {
    if (canChat || isOwner) {
      navigation.navigate('ActivityChatScreen', { activityId: activity.id, activityName: activity.name });
    } else {
      Alert.alert('Access Denied', 'You must join this activity to chat.');
    }
  };

  const handleEdit = () => {
    navigation.navigate('CreateActivity', { editMode: true, activity: activity });
  };

  const handleReschedule = async () => {
    try {
      setRescheduling(true);
      await axios.put(`${BASE_URL}/api/update-activity/${activity.id}/`, {
        date_time: newDate.toISOString(),
      });
      Alert.alert('Success', 'Event rescheduled!');
      setRescheduleVisible(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  const cancelActivity = async () => {
    try {
      await axios.put(`${BASE_URL}/api/cancel-activity/${activity.id}/`);
      setActivity(prev => ({ ...prev, is_cancelled: true }));
      Alert.alert('Cancelled', 'Event has been cancelled.');
    } catch (err) {
      Alert.alert('Error', 'Failed to cancel event');
    }
  };

  const confirmCancel = () => {
    setMenuVisible(false);
    Alert.alert('Cancel Event', 'Are you sure you want to cancel this event?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: cancelActivity },
    ]);
  };

  const fetchActivityPosts = async () => {
    if (!activity?.id) return;
    try {
      setPostsLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      const res = await fetch(`${BASE_URL}/api/posts/?activity=${activity.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const normalized = (data.results || data).map(p => ({
        ...p,
        activity_id: p.activity,
        event_name: p.activity_name,
      }));
      setPosts(normalized);
    } catch (err) {
      console.warn('Failed to fetch activity posts', err);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      await fetch(`${BASE_URL}/api/posts/${postId}/like/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchActivityPosts();
    } catch (err) {
      console.warn('Like failed', err);
    }
  };

  const handleVote = async (postId, choiceId) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      await fetch(`${BASE_URL}/api/posts/${postId}/vote/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice_id: choiceId }),
      });
      fetchActivityPosts();
    } catch (err) {
      console.warn('Vote failed', err);
    }
  };

  const openComments = async (post) => {
    setSelectedPost(post);
    setComments([]);
    setCommentModalVisible(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const res = await fetch(`${BASE_URL}/api/posts/${post.id}/comments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.warn('Fetch comments error', err);
    }
  };

  const createComment = async () => {
    if (!commentText.trim() || !selectedPost) return;
    try {
      const token = await AsyncStorage.getItem('accessToken');
      await fetch(`${BASE_URL}/api/posts/${selectedPost.id}/comments/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: commentText }),
      });
      setCommentText('');
      openComments(selectedPost);
      fetchActivityPosts();
    } catch (err) {
      console.warn('Create comment error', err);
    }
  };

  const statusColor = isCancelled ? '#B00020' : isConcluded ? '#444' : '#F2994A';
  const statusLabel = isCancelled ? 'Cancelled' : isConcluded ? 'Concluded' : 'Upcoming';

  const descriptionText = activity.description || 'No description provided for this activity.';
  const isLongDesc = descriptionText.length > 220;
  const displayedDesc = (!descExpanded && isLongDesc)
    ? descriptionText.slice(0, 220) + '...'
    : descriptionText;

  const mainContent = (
    <>
        {/* HEADER IMAGE */}
        <View style={styles.imageContainer}>
          <ImageBackground
            source={{
              uri: activity.cover_image
                ? activity.cover_image.startsWith('http')
                  ? activity.cover_image
                  : `${BASE_URL}${activity.cover_image}`
                : getActivityTypeImage(activity.activity_type),
            }}
            style={styles.headerImage}
            resizeMode="cover"
          >
            <View style={styles.headerOverlay}>
              <View style={styles.headerTopRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerRightIcons}>
                  {isOwner && (
                    <TouchableOpacity style={styles.iconBtn} onPress={handleEdit}>
                      <Ionicons name="pencil-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    ref={menuBtnRef}
                    style={styles.iconBtn}
                    onPress={() => {
                      menuBtnRef.current?.measureInWindow((x, y, width, height) => {
                        const windowWidth = Dimensions.get('window').width;
                        setMenuAnchor({
                          top: y + height + 6,
                          right: Math.max(16, windowWidth - (x + width)),
                        });
                        setMenuVisible(true);
                      });
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.badgesRow}>
                {distanceLabel && (
                  <View style={styles.distanceBadge}>
                    <Ionicons name="navigate-outline" size={12} color="#fff" />
                    <Text style={styles.badgeText}>{distanceLabel}</Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.badgeText}>{statusLabel}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* BODY */}
        <View style={styles.body}>

          <Text style={styles.title}>{activity.name}</Text>

          {isCancelled && (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This event has been cancelled by the host.</Text>
            </View>
          )}

          <View style={styles.infoStack}>
            <View style={styles.infoCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={20} color="#2CB9B0" />
              </View>
              <View>
                <Text style={styles.infoValue}>
                  {new Date(activity.date_time).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </Text>
                <Text style={styles.infoSubValue}>
                  {new Date(activity.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Onwards
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={20} color="#2CB9B0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoValue} numberOfLines={1}>{activity.location?.split(',')[0]}</Text>
                <Text style={styles.infoSubValue} numberOfLines={1}>
                  {activity.location?.split(',').slice(1).join(',').trim() || activity.location}
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.iconCircle}>
                {getActivityTypeIcon(activity.activity_type, 20, '#2CB9B0')}
              </View>
              <View>
                <Text style={styles.infoValue}>{activity.activity_type}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.description}>{displayedDesc}</Text>
          {isLongDesc && (
            <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)}>
              <Text style={styles.readMore}>{descExpanded ? 'Show less' : 'Read more...'}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.hostRow}>
            <View style={styles.column}>
              <Text style={styles.sectionHeader}>Host</Text>
              <TouchableOpacity
                style={styles.pill}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ProfileView', { userId: activity.created_by?.id })}
              >
                <View style={styles.hostAvatar}>
                  <Image
                    source={
                      activity.created_by?.avatar
                        ? { uri: activity.created_by.avatar }
                        : { uri: 'https://via.placeholder.com/50' }
                    }
                    style={styles.fullImage}
                  />
                </View>
                <Text style={styles.pillText} numberOfLines={1}>
                  @{activity.created_by?.username || 'user'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.column}>
              <Text style={styles.sectionHeader}>Joined</Text>
              <TouchableOpacity
                style={styles.pill}
                activeOpacity={0.7}
                onPress={() => {
                  if (activity.participants?.length > 0) {
                    navigation.navigate('ParticipantsList', {
                      participants: activity.participants,
                      activityName: activity.name,
                      isOwner: isOwner,
                      activityId: activity.id,
                    });
                  } else {
                    Alert.alert('Info', 'No participants have joined yet.');
                  }
                }}
              >
                <View style={styles.avatarStack}>
                  {displayedParticipants.map((participant, index) => (
                    <Image
                      key={participant.id || index}
                      source={getAvatarSource(participant.avatar)}
                      style={[styles.stackAvatar, { marginLeft: index === 0 ? 0 : -10, zIndex: 10 - index }]}
                    />
                  ))}
                </View>
                <Text style={styles.pillText}>
                  {activity.participant_count}/{activity.max_players || '22'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mapContainer}>
            <LeafletMap
              latitude={coords?.latitude}
              longitude={coords?.longitude}
              label={activity.location}
            />
          </View>
          <Text style={styles.mapLabel}>{activity.location}</Text>

          <View style={styles.activitySection}>
            <Text style={styles.sectionHeader}>Activity</Text>
            {postsLoading ? (
              <ActivityIndicator color="#2CB9B0" style={{ marginTop: 20 }} />
            ) : posts.length === 0 ? (
              <Text style={styles.noPostsText}>No activity yet for this event.</Text>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post.id.toString()}
                  post={post}
                  onLike={handleLike}
                  onVote={handleVote}
                  onCommentPress={openComments}
                  onPostDeleted={fetchActivityPosts}
                  navigation={navigation}
                  compact={true}
                  isActivityOwner={isOwner}
                  activityId={activity.id}
                />
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
    </>
  );

  // Price + action buttons row, shared between mobile and wide web — on
  // wide web this gets nested inside the 680px center-column wrapper (see
  // webCenterWrap below) so it's structurally confined to that column,
  // rather than relying on manual pixel-width math to line up with it.
  const footerButtonsContent = (
    <View style={styles.footerPriceButtons}>
      <View>
        <Text style={styles.footerLabel}>Price</Text>
        <Text style={styles.footerPrice}>
          {activity.price && activity.price > 0 ? `Rs. ${activity.price}` : 'Free'}
        </Text>
      </View>

      <View style={styles.footerButtons}>
        {isCancelled ? (
          <>
            <TouchableOpacity style={[styles.actionBtn, styles.disabledBtn]} disabled>
              <Text style={styles.actionBtnText}>Event Cancelled</Text>
            </TouchableOpacity>
            {(isJoined || isOwner) && (
              <TouchableOpacity style={styles.chatIconBtn} onPress={goToChat}>
                <Ionicons name="chatbubble-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        ) : isConcluded ? (
          <>
            <TouchableOpacity style={[styles.actionBtn, styles.disabledBtn]} disabled>
              <Text style={styles.actionBtnText}>Event Ended</Text>
            </TouchableOpacity>
            {(isJoined || isOwner) && (
              <TouchableOpacity style={styles.chatIconBtn} onPress={goToChat}>
                <Ionicons name="chatbubble-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        ) : (isJoined || isOwner) ? (
          <TouchableOpacity style={[styles.actionBtn, styles.chatBtn]} onPress={goToChat}>
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionBtn, styles.joinBtn]} onPress={handleJoin} disabled={joining}>
            <Text style={styles.actionBtnText}>{joining ? 'Joining...' : 'Join'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {isWideWeb ? (
        <View style={styles.webRow}>
          <WebSidebar />
          <View style={styles.webContent}>
            {/* webCenterWrap is exactly 680px (matching webCenter's own cap)
                and is the positioning anchor for the sticky footer below —
                that keeps the footer physically confined to this column,
                so it can never overlay the sidebar or spill into the rail
                regardless of viewport width. */}
            <View style={styles.webCenterWrap}>
              <ScrollView style={styles.webCenter} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {mainContent}
              </ScrollView>
              <View style={styles.stickyFooter}>
                {footerButtonsContent}
              </View>
            </View>
            <PostsRail />
          </View>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {mainContent}
          </ScrollView>

          {/* STICKY FOOTER */}
          <View style={styles.stickyFooterMobile}>
            {footerButtonsContent}
          </View>
        </>
      )}

      {/* KEBAB DROPDOWN MENU */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuCard, { top: menuAnchor.top, right: menuAnchor.right }]}>
                {/* Share — visible to everyone */}
                <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                  <Text style={styles.menuItemText}>Share Event</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />

                {isOwner && (
                  <>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setRescheduleVisible(true); }}>
                      <Text style={styles.menuItemText}>Reschedule</Text>
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />
                    {!isCancelled && (
                      <>
                        <TouchableOpacity style={styles.menuItem} onPress={confirmCancel}>
                          <Text style={styles.menuItemText}>Cancel Event</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                      </>
                    )}
                    <TouchableOpacity style={styles.menuItem} onPress={confirmDelete}>
                      <Text style={[styles.menuItemText, styles.menuItemDestructive]}>Delete Event</Text>
                    </TouchableOpacity>
                  </>
                )}
                {!isOwner && isJoined && (
                  <>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleLeave(); }}>
                      <Text style={[styles.menuItemText, styles.menuItemDestructive]}>Leave Event</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* RESCHEDULE MODAL */}
      <Modal visible={rescheduleVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reschedule Event</Text>

            <TouchableOpacity style={styles.dateTimeInput} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color="#2CB9B0" style={{ marginRight: 8 }} />
              <Text style={styles.dateTimeText}>{newDate.toDateString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.dateTimeInput, { marginTop: 10 }]} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={18} color="#2CB9B0" style={{ marginRight: 8 }} />
              <Text style={styles.dateTimeText}>
                {newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRescheduleVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleReschedule}
                disabled={rescheduling}
              >
                <Text style={styles.modalSaveText}>{rescheduling ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        onConfirm={(date) => {
          const updated = new Date(newDate);
          updated.setFullYear(date.getFullYear());
          updated.setMonth(date.getMonth());
          updated.setDate(date.getDate());
          setNewDate(updated);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      <DateTimePickerModal
        isVisible={showTimePicker}
        mode="time"
        onConfirm={(time) => {
          const updated = new Date(newDate);
          updated.setHours(time.getHours());
          updated.setMinutes(time.getMinutes());
          setNewDate(updated);
          setShowTimePicker(false);
        }}
        onCancel={() => setShowTimePicker(false)}
      />

      {/* COMMENT MODAL — plain Modal, no BottomSheet */}
      <Modal
        visible={commentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCommentModalVisible(false)}>
          <View style={styles.commentModalOverlay} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          style={styles.commentModalSheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Handle bar */}
          <View style={styles.commentHandle} />

          <Text style={styles.sheetTitle}>Comments</Text>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <Text style={styles.commentUsername}>@{item.user_name}</Text>
                <Text style={styles.commentText}>{item.text}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.noPostsText}>No comments yet. Be the first!</Text>
            }
          />

          <View style={styles.commentInputRow}>
            <TextInput
              placeholder="Write a comment..."
              placeholderTextColor="#555"
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity style={styles.commentPostBtn} onPress={createComment}>
              <Text style={styles.commentPostText}>Post</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  /* ───────── WIDE WEB: 2-column layout (matches Home) ─────────
     overflow:'hidden' on every row/column ancestor keeps the sidebar and
     rail pinned to the viewport — without it, any child taller than the
     available height bubbles up and makes the whole page (not just the
     center ScrollView) scroll, dragging the sidebar down with it. */
  webRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webContent: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 680 + 360,
    overflow: 'hidden',
  },
  // Exactly 680px (matching webCenter's own cap) — this is the positioning
  // anchor for the wide-web sticky footer (position:absolute inside it), so
  // the footer is physically confined to the center column and can never
  // overlay the sidebar or spill into the rail.
  webCenterWrap: {
    flex: 1,
    maxWidth: 680,
  },
  webCenter: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────
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
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 16,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },

  // ── Body ────────────────────────────────────────
  body: {
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  title: {
    fontSize: 26,
    color: '#fff',
    marginBottom: 20,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.3,
  },
  cancelledBanner: {
    backgroundColor: '#2B0A0A',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4C4C',
  },
  cancelledText: {
    color: '#FF4C4C',
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },

  // ── Info Cards ───────────────────────────────────
  infoStack: {
    gap: 10,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(44,185,176,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  infoSubValue: {
    color: '#888',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },

  // ── Description ─────────────────────────────────
  sectionHeader: {
    color: '#fff',
    fontSize: 17,
    marginBottom: 10,
    fontFamily: Fonts.semibold,
  },
  description: {
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 23,
    fontFamily: Fonts.regular,
    marginBottom: 6,
  },
  readMore: {
    color: '#2CB9B0',
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginBottom: 28,
  },

  // ── Host & Joined ───────────────────────────────
  hostRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  column: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  hostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  pillText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
    flexShrink: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },

  // ── Map ─────────────────────────────────────────
  mapContainer: {
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  mapLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 8,
    marginBottom: 4,
  },

  // ── Activity ─────────────────────────────────────
  activitySection: {
    marginTop: 28,
  },
  noPostsText: {
    color: '#555',
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // ── Sticky Footer ───────────────────────────────
  // Mobile: full-width, positioned absolute against `container` (unchanged
  // from before). Wide web uses a separate `stickyFooter` (below) nested
  // inside webCenterWrap instead, so it's confined to the center column.
  stickyFooterMobile: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0E0E0E',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  // Wide web: positioned absolute against webCenterWrap (its own 680px
  // column wrapper) rather than the full-viewport container — so it's
  // physically confined to that column and can't overlay the sidebar or
  // spill into the rail, no matter the viewport width.
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0E0E0E',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  footerPriceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  footerPrice: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.semibold,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 13,
    paddingHorizontal: 36,
    borderRadius: 26,
  },
  joinBtn: {
    backgroundColor: '#E81F89',
  },
  chatBtn: {
    backgroundColor: '#27AE60',
  },
  disabledBtn: {
    backgroundColor: '#333',
  },
  chatIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },

  // ── Kebab Menu ───────────────────────────────────
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuCard: {
    // top/right are overridden inline per-render with the kebab button's
    // actual measured position (see menuAnchor) — the Modal renders as a
    // viewport-level overlay, so a fixed offset here would only be correct
    // for one specific header height/layout.
    position: 'absolute',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    width: 180,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  menuItemDestructive: {
    color: '#FF453A',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
  },

  // ── Reschedule Modal ─────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '88%',
    backgroundColor: '#1A1A1A',
    padding: 22,
    borderRadius: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
    marginBottom: 18,
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  dateTimeText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 22,
    gap: 20,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  modalSaveBtn: {
    backgroundColor: '#E81F89',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },

  // ── Comment Modal ────────────────────────────────
  commentModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentModalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  commentHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: Fonts.semibold,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  commentUsername: {
    color: '#2CB9B0',
    fontSize: 13,
    fontFamily: Fonts.semibold,
    marginBottom: 3,
  },
  commentText: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  commentInputRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
    borderWidth: 1,
    borderColor: '#333',
  },
  commentPostBtn: {
    backgroundColor: '#E81F89',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  commentPostText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
});

export default ActivityViewerScreen;
