# Feed API v2 -- Frontend Contract

> Versioned API reference for the personalized feed endpoint.
> This document is the frontend engineer's contract for building the feed UI.

**Version:** v2
**Date:** February 2026

---

## Changelog (v1 -> v2)

- **Fixed:** `feed_position` validator no longer rejects page 2+ impressions (was capped at 10)
- **Added:** Project click tracking via `?source=feed` on project detail endpoint
- **Added:** `is_favourite` and `favorites_count` fields on project feed items (eliminates extra API calls)
- **Added:** Units prefetch for properties (reduces latency for multi-unit properties)

---

## Endpoint

### `GET /api/feed/properties/`

Returns a paginated, personalized feed of properties and projects.

**Auth:** Required (`Authorization: Bearer <token>`)

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `page` | int | 1 | -- | Page number |
| `page_size` | int | 10 | 30 | Items per page |

### Response (200)

```json
{
  "count": 150,
  "next": "https://api.example.com/api/feed/properties/?page=2&page_size=10",
  "previous": null,
  "results": [
    { "_type": "property", ... },
    { "_type": "project", ... }
  ]
}
```

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Invalid page number |
| 401 | Missing or invalid auth token |
| 500 | Server error |

---

## Response Schemas

### Discriminated Union

Every item in `results` has `_type`, `match_score`, and `slot_type`. Use `_type` to branch rendering logic.

```typescript
type FeedItem = PropertyFeedItem | ProjectFeedItem;
```

### Shared Fields (present on every item)

| Field | Type | Description |
|-------|------|-------------|
| `_type` | `"property"` or `"project"` | Discriminator |
| `id` | number | Unique identifier |
| `match_score` | number (0.0--1.0) | Relevance to user preferences |
| `slot_type` | `"personalized"` | Always `"personalized"` |
| `is_favourite` | boolean | Whether current user has favourited this item |
| `favorites_count` | number | Total favourites count |

---

### PropertyFeedItem

All fields from `PropertySerializer`, plus feed fields.

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Property ID |
| `title` | string | Property title |
| `description` | string | Full description |
| `price` | number | Price (for multi-unit: equals `unit_price_min`) |
| `property_type` | string | One of: `house`, `apartment`, `land`, `hotel`, `shop`, `office`, `residential_building` |
| `location` | string | Legacy location string |
| `country` | string | Country name |
| `region` | string or null | Region |
| `city` | string or null | City |
| `postal_code` | string or null | Postal code |
| `street` | string or null | Street address |
| `latitude` | number or null | Latitude |
| `longitude` | number or null | Longitude |
| `bedrooms` | number | Bedrooms (for multi-unit: may be 0; use unit ranges) |
| `bathrooms` | number | Bathrooms |
| `area` | number | Area in sqm |
| `year_built` | number or null | Year built |
| `parking_spaces` | number or null | Parking spaces |
| `lot_size` | number or null | Lot size |
| `property_status` | string | `for_sale`, `for_rent`, `sold`, `rented` |
| `energy_rating` | string or null | A--G |
| `construction_material` | string or null | Construction material |
| `floor_level` | number or null | Floor level |
| `total_floors` | number or null | Total floors |
| `available_from` | string or null | Available from date |
| `contact_phone` | string | Contact phone (auth users only) |
| `contact_email` | string | Contact email (auth users only) |
| `virtual_tour_url` | string or null | Virtual tour URL |
| `video_url` | string or null | Video URL |
| `amenities` | string[] | Amenity IDs |
| `owner` | object | `{ id, username, ... }` |
| `is_published` | boolean | Always true in feed |
| `is_featured` | boolean | Whether featured |
| `is_favourite` | boolean | Whether favourited by current user |
| `favorites_count` | number | Total favourites |
| `view_count` | number | Total views |
| `created_at` | string (ISO 8601) | Created timestamp |
| `updated_at` | string (ISO 8601) | Updated timestamp |
| `images` | Image[] | Property images |
| `documents` | Document[] | Property documents |
| `url` | string | Canonical display URL: `/{username}/{country}/{location-type-id}` |
| **Multi-unit fields** | | |
| `has_units` | boolean | True if property has units |
| `total_units` | number | Total unit count |
| `available_units` | number | Available unit count |
| `unit_bedrooms_min` | number or null | Min bedrooms across available units |
| `unit_bedrooms_max` | number or null | Max bedrooms |
| `unit_bathrooms_min` | number or null | Min bathrooms |
| `unit_bathrooms_max` | number or null | Max bathrooms |
| `unit_area_min` | number or null | Min area (sqm) |
| `unit_area_max` | number or null | Max area (sqm) |
| `unit_price_min` | number or null | Min unit price |
| `unit_price_max` | number or null | Max unit price |
| `units` | Unit[] | Array of unit objects |

