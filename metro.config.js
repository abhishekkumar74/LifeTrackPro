const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const tslibEs6Path = path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js');
const pdfLibDistPath = path.resolve(__dirname, 'node_modules/pdf-lib/dist/pdf-lib.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return {
      filePath: tslibEs6Path,
      type: 'sourceFile',
    };
  }
  if (moduleName === 'pdf-lib') {
    return {
      filePath: pdfLibDistPath,
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
