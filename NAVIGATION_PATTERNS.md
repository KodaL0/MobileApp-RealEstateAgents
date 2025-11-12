# Navigation Patterns & Best Practices

## Current Issues & Solutions

### ✅ Fixed: Back Button on Refresh
- **Problem**: After refresh, `router.back()` has no history to go back to
- **Solution**: Created `useSmartBack()` hook that falls back to home when no history exists
- **Applied to**: Agent profile, Listings, Connections pages

## Navigation Patterns to Consider

### 1. **Deep Linking & Shareable URLs**
- ✅ Agent profiles: `/agent/{username}` - Shareable
- ✅ Property pages: `/property/{id}` - Shareable  
- ✅ Listings: `/listings/{username}` - Shareable
- ✅ Connections: `/connections/{username}` - Shareable
- **Consider**: Add canonical URLs for SEO (already done in backend)

### 2. **Navigation Stack Management**
- **Current**: Using expo-router Stack navigation
- **Consider**: 
  - Track navigation state in context for complex flows
  - Use `router.replace()` vs `router.push()` strategically:
    - `push()` - Adds to history (good for drill-downs)
    - `replace()` - Replaces current (good for auth redirects, filters)

### 3. **State Persistence**
- **Current**: State lost on refresh
- **Consider**:
  - URL params for filters/search (already using in some places)
  - SessionStorage for temporary state (web only)
  - AsyncStorage for user preferences (already using)

### 4. **Breadcrumbs & Navigation Context**
- **Consider**: Add breadcrumb navigation for deep pages
- **Example**: Home > Agent > Listings

### 5. **Browser History Management**
- **Current**: Using `useSmartBack()` hook
- **Consider**:
  - Track referrer in sessionStorage for better fallbacks
  - Add "Home" button on deep pages as alternative to back

### 6. **Mobile vs Web Differences**
- **Mobile**: Native back button handled by OS
- **Web**: Browser back button + our custom back button
- **Current**: `useSmartBack()` handles both

### 7. **Loading States During Navigation**
- **Current**: Each page manages its own loading state
- **Consider**: Global loading indicator for navigation transitions

### 8. **Error Boundaries & 404 Handling**
- **Current**: `+not-found.tsx` for unmatched routes
- **Consider**: 
  - Better error pages with retry options
  - Redirect invalid routes to home with message

### 9. **Analytics & Tracking**
- **Consider**: Track navigation patterns
  - Page views
  - Back button usage
  - Deep link usage

### 10. **Prefetching & Performance**
- **Consider**: 
  - Prefetch data for likely next pages
  - Cache navigation state
  - Lazy load routes

## Recommended Next Steps

1. ✅ **Done**: Smart back button hook
2. **Consider**: Add breadcrumb component for deep pages
3. **Consider**: Add "Home" button alongside back button
4. **Consider**: Track navigation analytics
5. **Consider**: Add URL state management for filters/search

## Code Examples

### Using Smart Back Hook
```typescript
import { useSmartBack } from '@/hooks/useSmartBack';

const handleBack = useSmartBack(); // Defaults to '/(tabs)'
// or
const handleBack = useSmartBack('/custom/fallback');
```

### Navigation with State
```typescript
// Push (adds to history)
router.push({ pathname: '/page', params: { id: '123' } });

// Replace (replaces current)
router.replace({ pathname: '/page', params: { id: '123' } });
```

