# Feed Scroll Stability Analysis

## Summary

The feed scrolling misbehaves and shows wrong properties due to **height mismatch** between the FlatList's `getItemLayout`/`snapToInterval` and the actual visible viewport. This document analyzes all feed-related code and root causes.

---

## Architecture Overview

```
app/(tabs)/feed/
├── index.tsx          → FeedIndexScreen (PropertyReelsView)
├── [slug].tsx         → FeedSlugScreen (PropertyReelsView with initialSlug)
└── _layout.tsx        → Stack, headerShown: false

app/(tabs)/_layout.tsx → Tabs with tab bar (60px height)

components/Discover/
├── PropertyReelsView.tsx  → Main feed FlatList + PropertyReelCard / ProjectReelCard
├── PropertyReelCard.tsx  → Property reel (inline, uses ScrollView for images)
├── ProjectReelCard.tsx   → Project reel (uses BaseReelCard)
└── BaseReelCard.tsx     → Shared layout with horizontal image carousel
```

---

## Root Causes

### 1. **Height Mismatch (CRITICAL)**

**Problem:** The feed uses `Dimensions.get("window")` at module load for `SCREEN_HEIGHT`. This value is used for:
- `getItemLayout` → `offset: SCREEN_HEIGHT * index`, `length: SCREEN_HEIGHT`
- `snapToInterval={SCREEN_HEIGHT}`
- `reelItem` height
- `scrollToOffset` for deep links

**Why it breaks:**
- The feed lives inside a tab layout. The **actual visible area** = window height − tab bar (60px) − safe area insets.
- `Dimensions.get("window")` returns the full window, not the content area.
- When `getItemLayout` says each item is 800px but the visible viewport is 740px, scroll/snap calculations drift.
- After several scrolls, the FlatList's internal scroll position can desync from the displayed content → **wrong property shown**.

**Evidence:** React Native docs and community reports: *"When there's a mismatch between heights declared in getItemLayout and actual rendered item heights, FlatList can display wrong items."*

---

### 2. **Static Dimensions (Stale Values)**

**Problem:** `Dimensions.get("window")` is evaluated once at import. It does not update when:
- Device rotates
- App goes split-screen
- Keyboard opens (web/mobile)
- Browser window resizes (web)

**Impact:** On orientation change or resize, scroll math uses stale heights → misalignment.

---

### 3. **keyExtractor Includes Index**

**Current:** `\`${type}-${id ?? \`idx-${index}\`}-${index}\``

**Issue:** Including `index` means the same item gets a different key if it moves (e.g. after refresh with new order). For "wrong property" bugs, the main risk is cell recycling: if keys collide or are unstable, React can reuse the wrong component instance. Using `id` alone is sufficient when IDs are unique; index helps only for duplicate IDs (rare).

**Recommendation:** Prefer `\`${type}-${id}\`` for stability; add index only if duplicates exist.

---

### 4. **viewableItems[0] May Not Be Primary**

**Current:** `const currentViewable = viewableItems[0]`

**Issue:** `viewableItems` order is not guaranteed to be "most visible first." On fast scroll or with multiple items partially visible, `[0]` might not be the main item. This affects prefetch and analytics, not direct "wrong property" display, but can contribute to odd behavior.

---

### 5. **Nested Scroll + feedScrollEnabled**

**Flow:** Horizontal image carousel inside each reel calls `onHorizontalScrollBegin` → `setFeedScrollEnabled(false)`, and `onHorizontalScrollEnd` → `setFeedScrollEnabled(true)`.

**Risk:** If `onHorizontalScrollEnd` never fires (e.g. touch interrupted, momentum scroll cancelled), feed scroll stays disabled. User scrolls vertically but nothing happens → perceived "misbehavior."

---

### 6. **Append Race (loadMore)**

When appending:
- `isAppendingRef.current = true`
- `setProperties([...prev, ...newItems])`
- 100ms later: `isAppendingRef.current = false`

During append, `handleViewableItemsChanged` returns early. If `onEndReached` fires again before append completes, `loadMore` is guarded by `isLoadingNextPageRef` and `isAppendingRef`, which is good. But rapid scroll + append can still cause brief layout jumps.

---

### 7. **ProjectReelCard safeContainer: flex: 1**

ProjectReelCard wraps BaseReelCard in a View with `flex: 1`. PropertyReelCard uses `height: SCREEN_HEIGHT`. Both end up filling the reel item, but the mix of flex vs fixed height can cause subtle layout differences across devices.

---

## Files Involved

| File | Role |
|------|------|
| `PropertyReelsView.tsx` | FlatList, getItemLayout, snap, viewability, loadMore |
| `PropertyReelCard.tsx` | Property reel, horizontal ScrollView, scroll lock |
| `ProjectReelCard.tsx` | Project reel via BaseReelCard |
| `BaseReelCard.tsx` | Horizontal image carousel, scroll lock callbacks |
| `feed/index.tsx` | Feed screen container (flex: 1) |
| `feed/[slug].tsx` | Deep-link feed with initialSlug |
| `feed/_layout.tsx` | Stack layout |
| `(tabs)/_layout.tsx` | Tab bar (60px) |
| `feedCache.ts` | Cache for feed data |
| `api.ts` | Feed API |

---

## Web / Mobile Browser: Wrong Reels Without User Input

**Symptom:** After scrolling, the feed starts showing different reels on its own, especially on mobile browsers.

**Root cause (React Native Web):**
- `onViewableItemsChanged` is broken when `pagingEnabled` is true (react-native-web#1798) – returns wrong viewable items.
- FlatList virtualization/cell recycling on web can render the wrong item in recycled cells.

**Fixes applied:**
- **Disable `onViewableItemsChanged` on web** – avoid using broken viewability; rely on `onEndReached` for pagination.
- **Disable virtualization on web** – `disableVirtualization={Platform.OS === "web"}` so all items render (no cell recycling), preventing wrong-item display.

---

## Recommended Fixes

1. **Use measured height** – Replace static `SCREEN_HEIGHT` with `onLayout`-measured container height for the feed. Use this for `getItemLayout`, `snapToInterval`, and item/card heights.
2. **Use `useWindowDimensions`** – For reactive dimensions on rotate/resize; fallback to measured height when inside a smaller container.
3. **Stable keyExtractor** – Use `\`${type}-${id}\`` when IDs are unique; add index only if duplicates are possible.
4. **snapToOffsets** – Optionally use `snapToOffsets={[0, h, 2*h, ...]}` for explicit snap points.
5. **Horizontal scroll safety** – Ensure `onHorizontalScrollEnd` runs on scroll end (e.g. `onMomentumScrollEnd` + `onScrollEndDrag`), and consider a timeout fallback to re-enable feed scroll.
