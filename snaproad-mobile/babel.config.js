// Replace import.meta so Metro web bundle works when loaded as non-module script (avoids "Cannot use 'import.meta' outside a module")
function replaceImportMeta() {
  const t = require('@babel/core').types;
  return {
    name: 'transform-import-meta',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWith(t.objectExpression([
            t.objectProperty(t.identifier('url'), t.stringLiteral('')),
            t.objectProperty(t.identifier('resolve'), t.arrowFunctionExpression([t.stringLiteral('')], t.stringLiteral(''))),
          ]));
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: undefined }],
    ],
    plugins: [
      replaceImportMeta,
      '@babel/plugin-transform-modules-commonjs',
      ['@babel/plugin-transform-runtime', { helpers: true, regenerator: true }],
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
