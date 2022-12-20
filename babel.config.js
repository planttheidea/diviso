export default function getConfig(targets) {
  return {
    babelrc: false,
    ignore: ['./node_modules'],
    presets: [
      [
        '@babel/preset-env',
        {
          loose: true,
          modules: false,
          targets,
        },
      ],
    ],
    plugins: [
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      ['@babel/plugin-transform-typescript', { isTSX: true }],
    ],
  };
}
