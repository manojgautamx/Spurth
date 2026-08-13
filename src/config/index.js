// src/config/index.js
import { Platform } from 'react-native';

// Android emulator can't reach the host machine via `localhost` — it needs the
// special 10.0.2.2 alias. Web and iOS simulator both run on the same machine
// as the backend, so `localhost` works directly for them.
const DEV_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const BASE_URL = __DEV__ ? DEV_BASE_URL : "https://api.spurth.com";