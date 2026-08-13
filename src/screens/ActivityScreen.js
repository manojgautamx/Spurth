import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { Picker } from '@react-native-picker/picker';
import axiosInstance from '../utils/axiosInstance';
import { appendImageAsset } from '../utils/appendImageAsset';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { LocationContext, filterLeaguesByDistance } from '../context/LocationContext';
import { useDistance } from '../context/DistanceContext';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../config';

const ActivityScreen = () => {
  const { user } = useContext(AuthContext);
  const { location } = useContext(LocationContext);
  const { distanceKm } = useDistance();

  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [profile, setProfile] = useState(null);

  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['75%'], []);

  const navigation = useNavigation();

  useEffect(() => {
    axiosInstance.get('profile/').then(res => setProfile(res.data));
    fetchMyLeagues();
  }, []);

  // Re-filter posts when distance or location changes
  useEffect(() => {
    fetchPosts();
  }, [distanceKm, location]);

  const getAvatarUri = () => {
    if (!profile?.avatar) return null;
    return profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`;
  };

  const fetchMyLeagues = async () => {
    try {
      const [createdRes, joinedRes] = await Promise.all([
        axiosInstance.get('my-leagues/'),
        axiosInstance.get('joined-leagues/'),
      ]);
      const created = createdRes.data || [];
      const joined = joinedRes.data || [];
      const merged = [...created, ...joined.filter(j => !created.some(c => c.id === j.id))];
      const minimal = merged.map(l => ({ id: l.id, name: l.name }));
      setLeagues(minimal);
      if (minimal.length) setSelectedLeague(minimal[0].id);
    } catch (err) {
      console.log('Fetch leagues error:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      const [postsRes, createdRes, joinedRes] = await Promise.all([
        axiosInstance.get('posts/'),
        axiosInstance.get('my-leagues/'),
        axiosInstance.get('joined-leagues/'),
      ]);

      // Build nearby league id set
      const allLeagues = [
        ...(createdRes.data || []),
        ...(joinedRes.data || []),
      ];
      const nearbyLeagues = filterLeaguesByDistance(
        allLeagues,
        location?.latitude,
        location?.longitude,
        distanceKm
      );
      const nearbyIds = new Set(nearbyLeagues.map(l => l.id));

      const data = postsRes.data;
      const normalized = (data.results || data).map(p => ({
        ...p,
        league_id: p.league_id || p.league,
        event_name: p.league_name,
      }));

      // If we have location, filter to nearby leagues only
      const filtered = location
        ? normalized.filter(p => nearbyIds.has(p.league_id))
        : normalized;

      setPosts(filtered);
    } catch (err) {
      console.log('Fetch posts error:', err);
    }
  };

  const openComments = async (post) => {
    setSelectedPost(post);
    bottomSheetRef.current?.snapToIndex(0);

    try {
      const res = await axiosInstance.get(`posts/${post.id}/comments/`);
      setComments(res.data);
    } catch (err) {
      console.log('Fetch comments error:', err);
    }
  };

  const closeComments = () => {
    bottomSheetRef.current?.close();
    setSelectedPost(null);
    setCommentText('');
  };

  const createComment = async () => {
    if (!commentText.trim()) return;

    try {
      await axiosInstance.post(`posts/${selectedPost.id}/comments/`, {
        text: commentText,
      });

      setCommentText('');
      openComments(selectedPost);
      fetchPosts();
    } catch (err) {
      console.log('Create comment error:', err.response?.data || err);
    }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
    if (!result.didCancel && !result.errorCode) setImage(result.assets[0]);
  };

  const createPost = async () => {
    if (!selectedLeague) return Alert.alert('Select a league first');
    if (!caption && !image) return Alert.alert('Add caption or image');

    const formData = new FormData();
    formData.append('league', selectedLeague);
    formData.append('caption', caption);

    appendImageAsset(formData, 'image', image);

    try {
      await axiosInstance.post('posts/', formData);
      setCaption('');
      setImage(null);
      fetchPosts();
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error('Create post error:', detail);
      Alert.alert('Failed to post', detail);
    }
  };

  const handleLike = async (postId) => {
    await axiosInstance.post(`posts/${postId}/like/`);
    fetchPosts();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      
      <Text style={styles.header}>Activity</Text>

      {/* Composer */}
      <View style={styles.composerCard}>
        <View style={styles.inputRow}>
          {getAvatarUri() ? (
            <Image source={{ uri: getAvatarUri() }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={20} color="#555" />
            </View>
          )}
          <TextInput
            placeholder="What's your story?"
            placeholderTextColor="#666"
            style={styles.input}
            value={caption}
            onChangeText={setCaption}
          />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
            <Ionicons name="camera-outline" size={20} color="#888" />
          </TouchableOpacity>

          <View style={styles.dropdownWrap}>
            <Picker
              selectedValue={selectedLeague}
              onValueChange={setSelectedLeague}
              dropdownIconColor="#fff"
              style={styles.picker}
            >
              {leagues.map(l => (
                <Picker.Item key={l.id} label={l.name} value={l.id} color="#fff" />
              ))}
            </Picker>
          </View>

          <TouchableOpacity style={styles.postBtn} onPress={createPost}>
            <Text style={styles.postText}>Post</Text>
          </TouchableOpacity>
        </View>

        {image && <Image source={{ uri: image.uri }} style={styles.previewImage} />}
      </View>

      {/* POSTS */}
      <FlatList
        data={posts}
        keyExtractor={i => i.id.toString()}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onCommentPress={openComments}
            navigation={navigation}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* COMMENT BOTTOM SHEET */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onClose={closeComments}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Comments</Text>
            <TouchableOpacity onPress={closeComments} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <BottomSheetFlatList
            data={comments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <Text style={styles.commentUser}>@{item.user_name}</Text>
                <Text style={styles.commentText}>{item.text}</Text>
              </View>
            )}
            contentContainerStyle={styles.commentList}
          />

          <View style={styles.commentInputRow}>
            <TextInput
              placeholder="Write a comment..."
              placeholderTextColor="#555"
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity
              onPress={createComment}
              style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
              disabled={!commentText.trim()}
            >
              <Ionicons name="send" size={18} color={commentText.trim() ? '#6E35B7' : '#444'} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
};

export default ActivityScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: StatusBar.currentHeight || 44,
  },
  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },

  // Composer
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
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownWrap: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    marginHorizontal: 12,
    height: 36,
    justifyContent: 'center',
  },
  picker: {
    color: '#fff',
    fontSize: 14,
  },
  postBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 18,
  },
  postText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 12,
  },

  // Bottom Sheet
  sheetBg: {
    backgroundColor: '#1A1A1A',
  },
  sheetHandle: {
    backgroundColor: '#444',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeBtn: {
    padding: 4,
  },
  commentList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  comment: {
    marginBottom: 16,
  },
  commentUser: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 21,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});