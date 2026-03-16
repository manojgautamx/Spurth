import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import axiosInstance from '../utils/axiosInstance';

export default function CommentBottomSheet({ post, visible, onClose }) {
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (visible && post) {
      fetchComments();
      sheetRef.current?.expand();
    }
  }, [visible, post]);

  const fetchComments = async () => {
    try {
      const res = await axiosInstance.get(`posts/${post.id}/comments/`);
      setComments(res.data);
    } catch (err) {
      console.log('Fetch comments error:', err);
    }
  };

  const createComment = async () => {
    if (!text.trim()) return;

    try {
      const res = await axiosInstance.post(
        `posts/${post.id}/comments/`,
        { text }
      );

      // ✅ Optimistic update
      setComments(prev => [res.data, ...prev]);
      setText('');
    } catch (err) {
      console.log('Create comment error:', err);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.comment}>
      <Text style={styles.username}>@{item.user_name}</Text>
      <Text style={styles.text}>{item.text}</Text>
    </View>
  );

  if (!visible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: '#121212' }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Comments</Text>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          inverted
        />

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Add a comment..."
            placeholderTextColor="#777"
            value={text}
            onChangeText={setText}
            style={styles.input}
          />
          <TouchableOpacity onPress={createComment}>
            <Text style={styles.postBtn}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { color: '#fff', fontSize: 18, marginBottom: 10 },
  comment: { marginBottom: 12 },
  username: { color: '#aaa', fontWeight: '600' },
  text: { color: '#ddd' },
  inputRow: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 8,
  },
  input: { flex: 1, color: '#fff' },
  postBtn: { color: '#fff', paddingHorizontal: 12 },
});