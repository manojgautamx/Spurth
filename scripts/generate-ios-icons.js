// ios/StreetLeague/ is the real app icon source — confirmed via
// project.pbxproj: PRODUCT_NAME is still literally "StreetLeague" (never
// renamed at the Xcode level even though the app is Spurth everywhere
// else), and its Images.xcassets file reference points at
// "StreetLeague/Images.xcassets". ios/spurth/ only holds what
// react-native-bootsplash's own generator writes (BootSplash.storyboard,
// Colors.xcassets) — its AppIcon.appiconset is an unused scaffold with no
// real images, not the actual icon source; don't generate into it.
//
// Note the wider project.pbxproj inconsistency this also surfaced: most
// other ios/StreetLeague/* file references (AppDelegate.swift, Info.plist,
// PrivacyInfo.xcprivacy) point at files that no longer exist there at all
// — those physically live under ios/spurth/ now, just never got
// re-referenced after the move. That's a separate, pre-existing breakage
// (iOS isn't an actively built platform right now) — out of scope here,
// flagging only because it's adjacent to this directory-naming confusion.
//
// No alpha channel (flattened onto white) — Apple rejects an icon with
// transparency.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '../src/assets/appIcon.jpg');
const DIR = path.resolve(__dirname, '../ios/StreetLeague/Images.xcassets/AppIcon.appiconset');

const ENTRIES = [
  { idiom: 'iphone', size: '20x20', scale: '2x', px: 40 },
  { idiom: 'iphone', size: '20x20', scale: '3x', px: 60 },
  { idiom: 'iphone', size: '29x29', scale: '1x', px: 29 },
  { idiom: 'iphone', size: '29x29', scale: '2x', px: 58 },
  { idiom: 'iphone', size: '29x29', scale: '3x', px: 87 },
  { idiom: 'iphone', size: '40x40', scale: '2x', px: 80 },
  { idiom: 'iphone', size: '40x40', scale: '3x', px: 120 },
  { idiom: 'iphone', size: '60x60', scale: '2x', px: 120 },
  { idiom: 'iphone', size: '60x60', scale: '3x', px: 180 },
  { idiom: 'ipad', size: '20x20', scale: '1x', px: 20 },
  { idiom: 'ipad', size: '20x20', scale: '2x', px: 40 },
  { idiom: 'ipad', size: '29x29', scale: '1x', px: 29 },
  { idiom: 'ipad', size: '29x29', scale: '2x', px: 58 },
  { idiom: 'ipad', size: '40x40', scale: '1x', px: 40 },
  { idiom: 'ipad', size: '40x40', scale: '2x', px: 80 },
  { idiom: 'ipad', size: '76x76', scale: '1x', px: 76 },
  { idiom: 'ipad', size: '76x76', scale: '2x', px: 152 },
  { idiom: 'ipad', size: '83.5x83.5', scale: '2x', px: 167 },
  { idiom: 'ios-marketing', size: '1024x1024', scale: '1x', px: 1024 },
];

async function run() {
  const images = [];
  for (const { idiom, size, scale, px } of ENTRIES) {
    const filename = `Icon-App-${size}@${scale}.png`;
    await sharp(SOURCE)
      .resize(px, px)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toFile(path.join(DIR, filename));
    images.push({ size, idiom, filename, scale });
    console.log(`${filename} (${px}x${px})`);
  }

  const contents = {
    images,
    info: { author: 'xcode', version: 1 },
  };
  fs.writeFileSync(path.join(DIR, 'Contents.json'), JSON.stringify(contents, null, 2) + '\n');
  console.log('Contents.json updated with filenames');
}

run().catch((err) => { console.error(err); process.exit(1); });
