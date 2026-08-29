import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../utils/axiosInstance';
import { Fonts } from '../theme/fonts';
import { promptSignIn } from '../utils/requireAuth';
import ReportModal from './ReportModal';
import VideoPlayer from './VideoPlayer';
import { ratioValue } from '../constants/mediaRatios';

import { BASE_URL } from '../config';

// The post's caption doubles as the poll's question (the composer's
// question input and caption input are the same field), so the plain
// caption <Text> is skipped wherever a poll is rendered instead.
function PollBlock({ post, onVote }) {
  const poll = post.poll;
  if (!poll) return null;

  const showResults = poll.has_voted || poll.is_expired;
  const totalVotes = poll.total_votes || 0;

  const timeLeftLabel = () => {
    if (poll.is_expired) return 'Poll ended';
    const ms = new Date(poll.expires_at).getTime() - Date.now();
    if (ms <= 0) return 'Poll ended';
    const days = Math.floor(ms / 86400000);
    if (days > 0) return `${days}d left`;
    const hours = Math.floor(ms / 3600000);
    if (hours > 0) return `${hours}h left`;
    return `${Math.max(1, Math.floor(ms / 60000))}m left`;
  };

  return (
    <View style={pollStyles.container}>
      <Text style={pollStyles.question}>{post.caption}</Text>

      {poll.choices.map((choice) => {
        if (!showResults) {
          return (
            <TouchableOpacity
              key={choice.id}
              style={pollStyles.choicePill}
              onPress={() => onVote && onVote(post.id, choice.id)}
              activeOpacity={0.75}
            >
              <Text style={pollStyles.choiceText} numberOfLines={1}>{choice.text}</Text>
            </TouchableOpacity>
          );
        }

        const pct = totalVotes > 0 ? Math.round((choice.votes_count / totalVotes) * 100) : 0;
        const isSelected = poll.user_choice_id === choice.id;
        return (
          <View key={choice.id} style={pollStyles.resultRow}>
            <View style={[pollStyles.resultFill, { width: `${pct}%` }, isSelected && pollStyles.resultFillSelected]} />
            <View style={pollStyles.resultLabelRow}>
              <Text style={pollStyles.resultText} numberOfLines={1}>
                {choice.text}{isSelected ? ' ✓' : ''}
              </Text>
              <Text style={pollStyles.resultPct}>{pct}%</Text>
            </View>
          </View>
        );
      })}

      <Text style={pollStyles.footer}>
        {totalVotes} vote{totalVotes === 1 ? '' : 's'} · {timeLeftLabel()}
      </Text>
    </View>
  );
}

