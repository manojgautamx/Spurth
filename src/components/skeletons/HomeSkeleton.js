import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox, SkeletonCircle, SkeletonText, SkeletonPill } from '../Skeleton';

// Mirrors HomeScreen: hero card, create-activity row, "Activities" title +
// filter pills, and a few activity cards.
const ActivityRowSkeleton = () => (
  <View style={styles.card}>
    <SkeletonBox width="100%" height={140} borderRadius={0} />
    <View style={styles.cardContent}>
      <SkeletonText width="55%" height={17} style={{ marginBottom: 10 }} />
      <SkeletonText width="40%" height={12} style={{ marginBottom: 6 }} />
      <SkeletonText width="50%" height={12} style={{ marginBottom: 10 }} />
      <View style={styles.joinedRow}>
        <SkeletonCircle size={20} />
        <SkeletonCircle size={20} style={{ marginLeft: -8 }} />
        <SkeletonText width={60} height={11} style={{ marginLeft: 10 }} />
      </View>
    </View>
  </View>
);

export default function HomeSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBox width="100%" height={180} borderRadius={18} style={{ marginBottom: 20 }} />
      <View style={styles.createRow}>
        <SkeletonCircle size={38} />
        <View style={{ marginLeft: 18, flex: 1 }}>
          <SkeletonText width="50%" height={15} style={{ marginBottom: 6 }} />
          <SkeletonText width="70%" height={12} />
        </View>
      </View>

      <SkeletonText width={110} height={22} style={{ marginTop: 28, marginBottom: 16 }} />
      <View style={styles.pillRow}>
        <SkeletonPill width={70} height={32} style={{ marginRight: 8 }} />
        <SkeletonPill width={60} height={32} style={{ marginRight: 8 }} />
        <SkeletonPill width={55} height={32} style={{ marginRight: 8 }} />
        <SkeletonPill width={110} height={32} />
      </View>

      <ActivityRowSkeleton />
      <ActivityRowSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 20 },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 16,
  },
  pillRow: { flexDirection: 'row', marginBottom: 4 },
  card: {
    backgroundColor: '#121212',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#262626',
    marginTop: 16,
  },
  cardContent: { padding: 14 },
  joinedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
});
