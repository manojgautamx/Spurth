import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,                     // ← ADD 1: import Share
} from 'react-native';
import axiosInstance from '../utils/axiosInstance';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';
import { getActivityTypeImage } from '../utils/getActivityTypeImage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostCard from '../components/PostCard';
import { BASE_URL } from '../config';
import { useIsWideWeb } from '../utils/responsive';
import WebSidebar from '../components/web/WebSidebar';

const getCoverSource = (item) => {
  if (item.cover_image) {
    const uri = item.cover_image.startsWith('http')
      ? item.cover_image
      : `${BASE_URL}${item.cover_image}`;
    return { uri };
  }
  return { uri: getActivityTypeImage(item.activity_type) };
};

export default function ProfileViewScreen({ route }) {
  const navigation = useNavigation();
  const isWideWeb = useIsWideWeb();
  const { logout, user } = useContext(AuthContext);

  const userId = route?.params?.userId || null;
  const isMyProfile = !userId || user?.user_id === userId;

  const [myActivities, setMyActivities] = useState([]);
  const [joinedActivities, setJoinedActivities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  // ── ADD 2: Invite state ─────────────────────────────────────────────────────
  // myOwnActivities = the *current user's* activities (created + joined), used to
  // pick which event to invite the viewed user to. Only populated when !isMyProfile.
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [myOwnActivities, setMyOwnActivities] = useState([]);
  const [inviting, setInviting] = useState(false);
  // ───────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const fetchProfile = async () => {
        try {
          setLoading(true);

          const profileRes = await axiosInstance.get(
            isMyProfile ? 'profile/' : `profile/${userId}/`
          );
          if (!active) return;
          setProfile(profileRes.data);

          if (isMyProfile) {
            const [myRes, joinedRes] = await Promise.all([
              axiosInstance.get('my-activities/'),
              axiosInstance.get('joined-activities/'),
            ]);
            if (!active) return;
            setMyActivities(myRes.data);
            setJoinedActivities(joinedRes.data);
          } else {
            // Fetch the viewed user's activities for display
            const res = await axiosInstance.get(`user-activities/${userId}/`);
            if (!active) return;
            setMyActivities(res.data.created || []);
            setJoinedActivities(res.data.joined || []);

            // ── ADD 3: Also fetch the CURRENT user's own activities for the
            //    invite picker. We need to show activities the inviter belongs to.
            const [ownCreated, ownJoined] = await Promise.all([
              axiosInstance.get('my-activities/'),
              axiosInstance.get('joined-activities/'),
            ]);
            if (!active) return;
            setMyOwnActivities([
              ...(ownCreated.data || []),
              ...(ownJoined.data || []),
            ]);
          }
        } catch (err) {
          console.log('Profile fetch error:', err);
          Alert.alert('Error', 'Profile not found');
        } finally {
          if (active) setLoading(false);
        }
      };

      fetchProfile();
      fetchUserPosts();
      return () => (active = false);
    }, [userId])
  );

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      const targetId = isMyProfile ? user?.user_id : userId;
      const res = await fetch(`${BASE_URL}/api/posts/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const normalized = (data.results || data)
        .filter(p => String(p.user) === String(targetId))
        .map(p => ({
          ...p,
          activity_id: p.activity,
          event_name: p.activity_name,
          is_host: p.is_host === true,
        }));
      setPosts(normalized);
    } catch (err) {
      console.warn('Failed to fetch user posts', err);
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
      fetchUserPosts();
    } catch (err) {
      console.warn('Like failed', err);
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
      fetchUserPosts();
    } catch (err) {
      console.warn('Create comment error', err);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // ── ADD 4a: Share profile ───────────────────────────────────────────────────
  const handleShareProfile = async () => {
    try {
      await Share.share({
        title: profile?.full_name,
        message:
          `Check out ${profile?.full_name}'s profile on Spurth!\n\n` +
          `spurth://profile/${profile?.user_id || userId}\n\n` +
          `https://spurth.com/profile/${profile?.user_id || userId}`,
      });
    } catch (err) {
      console.warn('Share profile failed', err);
    }
  };

  // ── ADD 4b: Send invite ─────────────────────────────────────────────────────
  // Called when the current user picks an activity from the invite picker.
  // Backend should create a notification of type 'invite' for the invited user,
  // with activity_id set so tapping the notification opens ActivityViewerScreen.
  const handleSendInvite = async (activity) => {
    try {
      setInviting(true);
      await axiosInstance.post('invite/', {
        invited_user_id: userId,       // the profile being viewed
        activity_id: activity.id,
      });
      setInviteModalVisible(false);
      Alert.alert(
        'Invite sent!',
        `${profile?.full_name} has been invited to "${activity.name}".`
      );
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send invite';
      Alert.alert('Error', msg);
    } finally {
      setInviting(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  const avatarUri =
    profile?.avatar &&
    (profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#36ACA6" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff' }}>Failed to load profile</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Wide web: sidebar + centered profile column, matching Settings —
          no right rail here, just nav + content with space on both sides. */}
      <View style={styles.webRow}>
      {isWideWeb && <WebSidebar />}
      <View style={[styles.webCol, isWideWeb && styles.webColWide]}>
      <ScrollView
        style={styles.safe}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER
            — My profile:      back | edit  settings
            — Other profile:   back | share invite        */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 20 }}>
            {/* Share button visible for everyone */}
            <TouchableOpacity onPress={handleShareProfile}>
              <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>

            {isMyProfile ? (
              <>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProfileEdit', { profile })}
                >
                  <Ionicons name="create-outline" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                  <Ionicons name="settings-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setInviteModalVisible(true)}>
                <Ionicons name="person-add-outline" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* PROFILE CARD — wide web uses a horizontal layout (avatar | info |
            stats) that actually fills the wider column, instead of the
            mobile card's vertically-centered layout stretched thin. */}
        {isWideWeb ? (
          <View style={styles.profileCardWide}>
            <Image
              source={
                avatarUri
                  ? { uri: avatarUri }
                  : require('../assets/avatar-placeholder.png')
              }
              style={styles.avatarWide}
            />

            <View style={styles.profileCardWideInfo}>
              <Text style={styles.name}>{profile.full_name}</Text>
              <Text style={styles.username}>@{profile.username}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color="#888" />
                <Text style={styles.locationText}>{profile.location || '—'}</Text>
              </View>
            </View>

            <View style={styles.statsRowWide}>
              <StatBox label="Age" value={profile.age} />
              <StatBox label="Joined" value={profile.activities_joined} />
              <StatBox label="Organized" value={profile.activities_created} />
            </View>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <Image
              source={
                avatarUri
                  ? { uri: avatarUri }
                  : require('../assets/avatar-placeholder.png')
              }
              style={styles.avatar}
            />
            <Text style={styles.name}>{profile.full_name}</Text>
            <Text style={styles.username}>@{profile.username}</Text>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color="#888" />
              <Text style={styles.locationText}>{profile.location || '—'}</Text>
            </View>

            <View style={styles.statsRow}>
              <StatBox label="Age" value={profile.age} />
              <StatBox label="Joined" value={profile.activities_joined} />
              <StatBox label="Organized" value={profile.activities_created} />
            </View>
          </View>
        )}

        <Section title="Bio">
          <Text style={styles.bioText}>{profile.bio || '—'}</Text>
        </Section>

        <Section title="Interests" count={profile.interests?.length || 0}>
          <View style={styles.chipsWrap}>
            {profile.interests?.map((interest) => (
              <View key={interest} style={styles.chip}>
                <Text style={styles.chipText}>{interest}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Organizer" count={myActivities.length}>
          <ListCard data={myActivities} navigation={navigation} />
        </Section>

        <Section title="Joined" count={joinedActivities.length}>
          <ListCard data={joinedActivities} navigation={navigation} />
        </Section>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activity</Text>
            {posts.length > 0 && (
              <Text style={styles.sectionCount}>{posts.length}</Text>
            )}
          </View>

          {postsLoading ? (
            <ActivityIndicator color="#36ACA6" style={{ marginTop: 16 }} />
          ) : posts.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={{ color: '#777', textAlign: 'center' }}>No posts yet</Text>
            </View>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id.toString()}
                post={post}
                onLike={handleLike}
                onCommentPress={openComments}
                onPostDeleted={fetchUserPosts}
                navigation={navigation}
                compact={true}
                hideUsername={true}
                isActivityOwner={false}
              />
            ))
          )}
        </View>

        {isMyProfile && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </View>
      </View>

      {/* COMMENT MODAL */}
      <Modal
        visible={commentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.commentModalOverlay}
          activeOpacity={1}
          onPress={() => setCommentModalVisible(false)}
        />
        <KeyboardAvoidingView
          style={styles.commentModalSheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.commentHandle} />
          <Text style={styles.commentSheetTitle}>Comments</Text>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <Text style={styles.commentUsername}>@{item.user_name}</Text>
                <Text style={styles.commentBody}>{item.text}</Text>
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

      {/* ── ADD: INVITE PICKER MODAL ───────────────────────────────────────────
          Shows the current user's own activities. Tapping one sends an invite to
          the profile being viewed. Duplicate invites should be rejected server-side. */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.commentModalOverlay}
          activeOpacity={1}
          onPress={() => setInviteModalVisible(false)}
        />
        <View style={styles.commentModalSheet}>
          <View style={styles.commentHandle} />

          <Text style={styles.commentSheetTitle}>
            Invite {profile?.full_name?.split(' ')[0]} to…
          </Text>

          {myOwnActivities.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: '#555', textAlign: 'center' }}>
                You haven't created or joined any events yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={myOwnActivities}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: '#1A1A1A' }} />
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.inviteActivityRow}
                  activeOpacity={0.75}
                  disabled={inviting}
                  onPress={() => handleSendInvite(item)}
                >
                  <Image source={getCoverSource(item)} style={styles.inviteActivityCover} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inviteActivityName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.inviteActivityDate}>
                      {new Date(item.date_time).toLocaleDateString('en-GB')}
                    </Text>
                  </View>
                  {inviting ? (
                    <ActivityIndicator size="small" color="#36ACA6" />
                  ) : (
                    <Ionicons name="paper-plane-outline" size={18} color="#36ACA6" />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
      {/* ──────────────────────────────────────────────────────────────────────── */}
    </View>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

const Section = ({ title, count, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <Text style={styles.sectionCount}>{count}</Text>
      )}
    </View>
    {children}
  </View>
);

const StatBox = ({ label, value }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ListCard = ({ data = [], navigation }) => {
  if (data.length === 0) {
    return (
      <View style={styles.listCard}>
        <Text style={{ color: '#777', textAlign: 'center' }}>No plays found</Text>
      </View>
    );
  }
  return (
    <View style={styles.listCard}>
      {data.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.listItem}
          onPress={() =>
            navigation.navigate('ActivityViewerScreen', { activity: item })
          }
          activeOpacity={0.75}
        >
          <Image source={getCoverSource(item)} style={styles.listImage} />
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.listDate}>
              {new Date(item.date_time).toLocaleDateString('en-GB')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#444" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  // #0F0F0F matches WebSidebar's own background and the color other
  // sidebar-adjacent screens (Home, MainTabNavigator) use — keeps the
  // sidebar and content reading as one seamless surface instead of two
  // different shades of black.
  container: { flex: 1, backgroundColor: '#0F0F0F', overflow: 'hidden' },
  safe: { flex: 1 },

  /* ───────── WIDE WEB: sidebar + centered column, no rail ─────────
     overflow:'hidden' keeps the sidebar pinned to the viewport — without
     it, content taller than the available height bubbles up and makes the
     whole page scroll instead of just the ScrollView inside webCol. */
  webRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webCol: {
    flex: 1,
    overflow: 'hidden',
  },
  // 680+360 matches the same total block width (sidebar + 1040) used by
  // Home/Explore/ActivityViewer's center+rail budget — there's no rail
  // here, so the profile column gets that whole allowance to itself. Using
  // the same total keeps the sidebar at the exact same on-screen position
  // across every page instead of jumping around per-screen.
  webColWide: {
    maxWidth: 680 + 360,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  profileCard: {
    backgroundColor: '#222222',
    margin: 20,
    borderRadius: 35,
    alignItems: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 16,
  },

  // ── Wide web: horizontal card (avatar | name/username/location | stats) —
  // fills the wider column instead of stretching the mobile card's
  // vertically-centered layout thin across it.
  profileCardWide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    margin: 20,
    borderRadius: 35,
    padding: 32,
    gap: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  avatarWide: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileCardWideInfo: {
    flex: 1,
  },
  // Fixed width instead of flex:1 across the whole card — otherwise the 3
  // stat boxes would stretch into oversized tiles on a 1040px-wide card.
  statsRowWide: {
    flexDirection: 'row',
    gap: 12,
    width: 300,
  },

  name: { color: '#fff', fontSize: 22, fontFamily: Fonts.semibold },
  username: {
    color: '#888',
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  locationText: {
    color: '#888',
    marginLeft: 6,
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  statsRow: { flexDirection: 'row', marginTop: 25, gap: 10 },
  statBox: {
    backgroundColor: 'rgb(19, 19, 19)',
    borderRadius: 20,
    paddingVertical: 18,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { color: '#fff', fontSize: 24, fontFamily: Fonts.semibold },
  statLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
    fontFamily: Fonts.regular,
  },
  section: { paddingHorizontal: 20, marginTop: 30 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
    gap: 10,
  },
  sectionTitle: { color: '#fff', fontSize: 20, fontFamily: Fonts.semibold },
  sectionCount: { color: '#444', fontSize: 16, fontFamily: Fonts.regular },
  bioText: {
    color: '#fff',
    lineHeight: 22,
    fontSize: 15,
    fontFamily: Fonts.regular,
    // Capped so bio text doesn't stretch into uncomfortably long line
    // lengths on the wider web column — harmless on mobile, which is
    // already narrower than this.
    maxWidth: 640,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  chipText: { color: '#fff', fontSize: 18, fontFamily: Fonts.medium },
  listCard: {
    backgroundColor: '#181818',
    borderRadius: 25,
    padding: 16,
    gap: 20,
  },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  listImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#222',
  },
  listTitle: { color: '#fff', fontSize: 15, fontFamily: Fonts.semibold },
  listDate: {
    color: '#666',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#C90000',
    marginHorizontal: 20,
    marginTop: 40,
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutText: { color: '#C90000', fontSize: 16, fontFamily: Fonts.semibold },

  // ── Comment Modal ─────────────────────────────────────────────────────────
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
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  commentUsername: {
    color: '#36ACA6',
    fontSize: 13,
    fontFamily: Fonts.semibold,
    marginBottom: 3,
  },
  commentBody: { color: '#ccc', fontSize: 14, fontFamily: Fonts.regular },
  commentInputRow: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
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
    backgroundColor: '#36ACA6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  commentPostText: { color: '#fff', fontSize: 14, fontFamily: Fonts.semibold },
  noPostsText: {
    color: '#555',
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    paddingVertical: 24,
  },
  inviteActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  inviteActivityCover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  inviteActivityName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
    marginBottom: 3,
  },
  inviteActivityDate: {
    color: '#555',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
});