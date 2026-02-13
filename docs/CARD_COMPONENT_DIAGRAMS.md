# Card Component Visual Diagrams

Visual representations of how PropertyReelsView, PropertyReelCard, ProjectReelCard, and BaseReelCard interact.

---

## 📊 Component Hierarchy

```mermaid
graph TD
    A[PropertyReelsView] --> B[FlatList]
    B --> C{isProperty?}
    C -->|Yes| D[PropertyReelCard]
    C -->|No| E[ProjectReelCard]
    D --> F[BaseReelCard]
    E --> F
    
    style A fill:#10b981,stroke:#059669,color:#fff
    style D fill:#3b82f6,stroke:#2563eb,color:#fff
    style E fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style F fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## 🔄 Props Flow Diagram

```mermaid
graph LR
    A[PropertyReelsView] -->|property, callbacks| B[PropertyReelCard]
    A -->|project, callbacks| C[ProjectReelCard]
    B -->|images, content, handlers| D[BaseReelCard]
    C -->|images, content, handlers| D
    
    A1[containerHeight<br/>onFavoriteMetaUpdate<br/>onHorizontalScrollBegin<br/>onHorizontalScrollEnd<br/>onNotInterested] -.->|passes| B
    A1 -.->|passes| C
    
    B1[images<br/>topBarContent<br/>bottomContent<br/>onFavorite<br/>onChat<br/>isLiked<br/>favoriteCount] -.->|passes| D
    C1[images<br/>topBarContent<br/>bottomContent<br/>onFavorite<br/>onChat<br/>isLiked<br/>favoriteCount] -.->|passes| D
    
    style A fill:#10b981,stroke:#059669,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,color:#fff
    style C fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style D fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## 📥 Data Flow: Favorite Action

```mermaid
sequenceDiagram
    participant User
    participant BaseReelCard
    participant PropertyReelCard
    participant API
    participant PropertyReelsView
    
    User->>BaseReelCard: Tap Heart Icon
    BaseReelCard->>PropertyReelCard: onFavorite()
    PropertyReelCard->>API: api.properties.toggleFavorite(id)
    API-->>PropertyReelCard: { is_favourite, favorites_count }
    PropertyReelCard->>PropertyReelCard: Update local state
    PropertyReelCard->>PropertyReelsView: onFavoriteMetaUpdate(id, meta)
    PropertyReelsView->>PropertyReelsView: Update item in properties array
    PropertyReelsView-->>BaseReelCard: Props update (isLiked, favoriteCount)
    BaseReelCard-->>User: UI updates (heart fills, count changes)
```

---

## 🔒 Scroll Lock Flow

```mermaid
sequenceDiagram
    participant User
    participant BaseReelCard
    participant PropertyReelsView
    participant FlatList
    
    User->>BaseReelCard: Swipe image horizontally
    BaseReelCard->>BaseReelCard: onScrollBeginDrag fires
    BaseReelCard->>PropertyReelsView: onHorizontalScrollBegin()
    PropertyReelsView->>PropertyReelsView: setFeedScrollEnabled(false)
    PropertyReelsView->>FlatList: scrollEnabled = false
    Note over FlatList: Vertical scroll disabled
    
    User->>BaseReelCard: Release swipe
    BaseReelCard->>BaseReelCard: onScrollEndDrag + onMomentumScrollEnd
    BaseReelCard->>PropertyReelsView: onHorizontalScrollEnd()
    PropertyReelsView->>PropertyReelsView: setTimeout(() => setFeedScrollEnabled(true), 50ms)
    PropertyReelsView->>FlatList: scrollEnabled = true
    Note over FlatList: Vertical scroll re-enabled
```

---

## 🖼️ Image Carousel Flow

