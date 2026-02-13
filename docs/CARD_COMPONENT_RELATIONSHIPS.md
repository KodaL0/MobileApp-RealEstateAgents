# Card Component Relationships

This document explains how `PropertyReelsView`, `PropertyReelCard`, `ProjectReelCard`, and `BaseReelCard` work together to create the feed experience.

## 📊 Component Hierarchy

```
PropertyReelsView (Container)
    │
    ├── FlatList renders items
    │
    ├── PropertyReelCard (for properties)
    │   └── BaseReelCard (shared layout)
    │
    └── ProjectReelCard (for projects)
        └── BaseReelCard (shared layout)
```

---

## 🔗 Component Relationships

### **1. PropertyReelsView → Card Components**

**Role**: Container and orchestrator

**Responsibilities**:
- Manages feed state (properties array, loading, pagination)
- Renders FlatList with `renderItem()` callback
- Decides which card to render based on item type
- Provides callbacks to cards for state updates

**Key Code** (`PropertyReelsView.tsx:539-551`):
```typescript
const renderItem = useCallback(
  ({ item }: { item: FeedItem; index: number }) => (
    <View style={[styles.reelItem, { height: containerHeight }]}>
      {isProperty(item) ? (
        <PropertyReelCard
          property={item}
          source="feed"
          containerHeight={containerHeight}
          onFavoriteMetaUpdate={handleFavoriteMetaUpdate}
          onHorizontalScrollBegin={handleHorizontalScrollBegin}
          onHorizontalScrollEnd={handleHorizontalScrollEnd}
          onNotInterested={() => handleNotInterested(item.id, "property")}
        />
      ) : (
        <ProjectReelCard
          project={item}
          source="feed"
          containerHeight={containerHeight}
          onFavoriteMetaUpdate={handleFavoriteMetaUpdate}
          onHorizontalScrollBegin={handleHorizontalScrollBegin}
          onHorizontalScrollEnd={handleHorizontalScrollEnd}
          onNotInterested={() => handleNotInterested(item.id, "project")}
        />
      )}
    </View>
  ),
  [containerHeight, handleFavoriteMetaUpdate, ...]
);
```

**What it passes down**:
- `containerHeight`: Measured height for proper scrolling
- `onFavoriteMetaUpdate`: Callback to update favorite state in feed
- `onHorizontalScrollBegin/End`: Callbacks to lock/unlock feed scroll
- `onNotInterested`: Callback to remove item from feed
- `source`: Analytics source identifier

---

### **2. PropertyReelCard → BaseReelCard**

**Role**: Property-specific wrapper

**Responsibilities**:
- Prepares property-specific data (images, content, formatting)
- Handles property-specific actions (favorite API call, chat, navigation)
- Transforms property data into BaseReelCard props

**Key Code** (`PropertyReelCard.tsx:420-441`):
```typescript
return (
  <View style={styles.safeContainer}>
    <BaseReelCard
      images={images}                    // Property images array
      topBarContent={topBarContent}      // Tag line + photo counter
      bottomContent={bottomContent}      // Agent, title, price, location, stats
      onFavorite={handleFavorite}        // Property-specific favorite handler
      onChat={handleChat}                // Property-specific chat handler
      onShare={handleShare}
      onAgentPress={handleAgentProfilePress}
      onView={handleViewPress}
      isLiked={isLiked}                  // Local favorite state
      favoriteCount={favoriteCount}      // Local favorite count
      isChatLoading={isChatLoading}
      onImageChange={handleImageChange}  // Track current image index
      baseUrl={BASE_URL}
      containerHeight={containerHeight}
      onHorizontalScrollBegin={onHorizontalScrollBegin}  // Lock feed scroll
      onHorizontalScrollEnd={onHorizontalScrollEnd}      // Unlock feed scroll
    />
  </View>
);
```

**What PropertyReelCard prepares**:

1. **Images** (`PropertyReelCard.tsx:144-154`):
   ```typescript
   const images = useMemo(() => {
     if (!property) return [getValidUrl()];
     if (property.images && property.images.length > 0) {
       return property.images
         .map((img) => typeof img === "string" ? getValidUrl(img) : getValidUrl(img.image))
         .filter(Boolean);
     }
     return [getValidUrl()];
   }, [property, getValidUrl]);
   ```

2. **Top Bar Content** (`PropertyReelCard.tsx:345-356`):
   ```typescript
   const topBarContent = (
     <View style={styles.tagContainer}>
       <Text style={styles.tagLine}>
         {tagLine}  // "PROPERTY · Country · For Sale"
       </Text>
       {images.length > 1 && (
         <Text style={styles.photoCounterText}>
           {currentImageIndex + 1}/{images.length}
         </Text>
       )}
     </View>
   );
   ```

3. **Bottom Content** (`PropertyReelCard.tsx:359-417`):
   ```typescript
   const bottomContent = (
     <>
       <Text>{agentName}</Text>
       <Text>{property.title}</Text>
       <Text>{formatPrice(property.price)}</Text>
       <Text>{property.location}</Text>
       <View>{/* Bedrooms, Bathrooms, Area stats */}</View>
     </>
   );
   ```

