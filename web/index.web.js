import 'react-native-reanimated';
import './fonts';
import { AppRegistry, Alert } from 'react-native';
import App from '../App';
import { name as appName } from '../app.json';

// react-native-web's Alert.alert() is a no-op — without this, every error
// message in the app (failed login, failed signup, etc.) is silently dropped.
Alert.alert = (title, message) => {
  window.alert([title, message].filter(Boolean).join('\n\n'));
};

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});