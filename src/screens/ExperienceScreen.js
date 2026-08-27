import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import axiosInstance from '../utils/axiosInstance';
import { appendImageAsset, appendVideoAsset } from '../utils/appendImageAsset';
import { validateVideoAsset } from '../utils/validateVideoAsset';
import { nearestRatioKey } from '../constants/mediaRatios';
import MediaRatioPicker from '../components/MediaRatioPicker';
import MediaPreview from '../components/MediaPreview';
import { AuthContext } from '../context/AuthContext';
import { LocationContext } from '../context/LocationContext';
import { rankByInterest } from '../utils/rankByInterest';
import PostCard from '../components/PostCard';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../config';
import { useIsWideWeb } from '../utils/responsive';
import ActivitiesRail from '../components/web/ActivitiesRail';
import { Fonts } from '../theme/fonts';
import ExperienceSkeleton from '../components/skeletons/ExperienceSkeleton';

const ExperienceScreen = () => {
  const isWideWeb = useIsWideWeb();
  const { user } = useContext(AuthContext);
  const { location } = useContext(LocationContext);

  const [activities, setActivities] = useState([]);
  const [joinedActivityIds, setJoinedActivityIds] = useState(new Set());
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityPickerVisible, setActivityPickerVisible] = useState(false);
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [mediaRatio, setMediaRatio] = useState('original');
  const [profile, setProfile] = useState(null);

  // Poll composing — mutually exclusive with `image`/`video` (matches the
  // reference composer, which switches between a media preview and a
  // poll panel rather than showing both). The caption input doubles as
  // the poll's question — the reference poll panel shows "Ask a question"
  // only as a static header label, no separate question field.
  const [showPoll, setShowPoll] = useState(false);
  const [pollChoices, setPollChoices] = useState(['', '']);
  const [pollDays, setPollDays] = useState(1);
  const [pollHours, setPollHours] = useState(0);
  const [pollMinutes, setPollMinutes] = useState(0);
  const [numberPickerField, setNumberPickerField] = useState(null); // 'days' | 'hours' | 'minutes' | null
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation();

  useEffect(() => {
    const load = async () => {
      await Promise.allSettled([
        axiosInstance.get('profile/').then(res => setProfile(res.data)),
        fetchMyActivities(),
        fetchPosts(),
      ]);
      setLoading(false);
    };
    load();
  }, []);

  const getAvatarUri = () => {
    if (!profile?.avatar) return null;
    return profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`;
  };

  const fetchMyActivities = async () => {
    try {
      const [createdRes, joinedRes] = await Promise.all([
        axiosInstance.get('my-activities/'),
        axiosInstance.get('joined-activities/'),
      ]);
      const created = createdRes.data || [];
      const joined = joinedRes.data || [];
      const merged = [...created, ...joined.filter(j => !created.some(c => c.id === j.id))];
      const minimal = merged.map(a => ({ id: a.id, name: a.name }));
      setActivities(minimal);
      setJoinedActivityIds(new Set(merged.map(a => a.id)));
      if (minimal.length) setSelectedActivity(minimal[0].id);
    } catch (err) {
      console.log('Fetch activities error:', err);
    }
  };

  // Was previously restricted to posts from activities *you* created or
  // joined, intersected with a distance check against those activities'
  // location (not the viewer's) — meaning even a fully public, nearby post
  // never showed up unless you personally happened to be a member of that
  // exact activity. That's why the feed looked empty despite plenty of
  // seeded posts existing. Experience is meant to be a discovery feed like
  // Explore's, not scoped to your own activities, so it just shows
  // everything now (posts/ has no default restriction server-side either —
  // see PostViewSet.get_queryset).
  const fetchPosts = async () => {
    try {
      const res = await axiosInstance.get('posts/');
      const data = res.data;
      const normalized = (data.results || data).map(p => ({
        ...p,
        activity_id: p.activity,
        event_name: p.activity_name,
      }));
      setPosts(normalized);
    } catch (err) {
      console.log('Fetch posts error:', err);
    }
  };

  const pickMedia = async () => {
    const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.7 });
    if (result.didCancel || result.errorCode) return;
    const asset = result.assets[0];
    const isVideo = (asset.type || '').startsWith('video/');

    if (isVideo) {
      const error = validateVideoAsset(asset);
      if (error) return Alert.alert('Video not supported', error);
      setVideo(asset);
      setImage(null);
      setMediaRatio(nearestRatioKey(asset.width, asset.height)); // width/height rarely known upfront for video — falls back to 'original'
    } else {
      setImage(asset);
      setVideo(null);
      setMediaRatio(nearestRatioKey(asset.width, asset.height));
    }
  };

  const togglePoll = () => {
    if (showPoll) {
      removePoll();
    } else {
      setShowPoll(true);
      setImage(null); // image/video and poll are mutually exclusive
      setVideo(null);
    }
  };

  const removePoll = () => {
    setShowPoll(false);
    setPollChoices(['', '']);
    setPollDays(1);
    setPollHours(0);
    setPollMinutes(0);
  };

  const updatePollChoice = (index, text) => {
    setPollChoices(prev => prev.map((c, i) => (i === index ? text : c)));
  };

  const addPollChoice = () => {
    setPollChoices(prev => (prev.length < 4 ? [...prev, ''] : prev));
  };

  const selectPollNumber = (field, value) => {
    if (field === 'days') setPollDays(value);
    if (field === 'hours') setPollHours(value);
    if (field === 'minutes') setPollMinutes(value);
    setNumberPickerField(null);
  };

  const createPost = async () => {
    if (!selectedActivity) return Alert.alert('Select an activity first');

    const filledChoices = pollChoices.map(c => c.trim()).filter(Boolean);
    const hasPoll = showPoll && filledChoices.length >= 2;

    if (showPoll && filledChoices.length < 2) return Alert.alert('Add at least 2 poll choices');
    if (hasPoll && !caption.trim()) return Alert.alert('Add a question for your poll');
    if (!hasPoll && !caption && !image && !video) return Alert.alert('Add caption, image, or video');

    const formData = new FormData();
    formData.append('activity', selectedActivity);
    formData.append('caption', caption);

    if (hasPoll) {
      filledChoices.forEach(c => formData.append('poll_choices', c));
      formData.append('poll_days', String(pollDays));
      formData.append('poll_hours', String(pollHours));
      formData.append('poll_minutes', String(pollMinutes));
    } else if (video) {
      appendVideoAsset(formData, 'video', video);
      formData.append('media_ratio', mediaRatio);
      if (video.duration) formData.append('video_duration', String(Math.round(video.duration)));
    } else if (image) {
      appendImageAsset(formData, 'image', image);
      formData.append('media_ratio', mediaRatio);
    }

    try {
      await axiosInstance.post('posts/', formData);
      setCaption('');
      setImage(null);
      setVideo(null);
      setMediaRatio('original');
      removePoll();
      fetchPosts();
    } catch (err) {
      const data = err.response?.data;
      console.error('Create post error:', data || err.message);
      Alert.alert('Failed to post', data?.caption?.[0] || data?.detail || 'Something went wrong.');
    }
  };

  const handleLike = async (postId) => {
    await axiosInstance.post(`posts/${postId}/like/`);
    fetchPosts();
  };

  const handleVote = async (postId, choiceId) => {
    try {
      await axiosInstance.post(`posts/${postId}/vote/`, { choice_id: choiceId });
      fetchPosts();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to vote';
      Alert.alert('Error', detail);
    }
  };

  const canPost = activities.length > 0;

  const header = <Text style={styles.header}>Experience</Text>;

  const composer = (
    <View style={styles.composerCard}>
      {/* Activity selector — full-width pill at the top of the card */}
      {canPost ? (
        <TouchableOpacity
          style={styles.activityPill}
          onPress={() => setActivityPickerVisible(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.activityPillText} numberOfLines={1}>
            {activities.find(a => a.id === selectedActivity)?.name || 'Select activity'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#888" />
        </TouchableOpacity>
      ) : (
        <View style={[styles.activityPill, styles.activityPillDisabled]}>
          <Text style={styles.dropdownDisabledText}>Join/Create an activity to post</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        {getAvatarUri() ? (
          <Image source={{ uri: getAvatarUri() }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={20} color="#555" />
          </View>
        )}
        <TextInput
          placeholder={showPoll ? 'Ask a question' : "What's your story?"}
          placeholderTextColor="#666"
          style={styles.input}
          value={caption}
          onChangeText={setCaption}
        />
      </View>

      {showPoll && (
        <View style={styles.pollComposer}>
          {pollChoices.map((choice, i) => (
            <View key={i} style={styles.pollChoiceRow}>
              <TextInput
                style={styles.pollChoiceInput}
                placeholder={`Choice ${i + 1}`}
                placeholderTextColor="#666"
                value={choice}
                maxLength={25}
                onChangeText={(t) => updatePollChoice(i, t)}
              />
              <Text style={styles.pollChoiceCount}>{choice.length}/25</Text>
              {i === pollChoices.length - 1 && pollChoices.length < 4 && (
                <TouchableOpacity onPress={addPollChoice} style={styles.pollAddBtn}>
                  <Ionicons name="add" size={18} color="#2CB9B0" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <Text style={styles.pollLengthLabel}>Poll length</Text>
          <View style={styles.pollLengthRow}>
            <TouchableOpacity style={styles.pollLengthField} onPress={() => setNumberPickerField('days')}>
              <Text style={styles.pollLengthFieldLabel}>Days</Text>
              <Text style={styles.pollLengthFieldValue}>{pollDays}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pollLengthField} onPress={() => setNumberPickerField('hours')}>
              <Text style={styles.pollLengthFieldLabel}>Hours</Text>
              <Text style={styles.pollLengthFieldValue}>{pollHours}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pollLengthField} onPress={() => setNumberPickerField('minutes')}>
              <Text style={styles.pollLengthFieldLabel}>Minutes</Text>
              <Text style={styles.pollLengthFieldValue}>{pollMinutes}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={removePoll}>
            <Text style={styles.removePollText}>Remove poll</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actionsRow}>
        <View style={styles.iconGroup}>
          <TouchableOpacity onPress={pickMedia} style={styles.iconBtn} disabled={showPoll}>
            <Ionicons name="camera-outline" size={20} color={showPoll ? '#444' : '#888'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={togglePoll} style={styles.iconBtn}>
            <Ionicons name="stats-chart-outline" size={20} color={showPoll ? '#2CB9B0' : '#888'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          onPress={createPost}
          disabled={!canPost}
        >
          <Text style={styles.postText}>Post</Text>
        </TouchableOpacity>
      </View>

      {!showPoll && (image || video) && (
        <>
          <MediaRatioPicker selectedKey={mediaRatio} onSelect={setMediaRatio} />
          <MediaPreview
            asset={image || video}
            kind={video ? 'video' : 'image'}
            ratioKey={mediaRatio}
            naturalRatio={image?.width && image?.height ? image.width / image.height : undefined}
          />
        </>
      )}
    </View>
  );

  // "Joined" — posts from activities you created or joined, newest first
  // (posts/ already orders that way server-side). "Explore" — everything
  // else, ranked the same way Home's Nearby tab and Explore's All
  // Categories rank activities: exact interest match, then same-category,
  // then the rest, with distance as the tiebreaker within each tier.
  const joinedPosts = posts.filter(p => joinedActivityIds.has(p.activity_id));
  const explorePostsRaw = posts.filter(p => !joinedActivityIds.has(p.activity_id));
  const explorePosts = rankByInterest(explorePostsRaw, profile?.interests, location);

  const list = (
    <ScrollView
      style={isWideWeb ? styles.webListFlex : undefined}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* header/composer live inside the scroll view rather than pinned
          above it — a tall media preview (e.g. a 9:16 crop) could otherwise
          push the Post button off-screen with no way to scroll to it. */}
      {header}
      {composer}

      {joinedPosts.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Joined</Text>
          {joinedPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onVote={handleVote}
              onPostDeleted={fetchPosts}
              navigation={navigation}
            />
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>Explore</Text>
      {explorePosts.length === 0 ? (
        <Text style={styles.emptyText}>No experiences yet.</Text>
      ) : (
        explorePosts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onVote={handleVote}
            onPostDeleted={fetchPosts}
            navigation={navigation}
          />
        ))
      )}
    </ScrollView>
  );

  const activityPickerModal = (
    <Modal
      visible={activityPickerVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setActivityPickerVisible(false)}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={() => setActivityPickerVisible(false)}
      />
      <View style={styles.pickerSheet}>
        <View style={styles.pickerHandle} />
        <Text style={styles.pickerTitle}>Post to which activity?</Text>
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => {
                setSelectedActivity(item.id);
                setActivityPickerVisible(false);
              }}
            >
              <Text style={styles.pickerRowText} numberOfLines={1}>{item.name}</Text>
              {item.id === selectedActivity && (
                <Ionicons name="checkmark" size={18} color="#2CB9B0" />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );

  const NUMBER_PICKER_RANGES = { days: 8, hours: 24, minutes: 60 };
  const numberPickerModal = (
    <Modal
      visible={!!numberPickerField}
      transparent
      animationType="slide"
      onRequestClose={() => setNumberPickerField(null)}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={() => setNumberPickerField(null)}
      />
      <View style={styles.pickerSheet}>
        <View style={styles.pickerHandle} />
        <Text style={styles.pickerTitle}>
          {numberPickerField ? numberPickerField[0].toUpperCase() + numberPickerField.slice(1) : ''}
        </Text>
        <FlatList
          data={Array.from({ length: NUMBER_PICKER_RANGES[numberPickerField] || 0 }, (_, i) => i)}
          keyExtractor={(n) => n.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => selectPollNumber(numberPickerField, item)}
            >
              <Text style={styles.pickerRowText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <ExperienceSkeleton />
      </View>
    );
  }

  if (isWideWeb) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <View style={styles.webRow}>
          <View style={styles.webContent}>
            <View style={styles.webCenter}>
              {list}
            </View>
            <ActivitiesRail />
          </View>
        </View>
        {activityPickerModal}
        {numberPickerModal}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      {list}
      {activityPickerModal}
      {numberPickerModal}
    </View>
  );
};

export default ExperienceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: StatusBar.currentHeight || 44,
    overflow: 'hidden',
  },

  /* ───────── WIDE WEB: 3-column layout (matches Home/Explore/Chat) ────────
     overflow:'hidden' keeps the sidebar pinned to the viewport — without
     it, a post list taller than the available height bubbles up and makes
     the whole page scroll instead of just the list itself. webListFlex
     gives the FlatList a bounded height so it scrolls internally instead
     of rendering at full content height. */
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
  webCenter: {
    flex: 1,
    maxWidth: 680,
    overflow: 'hidden',
  },
  webListFlex: {
    flex: 1,
  },

  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  emptyText: {
    color: '#555',
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Composer
  composerCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Activity selector — full-width pill at the top of the composer ──
  activityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  activityPillDisabled: {
    backgroundColor: '#161616',
  },
  activityPillText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginRight: 6,
  },
  dropdownDisabledText: {
    color: '#555',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },

  // ── Poll composer ─────────────────────────────────────
  pollComposer: {
    marginBottom: 12,
  },
  pollChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  pollChoiceInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
    paddingVertical: 12,
  },
  pollChoiceCount: {
    color: '#555',
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  pollAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(44,185,176,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pollLengthLabel: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginTop: 4,
    marginBottom: 8,
  },
  pollLengthRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pollLengthField: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pollLengthFieldLabel: {
    color: '#666',
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginBottom: 2,
  },
  pollLengthFieldValue: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
  removePollText: {
    color: '#E53935',
    fontSize: 13,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },

  // ── Activity picker sheet ────────────────────────────
  pickerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: '70%',
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: Fonts.semibold,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  pickerRowText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.regular,
    marginRight: 10,
  },
  postBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 18,
  },
  postBtnDisabled: {
    backgroundColor: '#333',
  },
  postText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
});