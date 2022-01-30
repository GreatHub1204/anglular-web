const path = require('path');
const baseConfig = require('./webpack.electron.config');

module.exports = {
  ...baseConfig,
  mode: 'development',
  devtool: 'source-map',
  output: {
    path: path.join(process.cwd(), 'dist'),
    // avoid conflicts with the `main.js` file generated from the Angular CLI
    filename: 'shell.js'
  }
};