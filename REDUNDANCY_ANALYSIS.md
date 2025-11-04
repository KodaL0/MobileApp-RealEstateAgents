# Redundancy Analysis - Mobile App Codebase

## Executive Summary
This document identifies redundant code patterns across the mobile app that can be consolidated to improve maintainability and reduce bugs.

---

## 1. OAuth Handling Code (CRITICAL - High Priority)

### Issue
OAuth callback handling logic is duplicated in **3 locations** with nearly identical code:

1. **`app/_layout.tsx`** (lines 80-128)
2. **`app/_userbase/GlobalOAuthHandler.tsx`** (lines 12-59) 
3. **`app/(tabs)/profile.tsx`** (lines 84-131)

### Duplicated Logic
- Checking for `auth_success` and `authError` query parameters
- `cleanQueryParams()` function
- `completeLoginFromCookies()` / `completeLogin()` function
- Checking for OAuth params (`code` or `state`)
- Redirecting to backend callback URL
- Error handling and alerts

### Impact
- **~150 lines** of duplicated code
- High maintenance burden - changes must be made in 3 places
- Risk of inconsistencies between implementations
- Bugs may appear in one location but not others

### Recommendation
**Consolidate into `GlobalOAuthHandler.tsx`** and remove from other locations. The component should handle all OAuth flows globally.

---

## 2. Email/Password Login Logic (HIGH Priority)

### Issue
Login functionality is implemented in **2 locations**:

1. **`app/_userbase/NativeLogin.tsx`** - Full featured component (lines 111-176)
2. **`app/(tabs)/profile.tsx`** - Simplified handler (lines 158-181)

### Duplicated Logic
- Email/password validation
- API call to `api.auth.login()`
- Token extraction and storage
- User state update
- Error handling
- Navigation after success

### Impact
- **~25 lines** of duplicated code
- Inconsistent error handling between implementations
- Profile screen login doesn't handle web platform cookies properly

### Recommendation
**Remove login logic from `profile.tsx`** and redirect to `/auth/login` or use `NativeLogin` component.

---

## 3. Registration Logic (HIGH Priority)

### Issue
Registration functionality is duplicated:

1. **`app/_userbase/NativeLogin.tsx`** - Full featured component (lines 177-218)
2. **`app/(tabs)/profile.tsx`** - Simplified handler (lines 183-272)

### Duplicated Logic
- Form validation (username, email, password, confirm password)
- Terms/privacy acceptance checking
- API call to `api.auth.register()`
- Error handling
- Success/error messages

### Impact
- **~90 lines** of duplicated code
- Validation rules may diverge over time
- Profile screen registration doesn't match the full registration flow

### Recommendation
**Remove registration logic from `profile.tsx`** and redirect to `/auth/register` or use `NativeLogin` component.

---

## 4. User Redirect Logic (MEDIUM Priority)

### Issue
Similar user authentication redirect patterns appear in multiple files:

1. **`app/auth/login.tsx`** (lines 12-16)
2. **`app/auth/register.tsx`** (lines 12-16)
3. **`app/_layout.tsx`** (line 196)
4. **`app/(tabs)/profile.tsx`** (line 357)
5. **`app/saved-properties.tsx`** (lines 53, 133)
6. **`app/EditProfileScreen.tsx`** (line 27)
7. **`app/(tabs)/chat/index.tsx`** (line 32)
8. **`app/(tabs)/chat/[threadId].tsx`** (lines 76, 102)

### Pattern
```typescript
React.useEffect(() => {
  if (user) {
    router.replace('/(tabs)');
  }
}, [user]);
```

or

```typescript
if (!user) {
  router.replace('/auth/login');
  return null;
}
```

### Impact
- **~8 instances** of similar redirect logic
- Inconsistent redirect destinations
- No centralized authentication guard

### Recommendation
Create a **`useRequireAuth` hook** or **`<RequireAuth>` component** similar to the web frontend's `RequireAuth.tsx`.

---

## 5. OAuth Token Exchange (MEDIUM Priority)

### Issue
OAuth token exchange logic appears in **2 locations**:

1. **`app/_layout.tsx`** - `handleTokenExchange` (lines 68-78) - Uses `id_token`
2. **`app/(tabs)/profile.tsx`** - `handleAuthCodeExchange` (lines 52-70) - Uses `code`

