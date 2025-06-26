// src/types.ts

export interface PropertyImage {
  image: string;
  is_primary: boolean;
}

export interface Owner {
  id: string;
  email: string;
  // add additional owner fields if needed
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  year_built: number;
  parking_spaces: number;
  lot_size?: number;
  property_status: string;
  energy_rating?: string;
  construction_material?: string;
  floor_level?: number;
  total_floors?: number;
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
}

// Utility function to normalize a single property object from API
export const normalizePropertyData = (property: any): Property => ({
  ...property,
  price:         typeof property.price === 'string'   ? parseFloat(property.price)     : property.price,
  area:          typeof property.area === 'string'    ? parseFloat(property.area)      : property.area,
  bedrooms:      typeof property.bedrooms === 'string'? parseInt(property.bedrooms,10) : property.bedrooms,
  bathrooms:     typeof property.bathrooms === 'string'? parseInt(property.bathrooms,10): property.bathrooms,
  year_built:    typeof property.year_built === 'string'? parseInt(property.year_built,10): property.year_built,
  parking_spaces:typeof property.parking_spaces === 'string'
                    ? parseInt(property.parking_spaces,10)
                    : property.parking_spaces,
  lot_size:      typeof property.lot_size === 'string'  ? parseFloat(property.lot_size)  : property.lot_size,
  floor_level:   typeof property.floor_level === 'string'? parseInt(property.floor_level,10)  : property.floor_level,
  total_floors:  typeof property.total_floors === 'string'? parseInt(property.total_floors,10) : property.total_floors,
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
  properties_count: number;
  published_properties: Property[];
  connections_count: number;
  connection_status: 'connected' | 'pending_sent' | 'pending_received' | 'rejected' | 'none' | 'self';
  mutual_connections_count: number;
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