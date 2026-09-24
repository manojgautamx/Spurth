import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';

// Shown when a fetch failed, in place of the empty state. The distinction
// matters: "No activities yet" and "we couldn't reach the server" look
// identical to a user otherwise, and only one of them is worth retrying.
export default function ErrorState({ message, onRetry, compact = false }) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Ionicons name="cloud-offline-outline" size={compact ? 22 : 28} color="#777" />
      <Text style={[styles.message, compact && styles.messageCompact]}>
        {message || 'Something went wrong.'}
      </Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 28,
    gap: 12,
  },
  wrapCompact: {
    paddingVertical: 24,
    gap: 8,
  },
  message: {
    color: '#9A9A9A',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    maxWidth: 320,
  },
  messageCompact: {
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 4,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#2CB9B0',
  },
  retryText: {
    color: '#2CB9B0',
    fontSize: 13.5,
    fontFamily: Fonts.semibold,
  },
});
