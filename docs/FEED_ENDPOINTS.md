# Feed App — Developer Guide for Frontend Engineers

> Complete API reference and integration guide for building the personalized feed UI.

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Response Schemas](#response-schemas)
4. [Related Endpoints](#related-endpoints)
5. [Navigation & Click Tracking](#navigation--click-tracking)
6. [Algorithm & Scoring](#algorithm--scoring)
7. [Data Models Reference](#data-models-reference)
8. [Frontend Implementation Guide](#frontend-implementation-guide)
9. [Known Issues & Gaps](#known-issues--gaps)
10. [Quick Reference](#quick-reference)

---

## Overview

The feed app serves a **personalized feed** of properties and projects, ranked by user preferences, recency, and popularity. The feed is **mixed content** — each page can contain both properties and projects in a single ordered list.

| Aspect | Details |
|--------|---------|
| **Base URL** | `/api/feed/` |
| **Auth** | Required (JWT/Bearer) |
| **Content** | Properties + Projects (interleaved) |
| **Pagination** | Page-based, 10–30 items per page |
| **Cache** | 5 min per user, invalidated on preference change |

---

## API Endpoints

### `GET /api/feed/properties/`

Returns a paginated, personalized feed of properties and projects.

#### Request

| Method | URL | Auth |
|--------|-----|------|
| `GET` | `/api/feed/properties/` | Required |

#### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|--------------|
| `page` | int | 1 | Page number |
| `page_size` | int | 10 | Items per page (max: 30) |

#### Example Request

```http
GET /api/feed/properties/?page=1&page_size=10
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "count": 150,
  "next": "https://api.example.com/api/feed/properties/?page=2&page_size=10",
  "previous": null,
  "results": [
    {
      "_type": "property",
      "id": 123,
      "title": "Beachfront Apartment",
      "price": 250000,
      "property_type": "apartment",
      "match_score": 0.85,
      "slot_type": "personalized",
      "is_favourite": false,
      "favorites_count": 12,
      "view_count": 156,
      "images": [...],
      "country": "Cyprus",
      "city": "Limassol",
      "latitude": 34.68,
      "longitude": 33.04,
      "url": "/john_doe/cyprus/limassol-apartment-123",
      ...
    },
    {
      "_type": "project",
      "id": 456,
      "name": "Sunrise Residences",
      "sale_price_min": 300000,
      "sale_price_max": 450000,
      "match_score": 0.72,
      "slot_type": "personalized",
      "images": [...],
      "country": "Cyprus",
      "location": "Limassol",
      "url": "/developers/acme-dev/sunrise-residences",
      ...
    }
  ]
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Invalid page (e.g. page=0 or negative) |
| `401` | Missing or invalid auth token |
| `500` | Server error generating feed |

---

## Response Schemas

### Feed Item (Discriminated Union)

Every item has `_type`, `match_score`, and `slot_type`. Use `_type` to branch rendering.

```typescript
type FeedItem = PropertyFeedItem | ProjectFeedItem;

interface BaseFeedItem {
  _type: 'property' | 'project';
  match_score: number;   // 0.0–1.0
  slot_type: 'personalized';
}

interface PropertyFeedItem extends BaseFeedItem {
  _type: 'property';
  id: number;
  title: string;
  price: number;
  property_type: PropertyType;
  is_favourite: boolean;
  favorites_count: number;
  view_count: number;
  images: PropertyImage[];
  country: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  url: string;
  // ... see PropertySerializer fields
}

interface ProjectFeedItem extends BaseFeedItem {
  _type: 'project';
  id: number;
  name: string;
  sale_price_min?: number;
  sale_price_max?: number;
  rent_price_min?: number;
  rent_price_max?: number;
  property_types: string[];  // e.g. ['apartment', 'house']
  images: ProjectImage[];
  country: string;
  location?: string;
  url: string | null;
  // NOTE: is_favourite, favorites_count NOT in feed response (see Known Issues)
  // ... see ProjectFeedSerializer fields
}
```

### Property Types (for `property_type`)

| Value | Label |
|-------|-------|
| `house` | House |
| `apartment` | Apartment |
| `land` | Land |
| `hotel` | Hotel |
| `shop` | Shop |
| `office` | Office |
| `residential_building` | Residential Building |

### Image Structure (both Property & Project)

```typescript
interface FeedImage {
  image: string;        // URL
  is_primary: boolean;
  display_order: number;
  created_at: string | null;  // ISO 8601
}
```

### Pagination

Standard DRF pagination:

- `count`: Total items across all pages
- `next`: URL for next page or `null`
- `previous`: URL for previous page or `null`
- `results`: Array of feed items for current page

---

## Related Endpoints

These are not part of the feed app but are used when building the feed UI.

### Property Detail

| Method | URL | Purpose |
|--------|-----|---------|
| `GET` | `/api/properties/{id}/` | Property detail (use `?source=feed` for click tracking) |

### Project Detail

| Method | URL | Purpose |
|--------|-----|---------|
| `GET` | `/api/dev/v1/projects/{id}/` | Project detail |

> **Note:** Project detail does not yet support `?source=feed` for feed click tracking. See [Known Issues](#known-issues--gaps).

### Favorites (Property)

| Method | URL | Purpose |
|--------|-----|---------|
| `POST` | `/api/properties/{id}/favourite/` | Toggle favorite |

### Favorites (Project)

| Method | URL | Purpose |
|--------|-----|---------|
| `POST` | `/api/properties/toggle-favourite/` | Toggle project favorite (body: `{ project_id: number }`) |

### Analytics Events (Optional)

| Method | URL | Purpose |
|--------|-----|---------|
| `POST` | `/api/analytics/events/` | Track client-side events |

> **Note:** `feed_impression` and `feed_dwell` are not yet valid event types. See [Known Issues](#known-issues--gaps).

---

## Navigation & Click Tracking

### Property Click Flow

1. User taps a property card in the feed.
2. Navigate to: `/property/{id}?source=feed`
3. Property detail page fetches: `GET /api/properties/{id}/?source=feed`
4. Backend: `mark_feed_click` updates `FeedImpression.was_clicked = True` for that user+property

**Frontend responsibility:** Pass `source=feed` when navigating from the feed.

```typescript
// Example: React Navigation
router.push(`/property/${property.id}?source=feed`);

// Example: API call from detail page
const source = searchParams.get('source');
const res = await api.properties.getById(id, source ? { params: { source } } : undefined);
```

### Project Click Flow

1. User taps a project card in the feed.
2. Navigate to: `/property/{id}?source=feed` or `/project/{id}?source=feed` (depending on app routing)
3. Project detail: `GET /api/dev/v1/projects/{id}/` — **no `source` param support yet**
4. Backend: **No `mark_feed_click` for projects** — project clicks are not recorded

**Current gap:** Project feed click tracking is not implemented. See [Known Issues](#known-issues--gaps).

### Project URL Format

Projects use canonical URLs:

- Format: `/developers/{orgSlug}/{projectSlug}`
- Example: `/developers/acme-dev/sunrise-residences`
- The `url` field in the feed response is this path (or `null` if org/slug missing).

---

## Algorithm & Scoring

### Final Score Formula

```
final_score = 0.5 * match_score + 0.3 * recency_score + 0.2 * popularity_score
```

### Match Score (0–1)

| Factor | Weight | Logic |
|--------|--------|-------|
| Price fit | 40% | ±20% → 1.0, ±35% → 0.5, else → 0.0 |
| Type fit | 35% | In top 3 preferred types → 1.0, else → 0.0 |
| Location fit | 25% | ≤5km → 1.0, ≤15km → 0.5, else → 0.1 |
| Confidence | multiplier | 0–1 based on user engagement |

### Recency Score

Exponential decay: `exp(-hours_old / 720)` (≈30 days half-life).

### Popularity Score

Bayesian: `(favorites + 50) / (views + 50.05)`.

### Preference Learning

Preferences are inferred from:

- `property_favorite`, `property_chat_initiate`, `property_phone_click` (weight 1.0)
- `property_share` (weight 0.6)
- `property_view` — first view (0.2), repeated view (0.4)

Time decay: ~30 days for price/location, ~45 days for type.

---

## Data Models Reference

### FeedImpression (server-side)

Created when the feed is served. Used for CTR and engagement.

| Field | Type | Description |
|-------|------|-------------|
| `user` | FK | User who saw the item |
| `property` | FK | Property (nullable) |
| `project` | FK | Project (nullable) |
| `feed_position` | int | Position in feed (1-indexed) |
| `slot_type` | str | `'personalized'` |
| `match_score` | float | Relevance score |
| `was_clicked` | bool | Updated when user opens detail with `?source=feed` |
| `shown_at` | datetime | When item was shown |

### UserPreferences (internal)

Cached preferences, recomputed when stale (5 min TTL).

| Field | Type | Description |
|-------|------|-------------|
| `preferred_price` | decimal | Weighted avg from events |
| `preferred_types` | JSON | `{ "apartment": 0.8, "house": 0.6 }` |
| `preferred_locations` | JSON | `[{ lat, lng, weight }, ...]` |
| `confidence` | float | 0–1 |

---

## Frontend Implementation Guide

### 1. Fetch Feed

```typescript
const fetchFeed = async (page = 1, pageSize = 10) => {
  const res = await fetch(
    `${API_BASE}/api/feed/properties/?page=${page}&page_size=${pageSize}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!res.ok) throw new Error('Failed to fetch feed');
  return res.json();
};
```

### 2. Render Mixed Feed

```tsx
function FeedItem({ item }: { item: FeedItem }) {
  if (item._type === 'property') {
    return <PropertyCard property={item} source="feed" />;
  }
  return <ProjectCard project={item} source="feed" />;
}

function FeedScreen() {
  const [data, setData] = useState<FeedResponse | null>(null);
  useEffect(() => {
    fetchFeed(1, 10).then(setData);
  }, []);

  return (
    <FlatList
      data={data?.results ?? []}
      renderItem={({ item }) => <FeedItem item={item} />}
      onEndReached={() => {
        if (data?.next) fetch(data.next).then(r => r.json()).then(appendResults);
      }}
    />
  );
}
```

### 3. Navigate with Source

```tsx
// Property card
<TouchableOpacity onPress={() => router.push(`/property/${item.id}?source=feed`)}>
  ...
</TouchableOpacity>

// Project card — use developers URL or app route
<TouchableOpacity onPress={() => router.push(`/project/${item.id}?source=feed`)}>
  ...
</TouchableOpacity>
```

### 4. Match Score Display

```tsx
{item.match_score != null && (
  <Badge>{(item.match_score * 100).toFixed(0)}% match</Badge>
)}
```

### 5. Favorites

- **Properties:** Use `is_favourite` and `favorites_count` from the feed response. No extra API call needed.
- **Projects:** Feed does not include `is_favourite` or `favorites_count`. Frontend may call `GET /api/dev/v1/projects/{id}/` or a listings endpoint to get favorite state — this causes extra requests per project card.

### 6. Error Handling

| Status | Action |
|--------|--------|
| 401 | Redirect to login / refresh token |
| 400 | Show “Invalid page” or reset pagination |
| 500 | Show generic error, optionally retry |

### 7. Loading & Cache

- First load can take 1–3s (cache miss).
- Subsequent pages are faster (cached).
- Show skeleton or spinner during load.

---

## Known Issues & Gaps

### 1. Project Click Tracking Not Implemented

- **Issue:** `mark_feed_click` only supports properties. No equivalent for projects.
- **Impact:** Project clicks from the feed are not recorded; CTR/engagement for projects is incomplete.
- **Workaround:** None. Backend change required.

### 2. Project Serializer Missing Favorite Fields

- **Issue:** `ProjectFeedSerializer` does not include `is_favourite` or `favorites_count`.
- **Impact:** Project cards need an extra API call to show favorite state.
- **Workaround:** Call project detail or a listings endpoint when rendering project cards.

### 3. Feed Impression / Dwell Event Types

- **Issue:** `feed_impression` and `feed_dwell` are not in `UserEvent.EVENT_TYPES`.
- **Impact:** Client-side analytics for these events may fail validation.
- **Workaround:** Rely on server-side `FeedImpression` for impressions; avoid sending `feed_impression`/`feed_dwell` until backend supports them.

### 4. Feed Position Validator

- **Issue:** `FeedImpression.feed_position` has `MaxValueValidator(10)`, but pagination can produce positions > 10 (e.g. page 2).
- **Impact:** Possible validation errors when recording impressions for page 2+.
- **Workaround:** Backend should relax or remove the max validator.

### 5. Project Detail Route (Frontend)

- **Issue:** If the app uses `/project/{id}` but no such route exists, project taps lead to 404.
- **Fix:** Add `app/project/[id].tsx` (or equivalent) or route projects to an existing screen (e.g. `/developers/{orgSlug}/{projectSlug}` using `item.url`).

### 6. Dead Code: Not Interested

- **Issue:** `api.feed.notInterested()` exists but is never called.
- **Impact:** None. Safe to remove or leave.

---

## Quick Reference

### URLs

| Purpose | URL |
|---------|-----|
| Feed | `GET /api/feed/properties/?page=1&page_size=10` |
| Property detail (with tracking) | `GET /api/properties/{id}/?source=feed` |
| Project detail | `GET /api/dev/v1/projects/{id}/` |

### Required Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Response Shape

```json
{
  "count": number,
  "next": string | null,
  "previous": string | null,
  "results": Array<PropertyFeedItem | ProjectFeedItem>
}
```

### Feed Item Fields (always present)

- `_type`: `"property"` | `"project"`
- `match_score`: number (0–1)
- `slot_type`: `"personalized"`
- `id`: number

### Property vs Project

| Field | Property | Project |
|-------|----------|---------|
| Title | `title` | `name` |
| Price | `price` | `sale_price_min`, `rent_price_min` |
| Type | `property_type` (single) | `property_types` (array) |
| `is_favourite` | ✅ | ❌ (missing) |
| `favorites_count` | ✅ | ❌ (missing) |

---

*Last updated: Feb 2025*
