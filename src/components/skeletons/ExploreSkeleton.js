import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox, SkeletonCircle, SkeletonText, SkeletonPill } from '../Skeleton';

// Mirrors ExploreScreen's real layout (search bar + map button, date
// pills, category tabs, a handful of activity cards) so the shapes are
// already in place the instant the screen mounts, instead of a bare
// spinner while activities load.
const ActivityCardSkeleton = () => (
  <View style={styles.card}>
    <SkeletonBox width="100%" height={140} borderRadius={0} />
    <View style={styles.cardContent}>
      <SkeletonText width="55%" height={18} style={{ marginBottom: 12 }} />
      <View style={styles.infoRow}>
        <SkeletonCircle size={14} />
        <SkeletonText width="35%" height={13} />
      </View>
      <View style={styles.infoRow}>
        <SkeletonCircle size={14} />
        <SkeletonText width="45%" height={13} />
      </View>
      <View style={styles.infoRow}>
        <SkeletonCircle size={14} />
        <SkeletonText width="60%" height={13} />
      </View>
      <View style={styles.joinedRow}>
        <SkeletonCircle size={22} />
        <SkeletonCircle size={22} style={{ marginLeft: -10 }} />
        <SkeletonCircle size={22} style={{ marginLeft: -10 }} />
        <SkeletonText width={70} height={12} style={{ marginLeft: 10 }} />
      </View>
    </View>
  </View>
);

export default function ExploreSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <SkeletonPill width="100%" height={46} style={{ flex: 1 }} />
        <SkeletonPill width={80} height={40} />
      </View>

      <View style={styles.pillRow}>
        {[70, 60, 80, 90, 100].map((w, i) => (
          <SkeletonPill key={i} width={w} height={32} style={{ marginRight: 8 }} />
        ))}
      </View>

      <View style={styles.categoryRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.categoryItem}>
            <SkeletonCircle size={20} />
            <SkeletonText width={40} height={11} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {Array.from({ length: 3 }).map((_, i) => (
        <ActivityCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 30 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 20,
  },
  categoryItem: { alignItems: 'center' },
  card: {
    backgroundColor: '#121212',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardContent: { padding: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  joinedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
});
