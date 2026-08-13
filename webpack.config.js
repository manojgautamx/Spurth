const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  target: 'web',
  entry: path.resolve(__dirname, 'web/index.web.js'),
  output: {
    path: path.resolve(__dirname, 'web-build'),
    filename: 'bundle.js',
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
          exclude: /node_modules[\\/](?!(react-native-reanimated|react-native-vector-icons|react-native-linear-gradient|react-native|@react-native|react-navigation|@react-navigation|@gorhom|@react-native-community|@react-native-google-signin)[\\/])/,        use: {
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
      __DEV__: JSON.stringify(true),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  devServer: {
    port: 3000,
    static: path.resolve(__dirname, 'web-build'),
  },
};