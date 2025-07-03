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
  Square,
  Calendar,
  Layers,
} from 'lucide-react-native';
import SimilarProperties from '@/components/property/SimilarProperties';
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
    .filter(uri => !!uri);

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
  const additionalFeatures: string[] = Array.isArray(
    item.additional_features
  )
    ? item.additional_features.map((f: any) =>
        typeof f === 'string' ? f : f.name || String(f)
      )
    : [];

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
    additionalFeatures,
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
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [property, setProperty] = useState<any>(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const rawResp = await api.properties.getById(Number(id));
        const rawData = rawResp?.data ?? rawResp;
        if (!isMounted) return;
        const normalized = normalizePropertyDetail(rawData);
        setProperty(normalized);
        if (rawData.is_favourite !== undefined) {
          setIsFavourite(Boolean(rawData.is_favourite));
        }
        setSelectedImage(0);
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
  }, [id]);

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
  } = property;

  // Image slideshow logic
  const imgCount = images.length;
  const rawCurrent = images[selectedImage] || '';
  const imageUri = rawCurrent.startsWith('http')
    ? rawCurrent
    : `https://api.propertpro.com${rawCurrent}`;

  const goPrev = (e: any) => {
    e.stopPropagation?.();
    if (imgCount > 0) {
      setSelectedImage(i => (i - 1 + imgCount) % imgCount);
    }
  };
  const goNext = (e: any) => {
    e.stopPropagation?.();
    if (imgCount > 0) {
      setSelectedImage(i => (i + 1) % imgCount);
    }
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

        {/* Main image & overlays */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.mainImage}
            resizeMode="cover"
            onError={e => console.error('Image load failed:', imageUri)}
          />
          <View style={styles.imageOverlay}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setIsFavourite(prev => !prev)}
                >
                  <Heart
                    size={24}
                    color="#fff"
                    fill={isFavourite ? '#FF6B6B' : 'transparent'}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <Share size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {imgCount > 1 && (
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>
                  {selectedImage + 1}/{imgCount}
                </Text>
              </View>
            )}

            {imgCount > 1 && (
              <>
                <TouchableOpacity
                  style={styles.arrowLeft}
                  onPress={goPrev}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.arrowRight}
                  onPress={goNext}
                  activeOpacity={0.7}
                >
                  <ArrowRight size={24} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Thumbnails */}
        {imgCount > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailContainer}
          >
            {images.map((imgRaw: string, index: number) => {
              const uri = imgRaw.startsWith('http')
                ? imgRaw
                : `https://api.propertpro.com${imgRaw}`;
              const isSelected = index === selectedImage;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImage(index)}
                  style={[
                    styles.thumbnail,
                    isSelected && styles.thumbnailSelected,
                  ]}
                >
                  <Image
                    source={{ uri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

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

          {/* --- MOVED: Property Details before Description --- */}
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Property Details</Text>

          <View style={styles.detailRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.detailText}>
              Year Built: {yearBuilt || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Layers size={16} color="#666" />
            <Text style={styles.detailText}>
              Floor Level:{' '}
              {floorLevel ? formatOrdinal(floorLevel) : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Floors:</Text>
            <Text style={styles.detailText}>
              {totalFloors || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={16} color="#666" />
            <Text style={styles.detailText}>
              Lot Size: {lotSize ? `${lotSize} m²` : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Parking Spaces:</Text>
            <Text style={styles.detailText}>
              {parkingSpaces != null ? parkingSpaces : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Energy Rating:</Text>
            <Text style={styles.detailText}>
              {energyRating || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Construction:</Text>
            <Text style={styles.detailText}>
              {constructionMaterial || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.detailText}>
              Available From: {availableFrom || 'N/A'}
            </Text>
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
                {amenities.map((amenity: string, idx: number) => (
                  <View key={idx} style={styles.listItem}>
                    <Text style={styles.bullet}>{'\u2022'}</Text>
                    <Text style={styles.listText}>{amenity}</Text>
                  </View>
                ))}
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

          {/* Location Map Placeholder or actual map if you integrate */}
          {(latitude != null && longitude != null) && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>
                  Map: {latitude}, {longitude}
                </Text>
              </View>
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
              onPress={() => Linking.openURL(`tel:${contactPhone}`)}
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
              onPress={() => Linking.openURL(`mailto:${contactEmail}`)}
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
          {owner && (
            <TouchableOpacity
              style={styles.messageOwnerButton}
              onPress={() => {
                router.push({
                  pathname: '/chat',
                  params: {
                    ownerId: String(owner.id),
                    propertyId: String(property.id),
                    title: title,
                  },
                });
              }}
            >
              <MessageSquare size={16} color="#fff" />
              <Text style={styles.messageOwnerText}>
                Message Owner
              </Text>
            </TouchableOpacity>
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
                  onPress={() => {
                    if (agent.email) {
                      Linking.openURL(`mailto:${agent.email}`);
                    }
                  }}
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
                  onPress={() => {
                    if (agent.phone) {
                      Linking.openURL(`tel:${agent.phone}`);
                    }
                  }}
                >
                  <Phone size={20} color="#fff" />
                  <Text style={styles.agentButtonText}>
                    Call Agent
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* SimilarProperties */}
          <View style={styles.separator} />
          <SimilarProperties
            currentPropertyId={property.id}
          />
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
        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={() => {
            // schedule tour or navigate elsewhere
          }}
        >
          <Text style={styles.scheduleButtonText}>
            Schedule Tour
          </Text>
        </TouchableOpacity>
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
  imageContainer: {
    width: '100%',
    height: width * 0.6,
    position: 'relative',
    backgroundColor: '#EEE',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    padding: 12,
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
  arrowLeft: {
    position: 'absolute',
    top: '45%',
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 6,
  },
  arrowRight: {
    position: 'absolute',
    top: '45%',
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 6,
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailSelected: {
    borderColor: '#0F3460',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
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
  mapPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 12,
  },
  mapPlaceholderText: {
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
  messageOwnerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3460',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  messageOwnerText: {
    marginLeft: 6,
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#fff',
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
  scheduleButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scheduleButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#fff',
  },
});
