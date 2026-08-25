import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import axiosInstance from '../utils/axiosInstance';
import { Fonts } from '../theme/fonts';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'fake', label: 'Fake or impersonation' },
  { value: 'other', label: 'Other' },
];

// Shared by PostCard.js, ActivityViewerScreen.js, ProfileViewScreen.js —
// one bottom-sheet reason-picker rather than three near-identical modals.
export default function ReportModal({ visible, onClose, targetType, targetId, targetLabel = 'this' }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason(null);
    setDetails('');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Pick a reason', 'Please select a reason for this report.');
      return;
    }
    try {
      setSubmitting(true);
      await axiosInstance.post('report/', {
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim(),
      });
      reset();
      onClose();
      Alert.alert('Report submitted', 'Thank you — our team will review it.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose} />
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>Report {targetLabel}</Text>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>Why are you reporting this?</Text>
          {REASONS.map(r => (
            <TouchableOpacity
              key={r.value}
              style={styles.reasonRow}
              onPress={() => setReason(r.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={reason === r.value ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={reason === r.value ? '#8575ff' : '#666'}
              />
              <Text style={styles.reasonText}>{r.label}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Additional details (optional)</Text>
          <TextInput
            style={styles.detailsInput}
            placeholder="Add any extra context…"
            placeholderTextColor="#555"
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitBtn, (submitting || !reason) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !reason}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: '75%',
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontFamily: Fonts.semibold,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    textTransform: 'capitalize',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sectionLabel: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  reasonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  detailsInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    color: '#fff',
    fontSize: 14,
    padding: 12,
    minHeight: 90,
  },
  submitBtn: {
    backgroundColor: '#8575ff',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
});