export default function PostCard({
  post,
  onLike,
  onVote,
  onPostDeleted,
  compact = false,
  hideUsername = false,
}) {
  const navigation = useNavigation();
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Centralized here (rather than a parent-supplied onCommentPress) so
  // every screen that renders a PostCard opens the same dedicated post
  // page consistently — tapping the post body does the same thing as
  // tapping the comment icon.
  // postId only, not the full post object — React Navigation's web
  // `linking` integration serializes any param outside the path pattern
  // (post/:postId) into the URL's query string as literal "[object
  // Object]" text. CommentScreen re-fetches the full post on mount
  // regardless of what's passed, so nothing is lost by not passing it.
  const goToDetail = () => navigation.navigate('Comments', { postId: post.id });

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${BASE_URL}${url}`;
  };

  const mainImageUri = getImageUrl(post.image);
  const mainVideoUri = getImageUrl(post.video);
  const hasRatio = post.media_ratio && post.media_ratio !== 'original';
  // Always a full size decision (never leaves a fixed height for
  // aspectRatio to try to override) — old ratio-less posts fall back to
  // the same fixed heights the cards always used.
  const mainMediaSizeStyle = hasRatio ? { aspectRatio: ratioValue(post.media_ratio) } : { height: 300 };
  const compactMediaSizeStyle = hasRatio ? { aspectRatio: ratioValue(post.media_ratio) } : { height: 220 };
  const DEFAULT_COVER = 'https://via.placeholder.com/100x100.png?text=Event';
  const coverImageUri = getImageUrl(post.cover_image) || DEFAULT_COVER;
  const isConcluded = post.activity_is_concluded;
  const isCancelled = post.activity_is_cancelled;
  const avatarUri = getImageUrl(post.user_avatar);

  const goToActivity = () => {
    if (!post.activity_id) return;
    navigation.navigate('ActivityViewerScreen', { activityId: post.activity_id });
  };

  const goToProfile = () => {
    if (!post.user_name) return;
    navigation.navigate('ProfileView', { username: post.user_name });
  };

  const handleDeletePost = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // axiosInstance (not a raw fetch) so an expired access token
            // gets silently refreshed-and-retried instead of just failing —
            // a raw fetch here had no such retry, so deletes would quietly
            // fail with a generic error once the token aged out.
            await axiosInstance.delete(`delete-post/${post.id}/`);
            if (onPostDeleted) onPostDeleted();
          } catch (err) {
            console.warn('Delete post failed', err);
            Alert.alert('Error', 'Failed to delete post.');
          }
        },
      },
    ]);
  };

  const showPostOptions = async () => {
    const options = [];
    // Post owner can always delete their own post; the activity host can
    // also delete any post under their own activity, from any screen —
    // both are computed server-side (is_own_post/is_activity_owner) so
    // this doesn't depend on whichever screen happens to render the card.
    if (post.is_own_post || post.is_activity_owner) {
      options.push({ text: 'Delete Post', style: 'destructive', onPress: handleDeletePost });
    }
    if (!post.is_own_post) {
      options.push({
        text: 'Report Post',
        onPress: async () => {
          const token = await AsyncStorage.getItem('accessToken');
          if (!token) {
            promptSignIn(navigation, 'Sign in to report this post.');
            return;
          }
          setReportModalVisible(true);
        },
      });
    }
    if (options.length === 0) return;
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Post Options', null, options);
  };

  // ── COMPACT MODE ────────────────────────────────────────────────────────────
  const reportModal = (
    <ReportModal
      visible={reportModalVisible}
      onClose={() => setReportModalVisible(false)}
      targetType="post"
      targetId={post.id}
      targetLabel="post"
    />
  );

  if (compact) {
    return (
      <>
      <TouchableOpacity style={styles.compactCard} activeOpacity={1} onPress={goToDetail}>
        {/* Header */}
        <View style={styles.compactHeader}>
          <View style={styles.compactHeaderLeft}>

            {/* Avatar + username — ActivityViewerScreen (hideUsername=false) */}
            {!hideUsername && (
              <>
                {avatarUri ? (
                  <TouchableOpacity onPress={goToProfile}>
                    <Image source={{ uri: avatarUri }} style={styles.compactAvatar} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={goToProfile}>
                    <View style={[styles.compactAvatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={16} color="#555" />
                    </View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={goToProfile}>
                  <Text style={styles.compactUsername}>
                    @{post.user_name || 'username'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Activity thumbnail + name — ProfileViewScreen (hideUsername=true) */}
            {hideUsername && (
              <TouchableOpacity
                style={styles.compactActivityRow}
                onPress={goToActivity}
                activeOpacity={0.75}
              >
                {post.cover_image ? (
                  <Image
                    source={{ uri: getImageUrl(post.cover_image) }}
                    style={styles.compactActivityThumb}
                  />
                ) : (
                  <View style={[styles.compactActivityThumb, styles.avatarFallback]}>
                    <Ionicons name="trophy-outline" size={14} color="#555" />
                  </View>
                )}
                <Text style={styles.compactActivityName} numberOfLines={1}>
                  {post.event_name || post.activity_name || 'Event'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Host badge — only when backend explicitly sends true */}
            {post.is_host === true && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>host</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.dotsBtn} onPress={showPostOptions}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Poll (question reuses post.caption, rendered separately below) or Image */}
        {post.poll ? (
          <PollBlock post={post} onVote={onVote} />
        ) : (
          <>
            {mainVideoUri ? (
              <VideoPlayer uri={mainVideoUri} style={[styles.compactImage, compactMediaSizeStyle]} />
            ) : mainImageUri ? (
              <Image source={{ uri: mainImageUri }} style={[styles.compactImage, compactMediaSizeStyle]} />
            ) : null}
            {post.caption ? (
              <Text style={styles.compactCaption}>{post.caption}</Text>
            ) : null}
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionItem} onPress={() => onLike(post.id)}>
            <Ionicons
              name={post.is_liked ? 'flame' : 'flame-outline'}
              size={22}
              color={post.is_liked ? '#FF6B35' : '#fff'}
            />
            <Text style={styles.actionText}>
              {post.likes_count?.toLocaleString() || '0'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={goToDetail}>
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>{post.comments_count || '0'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      {reportModal}
      </>
    );
  }

  // ── DEFAULT MODE ────────────────────────────────────────────────────────────
  return (
    <>
    <TouchableOpacity style={styles.card} activeOpacity={1} onPress={goToDetail}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={goToActivity}>
            <Image source={{ uri: coverImageUri }} style={styles.coverImage} />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            {(post.event_name || post.activity_name) && (
              <TouchableOpacity onPress={goToActivity}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {post.event_name || post.activity_name}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.userInfoRow}>
              <TouchableOpacity onPress={goToProfile}>
                <Text style={styles.username}>
                  @{post.user_name || 'username'}
                </Text>
              </TouchableOpacity>
              {post.is_host === true && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>host</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: isCancelled ? '#2B0A0A' : '#1A1A1A',
            },
          ]}>
            <Text style={[
              styles.statusBadgeText,
              { color: isCancelled ? '#FF4C4C' : isConcluded ? '#888' : '#fff' },
            ]}>
              {isCancelled ? 'Cancelled' : isConcluded ? 'Concluded' : 'Upcoming'}
            </Text>
          </View>
          {post.is_own_post && post.moderation_status !== 'approved' && (
            <View style={[
              styles.statusBadge,
              { backgroundColor: post.moderation_status === 'rejected' ? '#2B0A0A' : '#2B2308' },
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: post.moderation_status === 'rejected' ? '#FF4C4C' : '#F2994A' },
              ]}>
                {post.moderation_status === 'rejected' ? 'Photo rejected' : 'Photo under review'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.dotsBtn} onPress={showPostOptions}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Poll (question reuses post.caption, rendered separately below) or Image */}
      {post.poll ? (
        <PollBlock post={post} onVote={onVote} />
      ) : (
        <>
          {mainVideoUri ? (
            <VideoPlayer uri={mainVideoUri} style={[styles.mainImage, mainMediaSizeStyle]} />
          ) : mainImageUri ? (
            <Image source={{ uri: mainImageUri }} style={[styles.mainImage, mainMediaSizeStyle]} />
          ) : null}
          {post.caption ? (
            <Text style={styles.caption}>{post.caption}</Text>
          ) : null}
        </>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionItem} onPress={() => onLike(post.id)}>
          <Ionicons
            name={post.is_liked ? 'flame' : 'flame-outline'}
            size={24}
            color={post.is_liked ? '#FF6B35' : '#fff'}
          />
          <Text style={styles.actionText}>
            {post.likes_count?.toLocaleString() || '0'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={goToDetail}>
          <Ionicons name="chatbubble-outline" size={22} color="#fff" />
          <Text style={styles.actionText}>{post.comments_count || '0'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    {reportModal}
    </>
  );
}

const styles = StyleSheet.create({
  // ── Default card ───────────────────────────────────
  card: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    backgroundColor: '#111010',
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  coverImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#2A2A2A',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.semibold,
    marginBottom: 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: '#888',
    fontSize: 13,
    marginRight: 8,
    fontFamily: Fonts.regular,
  },
  hostBadge: {
    backgroundColor: '#ddd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hostBadgeText: {
    color: '#111',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
  },
  dotsBtn: {
    padding: 4,
  },
  // No height here on purpose — it's decided per-post at render time
  // (fixed 300 for ratio-less posts, aspectRatio otherwise). A static
  // height here would compile to a CSS class on web that a later inline
  // aspectRatio override can't cancel (RN-Web skips `height: undefined`
  // entirely rather than using it to unset the class).
  mainImage: {
    width: '100%',
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#1A1A1A',
  },
  caption: {
    color: '#ccc',
    marginBottom: 16,
    lineHeight: 20,
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: Fonts.medium,
  },

  // ── Compact card ───────────────────────────────────
  compactCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    padding: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactUsername: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  // See mainImage's comment — height intentionally left out here too.
  compactImage: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
  },
  compactCaption: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: Fonts.regular,
  },

  // ── Compact activity row (ProfileViewScreen only) ───
  compactActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  compactActivityThumb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2A2A2A',
  },
  compactActivityName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
    flexShrink: 1,
  },
});

const pollStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  question: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
    lineHeight: 21,
    marginBottom: 12,
  },
  choicePill: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  choiceText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  resultRow: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#111',
    marginBottom: 8,
    overflow: 'hidden',
  },
  resultFill: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    backgroundColor: 'rgba(44,185,176,0.25)',
  },
  resultFillSelected: {
    backgroundColor: 'rgba(44,185,176,0.45)',
  },
  resultLabelRow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  resultText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginRight: 8,
  },
  resultPct: {
    color: '#ccc',
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  footer: {
    color: '#666',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
});
