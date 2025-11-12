// app/property/[id].tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart,
  Share,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Layers,
} from 'lucide-react-native';
import PropertyDocuments from '@/components/property/PropertyDocuments';
import PropertyMapView from '@/components/property/PropertyMapView';
import ChatButton from '@/components/property/ChatButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/app/_userbase/UserContext';
import { api } from '../../config/api'; // adjust path if needed

const { width } = Dimensions.get('window');

/**
 * Normalize raw API response into a consistent shape.
 * Ensure that `amenities`, etc. are always defined (even if empty arrays).
 */
function normalizePropertyDetail(item: any) {
  // 1) Images
  const rawImages = Array.isArray(item.images) ? item.images : [];
  const images: string[] = rawImages
    .map((imgObj: any) => {
      // item.images might be array of strings or objects with `.image`
      const raw =
        typeof imgObj === 'string'
          ? imgObj
          : imgObj?.image || '';
      if (!raw) return '';
      return raw.startsWith('http')
        ? raw
        : `https://api.propertpro.com${raw}`;
    })
    .filter((uri: string) => !!uri);

  // 2) forSale boolean
  let forSale = false;
  if (item.property_status) {
    forSale = item.property_status === 'for_sale';
  } else if (typeof item.forSale === 'boolean') {
    forSale = item.forSale;
  } else if (item.listing_type) {
    forSale = item.listing_type.toLowerCase() === 'sale';
  }

  // 3) Basic fields
  const id = item.id;
  const title: string = item.title || '';
  const price: number =
    item.price != null && !isNaN(Number(item.price))
      ? Number(item.price)
      : 0;
  const location: string = item.location || '';

  // 4) Stats (we will not render the features row, but size may still be used elsewhere)
  let size: number = 0;
  if (item.area != null && !isNaN(Number(item.area))) {
    const areaM2 = Number(item.area);
    size = Math.round(areaM2 * 10.764);
  }
  // bedrooms/bathrooms normalized in case used elsewhere (but features row removed)
  const bedrooms: number =
    item.bedrooms != null && !isNaN(Number(item.bedrooms))
      ? Number(item.bedrooms)
      : 0;
  const bathrooms: number =
    item.bathrooms != null && !isNaN(Number(item.bathrooms))
      ? Number(item.bathrooms)
      : 0;

  // 5) propertyType
  const rawType: string = item.property_type || '';
  const propertyType = rawType
    ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
    : '';

  // 6) Description
  const description: string = item.description || '';

  // 7) Amenities
  const amenities: string[] = Array.isArray(item.amenities)
    ? item.amenities.map((a: any) =>
        typeof a === 'string' ? a : a.name || String(a)
      )
    : [];

  // 8) Additional features (not rendered here, but normalized if needed later)


  // 9) Contact info
  const contactPhone: string = item.contact_phone || item.contactPhone || '';
  const contactEmail: string = item.contact_email || item.contactEmail || '';

  // 10) Owner (for message owner)
  const owner = item.owner
    ? {
        id: item.owner.id,
        name: item.owner.name,
        photo: item.owner.photo
          ? item.owner.photo.startsWith('http')
            ? item.owner.photo
            : `https://api.propertpro.com${item.owner.photo}`
          : '',
      }
    : null;

  // 11) Agent
  const agent = item.agent
    ? {
        name: item.agent.name,
        photo: item.agent.photo
          ? item.agent.photo.startsWith('http')
            ? item.agent.photo
            : `https://api.propertpro.com${item.agent.photo}`
          : '',
        company: item.agent.company,
        phone: item.agent.phone,
        email: item.agent.email,
      }
    : null;

  // 12) Other details for Property Details section
  const yearBuilt: string = item.year_built
    ? String(item.year_built)
    : '';
  const parkingSpaces: number =
    item.parking_spaces != null
      ? Number(item.parking_spaces)
      : 0;
  const lotSize: string = item.lot_size ? String(item.lot_size) : '';
  const energyRating: string = item.energy_rating || '';
  const constructionMaterial: string = item.construction_material || '';
  const floorLevel: string =
    item.floor_level != null ? String(item.floor_level) : '';
  const totalFloors: string =
    item.total_floors != null ? String(item.total_floors) : '';
  const availableFrom: string = item.available_from || '';

  // 13) Virtual tour / video
  const virtualTourUrl: string = item.virtual_tour_url || '';
  const videoUrl: string = item.video_url || '';

  // 14) Financing URL
  const financingUrl: string | null = item.financing_url || null;

  // 15) Publication / favourite
  const isPublished: boolean =
    item.is_published != null
      ? Boolean(item.is_published)
      : true;
  const isFavourite: boolean = Boolean(item.is_favourite);

  // 16) Coordinates
  const latitude: number | null =
    item.latitude != null && !isNaN(Number(item.latitude))
      ? Number(item.latitude)
      : null;
  const longitude: number | null =
    item.longitude != null && !isNaN(Number(item.longitude))
      ? Number(item.longitude)
      : null;

  // 17) Documents
  const documents = Array.isArray(item.documents) ? item.documents : [];

  return {
    id,
    images,
    forSale,
    title,
    price,
    location,
    bedrooms,
    bathrooms,
    size,
    propertyType,
    description,
    amenities,
    
    contactPhone,
    contactEmail,
    owner,
    agent,
    yearBuilt,
    parkingSpaces,
    lotSize,
    energyRating,
    constructionMaterial,
    floorLevel,
    totalFloors,
    availableFrom,
    virtualTourUrl,
    videoUrl,
    financingUrl,
    isPublished,
    isFavourite,
    latitude,
    longitude,
    documents,
  };
}

