import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonCircle, SkeletonText } from '../Skeleton';

// Mirrors NotificationScreen's row shape: type icon + title + body (2
// lines) + meta row.
const NotificationRowSkeleton = () => (
  <View style={styles.item}>
    <SkeletonCircle size={44} />
    <View style={styles.textWrap}>
      <SkeletonText width="55%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonText width="90%" height={12} style={{ marginBottom: 6 }} />
      <SkeletonText width="40%" height={11} />
    </View>
  </View>
);

export default function NotificationSkeleton() {
  return (
    <View style={styles.container}>
      {Array.from({ length: 7 }).map((_, i) => (
        <NotificationRowSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  textWrap: { flex: 1 },
});
