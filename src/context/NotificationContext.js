// App-wide unread-notification count, so the navbar badge (BottomTabs,
// WebSidebar) can show the same number NotificationScreen already fetches,
// without needing that screen to be mounted. The backend already computes
// this for free on every `GET notifications/` (see get_notifications in
// views.py) — this context just keeps a copy of it current in the
// background: once on login, every POLL_INTERVAL_MS as a simple fallback
// (there's no realtime/websocket channel for notifications to hook into
// instead), and immediately when a push notification arrives in the
// foreground (wired via notificationRefreshRef.js, since that happens
// outside any React tree).
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { AuthContext } from './AuthContext';
import { setNotificationRefresh } from '../utils/notificationRefreshRef';

const POLL_INTERVAL_MS = 30000;

const NotificationContext = createContext({
  unreadCount: 0,
  refresh: () => {},
  markAllRead: () => {},
  decrementBy: () => {},
});

export const NotificationProvider = ({ children }) => {
  const { userToken } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  // Refresh calls race against logout — this guards a stale response from
  // resurrecting a count right after the user signs out.
  const loggedInRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!loggedInRef.current) return;
    try {
      const res = await axiosInstance.get('notifications/');
      if (loggedInRef.current) setUnreadCount(res.data?.unread_count || 0);
    } catch (e) {
      // Next poll tick or focus-triggered refresh picks it up — a badge
      // count is never worth surfacing an error for.
    }
  }, []);

  useEffect(() => {
    loggedInRef.current = !!userToken;
    if (!userToken) {
      setUnreadCount(0);
      return;
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userToken, refresh]);

  useEffect(() => {
    setNotificationRefresh(refresh);
    return () => setNotificationRefresh(null);
  }, [refresh]);

  const markAllRead = useCallback(() => setUnreadCount(0), []);
  const decrementBy = useCallback((n = 1) => {
    setUnreadCount(prev => Math.max(0, prev - n));
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh, markAllRead, decrementBy }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationBadge = () => useContext(NotificationContext);
