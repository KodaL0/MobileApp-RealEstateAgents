/**
 * Centralized Analytics Service for PropertPro Mobile App
 * 
 * This service provides a clean, typed interface for tracking events
 * that mirrors the backend EventTracker class structure.
 * 
 * All methods are non-blocking and fail silently to ensure tracking
 * never impacts user experience.
 */

import { apiPost } from '@/config/api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EventMetadata = Record<string, any>;

export interface PropertyViewParams {
  propertyId: number | string;
  source: string; // e.g., 'feed', 'search_results', 'featured', 'direct'
  position?: number; // Position in search results (optional)
}

export interface ProfileViewParams {
  agentId: number | string;
  propertyId?: number | string; // Optional: if viewing from a property context
  source: string; // e.g., 'feed_reel', 'property_page', 'search_results', 'direct'
  tab?: string; // Optional: which tab is being viewed
}

export interface PropertyFavoriteParams {
  propertyId: number | string;
  action: 'add' | 'remove';
}

export interface PropertyContactParams {
  propertyId: number | string;
  contactMethod: 'phone' | 'email' | 'chat' | 'whatsapp';
}

export interface PropertyShareParams {
  propertyId: number | string;
  method: string; // e.g., 'facebook', 'twitter', 'whatsapp', 'copy_link'
}

export interface SearchPerformedParams {
  query?: string;
  filters: Record<string, any>;
  resultsCount: number;
  propertyStatus?: 'sale' | 'rent';
}

export interface FilterChangeParams {
  filterName: string;
  filterValue: any;
  resultsCount: number;
}

export interface SortChangeParams {
  sortBy: string;
  resultsCount: number;
}

// ============================================================================
// INTERNAL HELPER: Core tracking function
// ============================================================================

/**
 * Internal helper to send events to the backend.
 * All tracking methods use this under the hood.
 */
async function trackEvent(
  eventType: string,
  payload: {
    propertyId?: number | string;
    agentId?: number | string;
    metadata?: EventMetadata;
  }
): Promise<void> {
  try {
    await apiPost('analytics/events', {
      event_type: eventType,
      ...payload,
    });
  } catch (error) {
    // Silently fail - tracking should never break the app
    if (__DEV__) {
      console.warn(`[Analytics] Failed to track ${eventType}:`, error);
    }
  }
}

// ============================================================================
// PROPERTY EVENTS
// ============================================================================

/**
 * Track when a user views a property detail page.
 * 
 * @example
 * ```ts
 * analytics.trackPropertyView({
 *   propertyId: 123,
 *   source: 'feed',
 *   position: 2
 * });
 * ```
 */
export function trackPropertyView(params: PropertyViewParams): void {
  trackEvent('property_view', {
    propertyId: params.propertyId,
    metadata: {
      source: params.source,
      ...(params.position !== undefined && { position: params.position }),
    },
  });
}

/**
 * Track when a user favorites/unfavorites a property.
 * 
 * @example
 * ```ts
 * analytics.trackPropertyFavorite({
 *   propertyId: 123,
 *   action: 'add'
 * });
 * ```
 */
export function trackPropertyFavorite(params: PropertyFavoriteParams): void {
  const eventType = params.action === 'add' ? 'property_favorite' : 'property_unfavorite';
  trackEvent(eventType, {
    propertyId: params.propertyId,
    metadata: {
      action: params.action,
    },
  });
}

/**
 * Track when a user clicks to contact a property owner.
 * This is a conversion event!
 * 
 * @example
 * ```ts
 * analytics.trackPropertyContact({
 *   propertyId: 123,
 *   contactMethod: 'chat'
 * });
 * ```
 */
export function trackPropertyContact(params: PropertyContactParams): void {
  // Map contact_method to correct event type
  // Chat uses 'property_chat_initiate' to match feed algorithm expectations
  const eventType =
    params.contactMethod === 'chat'
      ? 'property_chat_initiate'
      : `property_${params.contactMethod}_click`;

  trackEvent(eventType, {
    propertyId: params.propertyId,
    metadata: {
      contact_method: params.contactMethod,
      is_conversion: true,
    },
  });
}

/**
 * Track when a user shares a property.
 * 
 * @example
 * ```ts
 * analytics.trackPropertyShare({
 *   propertyId: 123,
 *   method: 'copy_link'
 * });
 * ```
 */
export function trackPropertyShare(params: PropertyShareParams): void {
  trackEvent('property_share', {
    propertyId: params.propertyId,
    metadata: {
      share_method: params.method,
    },
  });
}

/**
 * Track when a user views/downloads a property document.
 * 
 * @example
 * ```ts
 * analytics.trackDocumentView({
 *   propertyId: 123,
 *   documentType: 'floor_plan',
 *   documentName: 'floor-plan.pdf'
 * });
 * ```
 */
