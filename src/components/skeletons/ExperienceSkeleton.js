import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox, SkeletonCircle, SkeletonText, SkeletonPill } from '../Skeleton';

// Mirrors ExperienceScreen's real layout (header, composer card with
// activity pill + avatar/input row + action icons, then a feed of post
// cards) so the shapes are already in place the instant the screen mounts.
const PostCardSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        <SkeletonCircle size={48} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <SkeletonText width="60%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonText width="35%" height={12} />
        </View>
      </View>
      <SkeletonPill width={70} height={24} />
    </View>
    <SkeletonBox width="100%" height={220} borderRadius={16} style={{ marginBottom: 16 }} />
    <View style={styles.actions}>
      <SkeletonPill width={50} height={20} />
      <SkeletonPill width={50} height={20} />
    </View>
  </View>
);

export default function ExperienceSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonText width={140} height={24} style={{ marginHorizontal: 20, marginBottom: 16 }} />

      <View style={styles.composerCard}>
        <SkeletonPill width="100%" height={44} style={{ marginBottom: 14 }} />
        <View style={styles.inputRow}>
          <SkeletonCircle size={40} style={{ marginRight: 12 }} />
          <SkeletonText width="70%" height={15} />
        </View>
        <View style={styles.actionsRow}>
          <View style={styles.iconGroup}>
            <SkeletonCircle size={36} />
            <SkeletonCircle size={36} />
          </View>
          <SkeletonPill width={72} height={32} />
        </View>
      </View>

      {Array.from({ length: 3 }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 30 },
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
    marginBottom: 16,
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
  card: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 0,
    marginBottom: 12,
    backgroundColor: '#111010',
    borderRadius: 16,
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
  actions: {
    flexDirection: 'row',
    gap: 24,
  },
});
