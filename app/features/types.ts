// src/types.ts

export interface PropertyImage {
  image: string;
  is_primary: boolean;
}

export interface Owner {
  id: number | string;
  email: string;
  name?: string;
  username?: string;
}

export interface Property {
  id: number | string;
  title: string;
  description: string;
  price: number;
  location: string;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  year_built: number | null;
  parking_spaces: number;
  lot_size?: number | null;
  property_status: string;
  energy_rating?: string;
  construction_material?: string;
  floor_level?: number | null;
  total_floors?: number | null;
  available_from?: string;
  contact_phone: string;
  contact_email: string;
  virtual_tour_url?: string;
  video_url?: string;
  amenities: string[];
  owner: Owner;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  images: PropertyImage[];
  image?: string;
  // Structured location fields
  country?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  street?: string;
  latitude?: number | null;
  longitude?: number | null;
  // Computed fields from backend
  is_favourite?: boolean;
  favorites_count?: number;
  view_count?: number;
  is_featured?: boolean;
  url?: string;
}

export interface FeedProperty extends Property {
  _type?: 'property';
  match_score?: number | null;
  slot_type?: 'personalized' | 'explore' | string | null;
}

// Project types
export interface ProjectImage {
  image: string;
  is_primary: boolean;
  display_order: number;
  created_at?: string;
}

export interface Project {
  id: number | string;
  name: string; // Project name (equivalent to Property.title)
  description?: string;
  location: string;
  country: string;
  status: 'planning' | 'construction' | 'completed' | 'available';
  start_date?: string;
  completion_date?: string;
  total_units: number;
  available_units: number;
  property_types: string[]; // Array of property types
  amenities: string[];
  features: string[];
  main_image?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  images: ProjectImage[];
  // Range fields (for sale)
  sale_bedrooms_min?: number;
  sale_bedrooms_max?: number;
  sale_bathrooms_min?: number;
  sale_bathrooms_max?: number;
  sale_area_min?: number;
  sale_area_max?: number;
  sale_price_min?: number;
  sale_price_max?: number;
  // Range fields (for rent)
  rent_bedrooms_min?: number;
  rent_bedrooms_max?: number;
  rent_bathrooms_min?: number;
  rent_bathrooms_max?: number;
  rent_area_min?: number;
  rent_area_max?: number;
  rent_price_min?: number;
  rent_price_max?: number;
  // Owner/Organization
  owner?: Owner;
  contact_phone?: string;
  contact_email?: string;
  // Feed-specific
  match_score?: number | null;
  slot_type?: 'personalized' | 'explore' | string | null;
  // Computed fields from backend
  is_favourite?: boolean;
  favorites_count?: number;
  view_count?: number;
  // Discriminator
  _type: 'project';
  // URL
  url?: string;
}

export interface FeedProject extends Project {
  _type: 'project';
  match_score?: number | null;
  slot_type?: 'personalized' | 'explore' | string | null;
}

// Union type for feed items
export type FeedItem = FeedProperty | FeedProject;

// Utility function to normalize project data from API
export const normalizeProjectData = (project: any): Project => ({
  ...project,
  sale_bedrooms_min: typeof project.sale_bedrooms_min === 'string' ? parseInt(project.sale_bedrooms_min, 10) : project.sale_bedrooms_min,
  sale_bedrooms_max: typeof project.sale_bedrooms_max === 'string' ? parseInt(project.sale_bedrooms_max, 10) : project.sale_bedrooms_max,
  sale_bathrooms_min: typeof project.sale_bathrooms_min === 'string' ? parseFloat(project.sale_bathrooms_min) : project.sale_bathrooms_min,
  sale_bathrooms_max: typeof project.sale_bathrooms_max === 'string' ? parseFloat(project.sale_bathrooms_max) : project.sale_bathrooms_max,
  sale_area_min: typeof project.sale_area_min === 'string' ? parseFloat(project.sale_area_min) : project.sale_area_min,
  sale_area_max: typeof project.sale_area_max === 'string' ? parseFloat(project.sale_area_max) : project.sale_area_max,
  sale_price_min: typeof project.sale_price_min === 'string' ? parseFloat(project.sale_price_min) : project.sale_price_min,
  sale_price_max: typeof project.sale_price_max === 'string' ? parseFloat(project.sale_price_max) : project.sale_price_max,
  rent_bedrooms_min: typeof project.rent_bedrooms_min === 'string' ? parseInt(project.rent_bedrooms_min, 10) : project.rent_bedrooms_min,
  rent_bedrooms_max: typeof project.rent_bedrooms_max === 'string' ? parseInt(project.rent_bedrooms_max, 10) : project.rent_bedrooms_max,
  rent_bathrooms_min: typeof project.rent_bathrooms_min === 'string' ? parseFloat(project.rent_bathrooms_min) : project.rent_bathrooms_min,
  rent_bathrooms_max: typeof project.rent_bathrooms_max === 'string' ? parseFloat(project.rent_bathrooms_max) : project.rent_bathrooms_max,
  rent_area_min: typeof project.rent_area_min === 'string' ? parseFloat(project.rent_area_min) : project.rent_area_min,
  rent_area_max: typeof project.rent_area_max === 'string' ? parseFloat(project.rent_area_max) : project.rent_area_max,
  rent_price_min: typeof project.rent_price_min === 'string' ? parseFloat(project.rent_price_min) : project.rent_price_min,
  rent_price_max: typeof project.rent_price_max === 'string' ? parseFloat(project.rent_price_max) : project.rent_price_max,
  total_units: typeof project.total_units === 'string' ? parseInt(project.total_units, 10) : project.total_units,
  available_units: typeof project.available_units === 'string' ? parseInt(project.available_units, 10) : project.available_units,
  latitude: typeof project.latitude === 'string' ? parseFloat(project.latitude) : project.latitude,
  longitude: typeof project.longitude === 'string' ? parseFloat(project.longitude) : project.longitude,
});

