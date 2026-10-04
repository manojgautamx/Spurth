// App-wide chat state, so the navbar badge (BottomTabs, WebSidebar) can show
// an unread-conversation count without ChatListScreen needing to be
// mounted. There's no backend concept of "unread" for chat at all — it's
// pure Firestore, so this lifts ChatListScreen's own fetch-activities +
// one-Firestore-listener-per-activity + AsyncStorage "last read" logic out
// of that screen and runs it for the whole logged-in session instead of
// only while the Chat tab happens to be open. ChatListScreen now reads its
// data from here rather than keeping a second, separate copy.
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase/firebaseConfig';
import axiosInstance from '../utils/axiosInstance';
import { fetchAllPages } from '../utils/paginated';
import { getErrorMessage } from '../utils/errorMessage';
import { AuthContext } from './AuthContext';

const STORAGE_KEY = 'chat_last_read';

const ChatContext = createContext({
  activities: [],
  loading: true,
  error: null,
  lastRead: {},
  isUnread: () => false,
  unreadChatCount: 0,
  markActivityRead: () => {},
});

export const ChatProvider = ({ children }) => {
  const { userToken } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRead, setLastRead] = useState({});
  const unsubscribersRef = useRef([]);
  // Mounting this provider app-wide (rather than only while ChatListScreen
  // happens to be open) means its Firestore subscriptions can now start the
  // instant `userToken` goes truthy — which races LoginScreen/SignupScreen's
  // separate, un-awaited-by-anything-here signIntoFirebase() HTTP round
  // trip. Subscribing before that resolves gets a terminal permission-denied
  // (Firestore doesn't retry a listener that's already failed once auth
  // later arrives), so this waits for Firebase's own auth state instead of
  // assuming it's ready just because our own JWT is.
  const [firebaseReady, setFirebaseReady] = useState(!!auth.currentUser);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => raw ? setLastRead(JSON.parse(raw)) : null)
      .catch(() => {});
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setFirebaseReady(!!user));
  }, []);

  const isUnread = useCallback((activity) => {
    const last = activity.lastMessage;
    if (!last?.timestamp) return false;
    const lastReadMs = lastRead[activity.id] || 0;
    const msgMs = last.timestamp.toDate
      ? last.timestamp.toDate().getTime()
      : new Date(last.timestamp).getTime();
    return msgMs > lastReadMs;
  }, [lastRead]);

  const markActivityRead = useCallback(async (activityId, lastMsgTimestamp) => {
    if (!lastMsgTimestamp) return;
    const ms = lastMsgTimestamp.toDate
      ? lastMsgTimestamp.toDate().getTime()
      : new Date(lastMsgTimestamp).getTime();
    setLastRead(prev => {
      const updated = { ...prev, [activityId]: ms };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!userToken || !firebaseReady) {
      unsubscribersRef.current.forEach(u => u && u());
      unsubscribersRef.current = [];
      setActivities([]);
      // Logged in but still waiting on Firebase sign-in is a loading state,
      // not an empty inbox — ChatListScreen isn't reachable while logged
      // out at all, so this only really matters for the former case.
      setLoading(true);
      setError(null);
      return;
    }

    let active = true;
    const fetchActivities = async () => {
      try {
        setError(null);
        // Every activity you're in needs a chat row, so both lists are
        // walked to the end rather than stopping at the first page.
        const [created, joined] = await Promise.all([
          fetchAllPages(axiosInstance, 'my-activities/'),
          fetchAllPages(axiosInstance, 'joined-activities/'),
        ]);
        if (!active) return;
        const merged = [
          ...created,
          ...joined.filter(j => !created.some(c => c.id === j.id)),
        ];

        setActivities(merged);

        unsubscribersRef.current.forEach(u => u && u());
        unsubscribersRef.current = [];

        // Firestore chat threads were created under a 'leagues'/'league_<id>'
        // path before this rename — kept as-is so existing chat history
        // isn't orphaned under a path no longer written to.
        unsubscribersRef.current = merged.map(activity => {
          const lastMessageQuery = query(
            collection(db, 'leagues', `league_${activity.id}`, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          return onSnapshot(lastMessageQuery, snapshot => {
            if (!snapshot.empty) {
              const msg = snapshot.docs[0].data();
              setActivities(prev =>
                prev.map(a =>
                  a.id === activity.id ? { ...a, lastMessage: msg } : a
                )
              );
            }
          });
        });
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Couldn't load your chats."));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchActivities();
    return () => {
      active = false;
      unsubscribersRef.current.forEach(u => u && u());
      unsubscribersRef.current = [];
    };
  }, [userToken, firebaseReady]);

  const unreadChatCount = activities.filter(isUnread).length;

  return (
    <ChatContext.Provider
      value={{ activities, loading, error, lastRead, isUnread, unreadChatCount, markActivityRead }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatBadge = () => useContext(ChatContext);