export function trackDocumentView(
  propertyId: number | string,
  documentType: string,
  documentName: string
): void {
  trackEvent('property_document_view', {
    propertyId,
    metadata: {
      document_type: documentType,
      document_name: documentName,
    },
  });
}

// ============================================================================
// SEARCH EVENTS
// ============================================================================

/**
 * Track search queries and filters.
 * 
 * @example
 * ```ts
 * analytics.trackSearch({
 *   query: 'beachfront apartment',
 *   filters: { price_max: 500000, bedrooms: 2 },
 *   resultsCount: 42,
 *   propertyStatus: 'sale'
 * });
 * ```
 */
export function trackSearch(params: SearchPerformedParams): void {
  trackEvent('search_performed', {
    metadata: {
      query: params.query?.substring(0, 200) || '', // Limit length
      filters: params.filters,
      results_count: params.resultsCount,
      has_results: params.resultsCount > 0,
      property_status: params.propertyStatus || 'sale',
    },
  });
}

/**
 * Track when a user changes a filter.
 * 
 * @example
 * ```ts
 * analytics.trackFilterChange({
 *   filterName: 'price_max',
 *   filterValue: 500000,
 *   resultsCount: 25
 * });
 * ```
 */
export function trackFilterChange(params: FilterChangeParams): void {
  trackEvent('filter_applied', {
    metadata: {
      filter_name: params.filterName,
      filter_value: String(params.filterValue),
      results_count: params.resultsCount,
    },
  });
}

/**
 * Track when a user changes sort order.
 * 
 * @example
 * ```ts
 * analytics.trackSortChange({
 *   sortBy: 'price-asc',
 *   resultsCount: 50
 * });
 * ```
 */
export function trackSortChange(params: SortChangeParams): void {
  trackEvent('sort_changed', {
    metadata: {
      sort_by: params.sortBy,
      results_count: params.resultsCount,
    },
  });
}

// ============================================================================
// PROFILE EVENTS
// ============================================================================

/**
 * Track profile page views.
 * 
 * @example
 * ```ts
 * analytics.trackProfileView({
 *   agentId: 456,
 *   propertyId: 123, // Optional: if viewing from property context
 *   source: 'feed_reel',
 *   tab: 'listings' // Optional
 * });
 * ```
 */
export function trackProfileView(params: ProfileViewParams): void {
  trackEvent('profile_view', {
    agentId: params.agentId,
    propertyId: params.propertyId,
    metadata: {
      source: params.source,
      ...(params.tab && { tab: params.tab }),
    },
  });
}

// ============================================================================
// USER EVENTS
// ============================================================================

/**
 * Track user registrations.
 * 
 * @example
 * ```ts
 * analytics.trackUserRegistration({
 *   method: 'email',
 *   isDeveloper: false
 * });
 * ```
 */
export function trackUserRegistration(params: {
  method?: 'email' | 'google' | 'facebook';
  isDeveloper?: boolean;
}): void {
  trackEvent('user_register', {
    metadata: {
      method: params.method || 'email',
      is_developer: params.isDeveloper || false,
    },
  });
}

/**
 * Track user logins.
 * 
 * @example
 * ```ts
 * analytics.trackUserLogin({ method: 'email' });
 * ```
 */
export function trackUserLogin(params?: { method?: 'email' | 'google' | 'facebook' }): void {
  trackEvent('user_login', {
    metadata: {
      method: params?.method || 'email',
    },
  });
}

// ============================================================================
// SOCIAL EVENTS
// ============================================================================

/**
 * Track connection requests and actions.
 * 
 * @example
 * ```ts
 * analytics.trackConnectionAction({
 *   targetUserId: 789,
 *   action: 'send'
 * });
 * ```
 */
export function trackConnectionAction(params: {
  targetUserId: number | string;
  action: 'send' | 'accept' | 'reject' | 'remove';
}): void {
  trackEvent('connection_action', {
    agentId: params.targetUserId,
    metadata: {
      action: params.action,
    },
  });
}

/**
 * Track chat/messaging events.
 * 
 * @example
 * ```ts
 * analytics.trackChatAction({
 *   action: 'initiate',
 *   recipientUserId: 789,
 *   propertyId: 123
 * });
 * ```
 */
export function trackChatAction(params: {
  action: 'initiate' | 'send_message' | 'view_thread';
  recipientUserId?: number | string;
  propertyId?: number | string;
}): void {
  trackEvent('chat_action', {
    agentId: params.recipientUserId,
    propertyId: params.propertyId,
    metadata: {
      action: params.action,
    },
  });
}

/**
 * Track review creation/updates.
 * 
 * @example
 * ```ts
 * analytics.trackReviewAction({
 *   targetUserId: 789,
 *   action: 'create',
 *   rating: 5
 * });
 * ```
 */
