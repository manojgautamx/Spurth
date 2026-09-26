import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';
import { captureException } from '../utils/monitoring';

// Without this, a single component throwing during render unmounts the whole
// tree and leaves a blank screen — permanently, with nothing on it to say
// what happened or how to get back. On web that reads as the site being
// down; on a phone it reads as the app being broken.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // React swallows a render error once a boundary catches it, so the
    // global error handlers never see it — this is the only place it can be
    // reported from.
    captureException(error, { componentStack: info?.componentStack });
    if (__DEV__) {
      console.error('Render error:', error, info?.componentStack);
    }
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false });
    // On web a reload is the honest recovery: the navigation state that led
    // here is often the thing that's broken.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Ionicons name="alert-circle-outline" size={40} color="#E8735A" />
        <Text style={styles.title}>Something broke on our end</Text>
        <Text style={styles.body}>
          This screen hit an error it couldn't recover from. Reloading usually
          sorts it — if it keeps happening, let us know from Settings.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleReset}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Reload Spurth"
        >
          <Text style={styles.buttonText}>Reload Spurth</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 19,
    fontFamily: Fonts.semibold,
    textAlign: 'center',
  },
  body: {
    color: '#9A9A9A',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    maxWidth: 340,
  },
  button: {
    marginTop: 10,
    paddingVertical: 11,
    paddingHorizontal: 26,
    borderRadius: 999,
    backgroundColor: '#2CB9B0',
  },
  buttonText: {
    color: '#0a0a0a',
    fontSize: 14.5,
    fontFamily: Fonts.semibold,
  },
});
