// `server-only` hádže mimo Next.js – v skriptoch ho nahradíme prázdnym modulom.
const Module = require('node:module');
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'server-only') return require.resolve('./noop.cjs');
  return orig.call(this, request, ...rest);
};
