import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../utils/axiosInstance';
import PostCard from '../components/PostCard';
import { Fonts } from '../theme/fonts';
import { useIsWideWeb } from '../utils/responsive';
import WebSidebar from '../components/web/WebSidebar';
import PostsRail from '../components/web/PostsRail';

export default function CommentScreen({ route, navigation }) {
  const { post: initialPost } = route.params;
  const isWideWeb = useIsWideWeb();

  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');

  const fetchPost = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`posts/${initialPost.id}/`);
      setPost(prev => ({
        ...prev,
        ...res.data,
        activity_id: res.data.activity,
        event_name: res.data.activity_name,
      }));
    } catch (err) {
      console.log('Fetch post error:', err);
    }
  }, [initialPost.id]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`posts/${initialPost.id}/comments/`);
      setComments(res.data);
    } catch (err) {
      console.log('Fetch comments error:', err);
    } finally {
      setLoading(false);
    }
  }, [initialPost.id]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  const handleLike = async (postId) => {
    setPost(prev => ({
      ...prev,
      is_liked: !prev.is_liked,
      likes_count: (prev.likes_count || 0) + (prev.is_liked ? -1 : 1),
    }));
    try {
      await axiosInstance.post(`posts/${postId}/like/`);
    } catch (err) {
      console.log('Like error:', err);
    }
  };

  const handleVote = async (postId, choiceId) => {
    try {
      await axiosInstance.post(`posts/${postId}/vote/`, { choice_id: choiceId });
      fetchPost();
    } catch (err) {
      console.log('Vote error:', err.response?.data?.detail || err);
    }
  };

  const createComment = async () => {
    if (!text.trim()) return;
    try {
      await axiosInstance.post(`posts/${initialPost.id}/comments/`, { text });
      setText('');
      fetchComments();
      fetchPost();
    } catch (err) {
      console.log('Create comment error:', err.response?.data || err);
    }
  };

  const body = (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <PostCard post={post} onLike={handleLike} onVote={handleVote} />
            <Text style={styles.commentsLabel}>
              Comments{post.comments_count ? ` (${post.comments_count})` : ''}
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.commentUser}>@{item.user_name}</Text>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No comments yet. Be the first!</Text> : null
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          placeholder="Write a comment..."
          placeholderTextColor="#555"
          style={styles.input}
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          onPress={createComment}
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={18} color={text.trim() ? '#2CB9B0' : '#444'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Post</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      {isWideWeb ? (
        <View style={styles.webRow}>
          <WebSidebar />
          <View style={styles.webContent}>
            <View style={styles.webCenterWrap}>
              {header}
              {body}
            </View>
            <PostsRail />
          </View>
        </View>
      ) : (
        <>
          {header}
          {body}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight || 44,
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  commentsLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
    marginBottom: 14,
  },
  comment: {
    marginBottom: 16,
  },
  commentUser: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.semibold,
    marginBottom: 4,
  },
  commentText: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.regular,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 30,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
