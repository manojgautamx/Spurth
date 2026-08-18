import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { db } from '../firebase/firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useAxios from '../utils/useAxios';
import { BASE_URL } from '../config';
import { useNavigation } from '@react-navigation/native';

// ── Helpers ──────────────────────────────────────────────────────────────────

const getAvatarSource = (avatarPath) => {
  if (!avatarPath) return require('../assets/avatar-placeholder.png');
  if (avatarPath.startsWith('http')) return { uri: avatarPath };
  return { uri: `${BASE_URL}${avatarPath}` };
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const formatDateLabel = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '';
  }
};

const isSameDay = (ts1, ts2) => {
  if (!ts1 || !ts2) return false;
  try {
    const d1 = ts1.toDate ? ts1.toDate() : new Date(ts1);
    const d2 = ts2.toDate ? ts2.toDate() : new Date(ts2);
    return d1.toDateString() === d2.toDateString();
  } catch {
    return false;
  }
};

// ── Main Component ────────────────────────────────────────────────────────────
// Shared by ActivityChatScreen (mobile — pushed as its own full screen, with
// a back button that pops the stack) and ChatListScreen's wide-web split
// pane (embedded next to the chat list, with a back button that just clears
// the selection instead of navigating).

export default function ChatConversationPanel({ activityId, activityName, onBack, embedded = false }) {
  const navigation = useNavigation();
  const [messages, setMessages]       = useState([]);
  const [text, setText]               = useState('');
  const [userId, setUserId]           = useState('');
  const [username, setUsername]       = useState('');
  const [userAvatar, setUserAvatar]   = useState('');
  const [infoVisible, setInfoVisible] = useState(false);
  const [activity, setActivity]       = useState(null);
  const [showAllMembers, setShowAllMembers] = useState(false);

  const flatListRef = useRef(null);
  const axios = useAxios();

  useEffect(() => {
    axios.get(`${BASE_URL}/api/me/`)
      .then(res => {
        setUserId(String(res.data.id));
        setUsername(res.data.username);
        setUserAvatar(res.data.avatar || '');
      })
      .catch(e => console.warn('Failed to load user', e));
  }, []);

  useEffect(() => {
    axios.get(`${BASE_URL}/api/activity-detail/${activityId}/`)
      .then(res => setActivity(res.data))
      .catch(e => console.warn('Failed to load activity info', e));
  }, [activityId]);

  // NOTE: the Firestore collection path ('leagues'/'league_<id>') is kept
  // as-is even though everything else here is now "activity" — these chat
  // threads already exist in Firestore under that path, and changing it
  // would orphan existing message history instead of just renaming a term.
  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'leagues', `league_${activityId}`, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(messagesQuery, snapshot => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsubscribe();
  }, [activityId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const msgText = text.trim();
    setText('');
    try {
      await addDoc(collection(db, 'leagues', `league_${activityId}`, 'messages'), {
        text: msgText,
        senderId: userId,
        senderName: username,
        senderAvatar: userAvatar,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Firestore write failed:', err.message);
    }
  };

  const handleLeaveActivity = () => {
    Alert.alert('Leave Activity', 'Are you sure you want to leave this activity chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          setInfoVisible(false);
          if (onBack) onBack();
        },
      },
    ]);
  };

  const buildItems = useCallback(() => {
    const items = [];
    messages.forEach((msg, index) => {
      const prev = messages[index - 1];
      if (!prev || !isSameDay(prev.timestamp, msg.timestamp)) {
        items.push({ type: 'date', id: `date_${index}`, timestamp: msg.timestamp });
      }
      const isMe = msg.senderId === userId;
      const nextMsg = messages[index + 1];
      const isLastInGroup =
        !nextMsg ||
        nextMsg.senderId !== msg.senderId ||
        !isSameDay(msg.timestamp, nextMsg.timestamp);
      const isFirstInGroup =
        !prev ||
        prev.senderId !== msg.senderId ||
        !isSameDay(prev.timestamp, msg.timestamp);
      items.push({
        type: 'message',
        ...msg,
        isMe,
        isFirstInGroup,
        isLastInGroup,
      });
    });
    return items;
  }, [messages, userId]);

  const renderItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>
            {formatDateLabel(item.timestamp)}
          </Text>
        </View>
      );
    }

    if (item.isMe) {
      return (
        <View style={styles.myMsgWrapper}>
          <View style={[
            styles.bubble,
            styles.myBubble,
            !item.isLastInGroup && styles.bubbleNoTailRight,
          ]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
            <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.otherMsgWrapper}>
        {item.isLastInGroup ? (
          <Image
            source={
              item.senderAvatar
                ? { uri: item.senderAvatar }
                : require('../assets/avatar-placeholder.png')
            }
            style={styles.msgAvatar}
          />
        ) : (
          <View style={styles.msgAvatarSpacer} />
        )}
        <View style={styles.otherBubbleCol}>
          {item.isFirstInGroup && (
            <Text style={styles.senderName}>@{item.senderName}</Text>
          )}
          <View style={[
            styles.bubble,
            styles.otherBubble,
            !item.isLastInGroup && styles.bubbleNoTailLeft,
          ]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
            <Text style={[styles.timestamp, styles.timestampOther]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const members = activity?.participants || [];
  const PREVIEW_COUNT = 6;
  const displayedMembers = showAllMembers ? members : members.slice(0, PREVIEW_COUNT);
  const remaining = members.length - PREVIEW_COUNT;

  const coverUri = activity?.cover_image
    ? activity.cover_image.startsWith('http')
      ? activity.cover_image
      : `${BASE_URL}${activity.cover_image}`
    : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, embedded && styles.headerEmbedded]}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{activityName}</Text>
        </View>
        <TouchableOpacity onPress={() => setInfoVisible(true)} style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.headerDivider} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={buildItems()}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="#555"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {infoVisible && (
        // A real RN Modal portals to the document body on web, so it always
        // covers the full page — ignoring this panel's own bounds. On the
        // wide-web split pane that meant the member/info panel spilled over
        // the chat list column instead of staying confined to the
        // conversation pane. A plain absolutely-positioned View here stays
        // scoped to `container` (this component's own root), which is
        // exactly what we want in both contexts: full-screen on mobile
        // (where container already fills the screen) and pane-confined here.
        <View style={styles.infoModal}>
          <View style={styles.infoHeader}>
            <TouchableOpacity onPress={() => setInfoVisible(false)} style={styles.infoBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoMenuBtn}>
              <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.infoScroll}>
            <View style={styles.infoCoverWrapper}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.infoCover} />
              ) : (
                <View style={[styles.infoCover, styles.infoCoverFallback]}>
                  <Ionicons name="people" size={48} color="#444" />
                </View>
              )}
            </View>

            <Text style={styles.infoName}>{activityName}</Text>
            <Text style={styles.infoMemberCount}>
              {activity?.participant_count || members.length} Members
            </Text>

            <Text style={styles.infoSectionLabel}>Members</Text>

            {displayedMembers.map(member => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberRow}
                onPress={() => {
                  setInfoVisible(false);
                  navigation.navigate('ProfileView', { userId: member.id });
                }}
              >
                <Image
                  source={getAvatarSource(member.avatar)}
                  style={styles.memberAvatar}
                />
                <Text style={styles.memberUsername}>@{member.username}</Text>
              </TouchableOpacity>
            ))}

            {!showAllMembers && remaining > 0 && (
              <TouchableOpacity onPress={() => setShowAllMembers(true)}>
                <Text style={styles.viewAllText}>View All ({remaining} More)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveActivity}>
              <Ionicons name="exit-outline" size={20} color="#E81F89" />
              <Text style={styles.leaveText}>Leave Activity</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 44) + 8,
    paddingBottom: 14,
    backgroundColor: '#0D0D0D',
  },
  headerEmbedded: {
    paddingTop: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  infoBtn: {
    padding: 4,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#1E1E1E',
  },
  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    color: '#555',
    fontSize: 13,
  },
  myMsgWrapper: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  myBubble: {
    backgroundColor: '#2CB9B0',
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  otherMsgWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#2A2A2A',
  },
  msgAvatarSpacer: {
    width: 36,
  },
  otherBubbleCol: {
    maxWidth: '75%',
  },
  senderName: {
    color: '#888',
    fontSize: 12,
    marginBottom: 3,
    marginLeft: 2,
  },
  otherBubble: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    maxWidth: '80%',
  },
  bubbleNoTailRight: {
    borderBottomRightRadius: 18,
  },
  bubbleNoTailLeft: {
    borderBottomLeftRadius: 18,
  },
  bubbleText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  timestampOther: {
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    backgroundColor: '#0D0D0D',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2CB9B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#222',
  },
  infoModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0D0D0D',
    zIndex: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 44) + 8,
    paddingBottom: 12,
  },
  infoBackBtn: {
    padding: 4,
  },
  infoMenuBtn: {
    padding: 4,
  },
  infoScroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  infoCoverWrapper: {
    marginBottom: 16,
    marginTop: 8,
  },
  infoCover: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1A1A1A',
  },
  infoCoverFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoMemberCount: {
    color: '#888',
    fontSize: 14,
    marginBottom: 28,
    textAlign: 'center',
  },
  infoSectionLabel: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 10,
    gap: 14,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },
  memberUsername: {
    color: '#fff',
    fontSize: 16,
  },
  viewAllText: {
    color: '#2CB9B0',
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 28,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginTop: 8,
    paddingVertical: 8,
  },
  leaveText: {
    color: '#E81F89',
    fontSize: 16,
    fontWeight: '600',
  },
});
