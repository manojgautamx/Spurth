import 'react-native-reanimated';
import './fonts';
import { AppRegistry } from 'react-native';
import App from '../App';
import { name as appName } from '../app.json';

// Alert.alert is overridden once in App.js (shared by both this web entry
// and index.js's native entry) to render AppAlertModal instead of the
// platform's native alert/confirm dialog — nothing web-specific needed here.

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});