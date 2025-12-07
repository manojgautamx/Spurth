// screens/LeagueViewerScreen.js
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Text, Alert, Pressable } from 'react-native';
import LeagueDetails from '../components/LeagueDetails';
import useAxios from '../utils/useAxios';

const LeagueViewerScreen = ({ route, navigation }) => {
  const { league } = route.params;
  const axios = useAxios();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [canChat, setCanChat] = useState(false);
  

  // 🔥 1. Fetch join-status when screen loads
  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      try {
        const statusRes = await axios.get(
          `http://10.0.2.2:8000/api/league-status/${league.id}/`
        );

        const chatRes = await axios.get(
          `http://10.0.2.2:8000/api/can-enter-chat/${league.id}/`
        );

        if (!mounted) return;

        setIsJoined(statusRes.data.joined);
        setCanChat(chatRes.data.can_chat);
      } catch (err) {
        console.warn("Failed to fetch league state");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();

    return () => {
      mounted = false;
    };
  }, [league.id]);

  // 🔥 2. Join League
  const handleJoin = async () => {
    try {
      setJoining(true);
      await axios.post(`http://10.0.2.2:8000/api/join-league/${league.id}/`);
      Alert.alert('Success', 'You joined the league!');
      setIsJoined(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to join league');
    } finally {
      setJoining(false);
    }
  };

  // 🔥 3. Leave League
  const handleLeave = async () => {
    try {
      setJoining(true);
      await axios.post(`http://10.0.2.2:8000/api/leave-league/${league.id}/`);
      Alert.alert('Left League', 'You have left the league.');
      setIsJoined(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to leave league');
    } finally {
      setJoining(false);
    }
  };

  const deleteLeague = async () => {
    try {
      await axios.delete(`http://10.0.2.2:8000/api/delete-league/${league.id}/`);
      Alert.alert('Event Deleted', 'The league has been deleted successfully.');
      navigation.goBack(); // remove screen
    } catch (err) {
      Alert.alert("Error", err.response?.data?.detail || "Delete failed");
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete League",
      "This action cannot be undone",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteLeague }
      ]
    );
  };

  if (loading) {
    return (
      <ScrollView>
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading...</Text>
      </ScrollView>
    );
  }


  const goToChat = async () => {
    try {
      const res = await axios.get(
        `http://10.0.2.2:8000/api/can-enter-chat/${league.id}/`
      );

      if (res.data.can_chat) {
        navigation.navigate('LeagueChatScreen', {
          leagueId: league.id,
          leagueName: league.name,
        });
      } else {
        Alert.alert('Access Denied', 'You must join this league to chat.');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to check chat access');
    }
  };


  return (
    <ScrollView>
      <LeagueDetails league={league} />

      <TouchableOpacity
        style={isJoined ? styles.leaveButton : styles.joinButton}
        onPress={isJoined ? handleLeave : handleJoin}
        disabled={joining}
      >
        <Text style={styles.buttonText}>
          {joining
            ? isJoined
              ? "Leaving..."
              : "Joining..."
            : isJoined
            ? "Leave League"
            : "Join League"}
        </Text>
      </TouchableOpacity>

      {league.is_owner && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            navigation.navigate("CreateLeague", {
              editMode: true,
              league: league,
            })
          }
        >
          <Text style={styles.buttonText}>Edit League</Text>
        </TouchableOpacity>        
      )}

      {league.is_owner && (
        <TouchableOpacity onPress={confirmDelete}>
          <Text style={{ color: 'red' }}>Delete League</Text>
        </TouchableOpacity>
      )}

      {canChat && (
        <TouchableOpacity style={styles.chatButton} onPress={goToChat}>
          <Text style={styles.buttonText}>Open Chat</Text>
        </TouchableOpacity>
      )}


    </ScrollView>
  );
};

const styles = StyleSheet.create({
  joinButton: {
    marginTop: 20,
    backgroundColor: '#E81F89',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  leaveButton: {
    marginTop: 20,
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  editButton: {
    marginTop: 10,
    marginBottom: 30,
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
  },

  chatButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
  },

});


export default LeagueViewerScreen;
