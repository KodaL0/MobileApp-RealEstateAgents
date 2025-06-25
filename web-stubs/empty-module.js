// Empty module stub for native-only modules
// This prevents import errors for modules that don't exist on web

// Export an empty object as default
export default {};

// Export empty functions for common native module patterns
export const codegenNativeCommands = () => {};
export const codegenNativeComponent = () => {};
export const codegenNativeComponentTurboModule = () => {};

// Also export as CommonJS for compatibility
module.exports = {};
module.exports.codegenNativeCommands = codegenNativeCommands;
module.exports.codegenNativeComponent = codegenNativeComponent;
module.exports.codegenNativeComponentTurboModule = codegenNativeComponentTurboModule; 