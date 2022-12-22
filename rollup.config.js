import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import esbuild from 'rollup-plugin-esbuild';
import path from 'path';
import tsc from 'typescript';
import createBabelConfig from './babel.config.js';

const originPath = process.cwd();
const basePath = originPath.split('/packages/')[0];

const extensions = ['.js', '.ts', '.tsx'];
const parsed = path.parse(basePath);
const systemRoot = parsed.root;

function globals(id) {
  if (id.includes('diviso') && id.includes('-')) {
    const [, file] = id.split('-');

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

function getEsBuild(packageName, target, env = 'development') {
  return esbuild({
    minify: env === 'production',
    target,
    tsconfig: path.resolve(originPath, `tsconfig.json`),
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

function createCommonJsConfig() {
  return {
    input: path.resolve(originPath, `index.ts`),
    output: {
      file: path.resolve(originPath, `dist/index.js`),
      format: 'cjs',
    },
    external,
    plugins: [...getCommonPlugins(), babel(getBabelOptions({ ie: 11 }))],
  };
}

function createDeclarationConfig() {
  return {
    input: path.resolve(originPath, `index.ts`),
    output: {
      dir: path.resolve(originPath, `dist`),
    },
    external,
    plugins: [
      typescript({
        tsconfig: path.resolve(originPath, 'tsconfig.declaration.json'),
        typescript: tsc,
      }),
    ],
  };
}

function createEsmConfig(packageName, fileExtension = 'js') {
  return {
    input: path.resolve(originPath, `index.ts`),
    output: {
      file: path.resolve(originPath, `dist/esm/index.${fileExtension}`),
      format: 'esm',
    },
    external,
    plugins: [...getCommonPlugins(), getEsBuild(packageName, 'node12')],
  };
}

function createSystemConfig(packageName, env) {
  return {
    input: path.resolve(originPath, `index.ts`),
    output: {
      file: path.resolve(originPath, `dist/system/${packageName}.${env}.js`),
      format: 'system',
    },
    external,
    plugins: [
      ...getCommonPlugins(),
      getEsBuild(packageName, 'node12', env),
      getTerser(env),
    ],
  };
}

function createUmdConfig(packageName, env) {
  return {
    input: path.resolve(originPath, `index.ts`),
    output: {
      file: path.resolve(originPath, `dist/umd/${packageName}.${env}.js`),
      format: 'umd',
      globals,
      name:
        packageName === 'diviso'
          ? packageName
          : `diviso${packageName[0].toUpperCase()}${packageName.slice(1)}`,
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
  const packageToBuild = Object.keys(args).find((key) =>
    key.startsWith('config-')
  );
  const packageName = packageToBuild.slice('config-'.length).replace(/_/g, '/');

  const configs = [
    createDeclarationConfig(packageName),
    createCommonJsConfig(packageName),
    createEsmConfig(packageName),
    createEsmConfig(packageName, 'mjs'),
    createUmdConfig(packageName, 'development'),
    createUmdConfig(packageName, 'production'),
    createSystemConfig(packageName, 'development'),
    createSystemConfig(packageName, 'production'),
  ];

  return configs;
}
