// Native links these fonts via Info.plist / build.gradle; on web there's no
// such linking step, so we register the same font files as @font-face rules
// under the exact family names the app already uses (see src/theme/fonts.js
// and react-native-vector-icons' createIconSet calls).
import manropeExtraLight from '../src/assets/fonts/Manrope-ExtraLight.ttf';
import manropeLight from '../src/assets/fonts/Manrope-Light.ttf';
import manropeRegular from '../src/assets/fonts/Manrope-Regular.ttf';
import manropeMedium from '../src/assets/fonts/Manrope-Medium.ttf';
import manropeSemiBold from '../src/assets/fonts/Manrope-SemiBold.ttf';
import manropeBold from '../src/assets/fonts/Manrope-Bold.ttf';
import manropeExtraBold from '../src/assets/fonts/Manrope-ExtraBold.ttf';
import funkYeah from './Funk Yeah.otf';

import ionicons from 'react-native-vector-icons/Fonts/Ionicons.ttf';
import materialCommunityIcons from 'react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf';
import feather from 'react-native-vector-icons/Fonts/Feather.ttf';
import materialIcons from 'react-native-vector-icons/Fonts/MaterialIcons.ttf';

const FONT_FACES = [
  ['Manrope-ExtraLight', manropeExtraLight],
  ['Manrope-Light', manropeLight],
  ['Manrope-Regular', manropeRegular],
  ['Manrope-Medium', manropeMedium],
  ['Manrope-SemiBold', manropeSemiBold],
  ['Manrope-Bold', manropeBold],
  ['Manrope-ExtraBold', manropeExtraBold],
  ['FunkYeah', funkYeah],
  ['Ionicons', ionicons],
  ['MaterialCommunityIcons', materialCommunityIcons],
  ['Feather', feather],
  ['MaterialIcons', materialIcons],
];

const style = document.createElement('style');
style.textContent = FONT_FACES.map(([family, url]) => `
  @font-face {
    font-family: '${family}';
    src: url('${url}') format('${url.endsWith('.otf') ? 'opentype' : 'truetype'}');
    font-display: swap;
  }
`).join('\n');
document.head.appendChild(style);