// Helper to format ordinal
function formatOrdinal(n: string | number): string {
  const num = Number(n);
  if (isNaN(num)) return String(n);
  const absNum = Math.abs(num);
  const tens = absNum % 100;
  if (tens >= 11 && tens <= 13) {
    return `${num}th`;
  }
  const unit = absNum % 10;
  switch (unit) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
}

export default function PropertyDetailScreen() {
  const { id, source } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();

  const [property, setProperty] = useState<any>(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        // Pass source parameter if present (for feed click tracking)
        const params = source ? { params: { source } } : undefined;
        const rawResp = await api.properties.getById(Number(id), params);
        const rawData = rawResp?.data ?? rawResp;
        if (!isMounted) return;
        const normalized = normalizePropertyDetail(rawData);
        setProperty(normalized);
        if (rawData.is_favourite !== undefined) {
          setIsFavourite(Boolean(rawData.is_favourite));
        }
        setCurrentImageIndex(0);
      } catch (e) {
        console.error('Error fetching property detail:', e);
        if (isMounted) setError('Failed to load property details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id, source]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0F3460" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (!property) {
    // In case still null
    return null;
  }

  // Destructure only after confirming property is non-null
  const {
    images,
    title,
    description,
    price,
    location,
    forSale,
    propertyType,
    // bedrooms, bathrooms, size,  // features row removed
    yearBuilt,
    parkingSpaces,
    lotSize,
    energyRating,
    constructionMaterial,
    floorLevel,
    totalFloors,
    availableFrom,
    amenities,
    // additionalFeatures,         // not rendered here
    virtualTourUrl,
    videoUrl,
    contactPhone,
    contactEmail,
    owner,
    agent,
    isPublished,
    latitude,
    longitude,
    documents,
  } = property;

  const imgCount = images.length;

  // Contact tracking handlers
  const handlePhoneClick = async () => {
    if (property?.id) {
      try {
        await api.analytics.trackConversion(property.id, 'phone');
      } catch (e) {
        console.error('Failed to track phone click:', e);
      }
    }
    Linking.openURL(`tel:${contactPhone}`);
  };

  const handleEmailClick = async () => {
    if (property?.id) {
      try {
        await api.analytics.trackConversion(property.id, 'email');
      } catch (e) {
        console.error('Failed to track email click:', e);
      }
    }
    Linking.openURL(`mailto:${contactEmail}`);
  };

  const handleAgentPhoneClick = async () => {
    if (property?.id && agent?.phone) {
      try {
        await api.analytics.trackConversion(property.id, 'phone');
      } catch (e) {
        console.error('Failed to track agent phone click:', e);
      }
    }
    if (agent?.phone) {
      Linking.openURL(`tel:${agent.phone}`);
    }
  };

  const handleAgentEmailClick = async () => {
    if (property?.id && agent?.email) {
      try {
        await api.analytics.trackConversion(property.id, 'email');
      } catch (e) {
        console.error('Failed to track agent email click:', e);
      }
    }
    if (agent?.email) {
      Linking.openURL(`mailto:${agent.email}`);
    }
  };

  const handleChatClick = async () => {
    if (property?.id) {
      try {
        await api.analytics.trackConversion(property.id, 'chat');
      } catch (e) {
        console.error('Failed to track chat click:', e);
      }
    }
    // Navigate to chat screen (placeholder)
    // router.push(`/chat/${owner?.id || property.owner_id}`);
  };

  // Share handler (placeholder until backend endpoint ready)
  const handleShare = () => {
    Alert.alert(
      'Share',
      'Share functionality coming in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleImageScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentImageIndex(index);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Unpublished banner */}
        {!isPublished && (
          <View style={styles.unpublishedBanner}>
            <Text style={styles.unpublishedText}>
              This property is not published. Only you can see it.
            </Text>
          </View>
        )}

        {/* Reel-style Image Gallery */}
        <View style={styles.imageGalleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleImageScroll}
            scrollEventThrottle={16}
            style={styles.imageScroll}
          >
            {images.length > 0 ? (
              images.map((uri: string, index: number) => {
                const imageUri = uri.startsWith('http')
                  ? uri
                  : `https://api.propertpro.com${uri}`;
                return (
                  <View key={index} style={styles.imageWrapper}>
                    {/* Blurred background */}
                    <Image
                      source={{ uri: imageUri }}
                      style={StyleSheet.absoluteFillObject}
                      blurRadius={25}
                      resizeMode="cover"
                    />
                    {/* Main image */}
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.reelImage}
                      resizeMode="contain"
                    />
                    {/* Photo counter */}
                    {imgCount > 1 && (
                      <View style={styles.photoCounter}>
                        <Text style={styles.photoCounterText}>
                          {index + 1}/{imgCount}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.imageWrapper}>
                <View style={styles.noImagePlaceholder}>
                  <Text style={styles.noImageText}>No images available</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Header overlay */}
          <View style={styles.imageHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={async () => {
                  try {
                    const response = await api.properties.toggleFavorite(property.id);
                    setIsFavourite(response.is_favourite || false);
                  } catch (e) {
                    console.error('Failed to toggle favorite:', e);
                    Alert.alert('Error', 'Failed to update favorite. Please try again.');
                  }
                }}
              >
                <Heart
                  size={24}
                  color="#fff"
                  fill={isFavourite ? '#FF6B6B' : 'transparent'}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                <Share size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Status & type */}
          <View style={styles.statusRow}>
            <Text
              style={[
                styles.statusBadge,
                forSale
                  ? styles.forSaleBadge
                  : styles.forRentBadge,
              ]}
            >
              {forSale ? 'For Sale' : 'For Rent'}
            </Text>
            {propertyType ? (
              <Text style={styles.propertyTypeText}>
                {propertyType}
              </Text>
            ) : null}
          </View>

          {/* Price */}
          <Text style={styles.priceText}>
            €{price.toLocaleString()}
            {!forSale && (
              <Text style={styles.periodText}>/mo</Text>
            )}
          </Text>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <MapPin size={16} color="#666" />
            <Text style={styles.locationText}>{location}</Text>
          </View>

          {/* Property Details - Improved UI */}
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Property Details</Text>

          <View style={styles.detailsGrid}>
            {yearBuilt && (
              <View style={styles.detailCard}>
                <Calendar size={20} color="#0F3460" />
                <Text style={styles.detailCardLabel}>Year Built</Text>
                <Text style={styles.detailCardValue}>{yearBuilt}</Text>
              </View>
            )}
            {floorLevel && (
              <View style={styles.detailCard}>
                <Layers size={20} color="#0F3460" />
                <Text style={styles.detailCardLabel}>Floor Level</Text>
                <Text style={styles.detailCardValue}>{formatOrdinal(floorLevel)}</Text>
              </View>
            )}
            {totalFloors && (
              <View style={styles.detailCard}>
                <Layers size={20} color="#0F3460" />
                <Text style={styles.detailCardLabel}>Total Floors</Text>
                <Text style={styles.detailCardValue}>{totalFloors}</Text>
              </View>
            )}
            {lotSize && (
              <View style={styles.detailCard}>
                <MapPin size={20} color="#0F3460" />
                <Text style={styles.detailCardLabel}>Lot Size</Text>
                <Text style={styles.detailCardValue}>{lotSize} m²</Text>
              </View>
            )}
            {parkingSpaces != null && parkingSpaces > 0 && (
              <View style={styles.detailCard}>
                <MapPin size={20} color="#0F3460" />
                <Text style={styles.detailCardLabel}>Parking</Text>
                <Text style={styles.detailCardValue}>{parkingSpaces}</Text>
              </View>
            )}
            {energyRating && (
              <View style={styles.detailCard}>
                <Calendar size={20} color="#0F3460" />
                <Text style={styles.detailCardLabel}>Energy Rating</Text>
                <Text style={styles.detailCardValue}>{energyRating}</Text>
              </View>
            )}
            {constructionMaterial && (
              <View style={styles.detailCard}>
                <Layers size={20} color="#0F3460" />
                <Text style={styles.detailCardLabel}>Construction</Text>
                <Text style={styles.detailCardValue} numberOfLines={2}>
                  {constructionMaterial}
                </Text>
              </View>
            )}
            {availableFrom && (
              <View style={styles.detailCard}>
                <Calendar size={20} color="#0F3460" />
                <Text style={styles.detailCardLabel}>Available From</Text>
                <Text style={styles.detailCardValue}>{availableFrom}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Amenities (kept, below description) */}
          {amenities.length > 0 && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.listContainer}>
                {amenities.map((amenityId: string, idx: number) => {
                  // Map amenity IDs to user-friendly labels
                  const amenityLabels: { [key: string]: string } = {
                    // Building & Infrastructure
                    elevator: 'Elevator',
                    internal_staircase: 'Internal Staircase',
                    secure_door: 'Secure Door',
                    manned_reception: 'Manned Reception',
                    attic: 'Attic',
                    facade: 'Facade',
                    corner: 'Corner',
                    
                    // Interior Features
                    frames_wooden: 'Wooden Frames',
                    floor_marble: 'Marble Floor',
                    single_glass: 'Single Glass',
                    bright: 'Bright',
                    airy: 'Airy',
                    fireplace: 'Fireplace',
                    furnished: 'Furnished',
                    storage: 'Storage Space',
                    painted: 'Painted',
                    luxury_home: 'Luxury Home',
                    playroom: 'Playroom',
                    
                    // Climate & Comfort
                    underfloor_heating: 'Underfloor Heating',
                    air_conditioning: 'Air Conditioning',
                    solar_water_heating: 'Solar Water Heating',
                    night_power: 'Night Power',
                    
                    // Exterior & Outdoor
                    garden: 'Garden',
                    swimming_pool: 'Swimming Pool',
                    awning: 'Awning',
                    built_in_bbq: 'Built-in BBQ',
                    window_screens: 'Window Screens',
                    balcony: 'Balcony',
                    
                    // Parking & Access
                    parking_space: 'Parking Space',
                    garage: 'Garage',
                    access_disabled: 'Access for People with Disabilities',
                    ev_charging: 'Charging Facilities for Electric Car',
                    
                    // Security & Safety
                    alarm: 'Alarm',
                    security_system: 'Security System',
                    doorman: 'Doorman',
                    
                    // Utilities & Technology
                    satellite_receiver: 'Satellite Receiver',
                    wifi: 'High-Speed Internet',
                    dishwasher: 'Dishwasher',
                    laundry: 'Laundry Facilities',
                    
                    // Location & Views
                    residential_zone: 'Residential Zone',
                    view: 'View',
                    waterfront: 'Waterfront',
                    
                    // Community & Shared
                    gym: 'Gym',
                    pool: 'Swimming Pool',
                    roof_deck: 'Roof Deck',
                    
                    // Policy & Lifestyle
                    pets: 'Pet Friendly',
                    
                    // Legacy amenities
                    parking: 'Parking',
                    ac: 'Air Conditioning',
                    heating: 'Central Heating',
                  };
                  
                  const displayName = amenityLabels[amenityId] || amenityId;
                  
                  return (
                    <View key={idx} style={styles.listItem}>
                      <Text style={styles.bullet}>{'\u2022'}</Text>
                      <Text style={styles.listText}>{displayName}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Virtual Tour / Video */}
          {(virtualTourUrl || videoUrl) && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>
                Virtual Tour / Video
              </Text>
              {virtualTourUrl && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(virtualTourUrl)}
                >
                  <Text style={styles.linkText}>
                    Open Virtual Tour
                  </Text>
                </TouchableOpacity>
              )}
              {videoUrl && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(videoUrl)}
                >
                  <Text style={styles.linkText}>
                    Watch Video
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Property Documents */}
          {documents && documents.length > 0 && (
            <>
              <View style={styles.separator} />
              <PropertyDocuments documents={documents} />
            </>
          )}

          {/* Location Map */}
          {(latitude != null && longitude != null) && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>Location</Text>
              <PropertyMapView
                latitude={latitude}
                longitude={longitude}
                title={title}
                location={location}
                email={user?.email}
              />
              <View style={styles.detailRow}>
                <MapPin size={16} color="#666" />
                <Text style={styles.detailText}>{location}</Text>
              </View>
            </>
          )}

          {/* Contact Information */}
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {contactPhone ? (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={handlePhoneClick}
            >
              <Phone size={16} color="#0F3460" />
              <Text style={styles.contactText}>
                {contactPhone}
              </Text>
            </TouchableOpacity>
          ) : null}
          {contactEmail ? (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={handleEmailClick}
            >
              <Mail size={16} color="#0F3460" />
              <Text style={styles.contactText}>
                {contactEmail}
              </Text>
            </TouchableOpacity>
          ) : null}
          {!contactPhone && !contactEmail && (
            <Text style={styles.noContactText}>
              Contact details not provided.
            </Text>
          )}

          {/* Chat Button */}
          {owner && (
            <View style={styles.chatButtonContainer}>
              <ChatButton
                sellerId={owner.id}
                propertyId={property.id}
                title={title}
              />
            </View>
          )}

          {/* Agent Info */}
          {agent && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>Agent</Text>
              <View style={styles.agentCard}>
                {agent.photo ? (
                  <Image
                    source={{ uri: agent.photo }}
                    style={styles.agentImage}
                  />
                ) : null}
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>
                    {agent.name}
                  </Text>
                  <Text style={styles.agentCompany}>
                    {agent.company}
                  </Text>
                  <View style={styles.agentRating}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Text
                        key={star}
                        style={styles.star}
                      >
                        ★
                      </Text>
                    ))}
                    <Text style={styles.ratingText}>
                      5.0
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.agentButtons}>
                <TouchableOpacity
                  style={[
                    styles.agentButton,
                    styles.messageButton,
                  ]}
                  onPress={handleChatClick}
                >
                  <MessageSquare
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.agentButtonText}>
                    Message
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.agentButton,
                    styles.callButton,
                  ]}
                  onPress={handleAgentPhoneClick}
                >
                  <Phone size={20} color="#fff" />
                  <Text style={styles.agentButtonText}>
                    Call Agent
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerPrice}>
            €{price.toLocaleString()}
            {!forSale && (
              <Text style={styles.periodText}>/mo</Text>
            )}
          </Text>
          <Text style={styles.footerSubtext}>
            {forSale
              ? 'View Financing Options'
              : 'Available Now'}
          </Text>
        </View>
        {owner && (
          <ChatButton
            sellerId={owner.id}
            propertyId={property.id}
            title={title}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  unpublishedBanner: {
    backgroundColor: '#ffeeba',
    padding: 10,
    borderRadius: 4,
    margin: 16,
  },
  unpublishedText: {
    color: '#856404',
    fontFamily: 'Poppins-Regular',
  },
  imageGalleryContainer: {
    width: '100%',
    height: width * 0.75,
    position: 'relative',
    backgroundColor: '#000',
  },
  imageScroll: {
    flex: 1,
  },
  imageWrapper: {
    width: width,
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelImage: {
    width: '100%',
    height: '100%',
  },
  photoCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  photoCounterText: {
    color: '#fff',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  noImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEE',
  },
  noImageText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  imageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  imageCountText: {
    color: '#fff',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  detailCard: {
    width: '47%',
    margin: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailCardLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  detailCardValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#0F3460',
    textAlign: 'center',
  },
  chatButtonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  contentContainer: {
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#fff',
  },
  forSaleBadge: {
    backgroundColor: '#28a745',
  },
  forRentBadge: {
    backgroundColor: '#007bff',
  },
  propertyTypeText: {
    marginLeft: 8,
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
  priceText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#0F3460',
    marginBottom: 4,
  },
  periodText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#333',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    marginLeft: 4,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#0F3460',
    marginBottom: 12,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  listContainer: {
    marginLeft: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 12,
    marginRight: 6,
    color: '#666',
  },
  listText: {
    marginLeft: 4,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#0F3460',
    textDecorationLine: 'underline',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#333',
    marginRight: 6,
  },
  detailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    marginLeft: 8,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#0F3460',
  },
  noContactText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },

  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  agentImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
  },
  agentCompany: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  agentRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    color: '#FFD700',
    fontSize: 16,
    marginRight: 2,
  },
  ratingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  agentButtons: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  agentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  messageButton: {
    backgroundColor: '#0F3460',
  },
  callButton: {
    backgroundColor: '#38A3A5',
  },
  agentButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#fff',
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  footerPrice: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#0F3460',
  },
  footerSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
});
