import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox, SkeletonCircle, SkeletonText } from '../Skeleton';

// Mirrors ProfileViewScreen: avatar, name/username/location, stat pills,
// bio, interest chips, and a couple of list rows (Organizer/Joined).
const ListRowSkeleton = () => (
  <View style={styles.listRow}>
    <SkeletonBox width={44} height={44} borderRadius={22} />
    <View style={{ marginLeft: 12, flex: 1 }}>
      <SkeletonText width="50%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonText width="30%" height={12} />
    </View>
  </View>
);

export default function ProfileSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <SkeletonCircle size={130} style={{ marginBottom: 16 }} />
        <SkeletonText width={160} height={20} style={{ marginBottom: 8 }} />
        <SkeletonText width={110} height={14} style={{ marginBottom: 8 }} />
        <SkeletonText width={140} height={13} style={{ marginBottom: 20 }} />
        <View style={styles.statsRow}>
          <SkeletonBox width={80} height={58} borderRadius={16} style={{ marginRight: 10 }} />
          <SkeletonBox width={80} height={58} borderRadius={16} style={{ marginRight: 10 }} />
          <SkeletonBox width={80} height={58} borderRadius={16} />
        </View>
      </View>

      <SkeletonText width={50} height={18} style={{ marginHorizontal: 20, marginBottom: 10 }} />
      <SkeletonText width="90%" height={13} style={{ marginHorizontal: 20, marginBottom: 4 }} />
      <SkeletonText width="60%" height={13} style={{ marginHorizontal: 20, marginBottom: 24 }} />

      <SkeletonText width={90} height={18} style={{ marginHorizontal: 20, marginBottom: 10 }} />
      <View style={[styles.row, { marginHorizontal: 20, marginBottom: 24 }]}>
        <SkeletonBox width={70} height={32} borderRadius={16} style={{ marginRight: 8 }} />
        <SkeletonBox width={90} height={32} borderRadius={16} style={{ marginRight: 8 }} />
        <SkeletonBox width={60} height={32} borderRadius={16} />
      </View>

      <SkeletonText width={100} height={18} style={{ marginHorizontal: 20, marginBottom: 12 }} />
      <View style={{ paddingHorizontal: 20 }}>
        <ListRowSkeleton />
        <ListRowSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  card: {
    backgroundColor: '#222222',
    margin: 20,
    borderRadius: 35,
    alignItems: 'center',
    padding: 24,
  },
  statsRow: { flexDirection: 'row' },
  row: { flexDirection: 'row' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
});
