import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../config';
import axiosInstance from '../utils/axiosInstance';
import { getErrorMessage } from '../utils/errorMessage';
import ErrorState from '../components/ErrorState';
import { useIsWideWeb } from '../utils/responsive';
import WebSidebar from '../components/web/WebSidebar';
import PostsRail from '../components/web/PostsRail';

// Modeled on ParticipantsListScreen.js — same card/avatar/layout — but much
// simpler: display-only (no pending-requests section, no remove action),
// since co-hosts are credit, not membership — only reachable when there's
// more than one host (ActivityViewerScreen sends you straight to a single
// host's own profile instead).
const HostsListScreen = ({ route, navigation }) => {
  const { activityName, activityId } = route.params;
  const isWideWeb = useIsWideWeb();

  // Fetched by activityId rather than passed through navigation params —
  // same reasoning as ParticipantsListScreen: an array of full objects would
  // otherwise leak into the web URL's query string as literal
  // "[object Object]" text.
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHosts = useCallback(async () => {
    try {
      setError(null);
      const res = await axiosInstance.get(`activity-detail/${activityId}/`);
      setHosts(res.data?.hosts || []);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load the hosts."));
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => { loadHosts(); }, [loadHosts]);

  const getAvatarSource = (avatarPath) => {
    if (!avatarPath) return require('../assets/avatar-placeholder.png');
    if (avatarPath.startsWith('http')) return { uri: avatarPath };
    return { uri: `${BASE_URL}${avatarPath}` };
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('ProfileView', { username: item.username })}
      activeOpacity={0.75}
    >
      <Image source={getAvatarSource(item.avatar)} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.fullName}>{item.full_name || item.username}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#555" />
    </TouchableOpacity>
  );

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Hosts</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  const list = (
    <>
      <Text style={styles.subHeader}>
        {hosts.length} {hosts.length === 1 ? 'person is' : 'people are'} hosting {activityName}
      </Text>

      {loading ? (
        <ActivityIndicator color="#36ACA6" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={hosts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            error ? (
              <ErrorState message={error} onRetry={loadHosts} compact />
            ) : (
              <Text style={styles.emptyText}>No hosts to show.</Text>
            )
          }
        />
      )}
    </>
  );

  // Wide web: same sidebar + centered column + PostsRail shape as the
  // activity page and ParticipantsListScreen — this screen is only ever
  // reached from there (and only while logged in).
  if (isWideWeb) {
    return (
      <View style={styles.container}>
        <View style={styles.webRow}>
          <WebSidebar />
          <View style={styles.webContent}>
            <View style={styles.webCenterWrap}>
              {header}
              {list}
            </View>
            <PostsRail />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      {list}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: StatusBar.currentHeight || 40,
    overflow: 'hidden',
  },
  webRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webContent: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 680 + 360,
    overflow: 'hidden',
  },
  webCenterWrap: {
    flex: 1,
    maxWidth: 680,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subHeader: {
    color: '#aaa',
    paddingHorizontal: 20,
    marginBottom: 10,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullName: {
    color: '#aaa',
    fontSize: 12,
  },
  emptyText: {
    color: '#777',
    textAlign: 'center',
    marginTop: 50,
    fontStyle: 'italic',
  },
});

export default HostsListScreen;
