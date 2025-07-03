import { Platform } from 'react-native';

/**
 * OAuth Configuration for PropertPro Mobile App
 * 
 * This file centralizes OAuth settings to make it easier to manage
 * redirect URIs and client configurations across different environments.
 * 
 * IMPORTANT: Ensure these redirect URIs are whitelisted in Google OAuth Console:
 * - http://localhost:8081 (for web development)
 * - https://auth.expo.io/@dalmiraskon/propertpro-mobile (for mobile devices)
 * 
 * Mobile uses Expo's AuthSession proxy for reliable OAuth flow on real devices.
 */

// Get the appropriate redirect URI for the current platform
export const getRedirectUri = (): string => {
  return Platform.OS === 'web'
    ? 'http://localhost:8081'
    : 'https://auth.expo.io/@dalmiraskon/propertpro-mobile';
};

export const OAUTH_CONFIG = {
  // Google OAuth Client ID
  CLIENT_ID: '447376864792-hle5fodoponi9c8do50ppn639f6fhbso.apps.googleusercontent.com',
  
  // Redirect URIs - localhost for all platforms
  REDIRECT_URI: getRedirectUri(),
  
  // OAuth scopes
  SCOPES: ['openid', 'profile', 'email'],
  
  // OAuth response type
  RESPONSE_TYPE: 'id_token',
  
  // OAuth response mode
  RESPONSE_MODE: 'fragment',
  
  // OAuth prompt
  PROMPT: 'select_account',
  
  // Backend endpoint for token exchange
  TOKEN_EXCHANGE_ENDPOINT: 'users/accounts/google/login/mobile/',
} as const;

/**
 * Generate OAuth URL with the current configuration
 */
export const generateOAuthUrl = (nonce: string, state: string): string => {
  console.log('=== GENERATING OAUTH URL ===');
  console.log('generateOAuthUrl: nonce:', nonce);
  console.log('generateOAuthUrl: state:', state);
  console.log('generateOAuthUrl: redirect URI:', OAUTH_CONFIG.REDIRECT_URI);
  
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.CLIENT_ID,
    redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
    response_type: OAUTH_CONFIG.RESPONSE_TYPE,
    scope: OAUTH_CONFIG.SCOPES.join(' '),
    response_mode: OAUTH_CONFIG.RESPONSE_MODE,
    prompt: OAUTH_CONFIG.PROMPT,
    nonce,
    state,
  });
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log('generateOAuthUrl: generated URL:', authUrl);
  console.log('============================');
  
  return authUrl;
};

/**
 * Log OAuth configuration for debugging
 */
export const logOAuthConfig = () => {
  console.log('=== OAUTH CONFIGURATION ===');
  console.log('Platform:', Platform.OS);
  console.log('Redirect URI Strategy: localhost for web, Expo proxy for mobile');
  console.log('Client ID:', OAUTH_CONFIG.CLIENT_ID);
  console.log('Redirect URI:', OAUTH_CONFIG.REDIRECT_URI);
  console.log('URI Scheme: HTTP (localhost)');
  console.log('Scopes:', OAUTH_CONFIG.SCOPES);
  console.log('Response Type:', OAUTH_CONFIG.RESPONSE_TYPE);
  console.log('Response Mode:', OAUTH_CONFIG.RESPONSE_MODE);
  console.log('Prompt:', OAUTH_CONFIG.PROMPT);
  console.log('Token Exchange Endpoint:', OAUTH_CONFIG.TOKEN_EXCHANGE_ENDPOINT);
  console.log('==========================');
}; 