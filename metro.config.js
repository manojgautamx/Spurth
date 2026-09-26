const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withSentryConfig} = require('@sentry/react-native/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
    resetCache: true
};

// withSentryConfig stamps each bundle with a debug id, which is how an
// uploaded source map is matched to the bundle a crash came from.
module.exports = withSentryConfig(mergeConfig(getDefaultConfig(__dirname), config));

