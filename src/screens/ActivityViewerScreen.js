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
  Dimensions,
  Platform,
  TextInput,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import useAxios from '../utils/useAxios';
import { promptSignIn } from '../utils/requireAuth';
import { getActivityTypeImage } from '../utils/getActivityTypeImage';
import { Fonts } from '../theme/fonts';
import ActivityMap from '../components/ActivityMap';
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
import AuthPromptRail from '../components/web/AuthPromptRail';
import ActivityDetailSkeleton from '../components/skeletons/ActivityDetailSkeleton';

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
  // route.params can be undefined — not just for a bad/missing link, but
  // also when this screen (an always-registered top-level Stack.Screen)
  // becomes React Navigation's fallback render target after the navigator's
  // conditional screen set changes out from under an active route, e.g. a
  // session expiring mid-browse (userToken flips, MainTabs and everything
  // in it disappears from the Stack, and the screen that was focused inside
  // it is no longer reachable). Without the fallback, destructuring here
  // crashes instead of showing "not found".
  const { activity: initialActivity, activityId } = route.params || {};
  const [activity, setActivity] = useState(initialActivity);
  const { user, userToken } = useContext(AuthContext);
  const axios = useAxios();
  // Anonymous visitors get a stripped-down, read-only view of just the
  // activity — no app chrome (sidebar/rail), no Join button — rather than
  // the full logged-in layout with actions that just prompt them to sign in.
  const showChrome = !!userToken;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [canChat, setCanChat] = useState(false);
  const [invitePickerVisible, setInvitePickerVisible] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState([]);
  const [inviteSearching, setInviteSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState(null);
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
    if (activity) return;
    if (!activityId) {
      // Nothing to load and nothing to fetch by — e.g. this screen became
      // React Navigation's fallback render target with no params at all
      // (see the route.params comment above). There's no request to retry,
      // so go straight to "not found" instead of hanging on the skeleton.
      setNotFound(true);
      return;
    }
    axios.get(`${BASE_URL}/api/activity-detail/${activityId}/`)
      .then(res => setActivity(res.data))
      // A deep link with no navigation history behind it (the normal case
      // for a shared link) has nowhere for goBack() to go, which used to
      // leave the screen stuck on the loading skeleton forever after the
      // alert was dismissed — render an in-place "not found" state instead.
      .catch(() => setNotFound(true));
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
        setRequestStatus(statusRes.data.request_status || null);
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

  // Invite People picker — same debounce/fallback pattern as ExploreScreen's
  // people search.
  useEffect(() => {
    if (inviteSearchQuery.trim().length <= 2) {
      setInviteSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setInviteSearching(true);
        const res = await axios.get(`${BASE_URL}/api/users/?search=${inviteSearchQuery.trim()}`);
        const data = res.data.results || res.data;
        setInviteSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('User search failed', err);
        setInviteSearchResults([]);
      } finally {
        setInviteSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [inviteSearchQuery]);

  const displayedParticipants = useMemo(() => {
    const participants = (activity?.participants) || [];
    if (participants.length === 0) return [];
    if (participants.length <= 3) return participants;
    return [...participants].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [activity?.participants]);

  // ── EARLY RETURN — safe, all hooks above ────────────────────────────────
  // Mirrors the real (loaded) return's wide-web sidebar wrapping below —
  // this screen sits outside MainTabNavigator (which is what normally
  // supplies WebSidebar for tab screens), so without this the sidebar
  // would just be missing for the whole time the skeleton is showing.
  if (notFound) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Activity not found</Text>
          <TouchableOpacity
            style={styles.notFoundBtn}
            onPress={() => navigation.navigate(userToken ? 'MainTabs' : (Platform.OS === 'web' ? 'Landing' : 'Welcome'))}
          >
            <Text style={styles.notFoundBtnText}>Go to Spurth</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        {isWideWeb && showChrome ? (
          <View style={styles.webRow}>
            <WebSidebar />
            <View style={styles.webContent}>
              <ScrollView style={styles.webCenter} showsVerticalScrollIndicator={false}>
                <ActivityDetailSkeleton />
              </ScrollView>
              <PostsRail />
            </View>
          </View>
        ) : isWideWeb ? (
          // Anonymous visitor, wide web: same two-column shape as the
          // logged-in layout, but with the sign-in/sign-up prompt standing
          // in for WebSidebar + PostsRail (both per-account content an
          // anonymous visitor can't use).
          <View style={styles.webRow}>
            <View style={styles.webContent}>
              <ScrollView style={styles.webCenter} showsVerticalScrollIndicator={false}>
                <ActivityDetailSkeleton />
              </ScrollView>
              <AuthPromptRail />
            </View>
          </View>
        ) : (
          <ActivityDetailSkeleton />
        )}
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
    if (!userToken) return promptSignIn(navigation, 'Sign in to join this activity.');
    try {
      setJoining(true);
      const res = await axios.post(`${BASE_URL}/api/join-activity/${activity.id}/`);
      if (res.status === 202) {
        setRequestStatus('pending');
        Alert.alert('Request Sent', 'The host will review your request to join.');
      } else {
        setIsJoined(true);
        setCanChat(true);
        Alert.alert('Success', 'You joined the activity!');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to join activity');
    } finally {
      setJoining(false);
    }
  };

  const handleCopyInviteLink = async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        title: activity.name,
        message: `You're invited to "${activity.name}" on Spurth:\n\nhttps://spurth.com/event/${activity.id}`,
      });
    } catch (err) {
      console.warn('Share failed', err);
    }
  };

  const handleSendInvite = async (invitedUser) => {
    try {
      setInvitingUserId(invitedUser.id);
      await axios.post(`${BASE_URL}/api/invite/`, {
        invited_user_id: invitedUser.id,
        activity_id: activity.id,
      });
      Alert.alert('Invite sent!', `@${invitedUser.username} has been invited to "${activity.name}".`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send invite');
    } finally {
      setInvitingUserId(null);
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
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    if (!userToken) return promptSignIn(navigation, 'Sign in to like posts.');
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
    if (!userToken) return promptSignIn(navigation, 'Sign in to vote on polls.');
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
                {isOwner && activity.moderation_status !== 'approved' && (
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: activity.moderation_status === 'rejected' ? '#B00020' : '#F2994A' },
                  ]}>
                    <Text style={styles.badgeText}>
                      {activity.moderation_status === 'rejected' ? 'Photo rejected — please replace' : 'Photo under review'}
                    </Text>
                  </View>
                )}
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
                onPress={() => navigation.navigate('ProfileView', { username: activity.created_by?.username })}
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
                  if (activity.participants?.length > 0 || (isOwner && activity.is_invite_only)) {
                    // activityId only, not the full participants array — see
                    // ActivityCard.js's handlePress for why: React
                    // Navigation's web `linking` serializes any param
                    // outside the path pattern into the URL's query string,
                    // and an array of full user objects becomes a wall of
                    // "[object Object]" there. ParticipantsListScreen
                    // fetches the activity (and its participants) by id.
                    navigation.navigate('ParticipantsList', {
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
            <ActivityMap
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
        ) : requestStatus === 'pending' ? (
          <TouchableOpacity style={[styles.actionBtn, styles.disabledBtn]} disabled>
            <Text style={styles.actionBtnText}>Requested</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionBtn, styles.joinBtn]} onPress={handleJoin} disabled={joining}>
            <Text style={styles.actionBtnText}>
              {joining ? 'Joining...' : (activity.is_invite_only ? 'Request to Join' : 'Join')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {isWideWeb && showChrome ? (
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
      ) : isWideWeb ? (
        // Anonymous visitor on wide web: same two-column shape as the
        // logged-in layout — no sidebar nav (nothing behind it is reachable
        // while logged out), and the sign-in/sign-up prompt stands in for
        // PostsRail ("Experiences" column, which is per-account content).
        <View style={styles.webRow}>
          <View style={styles.webContent}>
            <View style={styles.webCenterWrap}>
              <ScrollView style={styles.webCenter} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {mainContent}
              </ScrollView>
              <View style={styles.stickyFooter}>
                {footerButtonsContent}
              </View>
            </View>
            <AuthPromptRail />
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
                    {activity.is_invite_only && (
                      <>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setInvitePickerVisible(true); }}>
                          <Text style={styles.menuItemText}>Invite People</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity style={styles.menuItem} onPress={handleCopyInviteLink}>
                          <Text style={styles.menuItemText}>Copy Invite Link</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                      </>
                    )}
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

      {/* INVITE PEOPLE MODAL */}
      <Modal
        visible={invitePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInvitePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.commentModalOverlay}
          activeOpacity={1}
          onPress={() => setInvitePickerVisible(false)}
        />
        <View style={styles.commentModalSheet}>
          <View style={styles.commentHandle} />
          <Text style={styles.commentSheetTitle}>Invite People</Text>

          <View style={styles.inviteSearchWrap}>
            <Ionicons name="search-outline" size={16} color="#555" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.inviteSearchInput}
              placeholder="Search by name or username"
              placeholderTextColor="#555"
              value={inviteSearchQuery}
              onChangeText={setInviteSearchQuery}
              autoFocus
            />
            {inviteSearching && <ActivityIndicator size="small" color="#2CB9B0" />}
          </View>

          {inviteSearchQuery.trim().length > 2 && !inviteSearching && inviteSearchResults.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: '#555', textAlign: 'center' }}>No users found.</Text>
            </View>
          ) : (
            <FlatList
              data={inviteSearchResults}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: '#1A1A1A' }} />
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.inviteUserRow}
                  activeOpacity={0.75}
                  disabled={invitingUserId === item.id}
                  onPress={() => handleSendInvite(item)}
                >
                  <Image
                    source={item.avatar ? { uri: item.avatar } : require('../assets/avatar-placeholder.png')}
                    style={styles.inviteUserAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inviteUserName} numberOfLines={1}>
                      {item.full_name || item.username}
                    </Text>
                    <Text style={styles.inviteUserHandle} numberOfLines={1}>@{item.username}</Text>
                  </View>
                  {invitingUserId === item.id ? (
                    <ActivityIndicator size="small" color="#2CB9B0" />
                  ) : (
                    <Ionicons name="paper-plane-outline" size={18} color="#2CB9B0" />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
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
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.medium,
    marginBottom: 16,
  },
  notFoundBtn: {
    backgroundColor: '#8575ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  notFoundBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
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

  // ── Invite People Modal ──────────────────────────
  commentModalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentModalSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
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
  commentSheetTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: Fonts.semibold,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  inviteSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inviteSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
    padding: 0,
  },
  inviteUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  inviteUserAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2A2A2A',
  },
  inviteUserName: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  inviteUserHandle: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
});

export default ActivityViewerScreen;
