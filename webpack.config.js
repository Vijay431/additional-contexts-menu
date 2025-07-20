const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

/** @type {import('webpack').Configuration} */
const config = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    target: 'node',
    mode: isProduction ? 'production' : 'development',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    devtool: isProduction ? 'hidden-source-map' : 'source-map',
    externals: {
      vscode: 'commonjs vscode',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: [/node_modules/, /\.test\.ts$/, /src\/test/],
          use: [
            {
              loader: 'ts-loader',
              options: {
                compilerOptions: {
                  module: 'es6',
                },
              },
            },
          ],
        },
      ],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            ecma: 2022,
            compress: isProduction,
            mangle: isProduction,
          },
        }),
      ],
    },
  };
};

module.exports = config;
