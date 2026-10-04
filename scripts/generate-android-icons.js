// One-off script: fills in the two gaps left after the app icon was
// updated to src/assets/appIcon.jpg — mipmap-ldpi (missed by whatever
// generated the other 5 densities) and every density's adaptive-icon
// foreground layer (mipmap-*-v26/ic_foreground.png), which modern Android
// launchers (API 26+, i.e. virtually every real device) show INSTEAD of
// the flat ic_launcher.png — so leaving those on the old logo would mean
// the new icon never actually appears on a real phone's home screen.
const sharp = require('sharp');
const path = require('path');

const SOURCE = path.resolve(__dirname, '../src/assets/appIcon.jpg');
const RES = path.resolve(__dirname, '../android/app/src/main/res');
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Matches the existing (already-regenerated) densities exactly.
const SIZES = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

async function run() {
  for (const [density, size] of Object.entries(SIZES)) {
    // Flat launcher icon — only ldpi was missed; matches the simple full-
    // canvas resize the other 5 densities already use (same source, same
    // white background baked into the JPG, no extra padding added).
    if (density === 'ldpi') {
      const dir = path.join(RES, `mipmap-${density}`);
      await sharp(SOURCE).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
      await sharp(SOURCE).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
      console.log(`mipmap-${density}: ic_launcher(.round).png written`);
    }

    // Adaptive icon foreground — every density is still the old logo.
    // Scaled to 66% of the canvas (Android's documented adaptive-icon safe
    // zone — a 66dp circle inside the 108dp canvas) so it isn't clipped by
    // a launcher's own circular/squircle mask, centered on white to match
    // colors-icon.xml's iconBackground (#FFFFFF) the OS composites it onto.
    const inner = Math.round(size * 0.66);
    const resized = await sharp(SOURCE).resize(inner, inner).toBuffer();
    const fgDir = path.join(RES, `mipmap-${density}-v26`);
    await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
      .composite([{ input: resized, gravity: 'center' }])
      .png()
      .toFile(path.join(fgDir, 'ic_foreground.png'));
    console.log(`mipmap-${density}-v26: ic_foreground.png written (${inner}/${size})`);
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
