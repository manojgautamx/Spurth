import React from 'react';
import ChatConversationPanel from '../components/ChatConversationPanel';

// Mobile/narrow-web entry point — pushed as its own full screen from
// ChatListScreen. On wide web, ChatListScreen instead embeds
// ChatConversationPanel directly in a split pane, skipping navigation
// entirely (see ChatListScreen.js).
const ActivityChatScreen = ({ route, navigation }) => {
  const { activityId, activityName } = route.params;

  return (
    <ChatConversationPanel
      activityId={activityId}
      activityName={activityName}
      onBack={() => navigation.goBack()}
    />
  );
};

export default ActivityChatScreen;
