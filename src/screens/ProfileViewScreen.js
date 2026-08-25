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
  Share,                     // ← ADD 1: import Share
  Platform,
} from 'react-native';
import axiosInstance from '../utils/axiosInstance';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { promptSignIn } from '../utils/requireAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';
import { getActivityTypeImage } from '../utils/getActivityTypeImage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostCard from '../components/PostCard';
import ReportModal from '../components/ReportModal';
import { BASE_URL } from '../config';
import { useIsWideWeb } from '../utils/responsive';
import WebSidebar from '../components/web/WebSidebar';
import AuthPromptRail from '../components/web/AuthPromptRail';
import ProfileSkeleton from '../components/skeletons/ProfileSkeleton';

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
  const { logout, userToken } = useContext(AuthContext);

  const username = route?.params?.username || null;
  const isMyProfile = !username;

  const [myActivities, setMyActivities] = useState([]);
  const [joinedActivities, setJoinedActivities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Resolved from the fetched profile's numeric `user_id` — internal APIs
  // (posts/?user=, invite/) still key off the id, not the username, but the
  // URL/route param is username-based, so this is filled in once the
  // profile response comes back rather than being available up front.
  const [targetUserId, setTargetUserId] = useState(null);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const POSTS_PAGE_SIZE = 2;
  const [visiblePostCount, setVisiblePostCount] = useState(POSTS_PAGE_SIZE);

  // ── ADD 2: Invite state ─────────────────────────────────────────────────────
  // myOwnActivities = the *current user's* activities (created + joined), used to
  // pick which event to invite the viewed user to. Only populated when !isMyProfile.
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
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
            isMyProfile ? 'profile/' : `profile/${username}/`
          );
          if (!active) return;
          setProfile(profileRes.data);
          const resolvedUserId = profileRes.data.user_id;
          setTargetUserId(resolvedUserId);

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
            const res = await axiosInstance.get(`user-activities/${username}/`);
            if (!active) return;
            setMyActivities(res.data.created || []);
            setJoinedActivities(res.data.joined || []);

            // ── ADD 3: Also fetch the CURRENT user's own activities for the
            //    invite picker. We need to show activities the inviter belongs
            //    to — only meaningful (and only authorized) for a logged-in
            //    visitor; skipping this for anonymous visitors keeps the rest
            //    of the profile page (which loaded fine) from failing here.
            if (userToken) {
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
          }

          fetchUserPosts(resolvedUserId);
        } catch (err) {
          console.log('Profile fetch error:', err);
          Alert.alert('Error', 'Profile not found');
        } finally {
          if (active) setLoading(false);
        }
      };

      setVisiblePostCount(POSTS_PAGE_SIZE);
      fetchProfile();
      return () => (active = false);
    }, [username])
  );

  // targetId is passed explicitly right after the profile fetch resolves
  // (see fetchProfile above); later refresh calls (like/delete callbacks)
  // call this with no argument and fall back to the already-resolved
  // targetUserId state instead.
  const fetchUserPosts = async (targetId) => {
    const resolvedId = targetId ?? targetUserId;
    if (!resolvedId) return;
    try {
      setPostsLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      // Filtered server-side by ?user= — fetching the global feed and
      // filtering client-side (as this used to) silently dropped the user's
      // own posts whenever they weren't within the feed's first page
      // (PAGE_SIZE=10), since anything posted by other users pushes older
      // posts off that page before the client-side filter ever sees them.
      const res = await fetch(`${BASE_URL}/api/posts/?user=${resolvedId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const normalized = (data.results || data)
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
    if (!userToken) return promptSignIn(navigation, 'Sign in to like posts.');
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
          `spurth://profile/${profile?.username || username}\n\n` +
          `https://spurth.com/profile/${profile?.username || username}`,
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
        invited_user_id: targetUserId,  // the profile being viewed
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
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.webRow}>
          {isWideWeb && userToken && <WebSidebar />}
          <View style={[styles.webCol, isWideWeb && (userToken ? styles.webColWide : styles.webColNarrow)]}>
            <ProfileSkeleton />
          </View>
          {isWideWeb && !userToken && <AuthPromptRail />}
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff', marginBottom: 16 }}>Profile not found</Text>
        <TouchableOpacity
          style={styles.notFoundBtn}
          onPress={() => navigation.navigate(userToken ? 'MainTabs' : (Platform.OS === 'web' ? 'Landing' : 'Welcome'))}
        >
          <Text style={styles.notFoundBtnText}>Go to Spurth</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Wide web, logged in: sidebar + centered profile column, matching
          Settings — no right rail here, just nav + content with space on
          both sides. Logged out: no sidebar (nothing behind it is reachable
          anyway), and the sign-in/sign-up prompt takes the rail's place. */}
      <View style={styles.webRow}>
      {isWideWeb && userToken && <WebSidebar />}
      <View style={[styles.webCol, isWideWeb && (userToken ? styles.webColWide : styles.webColNarrow)]}>
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
              <>
                <TouchableOpacity
                  onPress={() =>
                    userToken
                      ? setInviteModalVisible(true)
                      : promptSignIn(navigation, 'Sign in to invite people to your events.')
                  }
                >
                  <Ionicons name="person-add-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    userToken
                      ? setReportModalVisible(true)
                      : promptSignIn(navigation, 'Sign in to report this profile.')
                  }
                >
                  <Ionicons name="flag-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </>
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
              <StatBox label="Hosted" value={profile.activities_created} />
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
              <StatBox label="Hosted" value={profile.activities_created} />
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
          <ListCard
            data={userToken ? myActivities : myActivities.slice(0, 3)}
            navigation={navigation}
          />
        </Section>

        <Section title="Joined" count={joinedActivities.length}>
          <ListCard
            data={userToken ? joinedActivities : joinedActivities.slice(0, 3)}
            navigation={navigation}
          />
        </Section>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Experiences</Text>
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
            <>
              {posts.slice(0, visiblePostCount).map((post) => (
                <PostCard
                  key={post.id.toString()}
                  post={post}
                  onLike={handleLike}
                  onPostDeleted={fetchUserPosts}
                  navigation={navigation}
                  compact={true}
                  hideUsername={true}
                />
              ))}
              {posts.length > visiblePostCount && (
                <TouchableOpacity
                  style={styles.ghostCta}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (!userToken) return promptSignIn(navigation, 'Sign in to see more experiences.');
                    setVisiblePostCount(posts.length);
                  }}
                >
                  <Text style={styles.ghostCtaText}>View more</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {isMyProfile && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </View>
      {isWideWeb && !userToken && <AuthPromptRail />}
      </View>

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

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        targetType="user"
        targetId={targetUserId}
        targetLabel="profile"
      />
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
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    {/* No numberOfLines here — at phone widths even "Joined"/"Hosted" don't
        reliably fit on one line next to two other equal-width pills, and
        ellipsizing a 6-letter word ("Host…") reads worse than a clean wrap. */}
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
            // activityId only — see ActivityCard.js's handlePress for why the
            // full object isn't passed alongside it.
            navigation.navigate('ActivityViewerScreen', { activityId: item.id })
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
  // Logged-out wide web: content column alone (no sidebar), capped to make
  // room for AuthPromptRail (360) alongside it — same 680+360 total budget
  // as every other two-column screen, just split into two columns instead
  // of one wide one.
  webColNarrow: {
    maxWidth: 680,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
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
    fontWeight: '600',
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
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { color: '#fff', fontSize: 22, fontFamily: Fonts.semibold },
  statLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
    fontFamily: Fonts.regular,
    textAlign: 'center',
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
  ghostCta: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  ghostCtaText: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: Fonts.semibold,
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