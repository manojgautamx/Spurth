// Web fallback for react-native-keyboard-controller — it's native-only
// (iOS/Android), no web build upstream at all. The browser already resizes
// the visual viewport around its own virtual keyboard, so nothing here
// needs to actively compensate — these are just no-op passthroughs that
// keep every call site's import working unmodified on both native and web,
// same pattern as the other src/shims/*.web.js files (see
// webpack.config.js's resolve.alias).
import React from 'react';
import { View } from 'react-native';

export const KeyboardProvider = ({ children }) => children;

export const KeyboardAvoidingView = ({ style, children }) => (
  <View style={style}>{children}</View>
);
