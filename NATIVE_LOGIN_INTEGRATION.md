# Native Login Screen Integration

This document describes the native login/registration screen integration from `propertprofrontend` into `mobile-v1`.

## Overview

The native login screen has been successfully ported from the web application (`propertprofrontend`) to the mobile application (`mobile-v1`) with full React Native compatibility.

## Files Created/Modified

### New Files

1. **`app/_userbase/NativeLogin.tsx`**
   - React Native component for login and registration
   - Supports both login and register modes
   - Includes form validation
   - Handles legal document acceptance (Terms & Privacy Policy)
   - Mobile-optimized UI with proper keyboard handling

2. **`app/auth/login.tsx`**
   - Login screen route
   - Displays branding and NativeLogin component
   - Auto-redirects if user is already authenticated

3. **`app/auth/register.tsx`**
   - Registration screen route
   - Similar to login but with `initialMode="register"`
   - Handles post-registration flow (email verification)

4. **`app/auth/_layout.tsx`**
   - Layout for auth screens
   - Configures navigation stack for auth routes

### Modified Files

1. **`app/_userbase/middleware.ts`**
   - Added `register()` function for user registration
   - Mirrors web implementation with mobile adaptations

## Features

### Login Screen
- Email and password authentication
- Form validation with error display
- Loading states during authentication
- Auto-navigation on success
- Forgot password link (placeholder for future implementation)

### Registration Screen
- Username, email, and password fields
- Password confirmation
- Required legal document acceptance:
  - Terms & Conditions
  - Privacy Policy
- Optional marketing consent
- Email verification flow
- Form validation with backend error handling

### Mobile Optimizations
- KeyboardAvoidingView for iOS/Android compatibility
- ScrollView for smaller screens
- Touch-friendly checkbox controls
- Native Alert dialogs for feedback
- Platform-specific secure storage handling

## Usage

### Navigating to Login Screen

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate to login
router.push('/auth/login');

// Navigate to registration
router.push('/auth/register');
```

### Using NativeLogin Component Directly

```typescript
import { NativeLogin } from '@/app/_userbase/NativeLogin';

<NativeLogin
  onSuccess={() => {
    // Handle successful login/registration
    console.log('Auth successful!');
  }}
  onCancel={() => {
    // Handle cancel action
    console.log('Auth cancelled');
  }}
  initialMode="login" // or "register"
/>
```

### Authentication Flow

1. **Login Flow:**
   ```
   User enters credentials → Validate form → Call API
   → Store tokens → Update UserContext → Navigate to app
   ```

2. **Registration Flow:**
   ```
   User enters details → Validate form → Call API
   → Show success message → Switch to login mode
   → User verifies email (external) → User logs in
   ```

## Integration with UserContext

The login screen integrates seamlessly with the existing UserContext:

```typescript
const { login, user, isAuthenticated } = useUser();

// The login method stores tokens and updates user state
await login(accessToken, refreshToken, userData);
```

## API Integration

### Login Endpoint
- **Endpoint:** `POST /users/login`
- **Request:** `{ email, password }`
- **Response:** `{ access_token, refresh_token, user }`

### Register Endpoint
- **Endpoint:** `POST /users/register`
- **Request:**
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",
    "accepted_terms": boolean,
    "accepted_privacy_policy": boolean,
    "marketing_consent": boolean,
    "terms_accepted_at": "ISO timestamp"
  }
  ```
- **Response:** `{ message, email, email_sent }`

## Token Storage

- **Native Platforms (iOS/Android):**
  - Access token: AsyncStorage (`access_token`, `mobile_access_token`)
  - Refresh token: SecureStore (`refresh_token`)

- **Web Platform:**
  - Relies on HTTP-only cookies set by backend
  - Cookie names: `access_token`, `refresh_token`, `mobile_access_token`

## Validation Rules

### Email
- Required field
- Must match email regex pattern

### Password
- Required field
- Minimum 8 characters

### Username (Registration only)
- Required field
- Minimum 3 characters
- Converted to lowercase

### Legal Documents (Registration only)
- Terms & Conditions: **Required**
- Privacy Policy: **Required**
- Marketing Consent: Optional

## UI/UX Features

- Clean, modern design matching PropertPro branding
- Blue color scheme (#2563eb)
- Loading indicators during API calls
- Error messages with field-specific highlighting
- Success messages for registration
- Toggle between login/register modes
- Cancel button support
- Responsive layout for various screen sizes

## Next Steps

To use the login screen in your app:

1. **Add login button to profile screen:**
   ```typescript
   if (!user) {
     return <Button onPress={() => router.push('/auth/login')} />;
   }
   ```

2. **Protect authenticated routes:**
   ```typescript
   const { user, isLoading } = useUser();
   
   if (isLoading) return <LoadingScreen />;
   if (!user) return router.replace('/auth/login');
   ```

3. **Add forgot password screen:**
   - Create `/app/auth/forgot-password.tsx`
   - Implement password reset flow

4. **Add OAuth providers (optional):**
   - Google Sign-In
   - Apple Sign-In
   - Facebook Login

## Differences from Web Version

1. **UI Framework:**
   - Web: React with Tailwind CSS
   - Mobile: React Native with StyleSheet

2. **Navigation:**
   - Web: React Router
   - Mobile: Expo Router

3. **Storage:**
   - Web: Cookies
   - Mobile: AsyncStorage + SecureStore

4. **Feedback:**
   - Web: react-hot-toast
   - Mobile: Alert API

5. **Links:**
   - Terms & Privacy links are styled but not yet functional
   - Consider adding WebView or external browser for legal docs

## Testing Checklist

- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Register new account
- [ ] Form validation (empty fields, invalid email, short password)
- [ ] Password mismatch in registration
- [ ] Legal document acceptance requirement
- [ ] Toggle between login and register modes
- [ ] Cancel button functionality
- [ ] Auto-redirect when already authenticated
- [ ] Token storage and retrieval
- [ ] Backend error handling
- [ ] Loading states
- [ ] Keyboard behavior on iOS/Android
- [ ] ScrollView behavior with keyboard

## Troubleshooting

### Common Issues

1. **"Cannot read property 'login' of undefined"**
   - Ensure UserProvider wraps your app in `_layout.tsx`

2. **Tokens not persisting**
   - Check AsyncStorage permissions
   - Verify SecureStore is available (requires Expo)

3. **Navigation not working**
   - Ensure Expo Router is properly configured
   - Check that routes exist in file structure

4. **Backend errors**
   - Verify API_BASE_URL in `config/api.ts`
   - Check network connectivity
   - Review backend logs for endpoint issues

## Credits

Adapted from `propertprofrontend/src/components/NativeLogin.tsx` with mobile-first optimizations for React Native.

