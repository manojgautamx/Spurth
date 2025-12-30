import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAxios from '../utils/useAxios';


const LeagueChatScreen = ({ route }) => {
  const { leagueId, leagueName } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const axios = useAxios();

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('leagues')
      .doc(`league_${leagueId}`)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(msgs);
      });

    return () => unsubscribe();
  }, [leagueId]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await axios.get('http://10.0.2.2:8000/api/me/');
        setUserId(String(res.data.id));
        setUsername(res.data.username);
      } catch (e) {
        console.log('Failed to load user', e);
      }
    };

    loadUser();
  }, []);



  const sendMessage = async () => {
    if (!text.trim()) return;

    await firestore()
      .collection('leagues')
      .doc(`league_${leagueId}`)
      .collection('messages')
      .add({
        text,
        senderId: userId,
        senderName: username,
        timestamp: firestore.FieldValue.serverTimestamp()
      });

    setText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{leagueName} Chat</Text>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.message,
            item.senderId === userId ? styles.myMessage : styles.otherMessage
          ]}>
            <Text style={styles.sender}>{item.senderName}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#888"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16 },
  header: { color: '#fff', fontSize: 20, textAlign: 'center', marginBottom: 10 },
  message: { padding: 10, borderRadius: 10, marginVertical: 5, maxWidth: '80%' },
  myMessage: { backgroundColor: '#E81F89', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#1e1e1e', alignSelf: 'flex-start' },
  sender: { color: '#aaa', fontSize: 12 },
  text: { color: '#fff', fontSize: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10
  },
  sendBtn: {
    backgroundColor: '#E81F89',
    marginLeft: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20
  },
  sendText: { color: '#fff', fontWeight: 'bold' }
});

export default LeagueChatScreen;
