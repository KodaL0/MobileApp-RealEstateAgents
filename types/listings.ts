/**
 * Unified Listings API Types
 * 
 * This file contains TypeScript interfaces for the unified listings API
 * that returns both Properties and Projects in a single response.
 * 
 * Backend endpoints:
 * - GET /api/listings/buy/
 * - GET /api/listings/rent/
 * - GET /api/listings/search/
 */

import type { 
  Property, 
  PropertyImage, 
  Project, 
  ProjectImage,
  Owner 
} from '@/app/features/types';

// ============================================================================
// LISTING TYPES (with _type discriminator)
// ============================================================================

/**
 * Property listing as returned by unified API
 * Includes _type discriminator for TypeScript type narrowing
 */
export interface PropertyListing extends Property {
  _type: 'property';
  id: number;
  title: string;
  description: string;
  price: number;
  location: string;
  property_type: string;
  property_status: 'for_sale' | 'for_rent';
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  images: PropertyImage[];
  amenities: string[];
  owner: Owner;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Additional structured location fields
  country?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  street?: string;
  latitude?: number | null;
  longitude?: number | null;
  // Computed fields
  is_favourite?: boolean;
  favorites_count?: number;
  view_count?: number;
  url?: string;
}

/**
 * Project listing as returned by unified API
 * Includes _type discriminator for TypeScript type narrowing
 */
export interface ProjectListing extends Project {
  _type: 'project';
  id: number;
  name: string;
  description?: string;
  location: string;
  country: string;
  status: 'planning' | 'construction' | 'completed' | 'available';
  total_units: number;
  available_units: number;
  property_types: string[];
  amenities: string[];
  features: string[];
  images: ProjectImage[];
  main_image?: string;
  // Sale ranges
  sale_price_min?: number | null;
  sale_price_max?: number | null;
  sale_bedrooms_min?: number;
  sale_bedrooms_max?: number;
  sale_bathrooms_min?: number;
  sale_bathrooms_max?: number;
  sale_area_min?: number;
  sale_area_max?: number;
  // Rent ranges
  rent_price_min?: number | null;
  rent_price_max?: number | null;
  rent_bedrooms_min?: number;
  rent_bedrooms_max?: number;
  rent_bathrooms_min?: number;
  rent_bathrooms_max?: number;
  rent_area_min?: number;
  rent_area_max?: number;
  // Owner/contact
  owner?: Owner;
  contact_phone?: string;
  contact_email?: string;
  // Location
  latitude?: number | null;
  longitude?: number | null;
  // Computed fields
  is_favourite?: boolean;
  favorites_count?: number;
  view_count?: number;
  url?: string;
  // Metadata
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Discriminated union type for unified listings
 * TypeScript will narrow the type based on the _type field
 */
export type UnifiedListing = PropertyListing | ProjectListing;

// ============================================================================
// QUERY PARAMETERS
// ============================================================================

/**
 * Query parameters for unified listings API endpoints
 * All parameters match backend implementation in:
 * - Propertprodjango/listings/views.py
 */
export interface ListingQueryParams {
  /** Page number for pagination (default: 1) */
  page?: number;
  
  /** Number of results per page (default: 20) */
  page_size?: number;
  
  /** Minimum price filter */
  price_min?: number;
  
  /** Maximum price filter */
  price_max?: number;
  
  /** Minimum price filter (alternative naming) */
  minPrice?: number;
  
  /** Maximum price filter (alternative naming) */
  maxPrice?: number;
  
  /** Minimum number of bedrooms */
  bedrooms?: number;
  
  /** Minimum number of bathrooms */
  bathrooms?: number;
  
  /** Minimum area in square meters */
  area_min?: number;
  
  /** Maximum area in square meters */
  area_max?: number;
  
  /** Minimum area (alternative naming) */
  minArea?: number;
  
  /** Maximum area (alternative naming) */
  maxArea?: number;
  
