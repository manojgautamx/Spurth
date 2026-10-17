import { StatusBar } from 'react-native';

// Shared top-of-screen gap — the space between the status bar and a
// page's own header/content below it. Every full-screen page (tab
// screens, auth screens, profile, etc.) wants the same breathing room
// here, but used to each pick its own guess: a flat 50 (the bottom-tab
// screens, previously TAB_HEADER_TOP_PADDING), a flat 60 (Login/Signup/
// Forgot/Reset password), a flat 50 again (ProfileView, email
// verification's back button) — none of them accounting for the actual
// device's status bar height, which is exactly why a flat value tuned
// by eye ended up visibly oversized on Android, whose status bar
// (~24-30dp) is much shorter than the ~44pt iOS notch/safe-area these
// flat numbers were really approximating.
//
// StatusBar.currentHeight is the real, device-measured status bar
// height on Android, and undefined on iOS/web (where 44 approximates
// the notch/safe-area instead, same fallback those platforms already
// use elsewhere) — this is the same formula most of the app's other
// screens (Settings, Profile, CreateActivity, Chat, …) already compute
// correctly; this constant just brings the screens that didn't onto
// that same, already-correct convention instead of a fourth guess.
export const SCREEN_TOP_PADDING = (StatusBar.currentHeight || 44) + 8;
