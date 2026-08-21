// Right-hand rail on the wide-web Home layout — a lightweight, read-mostly
// preview of the Experiences feed (posts users share after attending an
// activity). Full posting/commenting still happens on the Experiences tab
// (route name "Experience"); this is a widget, not a duplicate of that screen.
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../../utils/axiosInstance';
import { LocationContext, filterActivitiesByDistance } from '../../context/LocationContext';
import { useDistance } from '../../context/DistanceContext';
import { AuthContext } from '../../context/AuthContext';
import { promptSignIn } from '../../utils/requireAuth';
import PostCard from '../PostCard';
import { Fonts } from '../../theme/fonts';

const PREVIEW_COUNT = 8;

export default function PostsRail() {
  const navigation = useNavigation();
  const { location } = useContext(LocationContext);
  const { distanceKm } = useDistance();
  const { userToken } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // `my-activities/`/`joined-activities/` (used to compute "nearby") are
    // self-only, and an unfiltered `posts/` list stays authenticated by
    // design (see PostViewSet.get_permissions on the backend) — this rail
    // is a personalized widget, not public content, so it just renders its
    // empty state for an anonymous visitor rather than 401ing.
    if (!userToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPosts = async () => {
      try {
        const [postsRes, createdRes, joinedRes] = await Promise.all([
          axiosInstance.get('posts/'),
          axiosInstance.get('my-activities/'),
          axiosInstance.get('joined-activities/'),
        ]);

        const allActivities = [...(createdRes.data || []), ...(joinedRes.data || [])];
        const nearbyIds = new Set(
          filterActivitiesByDistance(allActivities, location?.latitude, location?.longitude, distanceKm)
            .map(a => a.id)
        );

        const data = postsRes.data;
        const normalized = (data.results || data).map(p => ({
          ...p,
          activity_id: p.activity,
          event_name: p.activity_name,
        }));

        const filtered = location ? normalized.filter(p => nearbyIds.has(p.activity_id)) : normalized;
        if (!cancelled) setPosts(filtered.slice(0, PREVIEW_COUNT));
      } catch (err) {
        console.log('PostsRail fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPosts();
    return () => { cancelled = true; };
  }, [location, distanceKm, userToken]);

  const handleLike = async (postId) => {
    if (!userToken) return promptSignIn(navigation, 'Sign in to like posts.');
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, is_liked: !p.is_liked, likes_count: (p.likes_count || 0) + (p.is_liked ? -1 : 1) }
        : p
    ));
    try {
      await axiosInstance.post(`posts/${postId}/like/`);
    } catch (err) {
      console.log('Like error:', err);
    }
  };

  const goToExperiences = () => navigation.navigate('Experience');

  return (
    <View style={styles.rail}>
      <TouchableOpacity style={styles.createBtn} onPress={goToExperiences} activeOpacity={0.7}>
        <Ionicons name="add-circle-outline" size={18} color="#ccc" style={{ marginRight: 8 }} />
        <Text style={styles.createBtnText}>Share an Experience</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Experiences</Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {loading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No experiences yet</Text>
            <Text style={styles.emptySubtitle}>
              Experiences from activities you attend will appear here.
            </Text>
            <TouchableOpacity style={styles.emptyCta} onPress={goToExperiences} activeOpacity={0.7}>
              <Text style={styles.emptyCtaText}>Share your experience</Text>
            </TouchableOpacity>
          </View>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              compact
              hideUsername
              onLike={handleLike}
            />
          ))
        )}

        <TouchableOpacity style={styles.seeMoreBtn} onPress={goToExperiences} activeOpacity={0.8}>
          <Text style={styles.seeMoreText}>See more</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 360,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 20,
    paddingVertical: 11,
    marginBottom: 20,
  },
  createBtnText: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 14,
  },
  scroll: {
    flex: 1,
  },
  emptyText: {
    color: '#555',
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  emptyTitle: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: Fonts.semibold,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#555',
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  emptyCta: {
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  emptyCtaText: {
    color: '#ccc',
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  seeMoreBtn: {
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  seeMoreText: {
    color: '#888',
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
});
