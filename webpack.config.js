const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    target: 'web',
    entry: path.resolve(__dirname, 'web/index.web.js'),
    output: {
      path: path.resolve(__dirname, 'web-build'),
      filename: 'bundle.js',
      // Without this, index.html references "bundle.js" as a relative path
      // — fine from the site root, but the same HTML also gets served (via
      // the SPA 404 fallback) for deep-link paths like /profile/42, where a
      // relative path resolves to /profile/bundle.js and 404s silently
      // (blank page, no console output, since the script never loads).
      publicPath: '/',
    },
    resolve: {
      extensions: ['.web.js', '.js', '.jsx'],
      mainFields: ['browser', 'main', 'module'],
      exportsFields: [],
      alias: {
        'react-native$': 'react-native-web',
        'react-native-image-picker': path.resolve(__dirname, 'src/shims/imagePicker.web.js'),
        'react-native-linear-gradient': path.resolve(__dirname, 'src/shims/linearGradient.web.js'),
        'react-native-webview': path.resolve(__dirname, 'src/shims/webview.web.js'),
        'react-native-modal-datetime-picker': path.resolve(__dirname, 'src/shims/dateTimePicker.web.js'),
        '@react-native-google-signin/google-signin': path.resolve(__dirname, 'src/shims/googleSignin.web.js'),
      },
      fallback: {
        crypto: false,
        stream: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.(js|jsx)$/,
          type: 'javascript/auto',
          exclude: /node_modules[\\/](?!(react-native-reanimated|react-native-vector-icons|react-native-linear-gradient|react-native|@react-native|react-navigation|@react-navigation|@gorhom|@react-native-community|@react-native-google-signin)[\\/])/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { modules: 'commonjs' }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-flow',
              ],
            },
          },
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/,
          type: 'asset/resource',
        },
        {
          test: /\.(ttf|otf|woff|woff2)$/,
          type: 'asset/resource',
          generator: { filename: 'fonts/[name][ext]' },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'web/index.html'),
      }),
      new webpack.DefinePlugin({
        // Was hardcoded to `true` regardless of --mode, which made
        // production builds resolve BASE_URL (src/config/index.js) to
        // localhost instead of the real API — every hosted request would
        // have silently gone nowhere.
        __DEV__: JSON.stringify(!isProduction),
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
    ],
    devServer: {
      port: 3000,
      static: path.resolve(__dirname, 'web-build'),
      // Mirrors the 404->index.html fallback added for the GitHub Pages
      // deploy — without it, hitting a deep link path (e.g. /profile/42)
      // directly against the dev server 404s instead of booting the SPA.
      historyApiFallback: true,
      // Non-blocking warnings (e.g. @react-native-firebase/auth's harmless
      // missing-export warning on web) shouldn't cover the whole app with a
      // full-screen overlay that intercepts clicks — only real errors should.
      client: {
        overlay: { warnings: false, errors: true },
      },
    },
  };
};
