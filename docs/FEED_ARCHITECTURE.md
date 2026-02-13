# Feed Architecture Overview

This document explains how all the feed-related files work together to create the scrolling property/project feed experience.

## 📁 File Structure

```
app/(tabs)/feed/
├── index.tsx          → FeedIndexScreen (default feed route)
├── [slug].tsx         → FeedSlugScreen (deep link to specific property/project)
└── _layout.tsx        → Stack layout configuration

components/Discover/
├── PropertyReelsView.tsx  → Main feed container (FlatList + state management)
├── PropertyReelCard.tsx  → Property reel card component
├── ProjectReelCard.tsx   → Project reel card component
└── BaseReelCard.tsx     → Shared base card with image carousel

data/
└── feedCache.ts          → AsyncStorage cache for feed data

config/
└── api.ts                → Feed API methods (api.feed.list, api.feed.notInterested)
```

---

## 🔄 Data Flow

### 1. **Initial Load**

```
User opens feed
    ↓
FeedIndexScreen (index.tsx)
    ↓
PropertyReelsView component mounts
    ↓
Check cache (feedCache.ts) → getCachedFeedData()
    ├─ Cache hit (valid, < 5min old) → Display cached items
    └─ Cache miss → Fetch from API (api.feed.list)
         ↓
    Store in cache → setFeedCache()
         ↓
    Display items in FlatList
```

### 2. **Deep Link Flow**

```
User opens /feed/property-123
    ↓
FeedSlugScreen ([slug].tsx) extracts slug from URL
    ↓
PropertyReelsView receives initialSlug="property-123"
    ↓
Load feed (cache or API)
    ↓
Find item matching slug in properties array
    ↓
Scroll to that item: scrollToOffset({ offset: index * containerHeight })
```

### 3. **Pagination Flow**

```
User scrolls near end of feed
    ↓
checkAndPrefetchNextPage() detects 5 items remaining
    ↓
loadMore() called
    ↓
Fetch next page: api.feed.list({ page: page + 1 })
    ↓
Append new items: setProperties([...prev, ...newItems])
    ↓
Update cache with full list
```

---

## 🧩 Component Responsibilities

### **app/(tabs)/feed/index.tsx**
- **Purpose**: Default feed route (`/feed`)
- **Role**: Simple wrapper that renders `PropertyReelsView` without initial slug
- **Key Features**:
  - Sets dark StatusBar
  - Provides black background container

### **app/(tabs)/feed/[slug].tsx**
- **Purpose**: Deep link route (`/feed/property-123` or `/feed/project-456`)
- **Role**: Extracts slug from URL params and passes to `PropertyReelsView`
- **Key Features**:
  - Uses `useLocalSearchParams()` to get slug
  - Passes `initialSlug` prop to `PropertyReelsView`
  - Same UI as index.tsx

### **app/(tabs)/feed/_layout.tsx**
- **Purpose**: Stack navigation layout for feed routes
- **Role**: Configures navigation behavior
- **Key Features**:
  - `headerShown: false` (full-screen feed)
  - `animation: 'none'` (instant transitions)

### **components/Discover/PropertyReelsView.tsx**
- **Purpose**: Main feed container and state manager
- **Role**: Orchestrates all feed functionality
- **Key Responsibilities**:
  1. **State Management**:
     - `properties`: Array of FeedItem (properties + projects)
     - `loading`, `error`, `page`, `hasNextPage`
     - `containerHeight`: Measured height for scroll calculations
     - `feedScrollEnabled`: Lock/unlock vertical scroll during horizontal image scrolling

  2. **Data Fetching**:
     - `fetchFeed()`: Calls `api.feed.list()` with pagination
     - Loads from cache first, then fetches if needed
     - Handles append vs replace logic

  3. **Scroll Management**:
     - `getItemLayout()`: Calculates item positions (uses `containerHeight`)
     - `snapToInterval`: Snaps to full-screen items
     - `onScroll` (web): Tracks current index for prefetch
     - `onViewableItemsChanged` (native): Tracks visible items

  4. **Analytics & Tracking**:
     - `trackVisibility()`: Fires impression/dwell events
     - Tracks when user views each item
     - Measures dwell time

  5. **User Actions**:
     - `handleNotInterested()`: Removes item + calls API
     - `handleFavoriteMetaUpdate()`: Updates favorite count/like state
     - `handleHorizontalScrollBegin/End()`: Locks vertical scroll during image carousel

  6. **Rendering**:
     - FlatList with `renderItem()` that switches between PropertyReelCard/ProjectReelCard
     - Uses `isProperty()` type guard to determine card type
     - `keyExtractor`: Stable keys (`property:123` or `project:456`)

### **components/Discover/PropertyReelCard.tsx**
- **Purpose**: Renders a single property reel
- **Role**: Displays property details with horizontal image carousel
- **Key Features**:
  - Uses `BaseReelCard` for shared layout
  - Horizontal ScrollView for property images
  - Favorite button, contact buttons, "Not Interested"
  - Calls `onHorizontalScrollBegin/End` to lock feed scroll

### **components/Discover/ProjectReelCard.tsx**
- **Purpose**: Renders a single project reel
- **Role**: Displays project details with horizontal image carousel
- **Key Features**:
  - Uses `BaseReelCard` for shared layout
  - Similar to PropertyReelCard but for projects
  - Shows project-specific fields (units, building type, etc.)

