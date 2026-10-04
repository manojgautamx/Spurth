// Common input wrapper — replaces the identical, broken-on-Android pattern
// repeated across the app: `<KeyboardAvoidingView behavior={Platform.OS ===
// 'ios' ? 'padding' : undefined}>`. On Android that's `undefined`, i.e. no
// JS-driven compensation at all, relying entirely on the manifest's
// windowSoftInputMode="adjustResize" — which is set correctly but evidently
// isn't enough on its own (a known gotcha, especially with react-navigation's
// native-screens stack). react-native-keyboard-controller's KeyboardAvoidingView
// implements `behavior="padding"` identically on both platforms, so there's
// no more Platform branching needed here at all.
import React from 'react';
import { ScrollView } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

export default function KeyboardAvoidingWrapper({
  children,
  // Most screens using this are a single scrollable form (the Login/Signup
  // shape) — set false for a screen that already scrolls some other way
  // (e.g. ChatConversationPanel's own FlatList) so it doesn't get a second,
  // conflicting scroll container.
  scroll = true,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
}) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      // Accounts for nav headers/modals on its own, so keyboardVerticalOffset
      // only needs to cover anything beyond that on a per-screen basis.
      automaticOffset
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : children}
    </KeyboardAvoidingView>
  );
}