4. **Actions**:
   - `handleFavorite`: Calls `api.properties.toggleFavorite()`
   - `handleChat`: Creates chat thread with property owner
   - `handleViewPress`: Navigates to `/property/${id}`

---

### **3. ProjectReelCard → BaseReelCard**

**Role**: Project-specific wrapper

**Responsibilities**:
- Prepares project-specific data (images, content, formatting)
- Handles project-specific actions (favorite API call, chat, navigation)
- Transforms project data into BaseReelCard props

**Key Code** (`ProjectReelCard.tsx:523-544`):
```typescript
return (
  <View style={styles.safeContainer}>
    <BaseReelCard
      images={images}                    // Project images array
      topBarContent={topBarContent}      // Tag line + photo counter
      bottomContent={bottomContent}      // Developer, name, price range, location, stats
      onFavorite={handleFavorite}        // Project-specific favorite handler
      onChat={handleChat}                // Project-specific chat handler
      onShare={handleShare}
      onAgentPress={handleAgentProfilePress}
      onView={handleViewPress}
      isLiked={isLiked}
      favoriteCount={favoriteCount}
      isChatLoading={isChatLoading}
      onImageChange={handleImageChange}
      baseUrl={BASE_URL}
      containerHeight={containerHeight}
      onHorizontalScrollBegin={onHorizontalScrollBegin}
      onHorizontalScrollEnd={onHorizontalScrollEnd}
    />
  </View>
);
```

**Differences from PropertyReelCard**:

1. **Images** (`ProjectReelCard.tsx:162-176`):
   - Also checks `project.main_image` as fallback
   ```typescript
   if (project.main_image) {
     return [getValidUrl(project.main_image)];
   }
   ```

2. **Price Display** (`ProjectReelCard.tsx:301-305`):
   - Shows price **ranges** instead of single price
   ```typescript
   const priceRange = formatPriceRange(
     priceMin,
     priceMax,
     listingType === "rent",
   );
   ```

3. **Stats** (`ProjectReelCard.tsx:491-519`):
   - Shows **ranges** for bedrooms, bathrooms, area
   - Adds **units available** stat (`available_units/total_units`)
   ```typescript
   {bedroomsRange && <View><Bed />{bedroomsRange}</View>}
   {project.total_units > 0 && (
     <View><Building2 />{project.available_units}/{project.total_units}</View>
   )}
   ```

4. **Actions**:
   - `handleFavorite`: Calls `api.listings.toggleFavorite(id, "project")`
   - `handleChat`: Creates chat thread with project developer
   - `handleViewPress`: Navigates to `/project/${id}` or `project.url`

---

### **4. BaseReelCard (Shared Foundation)**

**Role**: Common layout and behavior

**Responsibilities**:
- Provides shared UI structure (image carousel, side actions, gradients)
- Handles horizontal image scrolling
- Manages scroll locking with parent feed
- Provides double-tap to favorite
- Handles heart animation

**Key Features**:

1. **Image Carousel** (`BaseReelCard.tsx:349-400`):
   ```typescript
   <ScrollView
     ref={scrollViewRef}
     horizontal
     pagingEnabled
     onScroll={handleScroll}
     onScrollBeginDrag={onHorizontalScrollBegin}  // Lock feed scroll
     onScrollEndDrag={onHorizontalScrollEnd}      // Unlock feed scroll
     onMomentumScrollEnd={onHorizontalScrollEnd}
   >
     {visibleImages.map((uri, index) => (
       <View key={uri}>
         {/* Blurred background */}
         <OptimizedImage uri={uri} blurRadius={25} />
         {/* Foreground image */}
         <Image source={{ uri }} resizeMode="contain" />
       </View>
     ))}
   </ScrollView>
   ```

2. **Lazy Image Loading** (`BaseReelCard.tsx:32-36, 159, 332-337`):
   - Only loads first 10 images initially
   - Expands to all images when user scrolls past 5th image
   - Prevents loading 20-30+ images unnecessarily

3. **Side Actions** (`BaseReelCard.tsx:427-490`):
   - Heart button (favorite)
   - Chat button
   - Share button
   - Agent/Developer profile button
   - View button (green)

4. **Double-Tap to Favorite** (`BaseReelCard.tsx:277-316`):
   ```typescript
   const handleTouchEnd = useCallback((event) => {
     const deltaY = Math.abs(touch.pageY - touchStartY.current);
     const deltaX = Math.abs(touch.pageX - touchStartX.current);
     
     if (deltaY > 15 || deltaX > 15) return; // Moved too much
     
     const now = Date.now();
     if (lastTap.current && now - lastTap.current < 300) {
       // Double tap detected
       if (!isLiked) onFavorite();
       triggerHeartAnimation();
     }
   }, [isLiked, onFavorite]);
   ```

