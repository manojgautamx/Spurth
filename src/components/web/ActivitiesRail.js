// Right-hand rail on wide-web screens that don't otherwise show Activities
// (e.g. Chat) — a lightweight preview of nearby upcoming activities, reusing
// the exact ActivityCard used on Home/Explore so it reads as the same app.
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axiosInstance from '../../utils/axiosInstance';
import { LocationContext, filterActivitiesByDistance } from '../../context/LocationContext';
import { useDistance } from '../../context/DistanceContext';
import { rankByInterest } from '../../utils/rankByInterest';
import ActivityCard from '../ActivityCard';
import { Fonts } from '../../theme/fonts';

const PREVIEW_COUNT = 3;

export default function ActivitiesRail() {
  const navigation = useNavigation();
  const { location } = useContext(LocationContext);
  const { distanceKm } = useDistance();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchActivities = async () => {
      try {
        const [otherRes, joinedRes, profileRes] = await Promise.all([
          axiosInstance.get('public-activities/'),
          axiosInstance.get('joined-activities/'),
          axiosInstance.get('profile/'),
        ]);

        const joinedIds = new Set((joinedRes.data || []).map(a => a.id));
        const upcoming = (otherRes.data || []).filter(
          a => !joinedIds.has(a.id) && !a.is_cancelled && new Date(a.date_time) >= new Date()
        );
        // Same algorithm as Home's Nearby tab / Explore's All Categories:
        // distance-radius filter, then rank by the viewer's interests.
        const nearby = filterActivitiesByDistance(upcoming, location?.latitude, location?.longitude, distanceKm);
        const ranked = rankByInterest(nearby, profileRes.data?.interests, location);

        if (!cancelled) setActivities(ranked.slice(0, PREVIEW_COUNT));
      } catch (err) {
        console.log('ActivitiesRail fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchActivities();
    return () => { cancelled = true; };
  }, [location, distanceKm]);

  const goToExplore = () => navigation.navigate('Explore');

  return (
    <View style={styles.rail}>
      <View style={styles.railHeader}>
        <Text style={styles.title}>Activities</Text>
      </View>

      {/* ActivityCard's web layout already carries its own marginHorizontal:20
          (matching the 680px center column on Home/Explore) — no extra
          horizontal padding here, or cards would be squeezed too narrow. */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {loading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : activities.length === 0 ? (
          <View style={[styles.emptyState, styles.railInset]}>
            <Text style={styles.emptyTitle}>Nothing nearby yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first — create your own and invite others to join.
            </Text>
          </View>
        ) : (
          activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} compact />
          ))
        )}

        {activities.length > 0 && (
          <TouchableOpacity style={[styles.seeMoreBtn, styles.railInset]} onPress={goToExplore} activeOpacity={0.8}>
            <Text style={styles.seeMoreText}>See more</Text>
          </TouchableOpacity>
        )}
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
    paddingTop: 24,
  },
  railHeader: {
    paddingHorizontal: 20,
  },
  railInset: {
    marginHorizontal: 20,
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
  },
  seeMoreBtn: {
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  seeMoreText: {
    color: '#888',
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
});
