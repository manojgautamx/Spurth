import { Platform, useWindowDimensions } from 'react-native';

// Below this width, screens render exactly as they do on native mobile.
// At or above it (web only — never native, regardless of tablet size), a
// screen may opt into a wider, desktop-appropriate layout.
export const WEB_WIDE_BREAKPOINT = 900;

export function useIsWideWeb() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WEB_WIDE_BREAKPOINT;
}