// Utility function to normalize a single property object from API
export const normalizePropertyData = (property: any): Property => ({
  ...property,
  price:         typeof property.price === 'string'   ? parseFloat(property.price)     : property.price,
  area:          typeof property.area === 'string'    ? parseFloat(property.area)      : (property.area ?? null),
  bedrooms:      typeof property.bedrooms === 'string'? parseInt(property.bedrooms,10) : (property.bedrooms ?? null),
  bathrooms:     typeof property.bathrooms === 'string'? parseFloat(property.bathrooms) : (property.bathrooms ?? null),
  year_built:    typeof property.year_built === 'string'? parseInt(property.year_built,10): (property.year_built ?? null),
  parking_spaces:typeof property.parking_spaces === 'string'
                    ? parseInt(property.parking_spaces,10)
                    : property.parking_spaces,
  lot_size:      typeof property.lot_size === 'string'  ? parseFloat(property.lot_size)  : (property.lot_size ?? null),
  floor_level:   typeof property.floor_level === 'string'? parseInt(property.floor_level,10)  : (property.floor_level ?? null),
  total_floors:  typeof property.total_floors === 'string'? parseInt(property.total_floors,10) : (property.total_floors ?? null),
  latitude:      typeof property.latitude === 'string' ? parseFloat(property.latitude) : (property.latitude ?? null),
  longitude:     typeof property.longitude === 'string' ? parseFloat(property.longitude) : (property.longitude ?? null),
});

// Interface for your listing form data
export interface ListingForm {
  title: string;
  description: string;
  price: string;
  location: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  images: File[];
  amenities: string[];
  yearBuilt: string;
  parkingSpaces: string;
  lotSize: string;
  propertyStatus: string;
  energyRating: string;
  constructionMaterial: string;
  floorLevel: string;
  totalFloors: string;
  availableFrom: string;
  contactPhone: string;
  contactEmail: string;
  virtualTourUrl?: string;
  videoUrl?: string;
}

// Types for profile, posts, and properties
export interface PublicProfileData {
  id: number;
  username: string;
  date_joined: string;
  // New profile fields (public)
  name?: string;
  bio?: string;
  location?: string;
  office?: string;
  avatar?: string;
  website?: string;
  email?: string;
  phone?: string;
  // Property and connection data
  properties_count: number;
  published_properties: Property[];
  connections_count: number;
  connection_status: 'connected' | 'pending_sent' | 'pending_received' | 'rejected' | 'none' | 'self';
  mutual_connections_count: number;
}

export interface PublicProfileResponse {
  status: number;
  profile: PublicProfileData;
}

// Chat system types
export interface Thread {
  id: string;
  user1: number;
  user2: number;
  property: number | null;  // Now nullable for DM threads
  property_title: string;
  other_username: string;
  unread_count: number;
  updated_at: string;
  property_address?: string;
  property_image?: string;
  last_message?: {
    id: string;
    content: string;
    sender: number;
    created_at: string;
    read_at: string | null;
  } | null;
}

export interface Message {
  id: string;
  thread_id: string;
  property_id: number | null;  // Now nullable
  sender: number;
  recipient: number;
  content: string;
  original_content?: string | null;
  created_at: string;
  read_at: string | null;
  is_unsent: boolean;
  unsent_at: string | null;
}

export interface Connection {
  id: string;
  from_user: number;
  to_user: number;
  from_user_username: string;
  to_user_username: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface UserConnection {
  connection_id: string;
  user: {
    id: number;
    username: string;
    date_joined: string;
  };
  connected_since: string;
}

export interface ConnectionStatus {
  status: 'connected' | 'pending_sent' | 'pending_received' | 'rejected' | 'none' | 'self';
  user_id: number;
  username: string;
}

// Review system types
export interface ReviewCategory {
  id: number;
  name: string;
  description: string;
  display_order: number;
}

export interface CategoryRating {
  id: number;
  category: ReviewCategory;
  category_id: number;
  rating: number;
}

export interface ReviewResponse {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface UserBasic {
  id: number;
  username: string;
  email: string;
}

export interface Review {
  id: number;
  reviewer: UserBasic;
  reviewee: UserBasic;
  overall_rating: number;
  title: string;
  content: string;
  interaction_context: string;
  is_public: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  category_ratings: CategoryRating[];
  response?: ReviewResponse;
  helpful_count: number;
  unhelpful_count: number;
  user_found_helpful?: boolean | null;
}

export interface ReviewStats {
  reviews_received_count: number;
  reviews_given_count: number;
  average_rating: number;
  rating_distribution: {
    [key: string]: number; // "1": 5, "2": 10, etc.
  };
  category_averages: {
    [categoryName: string]: number;
  };
  recent_reviews: Review[];
}

export interface CanReviewResponse {
  can_review: boolean;
  reason: string;
}

export interface ReviewDashboard {
  reviews_received_count: number;
  reviews_given_count: number;
  average_rating_received: number;
  pending_reviews_count: number;
  recent_reviews_received: Review[];
  recent_reviews_given: Review[];
}