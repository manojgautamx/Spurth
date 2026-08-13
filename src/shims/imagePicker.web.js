// Web fallback for react-native-image-picker.
// Supports both call styles the native library offers: callback-based
// (launchImageLibrary(options, cb)) and promise-based (await launchImageLibrary(options)).
const pickFile = () => new Promise((resolve) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      resolve({ didCancel: true });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        assets: [{
          uri: reader.result,
          file, // real File — needed to build a proper multipart upload on web
          fileName: file.name,
          type: file.type,
          fileSize: file.size,
        }],
      });
    };
    reader.readAsDataURL(file);
  };
  input.click();
});

export const launchImageLibrary = (options, callback) => {
  const result = pickFile();
  if (callback) {
    result.then(callback);
    return;
  }
  return result;
};

export const launchCamera = launchImageLibrary; // fallback to file picker on web
