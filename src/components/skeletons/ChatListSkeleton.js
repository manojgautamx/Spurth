import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonCircle, SkeletonText, SkeletonPill } from '../Skeleton';

// Mirrors ChatListScreen: header, filter pills, then a handful of chat rows
// (avatar + title/time + subtitle) instead of a bare spinner.
const ChatRowSkeleton = () => (
  <View style={styles.row}>
    <SkeletonCircle size={52} />
    <View style={styles.textWrap}>
      <View style={styles.titleRow}>
        <SkeletonText width="50%" height={15} />
        <SkeletonText width={30} height={11} />
      </View>
      <SkeletonText width="70%" height={13} style={{ marginTop: 8 }} />
    </View>
  </View>
);

export default function ChatListSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonText width={100} height={26} style={{ marginBottom: 20 }} />
      <View style={styles.filterRow}>
        <SkeletonPill width={50} height={30} style={{ marginRight: 8 }} />
        <SkeletonPill width={70} height={30} style={{ marginRight: 8 }} />
        <SkeletonPill width={60} height={30} />
      </View>
      {Array.from({ length: 6 }).map((_, i) => (
        <ChatRowSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 30 },
  filterRow: { flexDirection: 'row', marginBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  textWrap: { flex: 1, marginLeft: 14 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