```mermaid
graph TD
    A[User Swipes Image] --> B[BaseReelCard ScrollView]
    B --> C[handleScroll calculates index]
    C --> D[onImageChange callback]
    D --> E[PropertyReelCard/ProjectReelCard]
    E --> F[Updates currentImageIndex state]
    F --> G[Top Bar Photo Counter Updates]
    G --> H["Shows '2/5' or '3/10'"]
    
    C --> I{index >= 5?}
    I -->|Yes| J[Lazy Load: Expand images]
    I -->|No| K[Keep first 10 images]
    J --> L[Load remaining images]
    
    style A fill:#10b981,stroke:#059669,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,color:#fff
    style G fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## 🎯 Component Responsibilities

```mermaid
mindmap
    root((Card Components))
        PropertyReelsView
            Feed State Management
            FlatList Rendering
            Pagination
            Analytics Tracking
            Scroll Management
        PropertyReelCard
            Property Data Prep
            Property Images
            Property Actions
            Property Formatting
            Property Navigation
        ProjectReelCard
            Project Data Prep
            Project Images
            Project Actions
            Project Formatting
            Project Navigation
        BaseReelCard
            Image Carousel
            Side Actions UI
            Double-Tap Favorite
            Heart Animation
            Scroll Locking
            Layout Structure
```

---

## 🔀 Rendering Decision Flow

```mermaid
flowchart TD
    A[PropertyReelsView.renderItem] --> B{Check item type}
    B -->|isProperty item| C[PropertyReelCard]
    B -->|isProject item| D[ProjectReelCard]
    
    C --> E[Prepare Property Data]
    E --> F[Format Property Images]
    E --> G[Create Property TopBar]
    E --> H[Create Property BottomContent]
    F --> I[BaseReelCard]
    G --> I
    H --> I
    
    D --> J[Prepare Project Data]
    J --> K[Format Project Images]
    J --> L[Create Project TopBar]
    J --> M[Create Project BottomContent]
    K --> I
    L --> I
    M --> I
    
    I --> N[Render UI]
    
    style A fill:#10b981,stroke:#059669,color:#fff
    style C fill:#3b82f6,stroke:#2563eb,color:#fff
    style D fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style I fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## 📦 Props Breakdown

### PropertyReelsView → PropertyReelCard/ProjectReelCard

```mermaid
graph TB
    A[PropertyReelsView] --> B[Props]
    B --> C[property/project: FeedItem]
    B --> D[containerHeight: number]
    B --> E[onFavoriteMetaUpdate: callback]
    B --> F[onHorizontalScrollBegin: callback]
    B --> G[onHorizontalScrollEnd: callback]
    B --> H[onNotInterested: callback]
    B --> I[source: string]
    
    style A fill:#10b981,stroke:#059669,color:#fff
    style B fill:#e5e7eb,stroke:#9ca3af
```

### PropertyReelCard/ProjectReelCard → BaseReelCard

```mermaid
graph TB
    A[Card Component] --> B[Props to BaseReelCard]
    B --> C[images: string[]]
    B --> D[topBarContent: ReactNode]
    B --> E[bottomContent: ReactNode]
    B --> F[onFavorite: function]
    B --> G[onChat: function]
    B --> H[onShare: function]
    B --> I[onAgentPress: function]
    B --> J[onView: function]
    B --> K[isLiked: boolean]
    B --> L[favoriteCount: number]
    B --> M[isChatLoading: boolean]
    B --> N[onImageChange: function]
    B --> O[containerHeight: number]
    B --> P[onHorizontalScrollBegin: function]
    B --> Q[onHorizontalScrollEnd: function]
    
    style A fill:#3b82f6,stroke:#2563eb,color:#fff
    style B fill:#e5e7eb,stroke:#9ca3af
```

---

## 🎨 UI Layout Structure

```mermaid
graph TD
    A[BaseReelCard Container] --> B[ScrollView Horizontal]
    B --> C[Image 1]
    B --> D[Image 2]
    B --> E[Image N...]
    
    A --> F[LinearGradient Bottom]
    A --> G[Top Bar Content]
    A --> H[Side Actions Column]
    A --> I[Bottom Content]
    
    G --> G1[Tag Line]
    G --> G2[Photo Counter]
    
    H --> H1[Heart Icon]
    H --> H2[Favorite Count]
    H --> H3[Chat Icon]
    H --> H4[Share Icon]
    H --> H5[Agent Icon]
    H --> H6[View Button]
    
    I --> I1[Agent Name]
    I --> I2[Title]
    I --> I3[Price]
    I --> I4[Location]
    I --> I5[Stats Pills]
    
    style A fill:#000,stroke:#10b981,color:#fff
    style B fill:#1f2937,stroke:#374151
    style H fill:#f59e0b,stroke:#d97706,color:#fff
    style I fill:#3b82f6,stroke:#2563eb,color:#fff
```

