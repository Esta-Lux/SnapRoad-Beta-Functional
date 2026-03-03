module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        // Disable import.meta support in preset to handle it manually
        jsxImportSource: undefined,
      }],
    ],
    plugins: [
      // Handle ES modules and import.meta
      '@babel/plugin-transform-modules-commonjs',
      // Ensure proper module handling
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true,
      }],
    ],
    env: {
      production: {
        plugins: [
          'transform-remove-console',
        ],
      },
    },
  };
};
