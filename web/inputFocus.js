// React Native Web renders TextInput as a real <input>/<textarea>, and
// nothing in the app ever styles its focus state — so every text field
// site-wide falls back to the browser's raw default focus outline (a stark,
// sharp-cornered white/blue rectangle) sitting oddly over the app's rounded,
// low-contrast dark fields. That default outline is also the only visual
// cue a field is interactive at all before it's focused, since the resting
// border (#1E1E1E on #111) is barely distinguishable from the page
// background — together it reads as "this box isn't really a field."
//
// Replaces it with an on-brand glow that echoes the ~14px radius used by
// every inputWrap-style container across the app (Login/Signup/etc.),
// instead of trying to match each screen's exact radius individually.
const style = document.createElement('style');
style.textContent = `
  input:focus,
  textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(133, 117, 255, 0.55);
    border-radius: 12px;
  }
`;
document.head.appendChild(style);
