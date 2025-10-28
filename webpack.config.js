const path = require('path');
const UnusedFilesPlugin = require('./scripts/webpack-unused-plugin.js');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'src/index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
    ],
  },
  plugins: [
    new UnusedFilesPlugin({
      root: __dirname,
      include: ['src/**/*'],
      exclude: [],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      verbose: true,
      checkTypeReferences: true,
      treatTypeOnlyAsUnused: true,
      strictRuntimeUsage: true,
      tsconfigPath: 'tsconfig.json',
      writeDisk: true,
      name: 'unused-files.json',
    }),
  ],
};
