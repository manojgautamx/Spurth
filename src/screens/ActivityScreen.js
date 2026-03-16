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
} from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../utils/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { useNavigation } from '@react-navigation/native';

const BASE_URL = 'http://10.0.2.2:8000';

const ActivityScreen = () => {
  const { user } = useContext(AuthContext);

  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);

  /* 🔥 COMMENT STATE */
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  const navigation = useNavigation();

  /* ───────── INIT TOKEN ───────── */
  useEffect(() => {
    AsyncStorage.getItem('accessToken').then(setToken);
  }, []);

  /* ───────── FETCH PROFILE ───────── */
  useEffect(() => {
    axiosInstance.get('profile/').then(res => setProfile(res.data));
  }, []);

  const getAvatarUri = () => {
    if (!profile?.avatar) return null;
    return profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`;
  };

  /* ───────── FETCH DATA ───────── */
  useEffect(() => {
    if (token) {
      fetchMyLeagues();
      fetchPosts();
    }
  }, [token]);

  const fetchMyLeagues = async () => {
    try {
      const [createdRes, joinedRes] = await Promise.all([
        fetch(`${BASE_URL}/api/my-leagues/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/joined-leagues/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const created = await createdRes.json();
      const joined = await joinedRes.json();

      const merged = [...created, ...joined.filter(j => !created.some(c => c.id === j.id))];
      const minimal = merged.map(l => ({ id: l.id, name: l.name }));

      setLeagues(minimal);
      if (minimal.length) setSelectedLeague(minimal[0].id);
    } catch (err) {
      console.log('Fetch leagues error:', err);
    }
  };

  const fetchPosts = async () => {
    const res = await fetch(`${BASE_URL}/api/posts/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setPosts((data.results || data).map(p => ({ 
      ...p,
      league_id: p.league_id || p.league,  // 🔥 normalize here
      event_name: p.league_name 
    })));
  };

  /* ───────── COMMENTS LOGIC ───────── */

  const openComments = async (post) => {
    setSelectedPost(post);
    bottomSheetRef.current?.expand();

    try {
      const res = await axiosInstance.get(`posts/${post.id}/comments/`);
      setComments(res.data);
    } catch (err) {
      console.log('Fetch comments error:', err);
    }
  };

  const createComment = async () => {
    if (!commentText.trim()) return;

    try {
      await axiosInstance.post(`posts/${selectedPost.id}/comments/`, {
        text: commentText,
      });

      setCommentText('');
      openComments(selectedPost);
      fetchPosts(); // refresh counts
    } catch (err) {
      console.log('Create comment error:', err.response?.data || err);
    }
  };

  /* ───────── IMAGE PICKER ───────── */
  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
    if (!result.didCancel && !result.errorCode) setImage(result.assets[0]);
  };

  /* ───────── CREATE POST ───────── */
  const createPost = async () => {
    if (!selectedLeague) return Alert.alert('Select a league first');
    if (!caption && !image) return Alert.alert('Add caption or image');

    const formData = new FormData();
    formData.append('league', selectedLeague);
    formData.append('caption', caption);

    if (image) {
      formData.append('image', {
        uri: image.uri,
        type: image.type,
        name: image.fileName || 'photo.jpg',
      });
    }

    const res = await fetch(`${BASE_URL}/api/posts/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (res.status === 201) {
      setCaption('');
      setImage(null);
      fetchPosts();
    }
  };

  /* ───────── LIKE ───────── */
  const handleLike = async (postId) => {
    await axiosInstance.post(`posts/${postId}/like/`);
    fetchPosts();
  };

  /* ───────── UI ───────── */
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Activity</Text>

      {/* Composer */}
      <View style={styles.composerCard}>
        <View style={styles.dropdown}>
          <Picker
            selectedValue={selectedLeague}
            onValueChange={setSelectedLeague}
            dropdownIconColor="#fff"
            style={{ color: '#fff' }}
          >
            {leagues.map(l => <Picker.Item key={l.id} label={l.name} value={l.id} />)}
          </Picker>
        </View>

        <View style={styles.inputRow}>
          {getAvatarUri()
            ? <Image source={{ uri: getAvatarUri() }} style={styles.avatar} />
            : <Ionicons name="person-circle-outline" size={36} color="#777" />}
          <TextInput
            placeholder="What's your story?"
            placeholderTextColor="#777"
            style={styles.input}
            value={caption}
            onChangeText={setCaption}
          />
        </View>

        {image && <Image source={{ uri: image.uri }} style={styles.previewImage} />}

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={pickImage}>
            <Ionicons name="image-outline" size={22} color="#aaa" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.postBtn} onPress={createPost}>
            <Text style={styles.postText}>Post</Text>
          </TouchableOpacity>
        </View>
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
      />

      {/* 🔥 COMMENT BOTTOM SHEET */}
      <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={snapPoints}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Text style={styles.sheetTitle}>Comments</Text>

          <BottomSheetFlatList
            data={comments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <Text style={styles.username}>@{item.user_name}</Text>
                <Text style={styles.text}>{item.text}</Text>
              </View>
            )}
          />

          <View style={styles.commentInputRow}>
            <TextInput
              placeholder="Write a comment..."
              placeholderTextColor="#777"
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity onPress={createComment}>
              <Text style={styles.postBtnText}>Post</Text>
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
    backgroundColor: '#0B0B0B',
    padding: 16,
  },
  header: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  /* Composer */
  composerCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  dropdown: {
    backgroundColor: '#2A2A2C',
    borderRadius: 10,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 16,
  },
  postBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postText: {
    color: '#000',
    fontWeight: '600',
  },

  /* Post Card */
  postCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
  },
  username: {
    color: '#888',
    marginTop: 6,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 20,
  },
  meta: {
    color: '#aaa',
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
  },
  comment: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  commentInputRow: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  commentInput: {
    flex: 1,
  },
  postBtnText: {
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
