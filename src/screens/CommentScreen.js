import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import axiosInstance from '../utils/axiosInstance';

export default function CommentsScreen({ route }) {
  const { post } = route.params;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    fetchComments();
  }, []);

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
      await axiosInstance.post(
        `posts/${post.id}/comments/`, { text });
        setText('');
        fetchComments();
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comments</Text>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />

      <View style={styles.inputRow}>
        <TextInput
          placeholder="Write a comment..."
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0B', padding: 16 },
  title: { color: '#fff', fontSize: 20, marginBottom: 12 },
  comment: { marginBottom: 12 },
  username: { color: '#aaa', fontWeight: '600' },
  text: { color: '#ddd' },
  inputRow: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 8,
  },
  input: { flex: 1, color: '#fff' },
  postBtn: { color: '#fff', paddingHorizontal: 12 },
});