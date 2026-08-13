import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '../theme/fonts';

import { BASE_URL } from '../config';

export default function PostCard({
  post,
  onLike,
  onCommentPress,
  onPostDeleted,
  compact = false,
  isLeagueOwner = false,
  hideUsername = false,
}) {
  const navigation = useNavigation();

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${BASE_URL}${url}`;
  };

  const mainImageUri = getImageUrl(post.image);
  const DEFAULT_COVER = 'https://via.placeholder.com/100x100.png?text=Event';
  const coverImageUri = getImageUrl(post.cover_image) || DEFAULT_COVER;
  const isConcluded = post.league_is_concluded;
  const isCancelled = post.league_is_cancelled;
  const avatarUri = getImageUrl(post.user_avatar);

  const goToLeague = () => {
    if (!post.league_id) return;
    navigation.navigate('LeagueViewerScreen', { leagueId: post.league_id });
  };

  const goToProfile = () => {
    if (!post.user) return;
    navigation.navigate('ProfileView', { userId: post.user });
  };

  const handleDeletePost = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('accessToken');
            const res = await fetch(`${BASE_URL}/api/delete-post/${post.id}/`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 204 && onPostDeleted) {
              onPostDeleted();
            }
          } catch (err) {
            console.warn('Delete post failed', err);
          }
        },
      },
    ]);
  };

  const showPostOptions = () => {
    if (isLeagueOwner) {
      Alert.alert('Post Options', null, [
        { text: 'Delete Post', style: 'destructive', onPress: handleDeletePost },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // ── COMPACT MODE ────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <View style={styles.compactCard}>
        {/* Header */}
        <View style={styles.compactHeader}>
          <View style={styles.compactHeaderLeft}>

            {/* Avatar + username — LeagueViewerScreen (hideUsername=false) */}
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

            {/* League thumbnail + name — ProfileViewScreen (hideUsername=true) */}
            {hideUsername && (
              <TouchableOpacity
                style={styles.compactLeagueRow}
                onPress={goToLeague}
                activeOpacity={0.75}
              >
                {post.cover_image ? (
                  <Image
                    source={{ uri: getImageUrl(post.cover_image) }}
                    style={styles.compactLeagueThumb}
                  />
                ) : (
                  <View style={[styles.compactLeagueThumb, styles.avatarFallback]}>
                    <Ionicons name="trophy-outline" size={14} color="#555" />
                  </View>
                )}
                <Text style={styles.compactLeagueName} numberOfLines={1}>
                  {post.event_name || post.league_name || 'Event'}
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

          <TouchableOpacity
            style={styles.dotsBtn}
            onPress={isLeagueOwner ? showPostOptions : undefined}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={isLeagueOwner ? '#ccc' : '#444'}
            />
          </TouchableOpacity>
        </View>

        {/* Image */}
        {mainImageUri && (
          <Image source={{ uri: mainImageUri }} style={styles.compactImage} />
        )}

        {/* Caption */}
        {post.caption ? (
          <Text style={styles.compactCaption}>{post.caption}</Text>
        ) : null}

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

          <TouchableOpacity style={styles.actionItem} onPress={() => onCommentPress(post)}>
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>{post.comments_count || '0'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── DEFAULT MODE ────────────────────────────────────────────────────────────
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={goToLeague}>
            <Image source={{ uri: coverImageUri }} style={styles.coverImage} />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            {(post.event_name || post.league_name) && (
              <TouchableOpacity onPress={goToLeague}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {post.event_name || post.league_name}
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
          <TouchableOpacity style={styles.dotsBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Image */}
      {mainImageUri && (
        <Image source={{ uri: mainImageUri }} style={styles.mainImage} />
      )}

      {/* Caption */}
      {post.caption ? (
        <Text style={styles.caption}>{post.caption}</Text>
      ) : null}

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

        <TouchableOpacity style={styles.actionItem} onPress={() => onCommentPress(post)}>
          <Ionicons name="chatbubble-outline" size={22} color="#fff" />
          <Text style={styles.actionText}>{post.comments_count || '0'}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    fontFamily: Fonts.semiBold,
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
    fontFamily: Fonts.semiBold,
  },
  dotsBtn: {
    padding: 4,
  },
  mainImage: {
    width: '100%',
    height: 300,
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
    fontFamily: Fonts.semiBold,
  },
  compactImage: {
    width: '100%',
    height: 220,
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

  // ── Compact league row (ProfileViewScreen only) ─────
  compactLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  compactLeagueThumb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2A2A2A',
  },
  compactLeagueName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    flexShrink: 1,
  },
});