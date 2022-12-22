import ESLintWebpackPlugin from 'eslint-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';

export const ROOT = fileURLToPath(new URL('.', import.meta.url));

function getAliasLocation(packageName) {
  return path.resolve(ROOT, 'packages', packageName, 'index.ts');
}

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
        include: [path.resolve(ROOT, 'packages'), /examples/],
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
      diviso: getAliasLocation('diviso'),
      'diviso-react': getAliasLocation('diviso-react'),
      'diviso-shared': getAliasLocation('diviso-shared'),
    },
    extensions: ['.tsx', '.ts', '.js'],
  },
};
