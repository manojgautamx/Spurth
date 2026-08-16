import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Fonts } from '../theme/fonts';
import { setAlertListener } from '../utils/alertController';

// Replaces Alert.alert app-wide (see App.js) so every existing Alert.alert
// call site — validation errors, server errors, confirmations, action
// sheets — renders through this one on-brand modal instead of the
// platform's native alert/confirm dialog, on both web and native.
export default function AppAlertModal() {
  const [payload, setPayload] = useState(null); // { title, message, buttons } | null

  useEffect(() => {
    setAlertListener(setPayload);
    return () => setAlertListener(null);
  }, []);

  if (!payload) return null;

  const buttons = payload.buttons?.length ? payload.buttons : [{ text: 'OK' }];

  const handlePress = (btn) => {
    setPayload(null);
    btn.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {payload.title ? <Text style={styles.title}>{payload.title}</Text> : null}
          {payload.message ? <Text style={styles.message}>{payload.message}</Text> : null}

          <View style={styles.actions}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  btn.style === 'cancel' && styles.cancelBtn,
                  btn.style === 'destructive' && styles.destructiveBtn,
                ]}
                onPress={() => handlePress(btn)}
              >
                <Text
                  style={[
                    styles.btnText,
                    btn.style === 'cancel' && styles.cancelBtnText,
                    btn.style === 'destructive' && styles.destructiveBtnText,
                  ]}
                >
                  {btn.text || 'OK'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1A1A1A',
    padding: 22,
    borderRadius: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
    marginBottom: 8,
  },
  message: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  actions: {
    marginTop: 22,
    gap: 10,
  },
  btn: {
    backgroundColor: '#2CB9B0',
    paddingVertical: 13,
    borderRadius: 24,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelBtnText: {
    color: '#aaa',
    fontFamily: Fonts.medium,
  },
  destructiveBtn: {
    backgroundColor: '#E53935',
  },
  destructiveBtnText: {
    color: '#fff',
  },
});
