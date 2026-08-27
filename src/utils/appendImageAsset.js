import { Platform } from 'react-native';

// Appends an image-picker asset ({ uri, fileName, type, file? }) to a FormData
// instance. Native RN's fetch bridge understands a plain {uri,name,type}
// object and turns it into a multipart file part; a browser's FormData does
// not — appending a plain object there just stringifies it to "[object
// Object]" as a text field. On web the picker shim attaches the real `File`
// object, which is what actually needs to go into FormData there.
export function appendImageAsset(formData, key, asset, fallbackName = 'photo.jpg', defaultType = 'image/jpeg') {
  if (!asset) return;

  if (Platform.OS === 'web') {
    if (asset.file) {
      formData.append(key, asset.file, asset.fileName || fallbackName);
    }
    return;
  }

  const uri = Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri;
  formData.append(key, {
    uri,
    name: asset.fileName || uri.split('/').pop() || fallbackName,
    type: asset.type || defaultType,
  });
}

// Same as appendImageAsset, just with video-appropriate defaults — the
// function itself is format-agnostic (only reads .uri/.file/.fileName/.type).
export function appendVideoAsset(formData, key, asset, fallbackName = 'video.mp4') {
  appendImageAsset(formData, key, asset, fallbackName, 'video/mp4');
}
