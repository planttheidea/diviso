import { merge } from 'webpack-merge';
import path from 'path';
import { DEFAULT_CONFIG } from '../../../webpack.config.js';

export default merge(DEFAULT_CONFIG, {
  entry: {
    divisoCore: path.resolve('examples', 'index.tsx'),
  },
});
