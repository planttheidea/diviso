import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import esbuild from 'rollup-plugin-esbuild';
import path from 'path';
import tsc from 'typescript';
import createBabelConfig from './babel.config.js';

const extensions = ['.js', '.ts', '.tsx'];
const parsed = path.parse(process.cwd());
const systemRoot = parsed.root;

function globals(id) {
  if (id.startsWith('diviso/')) {
    const [, file] = id.split('/');

    return `diviso${file[0].toUpperCase()}${file.slice(1)}`;
  }

  switch (id) {
    case 'react':
      return 'React';

    case 'redux-thunk':
      return 'reduxThunk';

    case 'use-sync-external-store/shim/with-selector':
      return 'useSyncExternalStoreWithSelector';
  }
}

function external(id) {
  return !id.startsWith('.') && !id.startsWith(systemRoot);
}

function getBabelOptions(targets) {
  return {
    ...createBabelConfig(targets),
    babelHelpers: 'bundled',
    comments: false,
    extensions,
  };
}

function getEsBuild(location, target, env = 'development') {
  return esbuild({
    minify: env === 'production',
    target,
    tsconfig: `tsconfig/${location}.tsconfig.json`,
  });
}

function getCommonPlugins() {
  return [
    nodeResolve({ extensions }),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
  ];
}

function getTerser(env = 'development') {
  if (env === 'production') {
    return terser({
      compress: {
        passes: 3,
      },
    });
  }

  return terser({
    compress: false,
    mangle: false,
    output: {
      beautify: true,
    },
  });
}

function createCommonJsConfig(location) {
  return {
    input: `src/${location}.ts`,
    output: {
      file: `dist/${location}.js`,
      format: 'cjs',
    },
    external,
    plugins: [...getCommonPlugins(), babel(getBabelOptions({ ie: 11 }))],
  };
}

function createDeclarationConfig(location) {
  return {
    input: `src/${location}.ts`,
    output: {
      dir: 'dist',
    },
    external,
    plugins: [
      typescript({
        tsconfig: 'tsconfig/declaration.tsconfig.json',
        typescript: tsc,
      }),
    ],
  };
}

function createEsmConfig(location, fileExtension = 'js') {
  return {
    input: `src/${location}.ts`,
    output: {
      file: `dist/esm/${location}.${fileExtension}`,
      format: 'esm',
    },
    external,
    plugins: [...getCommonPlugins(), getEsBuild(location, 'node12')],
  };
}

function createSystemConfig(location, env) {
  return {
    input: `src/${location}.ts`,
    output: {
      file: `dist/system/${location}.${env}.js`,
      format: 'system',
    },
    external,
    plugins: [
      ...getCommonPlugins(),
      getEsBuild(location, 'node12', env),
      getTerser(env),
    ],
  };
}

function createUmdConfig(location, env) {
  return {
    input: `src/${location}.ts`,
    output: {
      file: `dist/umd/${location}.${env}.js`,
      format: 'umd',
      globals,
      name:
        location === 'core'
          ? 'diviso'
          : `diviso${location[0].toUpperCase()}${location.slice(1)}`,
    },
    external,
    plugins: [
      ...getCommonPlugins(),
      babel(getBabelOptions({ ie: 11 })),
      getTerser(env),
    ],
  };
}

export default function build(args) {
  const configName = Object.keys(args).find((key) => key.startsWith('config-'));
  const location = configName.slice('config-'.length).replace(/_/g, '/');

  const configs = [
    createCommonJsConfig(location),
    createEsmConfig(location),
    createEsmConfig(location, 'mjs'),
    createUmdConfig(location, 'development'),
    createUmdConfig(location, 'production'),
    createSystemConfig(location, 'development'),
    createSystemConfig(location, 'production'),
  ];

  if (location === 'core') {
    configs.unshift(createDeclarationConfig(location));
  }

  return configs;
}

// const EXTERNALS = [
//   ...Object.keys(pkg.dependencies || {}),
//   ...Object.keys(pkg.peerDependencies || {}),
// ];

// const extensions = ['.js', '.ts', '.tsx'];

// const DEFAULT_OUTPUT = {
//   exports: 'named',
//   name: pkg.name,
//   sourcemap: true,
// };

// const DEFAULT_CONFIG = {
//   external,
//   input: 'src/index.ts',
//   output: [
//     { ...DEFAULT_OUTPUT, file: pkg.browser, format: 'umd' },
//     { ...DEFAULT_OUTPUT, file: pkg.main, format: 'cjs' },
//     { ...DEFAULT_OUTPUT, file: pkg.module, format: 'es' },
//   ],
//   plugins: [
//     resolve({
//       extensions,
//       mainFields: ['module', 'jsnext:main', 'main'],
//     }),
//     babel({
//       babelHelpers: 'bundled',
//       exclude: 'node_modules/**',
//       extensions,
//       include: ['src/*'],
//     }),
//   ],
// };

// export default [
//   DEFAULT_CONFIG,
//   {
//     ...DEFAULT_CONFIG,
//     output: {
//       ...DEFAULT_OUTPUT,
//       file: pkg.browser.replace('.js', '.min.js'),
//       format: 'umd',
//     },
//     plugins: [
//       ...DEFAULT_CONFIG.plugins,
//       terser({
//         compress: {
//           passes: 3,
//         },
//       }),
//     ],
//   },
// ];
