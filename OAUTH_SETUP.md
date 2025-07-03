# Google OAuth Console Setup

## Required Redirect URI

For development with both web and mobile, you only need to add one redirect URI to your Google OAuth Console:

### Development (Web and Mobile)
```
http://localhost:8081
```
This handles OAuth redirects for both:
- Web development (automatic redirect)
- Mobile development (manual step required)

## How to Add Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Find your OAuth 2.0 Client ID: `447376864792-hle5fodoponi9c8do50ppn639f6fhbso.apps.googleusercontent.com`
4. Click "Edit" 
5. Under "Authorized redirect URIs", add:
   - `http://localhost:8081`
6. Click "Save"

## Platform Behavior

### Web Platform
- Uses `http://localhost:8081` with automatic redirect
- User stays on localhost throughout the flow

### Mobile Platform (iPhone via QR code)
- Opens Google OAuth in Safari browser
- After Google sign-in, user must manually open `localhost:8081` in Safari
- The app automatically detects the OAuth callback and logs the user in
- This avoids Safari's restriction on redirecting outside localhost

## Testing

### Web Testing
1. Open `http://localhost:8081` in your browser
2. Click "Continue with Google"
3. Complete OAuth flow - automatic redirect back to app

### Mobile Testing
1. Scan QR code with Expo Go on your iPhone
2. Click "Continue with Google" 
3. Complete OAuth flow in Safari
4. **Important**: Manually type `localhost:8081` in Safari address bar
5. App will automatically log you in

## Mobile OAuth Flow Steps

The mobile OAuth flow requires an extra manual step due to Safari's security restrictions:

1. **User taps "Continue with Google"** → Opens Safari with Google OAuth
2. **User completes Google sign-in** → Google redirects to localhost:8081 
3. **Safari shows "can't connect to server"** → Expected behavior (Safari can't redirect outside localhost)
4. **User manually opens localhost:8081 in Safari** → App detects OAuth tokens and logs user in
5. **User returns to Expo app** → Now logged in

## Benefits

- ✅ **Single redirect URI** - Only need to whitelist localhost
- ✅ **No external redirects** - Works within Safari's security restrictions  
- ✅ **Web works seamlessly** - Automatic redirect for web
- ✅ **Mobile works with extra step** - Manual localhost visit required

## Troubleshooting

If you get "redirect_uri_mismatch" errors:

1. Ensure `http://localhost:8081` is added to Google OAuth Console
2. Check the console logs to verify the redirect URI being used
3. Make sure your Expo development server is running on port 8081
4. For mobile: After OAuth, manually type `localhost:8081` in Safari
5. Wait a few minutes after adding the URI to Google Console for changes to propagate 