#### Unit Object

| Field | Type |
|-------|------|
| `id` | number |
| `unit_number` | string |
| `unit_name` | string or null |
| `bedrooms` | number |
| `bathrooms` | number |
| `area` | number |
| `floor_level` | number or null |
| `lot_size` | number or null |
| `total_floors` | number or null |
| `parking_spaces` | number or null |
| `price` | number |
| `status` | string (`available`, `reserved`, `sold`) |
| `is_published` | boolean |

#### Image Object

| Field | Type |
|-------|------|
| `id` | number |
| `image` | string (URL) |
| `is_primary` | boolean |
| `display_order` | number |
| `created_at` | string (ISO 8601) |

---

### ProjectFeedItem

All fields from `ProjectFeedSerializer`, plus feed fields.

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Project ID |
| `name` | string | Project name |
| `description` | string | Description |
| `location` | string or null | Location text |
| `country` | string | Country name |
| `status` | string | Project status |
| `start_date` | string or null | Start date |
| `completion_date` | string or null | Completion date |
| `total_units` | number | Total units in project |
| `available_units` | number | Available units |
| `property_types` | string[] | e.g. `["apartment", "house"]` |
| `amenities` | any | Project amenities |
| `features` | any | Project features |
| `main_image` | string or null | Main image URL |
| `latitude` | number or null | Latitude |
| `longitude` | number or null | Longitude |
| `is_published` | boolean | Always true in feed |
| `created_at` | string (ISO 8601) | Created timestamp |
| `updated_at` | string (ISO 8601) | Updated timestamp |
| **Sale ranges** | | |
| `sale_price_min` | number or null | Min sale price |
| `sale_price_max` | number or null | Max sale price |
| `sale_bedrooms_min` | number or null | Min bedrooms (sale) |
| `sale_bedrooms_max` | number or null | Max bedrooms (sale) |
| `sale_bathrooms_min` | number or null | Min bathrooms (sale) |
| `sale_bathrooms_max` | number or null | Max bathrooms (sale) |
| `sale_area_min` | number or null | Min area (sale) |
| `sale_area_max` | number or null | Max area (sale) |
| **Rent ranges** | | |
| `rent_price_min` | number or null | Min rent price |
| `rent_price_max` | number or null | Max rent price |
| `rent_bedrooms_min` | number or null | Min bedrooms (rent) |
| `rent_bedrooms_max` | number or null | Max bedrooms (rent) |
| `rent_bathrooms_min` | number or null | Min bathrooms (rent) |
| `rent_bathrooms_max` | number or null | Max bathrooms (rent) |
| `rent_area_min` | number or null | Min area (rent) |
| `rent_area_max` | number or null | Max area (rent) |
| **Computed fields** | | |
| `images` | Image[] | Normalized image array (same structure as property images) |
| `url` | string or null | Canonical URL: `/developers/{orgSlug}/{projectSlug}` |
| `owner` | object or null | `{ id, username, ... }` from organization owner |
| `contact_phone` | string or null | Organization phone (auth users only) |
| `contact_email` | string or null | Organization email (auth users only) |
| `is_favourite` | boolean | Whether favourited by current user **(new in v2)** |
| `favorites_count` | number | Total favourites **(new in v2)** |

---

## Navigation and Click Tracking

When a user taps a feed item, pass `source=feed` so the backend records the click on the `FeedImpression` record.

### Property

1. Navigate to property detail page with `source=feed` in URL
2. Detail page fetches: `GET /api/properties/{id}/?source=feed`
3. Backend updates `FeedImpression.was_clicked = True`

### Project

