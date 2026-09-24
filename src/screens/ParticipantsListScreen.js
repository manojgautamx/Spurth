import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../config';
import axiosInstance from '../utils/axiosInstance';
import { listFrom } from '../utils/paginated';
import { getErrorMessage } from '../utils/errorMessage';
import ErrorState from '../components/ErrorState';
import { useIsWideWeb } from '../utils/responsive';
import WebSidebar from '../components/web/WebSidebar';
import PostsRail from '../components/web/PostsRail';

const ParticipantsListScreen = ({ route, navigation }) => {
  const { activityName, isOwner = false, activityId } = route.params;
  const isWideWeb = useIsWideWeb();

  // Fetched by activityId rather than passed through navigation params —
  // an array of full participant objects would otherwise leak into the web
  // URL's query string as literal "[object Object]" text (React
  // Navigation's `linking` integration serializes any param outside the
  // path pattern). activity-detail/<id>/ already includes `participants`.
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [respondingId, setRespondingId] = useState(null);

  // Previously bare fetch() calls with a hand-attached token, so an expired
  // access token produced an empty participants list rather than a retry.
  const loadParticipants = useCallback(async () => {
    try {
      setError(null);
      const res = await axiosInstance.get(`activity-detail/${activityId}/`);
      setParticipants(res.data?.participants || []);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load the participants."));
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => { loadParticipants(); }, [loadParticipants]);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    (async () => {
      try {
        const res = await axiosInstance.get(`join-requests/${activityId}/`);
        if (active) setPendingRequests(listFrom(res.data));
      } catch (err) {
        // The owner-only pending list is supplementary; the participants
        // list above already reports its own failure.
        if (active) setPendingRequests([]);
      }
    })();
    return () => { active = false; };
  }, [activityId, isOwner]);

  const handleRespond = async (requestId, action) => {
    setRespondingId(requestId);
    try {
      await axiosInstance.post(`respond-join-request/${requestId}/`, { action });
      const jr = pendingRequests.find(r => r.id === requestId);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      if (action === 'accept' && jr) {
        setParticipants(prev => [...prev, jr.user]);
      }
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, "Couldn't respond to that request."));
    } finally {
      setRespondingId(null);
    }
  };

  const getAvatarSource = (avatarPath) => {
    if (!avatarPath) return require('../assets/avatar-placeholder.png');
    if (avatarPath.startsWith('http')) return { uri: avatarPath };
    return { uri: `${BASE_URL}${avatarPath}` };
  };

  const handleRemove = (item) => {
    Alert.alert(
      'Remove Participant',
      `Remove @${item.username} from ${activityName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`remove-participant/${activityId}/${item.id}/`);
              setParticipants(prev => prev.filter(p => p.id !== item.id));
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err, "Couldn't remove that participant."));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('ProfileView', { username: item.username })}
      activeOpacity={0.75}
    >
      <Image
        source={getAvatarSource(item.avatar)}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.fullName}>{item.full_name || item.username}</Text>
      </View>

      {isOwner ? (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemove(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="person-remove-outline" size={20} color="#FF453A" />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#555" />
      )}
    </TouchableOpacity>
  );

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Participants</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  const list = (
    <>
      {isOwner && pendingRequests.length > 0 && (
        <>
          <Text style={styles.subHeader}>
            Pending Requests ({pendingRequests.length})
          </Text>
          {pendingRequests.map(jr => (
            <View key={jr.id} style={[styles.userCard, { marginHorizontal: 20 }]}>
              <Image source={getAvatarSource(jr.user.avatar)} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.username}>@{jr.user.username}</Text>
                <Text style={styles.fullName}>{jr.user.full_name || jr.user.username}</Text>
              </View>
              {respondingId === jr.id ? (
                <ActivityIndicator size="small" color="#36ACA6" />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => handleRespond(jr.id, 'decline')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle-outline" size={22} color="#FF453A" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRespond(jr.id, 'accept')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 14 }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={22} color="#36ACA6" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}
          <View style={styles.pendingDivider} />
        </>
      )}

      <Text style={styles.subHeader}>
        {participants.length} {participants.length === 1 ? 'person' : 'people'} joined in {activityName}
      </Text>

      {loading ? (
        <ActivityIndicator color="#36ACA6" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={participants}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            error ? (
              <ErrorState message={error} onRetry={loadParticipants} compact />
            ) : (
              <Text style={styles.emptyText}>No one has joined yet.</Text>
            )
          }
        />
      )}
    </>
  );

  // Wide web: same sidebar + centered column + PostsRail shape as the
  // activity page — this screen is only ever reached from there (and only
  // while logged in, since it's registered inside AppNavigator's
  // authenticated-only screen set), so it should read as the same page.
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
  // ── Wide web: sidebar + centered column + PostsRail, matching
  // ActivityViewerScreen's own webRow/webContent/webCenterWrap values so
  // the sidebar lands in the exact same on-screen position across pages.
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
  removeBtn: {
    padding: 4,
  },
  emptyText: {
    color: '#777',
    textAlign: 'center',
    marginTop: 50,
    fontStyle: 'italic',
  },
  pendingDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    marginBottom: 16,
  },
});

export default ParticipantsListScreen;