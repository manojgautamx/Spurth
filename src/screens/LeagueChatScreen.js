import React from 'react';
import { View, Text } from 'react-native';

const LeagueChatScreen = ({ route }) => {
  const { leagueName } = route.params;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Chat for: {leagueName}</Text>
      <Text>(You got access ✅)</Text>
    </View>
  );
};

export default LeagueChatScreen;
