import { Alert } from 'react-native';

// Contextual "sign in to continue" prompt for interactive actions on screens
// that now render real content for anonymous visitors (activity/profile/post
// detail pages reached via a shared link) — viewing is public, but join/
// like/vote/comment/invite still require an account. Routes through the
// app's own on-brand modal since App.js globally overrides Alert.alert.
export function promptSignIn(navigation, message = 'Sign in to continue.') {
  Alert.alert('Sign in required', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign In', onPress: () => navigation.navigate('Login') },
  ]);
}
