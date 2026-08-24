import React from 'react';
import { View, StyleSheet } from 'react-native';
import ChatConversationPanel from '../components/ChatConversationPanel';
import WebSidebar from '../components/web/WebSidebar';
import { useIsWideWeb } from '../utils/responsive';

// Mobile/narrow-web entry point — pushed as its own full screen from
// ChatListScreen, or reached directly via a shared /chat/:activityId link.
// On wide web, ChatListScreen's own split pane (embedding this same
// ChatConversationPanel next to the chat list) is the primary way in — this
// screen only renders standalone here when a link is opened directly
// (e.g. from an activity page), so it needs its own sidebar + width cap
// instead of rendering full-bleed with no chrome.
const ActivityChatScreen = ({ route, navigation }) => {
  const { activityId, activityName } = route.params;
  const isWideWeb = useIsWideWeb();

  const panel = (
    <ChatConversationPanel
      activityId={activityId}
      activityName={activityName}
      onBack={() => navigation.goBack()}
      embedded={isWideWeb}
    />
  );

  if (isWideWeb) {
    return (
      <View style={styles.container}>
        <View style={styles.webRow}>
          <WebSidebar />
          <View style={styles.webCol}>
            {panel}
          </View>
        </View>
      </View>
    );
  }

  return panel;
};

export default ActivityChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', overflow: 'hidden' },
  webRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webCol: {
    flex: 1,
    maxWidth: 720,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderLeftColor: '#1A1A1A',
  },
});
