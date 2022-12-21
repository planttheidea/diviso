import ESLintWebpackPlugin from 'eslint-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';

export const ROOT = fileURLToPath(new URL('.', import.meta.url));

export const DEFAULT_CONFIG = {
  devtool: 'source-map',

  mode: 'development',

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        include: [path.resolve(ROOT, 'src'), /examples/],
        loader: 'ts-loader',
        options: {
          reportFiles: ['src/*.{ts|tsx}'],
        },
        test: /\.tsx?$/,
      },
    ],
  },

  output: {
    filename: '[name].js',
    library: {
      name: '[name]',
      type: 'umd',
      umdNamedDefine: true,
    },
  },

  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new HtmlWebpackPlugin(),
    new ESLintWebpackPlugin(),
  ],

  resolve: {
    alias: {
      'diviso/core': path.resolve(ROOT, 'src', 'core.ts'),
      'diviso/react': path.resolve(ROOT, 'src', 'react.ts'),
      'diviso/shared': path.resolve(ROOT, 'src', 'shared.ts'),
    },
    extensions: ['.tsx', '.ts', '.js'],
  },
};
