import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://10.0.2.2:8000';

export default function PostCard({ post, onLike, onCommentPress, onPostDeleted, compact = false, isLeagueOwner = false }) {
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
    const isMyPost = false; // could wire up current user check if needed
    if (isLeagueOwner) {
      Alert.alert('Post Options', null, [
        { text: 'Delete Post', style: 'destructive', onPress: handleDeletePost },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // ── COMPACT MODE (embedded inside LeagueViewerScreen) ──────────────────
  if (compact) {
    return (
      <View style={styles.compactCard}>
        {/* Header: avatar + username + host badge + three dots */}
        <View style={styles.compactHeader}>
          <View style={styles.compactHeaderLeft}>
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
            {post.is_host && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>host</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.dotsBtn} onPress={isLeagueOwner ? showPostOptions : undefined}>
            <Ionicons name="ellipsis-horizontal" size={20} color={isLeagueOwner ? '#ccc' : '#444'} />
          </TouchableOpacity>
        </View>

        {/* Main Image */}
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
              name={post.is_liked ? 'heart' : 'heart-outline'}
              size={22}
              color={post.is_liked ? '#E81F89' : '#fff'}
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

  // ── DEFAULT MODE (ActivityScreen) ──────────────────────────────────────
  return (
    <View style={styles.card}>
      {/* Header Row: Cover Image, Title, Host Badge, and Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={goToLeague}>
            {coverImageUri && (
              <Image source={{ uri: coverImageUri }} style={styles.coverImage} />
            )}
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
              {post.is_host && (
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
              backgroundColor: isCancelled ? '#2B0A0A' : isConcluded ? '#000' : '#2A2A2A',
              borderColor: isCancelled ? '#FF4C4C' : '#333',
            },
          ]}>
            <Text style={[
              styles.statusBadgeText,
              { color: isCancelled ? '#FF4C4C' : isConcluded ? '#ccc' : '#fff' },
            ]}>
              {isCancelled ? 'Cancelled' : isConcluded ? 'Concluded' : 'Upcoming'}
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>

      {mainImageUri && (
        <Image source={{ uri: mainImageUri }} style={styles.mainImage} />
      )}

      {post.caption ? (
        <Text style={styles.caption}>{post.caption}</Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionItem} onPress={() => onLike(post.id)}>
          <Ionicons
            name={post.is_liked ? 'heart' : 'heart-outline'}
            size={24}
            color={post.is_liked ? '#E81F89' : '#fff'}
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
    backgroundColor: '#111111',
    marginBottom: 32,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#2A2A2A',
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: '#aaa',
    fontSize: 13,
    marginRight: 8,
  },
  hostBadge: {
    backgroundColor: '#ccc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hostBadgeText: {
    color: '#111',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mainImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 16,
  },
  caption: {
    color: '#DDDDDD',
    marginBottom: 16,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
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
    fontWeight: '600',
  },
  dotsBtn: {
    padding: 4,
  },
  compactImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
  compactCaption: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
});
