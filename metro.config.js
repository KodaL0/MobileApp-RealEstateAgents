// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Prefer compiled entrypoints (build/) over raw TS sources in node_modules
config.resolver.resolverMainFields = ['react-native', 'main'];

// Add resolver configuration to handle web-only modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Exclude leaflet modules from mobile builds
config.resolver.blockList = [
  /node_modules\/leaflet\/.*/,
  /node_modules\/react-leaflet\/.*/,
];

// Add web-specific configuration
if (process.env.EXPO_PLATFORM === 'web') {
  // Remove the blockList for web builds
  config.resolver.blockList = [];
}

// Configure transformer for web
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

// Configure server settings for proper MIME types
config.server = {
  port: 8081,
};

// Ensure resolver finds all file types
config.resolver.assetExts.push('svg');

// Custom resolver for platform-specific modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If it's web platform and trying to resolve react-native-maps, return web stub
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: require.resolve('./web-stubs/react-native-maps-web.js'),
      type: 'sourceFile',
    };
  }
  
  // Block native-only modules on web
  if (
    platform === 'web' &&
    moduleName.includes('react-native/Libraries/Utilities/codegenNativeCommands')
  ) {
    return {
      filePath: require.resolve('./web-stubs/empty-module.js'),
      type: 'sourceFile',
    };
  }
  
  // Let Metro handle all other modules normally
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