5. **Scroll Locking** (`BaseReelCard.tsx:355-363`):
   - When horizontal scroll begins → calls `onHorizontalScrollBegin()`
   - PropertyReelsView disables vertical feed scroll
   - When horizontal scroll ends → calls `onHorizontalScrollEnd()`
   - PropertyReelsView re-enables vertical feed scroll

---

## 🔄 Data Flow

### **Favorite Flow**:
```
User taps heart in BaseReelCard
    ↓
BaseReelCard calls onFavorite()
    ↓
PropertyReelCard.handleFavorite() or ProjectReelCard.handleFavorite()
    ↓
API call (api.properties.toggleFavorite or api.listings.toggleFavorite)
    ↓
Update local state (isLiked, favoriteCount)
    ↓
Call onFavoriteMetaUpdate(propertyId, { is_favourite, favorites_count })
    ↓
PropertyReelsView.handleFavoriteMetaUpdate()
    ↓
Updates item in properties array
    ↓
All cards using that item reflect new state
```

### **Horizontal Scroll Lock Flow**:
```
User swipes image carousel horizontally
    ↓
BaseReelCard ScrollView detects scroll start
    ↓
onScrollBeginDrag fires
    ↓
Calls onHorizontalScrollBegin()
    ↓
PropertyReelsView sets feedScrollEnabled = false
    ↓
Vertical feed scroll disabled
    ↓
User finishes horizontal scroll
    ↓
onScrollEndDrag + onMomentumScrollEnd fire
    ↓
Calls onHorizontalScrollEnd()
    ↓
PropertyReelsView sets feedScrollEnabled = true (after 50ms delay)
```

### **Image Change Flow**:
```
User swipes to next image
    ↓
BaseReelCard.handleScroll() calculates index
    ↓
Calls onImageChange(index)
    ↓
PropertyReelCard/ProjectReelCard updates currentImageIndex state
    ↓
Top bar photo counter updates (e.g., "2/5")
```

---

## 🎨 Design Pattern: Composition

This architecture uses **composition** rather than inheritance:

- **BaseReelCard**: Provides the "what" (layout, structure, behavior)
- **PropertyReelCard/ProjectReelCard**: Provide the "how" (data transformation, specific actions)
- **PropertyReelsView**: Provides the "where" (rendering context, state management)

**Benefits**:
1. **DRY**: Shared layout code in one place
2. **Flexibility**: Each card type can customize content/actions
3. **Maintainability**: Changes to layout affect both card types
4. **Type Safety**: Each card handles its own data types

---

## 📋 Props Flow Summary

### **PropertyReelsView → PropertyReelCard/ProjectReelCard**:
- `property` / `project`: Data object
- `containerHeight`: Measured height
- `onFavoriteMetaUpdate`: State sync callback
- `onHorizontalScrollBegin/End`: Scroll lock callbacks
- `onNotInterested`: Removal callback
- `source`: Analytics identifier

### **PropertyReelCard/ProjectReelCard → BaseReelCard**:
- `images`: Array of image URLs
- `topBarContent`: ReactNode (tag line + counter)
- `bottomContent`: ReactNode (agent, title, price, location, stats)
- `onFavorite`: Favorite action handler
- `onChat`: Chat action handler
- `onShare`: Share action handler
- `onAgentPress`: Agent profile handler
- `onView`: View details handler
- `isLiked`: Favorite state
- `favoriteCount`: Favorite count
- `isChatLoading`: Chat loading state
- `onImageChange`: Image index change callback
- `containerHeight`: Height for layout
- `onHorizontalScrollBegin/End`: Scroll lock callbacks

---

## 🔍 Key Differences: PropertyReelCard vs ProjectReelCard

| Feature | PropertyReelCard | ProjectReelCard |
|---------|-----------------|-----------------|
| **Data Type** | `FeedProperty` | `FeedProject` |
| **Price Display** | Single price (`€500,000`) | Price range (`€400,000 - €600,000`) |
| **Stats** | Single values (`3 beds`) | Ranges (`2-4 beds`) |
| **Additional Stats** | None | Units available (`5/10`) |
| **Image Fallback** | Placeholder | `main_image` field |
| **Favorite API** | `api.properties.toggleFavorite()` | `api.listings.toggleFavorite(id, "project")` |
| **Navigation** | `/property/${id}` | `/project/${id}` or `project.url` |
| **Tag Line** | "PROPERTY · Country · Status" | "PROJECT · Country · Status" |

---

## 🎯 Summary

1. **PropertyReelsView** is the orchestrator that manages feed state and renders cards
2. **PropertyReelCard** and **ProjectReelCard** are specialized wrappers that prepare data and handle type-specific actions
3. **BaseReelCard** is the shared foundation that provides common UI and behavior
4. All components communicate through **callbacks** and **props**
5. The architecture uses **composition** for flexibility and maintainability

This design allows both property and project cards to share the same beautiful layout while maintaining their unique data handling and actions.
