// Web fallback for react-native-image-picker.
// Supports both call styles the native library offers: callback-based
// (launchImageLibrary(options, cb)) and promise-based (await launchImageLibrary(options)).

function acceptFor(mediaType) {
  if (mediaType === 'video') return 'video/*';
  if (mediaType === 'mixed') return 'image/*,video/*';
  return 'image/*'; // 'photo' (default)
}

// react-native-image-picker returns `duration` (seconds) on native video
// assets; a raw browser File has no such metadata, so probe it via an
// offscreen <video> element before resolving — validateVideoAsset relies on
// this being present on both platforms.
function probeVideoDuration(uri) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve(video.duration || null);
    video.onerror = () => resolve(null);
    video.src = uri;
  });
}

// Same idea for `width`/`height`, which native returns directly on the
// asset — used to pick the nearest standard crop ratio.
function probeImageSize(uri) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: null, height: null });
    img.src = uri;
  });
}

function readFileAsAsset(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const isVideo = file.type.startsWith('video/');
      const asset = {
        uri: reader.result,
        file, // real File — needed to build a proper multipart upload on web
        fileName: file.name,
        type: file.type,
        fileSize: file.size,
      };
      if (isVideo) {
        asset.duration = await probeVideoDuration(reader.result);
      } else {
        const { width, height } = await probeImageSize(reader.result);
        asset.width = width;
        asset.height = height;
      }
      resolve(asset);
    };
    reader.readAsDataURL(file);
  });
}

const pickFile = (options = {}) => new Promise((resolve) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = acceptFor(options.mediaType);
  // Multi-select only when the caller actually wants it (post composer's
  // photo picker) — every other call site (avatar, activity cover, video)
  // omits selectionLimit and keeps today's single-file behavior exactly.
  const limit = options.selectionLimit || 1;
  input.multiple = limit > 1;
  input.onchange = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, limit);
    if (files.length === 0) {
      resolve({ didCancel: true });
      return;
    }
    const assets = await Promise.all(files.map(readFileAsAsset));
    resolve({ assets });
  };
  input.click();
});

export const launchImageLibrary = (options, callback) => {
  const result = pickFile(options);
  if (callback) {
    result.then(callback);
    return;
  }
  return result;
};

export const launchCamera = launchImageLibrary; // fallback to file picker on web