### Difference
- `_layout.tsx` uses ID token flow (mobile-native)
- `profile.tsx` uses authorization code flow (web)

### Impact
- Two different OAuth flows maintained separately
- Potential confusion about which flow to use when

### Recommendation
Consolidate OAuth flows in `GlobalOAuthHandler.tsx` with platform detection.

---

## 6. Google Login Button Handler (MEDIUM Priority)

### Issue
Google login initiation is duplicated:

1. **`app/_layout.tsx`** - `handleGoogleLogin` (lines 149-161)
2. **`app/(tabs)/profile.tsx`** - `handleGoogleLogin` (lines 274-287)

### Duplicated Logic
- Platform detection (web vs native)
- Building login URL for web
- Calling `promptAsync()` for native
- Error handling

### Impact
- **~15 lines** of duplicated code
- Inconsistent error messages

### Recommendation
Move to a shared hook like `useGoogleLogin()` or consolidate in `GlobalOAuthHandler.tsx`.

---

## 7. Styling Duplication (LOW Priority)

### Issue
Similar logo/header styling appears in:

1. **`app/auth/login.tsx`** (lines 49-79)
2. **`app/auth/register.tsx`** (lines 50-80)

### Duplicated Styles
- `container`, `header`, `logoContainer`, `logoIcon`, `logoText`, `tagline`

### Impact
- **~30 lines** of duplicated styles
- Visual inconsistencies if one is updated without the other

### Recommendation
Extract to a shared `AuthLayout` component or style constants file.

---

## 8. Deep Link Handling (LOW Priority)

### Issue
Deep link handling for OAuth appears in **2 locations**:

1. **`app/_layout.tsx`** (lines 130-139)
2. **`app/(tabs)/profile.tsx`** (lines 133-156)

### Impact
- Potential conflicts if both handlers are active
- Unclear which handler takes precedence

### Recommendation
Consolidate in `GlobalOAuthHandler.tsx` or a dedicated deep link handler.

---

## Summary Statistics

| Category | Instances | Lines Affected | Priority |
|----------|-----------|----------------|----------|
| OAuth Handling | 3 | ~150 | CRITICAL |
| Login Logic | 2 | ~25 | HIGH |
| Registration Logic | 2 | ~90 | HIGH |
| User Redirects | 8 | ~40 | MEDIUM |
| OAuth Token Exchange | 2 | ~20 | MEDIUM |
| Google Login Handler | 2 | ~15 | MEDIUM |
| Styling | 2 | ~30 | LOW |
| Deep Links | 2 | ~25 | LOW |
| **TOTAL** | **23** | **~395** | |

---

## Recommended Refactoring Order

1. **Phase 1 (Critical)**: Consolidate OAuth handling
   - Move all OAuth logic to `GlobalOAuthHandler.tsx`
   - Remove from `_layout.tsx` and `profile.tsx`
   - Ensure it runs globally

2. **Phase 2 (High)**: Remove duplicate auth forms
   - Remove login/register from `profile.tsx`
   - Redirect to dedicated auth screens
   - Ensure `NativeLogin` handles all cases

3. **Phase 3 (Medium)**: Create auth guards
   - Implement `useRequireAuth` hook
   - Create `<RequireAuth>` component
   - Replace all manual redirects

4. **Phase 4 (Low)**: Extract shared components
   - Create `AuthLayout` component
   - Extract shared styles
   - Consolidate Google login handler

---

## Estimated Effort

- **Phase 1**: 2-3 hours (testing OAuth flows)
- **Phase 2**: 1-2 hours (removing duplicates)
- **Phase 3**: 2-3 hours (implementing guards)
- **Phase 4**: 1-2 hours (extracting components)

**Total**: ~6-10 hours of refactoring

---

## Risk Assessment

- **Low Risk**: Removing duplicate login/register from profile screen
- **Medium Risk**: Consolidating OAuth handling (requires thorough testing)
- **High Risk**: Changing auth redirect logic (may affect user flow)

---

## Testing Checklist

After refactoring, test:
- [ ] OAuth login on web
- [ ] OAuth login on mobile (native)
- [ ] Email/password login on web
- [ ] Email/password login on mobile
- [ ] Registration flow
- [ ] Redirect after login
- [ ] Protected route access
- [ ] Deep link handling
- [ ] Logout functionality