---

## 🔄 State Management Flow

```mermaid
stateDiagram-v2
    [*] --> PropertyReelsView: Mount
    PropertyReelsView --> Loading: Fetch Feed
    Loading --> Cached: Cache Hit
    Loading --> Fetched: API Success
    Cached --> Rendered: Display Items
    Fetched --> Rendered: Display Items
    
    Rendered --> UserInteracts: User Action
    UserInteracts --> FavoriteUpdate: Tap Heart
    UserInteracts --> ScrollLock: Swipe Image
    UserInteracts --> Pagination: Scroll Near End
    
    FavoriteUpdate --> StateSync: Update Feed State
    ScrollLock --> ScrollUnlock: Release
    Pagination --> LoadingMore: Fetch Next Page
    
    StateSync --> Rendered
    ScrollUnlock --> Rendered
    LoadingMore --> Rendered
    
    Rendered --> [*]: Unmount
```

---

## 🎯 Callback Chain Visualization

```mermaid
graph LR
    subgraph "User Interaction"
        A[User Taps Heart]
        B[User Swipes Image]
        C[User Scrolls Feed]
    end
    
    subgraph "BaseReelCard"
        D[onFavorite]
        E[onHorizontalScrollBegin]
        F[onHorizontalScrollEnd]
    end
    
    subgraph "PropertyReelCard/ProjectReelCard"
        G[handleFavorite]
        H[Pass through callbacks]
    end
    
    subgraph "PropertyReelsView"
        I[handleFavoriteMetaUpdate]
        J[setFeedScrollEnabled]
    end
    
    A --> D
    D --> G
    G --> I
    
    B --> E
    E --> H
    H --> J
    
    B --> F
    F --> H
    H --> J
    
    style A fill:#10b981,stroke:#059669,color:#fff
    style D fill:#f59e0b,stroke:#d97706,color:#fff
    style G fill:#3b82f6,stroke:#2563eb,color:#fff
    style I fill:#10b981,stroke:#059669,color:#fff
```

---

## 📊 Component Comparison

```mermaid
graph TB
    subgraph "PropertyReelCard"
        A1[Single Price]
        A2[Single Stats]
        A3[api.properties]
        A4[/property/id]
    end
    
    subgraph "ProjectReelCard"
        B1[Price Range]
        B2[Stat Ranges]
        B3[Units Available]
        B4[api.listings]
        B5[/project/id]
    end
    
    subgraph "Shared BaseReelCard"
        C1[Image Carousel]
        C2[Side Actions]
        C3[Double-Tap]
        C4[Heart Animation]
        C5[Scroll Lock]
    end
    
    A1 --> C1
    A2 --> C2
    A3 --> C3
    A4 --> C4
    
    B1 --> C1
    B2 --> C2
    B3 --> C3
    B4 --> C4
    B5 --> C5
    
    style A1 fill:#3b82f6,stroke:#2563eb,color:#fff
    style B1 fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style C1 fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## 🚀 Lifecycle Flow

```mermaid
sequenceDiagram
    participant Feed as PropertyReelsView
    participant Card as PropertyReelCard
    participant Base as BaseReelCard
    participant API as Backend API
    
    Feed->>Feed: Load feed data
    Feed->>Card: Render with property data
    Card->>Card: Prepare images, content
    Card->>Base: Render BaseReelCard with props
    Base->>Base: Initialize image carousel
    Base->>Base: Setup scroll handlers
    
    Note over Feed,Base: User interacts with card
    
    Base->>Card: onFavorite() called
    Card->>API: Toggle favorite
    API-->>Card: Response
    Card->>Feed: onFavoriteMetaUpdate()
    Feed->>Feed: Update state
    Feed-->>Card: Props update
    Card-->>Base: Props update
    Base-->>Base: UI reflects changes
    
    Note over Feed,Base: User swipes image
    
    Base->>Feed: onHorizontalScrollBegin()
    Feed->>Feed: Disable feed scroll
    Base->>Base: Handle horizontal scroll
    Base->>Feed: onHorizontalScrollEnd()
    Feed->>Feed: Re-enable feed scroll
```

---

These diagrams show how the components interact, how data flows between them, and how user interactions are handled throughout the system.