### **components/Discover/BaseReelCard.tsx**
- **Purpose**: Shared base component for both card types
- **Role**: Provides common layout and image carousel
- **Key Features**:
  - Horizontal image scrolling
  - Image indicators
  - Shared UI structure

### **data/feedCache.ts**
- **Purpose**: Persistent cache for feed data
- **Role**: Stores feed items in AsyncStorage to avoid refetching
- **Key Functions**:
  - `getCachedFeedData()`: Retrieves cache if valid (< 5min old)
  - `setFeedCache()`: Stores feed data with timestamp
  - `clearFeedCache()`: Clears cache (used on refresh)
  - `isCacheValid()`: Checks if cache is still fresh

### **config/api.ts → api.feed**
- **Purpose**: API client for feed endpoints
- **Role**: Handles HTTP requests to backend
- **Key Methods**:
  - `api.feed.list({ page, page_size })`: Fetches paginated feed
    - Returns `{ results: FeedItem[], next: string | null, count: number }`
    - Normalizes properties/projects with `_type` discriminator
  - `api.feed.notInterested(itemId, itemType)`: Signals disinterest

---

## 🔗 Component Interactions

### **Horizontal Scroll Lock**
```
User swipes image carousel horizontally
    ↓
BaseReelCard detects scroll start
    ↓
onHorizontalScrollBegin() called
    ↓
PropertyReelsView sets feedScrollEnabled = false
    ↓
Vertical feed scroll disabled
    ↓
User finishes horizontal scroll
    ↓
onHorizontalScrollEnd() called
    ↓
PropertyReelsView sets feedScrollEnabled = true (after 50ms delay)
```

### **Favorite Update Propagation**
```
User taps favorite button in PropertyReelCard
    ↓
Card updates local state (isLiked, favoriteCount)
    ↓
Calls API to toggle favorite
    ↓
onFavoriteMetaUpdate() callback fired
    ↓
PropertyReelsView updates item in properties array
    ↓
All cards using that item reflect new state
```

### **Not Interested Flow**
```
User taps "Not Interested" in card
    ↓
onNotInterested() callback fired
    ↓
PropertyReelsView optimistically removes item from array
    ↓
Calls api.feed.notInterested() (non-blocking)
    ↓
Analytics event fired
    ↓
Item disappears immediately (optimistic UI)
```

---

## 📊 State Management Flow

### **Properties Array Lifecycle**
```
1. Initial: [] (empty)
2. Cache load: [item1, item2, ...] (from cache)
3. API fetch: [item1, item2, ...] (from API, replaces cache)
4. Pagination: [item1, item2, ..., item11, item12, ...] (appends)
5. Not Interested: [item1, item3, ...] (removes item2)
6. Favorite update: [item1, { ...item2, is_favourite: true }, ...] (updates)
```

### **Height Measurement**
```
1. Component mounts: containerHeight = SCREEN_HEIGHT (static fallback)
2. onLayout fires: Measures actual container height
3. Updates: containerHeight = measured height
4. Used for: getItemLayout, snapToInterval, item heights
```

---

## 🎯 Key Design Patterns

### **1. Cache-First Loading**
- Always check cache before API call
- Reduces loading time and API calls
- Cache expires after 5 minutes

### **2. Optimistic Updates**
- "Not Interested" removes item immediately
- Favorite updates reflect instantly
- API calls happen in background

### **3. Stable Keys**
- Uses `type:id` format (`property:123`)
- Survives array reordering
- Prevents React reconciliation issues

### **4. Measured Heights**
- Uses `onLayout` to measure actual container height
- Accounts for tab bar, safe areas
- Prevents scroll misalignment bugs

### **5. Platform-Specific Behavior**
- Web: Uses `onScroll` (viewability broken with pagingEnabled)
- Native: Uses `onViewableItemsChanged`
- Different virtualization strategies

### **6. Scroll Locking**
- Disables vertical scroll during horizontal image scrolling
- Prevents accidental feed navigation
- Auto-unlocks after 50ms or 2s safety timeout

---

## 🐛 Known Issues & Solutions

### **Height Mismatch (Fixed)**
- **Problem**: Static `SCREEN_HEIGHT` didn't account for tab bar
- **Solution**: Measure container height with `onLayout`

### **Web Viewability (Fixed)**
- **Problem**: `onViewableItemsChanged` broken with `pagingEnabled` on web
- **Solution**: Use `onScroll` with debouncing on web

### **Scroll Lock Stuck (Mitigated)**
- **Problem**: Horizontal scroll end might not fire
- **Solution**: 2-second safety timeout to re-enable scroll

---

## 🔍 Debugging Tips

1. **Check cache**: Look for `📦 Loading feed from cache` logs
2. **Track scroll**: Monitor `containerHeight` vs `SCREEN_HEIGHT`
3. **Viewability**: Check `trackVisibility()` calls in analytics
4. **Pagination**: Watch for `⚡ Prefetching` logs
5. **Scroll lock**: Verify `feedScrollEnabled` state changes

---

## 📝 Summary

The feed system is a **cache-first, paginated, full-screen scrolling experience** that:
- Loads from cache instantly, then refreshes from API
- Supports deep linking to specific items
- Handles both properties and projects in a unified feed
- Tracks user interactions (impressions, dwell, favorites, not interested)
- Optimizes performance with prefetching and image preloading
- Handles platform differences (web vs native)
- Provides smooth scrolling with proper height calculations

All components work together through **callbacks** and **shared state** to create a cohesive feed experience.