export function trackReviewAction(params: {
  targetUserId: number | string;
  action: 'create' | 'update' | 'delete';
  rating?: number;
}): void {
  trackEvent('review_action', {
    agentId: params.targetUserId,
    metadata: {
      action: params.action,
      ...(params.rating !== undefined && { rating: params.rating }),
    },
  });
}

// ============================================================================
// DEVELOPER EVENTS
// ============================================================================

/**
 * Track developer portal actions.
 * 
 * @example
 * ```ts
 * analytics.trackDeveloperAction({
 *   action: 'create_project',
 *   details: { projectId: 123 }
 * });
 * ```
 */
export function trackDeveloperAction(params: {
  action: string;
  details?: EventMetadata;
}): void {
  trackEvent('developer_action', {
    metadata: {
      action: params.action,
      ...(params.details || {}),
    },
  });
}

// ============================================================================
// INSTAGRAM EVENTS
// ============================================================================

/**
 * Track Instagram post attempts.
 * 
 * @example
 * ```ts
 * analytics.trackInstagramPost({
 *   propertyId: 123,
 *   success: true
 * });
 * ```
 */
export function trackInstagramPost(params: {
  propertyId: number | string;
  success: boolean;
  errorMessage?: string;
}): void {
  trackEvent('instagram_post', {
    propertyId: params.propertyId,
    metadata: {
      success: params.success,
      ...(params.errorMessage && { error_message: params.errorMessage }),
    },
  });
}

// ============================================================================
// FEED EVENTS (impression, dwell, not-interested)
// ============================================================================

export interface FeedImpressionParams {
  itemId: number | string;
  itemType: 'property' | 'project';
  position: number;
  slotType?: string | null;
  matchScore?: number | null;
}

export interface FeedDwellParams {
  itemId: number | string;
  itemType: 'property' | 'project';
  dwellTimeMs: number;
  position: number;
}

export interface FeedNotInterestedParams {
  itemId: number | string;
  itemType: 'property' | 'project';
}

/**
 * Track when a feed item becomes visible in the viewport.
 *
 * @example
 * ```ts
 * analytics.trackFeedImpression({
 *   itemId: 123,
 *   itemType: 'property',
 *   position: 0,
 *   slotType: 'personalized',
 *   matchScore: 0.87,
 * });
 * ```
 */
export function trackFeedImpression(params: FeedImpressionParams): void {
  trackEvent('feed_impression', {
    propertyId: params.itemId,
    metadata: {
      item_type: params.itemType,
      position: params.position,
      slot_type: params.slotType ?? null,
      match_score: params.matchScore ?? null,
    },
  });
}

/**
 * Track how long a user viewed a single feed item.
 * Only fired when dwell > 500 ms (meaningful view).
 *
 * @example
 * ```ts
 * analytics.trackFeedDwell({
 *   itemId: 123,
 *   itemType: 'property',
 *   dwellTimeMs: 4200,
 *   position: 2,
 * });
 * ```
 */
export function trackFeedDwell(params: FeedDwellParams): void {
  trackEvent('feed_dwell', {
    propertyId: params.itemId,
    metadata: {
      item_type: params.itemType,
      dwell_time_ms: params.dwellTimeMs,
      position: params.position,
    },
  });
}

/**
 * Track when a user explicitly signals "not interested" on a feed item.
 * This is a strong negative signal for the ranking algorithm.
 *
 * @example
 * ```ts
 * analytics.trackFeedNotInterested({ itemId: 123, itemType: 'property' });
 * ```
 */
export function trackFeedNotInterested(params: FeedNotInterestedParams): void {
  trackEvent('feed_not_interested', {
    propertyId: params.itemId,
    metadata: {
      item_type: params.itemType,
    },
  });
}

// ============================================================================
// EXPORT: Centralized Analytics Object
// ============================================================================

/**
 * Centralized analytics service.
 * 
 * Import and use like this:
 * ```ts
 * import { analytics } from '@/services/analytics';
 * 
 * analytics.trackPropertyView({ propertyId: 123, source: 'feed' });
 * ```
 */
export const analytics = {
  // Property events
  trackPropertyView,
  trackPropertyFavorite,
  trackPropertyContact,
  trackPropertyShare,
  trackDocumentView,

  // Search events
  trackSearch,
  trackFilterChange,
  trackSortChange,

  // Profile events
  trackProfileView,

  // User events
  trackUserRegistration,
  trackUserLogin,

  // Social events
  trackConnectionAction,
  trackChatAction,
  trackReviewAction,

  // Developer events
  trackDeveloperAction,

  // Instagram events
  trackInstagramPost,

  // Feed events
  trackFeedImpression,
  trackFeedDwell,
  trackFeedNotInterested,
};

export default analytics;


