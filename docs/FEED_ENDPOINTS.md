# Feed App - Frontend Endpoints Documentation

## Base URL
All feed endpoints are prefixed with: `/api/feed/`

---

## Endpoints

### 1. Get Personalized Feed
**Endpoint:** `GET /api/feed/properties/`

**Description:**  
Returns a paginated, personalized feed of properties and projects ranked by user preferences, recency, and popularity. The feed combines both properties and projects in a single response, sorted by relevance score.

**Authentication:**  
✅ Required - User must be authenticated (`IsAuthenticated` permission)

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `page_size` (optional): Number of items per page (default: 10, max: 30)

**Response Format:**
```json
{
  "count": 150,
  "next": "http://example.com/api/feed/properties/?page=2",
  "previous": null,
  "results": [
    {
      "_type": "property",  // or "project"
      "id": 123,
      "title": "Property Title",
      "price": 250000,
      "property_type": "apartment",
      "match_score": 0.85,
      "slot_type": "personalized",
      // ... other property fields from PropertySerializer
    },
    {
      "_type": "project",
      "id": 456,
      "name": "Project Name",
      "sale_price_min": 300000,
      "match_score": 0.72,
      "slot_type": "personalized",
      // ... other project fields from ProjectFeedSerializer
    }
  ]
}
```

**Response Fields:**
- `_type`: Discriminator field indicating whether the item is a `"property"` or `"project"`
- `match_score`: Float (0.0-1.0) indicating how well the item matches user preferences
- `slot_type`: Always `"personalized"` (explore slots removed)
- All other fields from `PropertySerializer` (for properties) or `ProjectFeedSerializer` (for projects)

**Pagination:**
- Default page size: 10 items
- Maximum page size: 30 items
- Uses standard Django REST Framework pagination

**Caching:**
- Feed results are cached for 5 minutes per user
- Cache is automatically invalidated when user preferences change
- Cache key includes user ID and preferences timestamp

**Algorithm:**
The feed uses a sophisticated scoring algorithm that considers:
1. **Match Score** (50% weight):
   - Price fit: ±20% → 1.0, ±35% → 0.5, else → 0.0
   - Type fit: Matches preferred types → 1.0, else → 0.0
   - Location fit: ≤5km → 1.0, ≤15km → 0.5, else → 0.1
   - Confidence: Based on user engagement history
2. **Recency Score** (30% weight): Exponential decay based on creation date
3. **Popularity Score** (20% weight): Bayesian approach using favorites and views

**Feed Impressions:**
- Each item shown in the feed creates a `FeedImpression` record
- Tracks: user, property/project, position, slot_type, match_score, timestamp
- Used for analytics and improving recommendations

**Error Responses:**
- `400 Bad Request`: Invalid page number
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Server error generating feed

---

## Related Endpoints (Not in Feed App)

### Mark Feed Click (Internal)
**Note:** This is not a direct endpoint, but is called internally when a user views a property from the feed.

**Trigger:** When accessing a property detail endpoint with `source=feed` parameter:
- `GET /api/properties/{id}/?source=feed`

**Function:** `mark_feed_click(user, property_obj)`
- Finds the most recent `FeedImpression` for the user+property (within last 24h)
- Updates `was_clicked=True` on the impression record
- Used for tracking feed engagement and improving recommendations

---

## Data Models Used

### FeedImpression
Tracks when items are shown in the feed:
- `user`: User who saw the feed
- `property`: Property shown (nullable)
- `project`: Project shown (nullable)
- `feed_position`: Position in feed (1-indexed)
- `slot_type`: Type of slot ("personalized")
- `match_score`: Relevance score
- `was_clicked`: Whether user clicked on the item
- `shown_at`: Timestamp when shown

### UserPreferences
Stores computed user preferences:
- `preferred_price`: Average preferred price
- `preferred_types`: Dict of top 3 preferred property types
- `preferred_locations`: List of top 3 location centroids
- `confidence`: Confidence level (0.0-1.0)
- `last_updated`: Timestamp of last computation

---

## Frontend Integration Notes

1. **Authentication:** Always include authentication token in headers:
   ```
   Authorization: Bearer <token>
   ```

2. **Type Discrimination:** Use the `_type` field to determine how to render each item:
   ```javascript
   if (item._type === 'property') {
     // Render property card
   } else if (item._type === 'project') {
     // Render project card
   }
   ```

3. **Pagination:** Use the `next` and `previous` URLs for navigation, or construct URLs with `page` and `page_size` parameters.

4. **Match Score Display:** Consider showing `match_score` as a relevance indicator (e.g., "95% match").

5. **Feed Click Tracking:** When navigating to a property detail page from the feed, include `source=feed` in the query parameters to track engagement.

6. **Error Handling:** Handle 401 errors by redirecting to login, and 500 errors with user-friendly messages.

7. **Loading States:** The feed may take a moment to compute on first load (cache miss), show appropriate loading indicators.

---

## Example Frontend Usage

```javascript
// Fetch personalized feed
async function fetchFeed(page = 1, pageSize = 10) {
  const response = await fetch(
    `/api/feed/properties/?page=${page}&page_size=${pageSize}`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch feed');
  }
  
  return await response.json();
}

// Usage
const feedData = await fetchFeed(1, 10);
feedData.results.forEach(item => {
  if (item._type === 'property') {
    renderPropertyCard(item);
  } else if (item._type === 'project') {
    renderProjectCard(item);
  }
});
```

---

## Summary

**Total Endpoints:** 1 main endpoint

**Main Endpoint:**
- `GET /api/feed/properties/` - Get personalized feed (paginated)

**Key Features:**
- ✅ Personalized recommendations based on user behavior
- ✅ Mixed content (properties + projects)
- ✅ Pagination support
- ✅ Caching for performance
- ✅ Automatic preference learning
- ✅ Engagement tracking