  /** Property type filter (apartment, house, villa, commercial, land) */
  property_type?: string;
  
  /** Property type filter (alternative naming) */
  propertyType?: string;
  
  /** Location search (partial match on location field) */
  location?: string;
  
  /** Country filter (exact match) */
  country?: string;
  
  /** General search query (searches title/name, description, location) */
  search?: string;
  
  /** Comma-separated list of amenity IDs (AND logic - must have ALL) */
  amenities?: string;
  
  /** Sort order: 'recommended', 'price-asc', 'price-desc', 'newest', 'oldest' */
  sort?: 'recommended' | 'price-asc' | 'price-desc' | 'newest' | 'oldest';
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Paginated response from unified listings API
 * Matches Django REST Framework pagination format
 */
export interface UnifiedListingsResponse {
  /** Total count of matching listings (properties + projects/units) */
  count: number;
  
  /** URL to next page (null if no more pages) */
  next: string | null;
  
  /** URL to previous page (null if on first page) */
  previous: string | null;
  
  /** Array of unified listings (properties and projects mixed) */
  results: UnifiedListing[];
  
  /** Optional search event ID for analytics tracking */
  search_event_id?: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a listing is a property
 * @param listing - Unified listing to check
 * @returns true if listing is a PropertyListing
 */
export function isPropertyListing(listing: UnifiedListing): listing is PropertyListing {
  return listing._type === 'property';
}

/**
 * Type guard to check if a listing is a project
 * @param listing - Unified listing to check
 * @returns true if listing is a ProjectListing
 */
export function isProjectListing(listing: UnifiedListing): listing is ProjectListing {
  return listing._type === 'project';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the display price for a unified listing
 * For properties: returns exact price
 * For projects: returns price range based on listing type
 * 
 * @param listing - Unified listing
 * @param listingType - 'sale' or 'rent' (for projects)
 * @returns Formatted price string or null
 */
export function getListingPrice(
  listing: UnifiedListing, 
  listingType: 'sale' | 'rent' = 'sale'
): { min: number | null; max: number | null; exact: number | null } {
  if (isPropertyListing(listing)) {
    return {
      exact: listing.price,
      min: null,
      max: null,
    };
  }
  
  // Project - return range
  if (listingType === 'sale') {
    return {
      exact: null,
      min: listing.sale_price_min ?? null,
      max: listing.sale_price_max ?? null,
    };
  } else {
    return {
      exact: null,
      min: listing.rent_price_min ?? null,
      max: listing.rent_price_max ?? null,
    };
  }
}

/**
 * Get the display name/title for a unified listing
 * 
 * @param listing - Unified listing
 * @returns Display name
 */
export function getListingTitle(listing: UnifiedListing): string {
  if (isPropertyListing(listing)) {
    return listing.title;
  }
  return listing.name;
}

/**
 * Get the location for a unified listing
 * 
 * @param listing - Unified listing
 * @returns Location string
 */
export function getListingLocation(listing: UnifiedListing): string {
  return listing.location;
}

/**
 * Get bedrooms info for a unified listing
 * For properties: returns exact count
 * For projects: returns range based on listing type
 * 
 * @param listing - Unified listing
 * @param listingType - 'sale' or 'rent' (for projects)
 * @returns Bedrooms info
 */
export function getListingBedrooms(
  listing: UnifiedListing,
  listingType: 'sale' | 'rent' = 'sale'
): { min: number | null; max: number | null; exact: number | null } {
  if (isPropertyListing(listing)) {
    return {
      exact: listing.bedrooms,
      min: null,
      max: null,
    };
  }
  
  // Project - return range
  if (listingType === 'sale') {
    return {
      exact: null,
      min: listing.sale_bedrooms_min ?? null,
      max: listing.sale_bedrooms_max ?? null,
    };
  } else {
    return {
      exact: null,
      min: listing.rent_bedrooms_min ?? null,
      max: listing.rent_bedrooms_max ?? null,
    };
  }
}
