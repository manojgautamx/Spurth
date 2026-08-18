import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox, SkeletonCircle, SkeletonText, SkeletonPill } from '../Skeleton';

// Mirrors ActivityViewerScreen: hero cover image, title/host block, price/
// join buttons, description, map, participant avatars.
export default function ActivityDetailSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBox width="100%" height={280} borderRadius={0} />

      <View style={styles.body}>
        <SkeletonText width="70%" height={24} style={{ marginBottom: 10 }} />
        <SkeletonText width="40%" height={14} style={{ marginBottom: 20 }} />

        <View style={styles.row}>
          <SkeletonPill width={90} height={36} style={{ marginRight: 10 }} />
          <SkeletonPill width={110} height={36} />
        </View>

        <SkeletonText width={100} height={16} style={{ marginTop: 24, marginBottom: 10 }} />
        <SkeletonText width="100%" height={13} style={{ marginBottom: 8 }} />
        <SkeletonText width="100%" height={13} style={{ marginBottom: 8 }} />
        <SkeletonText width="60%" height={13} />

        <SkeletonBox width="100%" height={190} borderRadius={16} style={{ marginTop: 24 }} />

        <SkeletonText width={120} height={16} style={{ marginTop: 24, marginBottom: 12 }} />
        <View style={styles.row}>
          <SkeletonCircle size={40} />
          <SkeletonCircle size={40} style={{ marginLeft: -12 }} />
          <SkeletonCircle size={40} style={{ marginLeft: -12 }} />
          <SkeletonText width={80} height={14} style={{ marginLeft: 14 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0E' },
  body: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
