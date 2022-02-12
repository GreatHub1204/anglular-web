const path = require('path');
const baseConfig = require('./webpack.electron.config');

module.exports = {
  ...baseConfig,
  mode: 'production',
  output: {
    path: path.join(process.cwd(), 'dist'),
    filename: 'index.js'
  }
};