/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

// Must be registered here, before AppRegistry mounts anything — a handler
// attached inside a component only exists while that component is alive,
// but a background/quit-state push has to be handled with no screen
// mounted at all. This only decides whether the message is acknowledged;
// showing it as a system notification is handled by the OS itself once FCM
// hands the message off, so there's nothing further to do in the body.
messaging().setBackgroundMessageHandler(async () => {});

AppRegistry.registerComponent(appName, () => App);
