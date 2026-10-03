import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../utils/axiosInstance';
import { listFrom } from '../utils/paginated';
import { Fonts } from '../theme/fonts';

const SEARCH_DEBOUNCE_MS = 500;
const PLACEHOLDER_AVATAR = 'https://via.placeholder.com/80';

// Search-and-pick for inviting co-hosts — same GET users/ search ExploreScreen's
// people search already uses (PublicUserSearchView: username + full_name,
// AllowAny, capped at 10), same row rendering. Adds a sequence-number
// staleness guard (the usernameCheckSeq pattern from SignupScreen.js) that
// ExploreScreen's own copy of this search lacks — fixing that gap here
// rather than carrying it into a second place.
//
// Picking someone here doesn't add them outright — CreateActivityScreen
// sends an invite per selection once the activity exists; they only become
// a listed host once they accept it. `selectedHosts` just tracks who's
// about to be invited.
const HostPicker = ({ label, selectedHosts, onChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    const val = query.trim();
    if (val.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get('users/', { params: { search: val } });
        if (seq !== searchSeq.current) return; // a newer keystroke already superseded this search
        setResults(listFrom(res.data));
      } catch {
        if (seq !== searchSeq.current) return;
        setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const addHost = (user) => {
    if (selectedHosts.some((h) => h.id === user.id)) return;
    onChange([...selectedHosts, user]);
    setQuery('');
    setResults([]);
  };

  const removeHost = (id) => {
    onChange(selectedHosts.filter((h) => h.id !== id));
  };

  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>

      {selectedHosts.length > 0 && (
        <View style={styles.chipsWrap}>
          {selectedHosts.map((h) => (
            <View key={h.id} style={styles.chip}>
              <Image source={{ uri: h.avatar || PLACEHOLDER_AVATAR }} style={styles.chipAvatar} />
              <Text style={styles.chipText} numberOfLines={1}>@{h.username}</Text>
              <TouchableOpacity
                onPress={() => removeHost(h.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove @${h.username}`}
              >
                <Ionicons name="close" size={14} color="#888" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.fieldInput}>
        <Ionicons name="search" size={16} color="#555" style={styles.fieldIcon} />
        <TextInput
          style={styles.fieldTextInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by username"
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color="#555" />}
      </View>

      {results.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {results.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.suggestionItem, index === results.length - 1 && styles.suggestionItemLast]}
              onPress={() => addHost(item)}
              activeOpacity={0.75}
            >
              <Image source={{ uri: item.avatar || PLACEHOLDER_AVATAR }} style={styles.resultAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionText} numberOfLines={1}>@{item.username}</Text>
                {!!item.full_name && (
                  <Text style={styles.suggestionSubtext} numberOfLines={1}>{item.full_name}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default HostPicker;

// Matches CreateActivityScreen's own field styling exactly (dark #111
// fields, #222 borders, #141414 suggestion dropdowns) so this reads as a
// native part of that screen rather than a visually distinct component.
const styles = StyleSheet.create({
  fieldLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 20,
    fontFamily: Fonts.semibold,
  },
  fieldInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldTextInput: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    padding: 0,
    fontFamily: Fonts.regular,
  },
  suggestionsContainer: {
    backgroundColor: '#141414',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  resultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  suggestionSubtext: {
    color: '#888',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    gap: 6,
    maxWidth: 180,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#222',
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.medium,
    flexShrink: 1,
  },
});