1. Navigate to project detail page with `source=feed` in URL
2. Detail page fetches: `GET /api/dev/v1/projects/{id}/public_detail/?source=feed`
3. Backend updates `FeedImpression.was_clicked = True` **(new in v2)**

### Code Example

```typescript
// Property card tap
function onPropertyTap(item: PropertyFeedItem) {
  router.push(`/property/${item.id}?source=feed`);
}

// Project card tap
function onProjectTap(item: ProjectFeedItem) {
  router.push(`/project/${item.id}?source=feed`);
}

// In detail page, forward source to API:
const source = searchParams.get('source');
// Property:
await fetch(`/api/properties/${id}/?source=${source || 'direct'}`);
// Project:
await fetch(`/api/dev/v1/projects/${id}/public_detail/?source=${source || 'direct'}`);
```

---

## Multi-Unit Properties

Properties can have multiple units (apartments, houses with ADUs, etc.).

### Detection

```typescript
if (item._type === 'property' && item.has_units) {
  // Multi-unit property
}
```

### Display Rules

| Scenario | Price display | Details |
|----------|--------------|---------|
| `has_units === false` | Show `price` | Standard single-unit property |
| `has_units === true`, `unit_price_min === unit_price_max` | Show `unit_price_min` | All units same price |
| `has_units === true`, `unit_price_min !== unit_price_max` | Show range: "From {unit_price_min}" or "{unit_price_min} -- {unit_price_max}" | Price range |

### Other Range Fields

When `has_units === true`, use:

- `unit_bedrooms_min` / `unit_bedrooms_max` instead of `bedrooms`
- `unit_bathrooms_min` / `unit_bathrooms_max` instead of `bathrooms`
- `unit_area_min` / `unit_area_max` instead of `area`

The top-level `bedrooms`, `bathrooms`, `area` may be 0 or stale for multi-unit properties.

### Units Array

The `units` array contains individual unit details for drill-down display:

```typescript
item.units.forEach(unit => {
  // unit.unit_number, unit.price, unit.bedrooms, unit.status, etc.
});
```

Only units with `is_published === true` and `status === 'available'` should be shown to end users.

---

## Favourites

### Property Favourite Toggle

```
POST /api/properties/{id}/favourite/
```

### Project Favourite Toggle

```
POST /api/properties/toggle-favourite/
Body: { "project_id": <number> }
```

Both return the updated favourite state. The feed response already includes `is_favourite` and `favorites_count` for both properties and projects, so no extra call is needed on initial render.

---

## Property vs Project Field Comparison

| Concept | Property field | Project field |
|---------|---------------|---------------|
| Title | `title` | `name` |
| Single price | `price` | -- |
| Sale price range | `unit_price_min` / `unit_price_max` | `sale_price_min` / `sale_price_max` |
| Rent price range | -- | `rent_price_min` / `rent_price_max` |
| Type | `property_type` (single string) | `property_types` (string array) |
| Location | `city`, `region`, `country` | `location`, `country` |
| Units/availability | `has_units`, `total_units`, `available_units` | `total_units`, `available_units` |
| Favourite state | `is_favourite` | `is_favourite` **(new in v2)** |
| Favourite count | `favorites_count` | `favorites_count` **(new in v2)** |
| Detail URL | `/api/properties/{id}/` | `/api/dev/v1/projects/{id}/public_detail/` |
| Canonical URL | `url` = `/{username}/{country}/{slug}` | `url` = `/developers/{orgSlug}/{projectSlug}` |

---

## Quick Reference

### URLs

| Purpose | URL |
|---------|-----|
| Feed | `GET /api/feed/properties/?page=1&page_size=10` |
| Property detail (with click tracking) | `GET /api/properties/{id}/?source=feed` |
| Project detail (with click tracking) | `GET /api/dev/v1/projects/{id}/public_detail/?source=feed` |
| Toggle property favourite | `POST /api/properties/{id}/favourite/` |
| Toggle project favourite | `POST /api/properties/toggle-favourite/` with `{ project_id }` |

### Required Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Property Types

| Value | Label |
|-------|-------|
| `house` | House |
| `apartment` | Apartment |
| `land` | Land |
| `hotel` | Hotel |
| `shop` | Shop |
| `office` | Office |
| `residential_building` | Residential Building |
