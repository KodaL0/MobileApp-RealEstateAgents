// app/property/[id].tsx

import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Heart,
  Share,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Layers,
} from "lucide-react-native";

import PropertyDocuments from "@/components/property/PropertyDocuments";
import PropertyMapView from "@/components/property/PropertyMapView";
import ChatButton from "@/components/property/ChatButton";
import { useUser } from "@/app/_userbase/UserContext";
import { api } from "../../config/api";
import { analytics } from "@/services/analytics";

const { width } = Dimensions.get("window");

/* ------------------ NORMALIZER ------------------ */
function normalizePropertyDetail(item: any) {
  const rawImages = Array.isArray(item.images) ? item.images : [];
  const images = rawImages
    .map((imgObj: any) => {
      const raw = typeof imgObj === "string" ? imgObj : imgObj?.image || "";
      if (!raw) return "";
      return raw.startsWith("http") ? raw : `https://api.propertpro.com${raw}`;
    })
    .filter(Boolean);

  let forSale = false;
  if (item.property_status) {
    forSale = item.property_status === "for_sale";
  } else if (typeof item.forSale === "boolean") {
    forSale = item.forSale;
  } else if (item.listing_type) {
    forSale = item.listing_type.toLowerCase() === "sale";
  }

  return {
    id: item.id,
    images,
    forSale,
    title: item.title || "",
    price: !isNaN(Number(item.price)) ? Number(item.price) : 0,
    location: item.location || "",
    propertyType: item.property_type
      ? item.property_type.charAt(0).toUpperCase() + item.property_type.slice(1)
      : "",
    description: item.description || "",
    amenities: Array.isArray(item.amenities)
      ? item.amenities.map((a: any) =>
          typeof a === "string" ? a : a.name || String(a)
        )
      : [],
    contactPhone: item.contact_phone || item.contactPhone || "",
    contactEmail: item.contact_email || item.contactEmail || "",
    owner: item.owner
      ? {
          id: item.owner.id,
          name: item.owner.name,
          photo: item.owner.photo
            ? item.owner.photo.startsWith("http")
              ? item.owner.photo
              : `https://api.propertpro.com${item.owner.photo}`
            : "",
        }
      : null,
    agent: item.agent
      ? {
          name: item.agent.name,
          photo: item.agent.photo
            ? item.agent.photo.startsWith("http")
              ? item.agent.photo
              : `https://api.propertpro.com${item.agent.photo}`
            : "",
          company: item.agent.company,
          phone: item.agent.phone,
          email: item.agent.email,
        }
      : null,
    yearBuilt: item.year_built ? String(item.year_built) : "",
    parkingSpaces:
      item.parking_spaces != null ? Number(item.parking_spaces) : 0,
    lotSize: item.lot_size ? String(item.lot_size) : "",
    energyRating: item.energy_rating || "",
    constructionMaterial: item.construction_material || "",
    floorLevel:
      item.floor_level != null ? String(item.floor_level) : "",
    totalFloors:
      item.total_floors != null ? String(item.total_floors) : "",
    availableFrom: item.available_from || "",
    virtualTourUrl: item.virtual_tour_url || "",
    videoUrl: item.video_url || "",
    financingUrl: item.financing_url || null,
    isPublished:
      item.is_published != null ? Boolean(item.is_published) : true,
    isFavourite: Boolean(item.is_favourite),
    latitude:
      item.latitude != null && !isNaN(Number(item.latitude))
        ? Number(item.latitude)
        : null,
    longitude:
      item.longitude != null && !isNaN(Number(item.longitude))
        ? Number(item.longitude)
        : null,
    documents: Array.isArray(item.documents) ? item.documents : [],
  };
}

/* ------------------ ORDINALS ------------------ */
function formatOrdinal(n: any) {
  const num = Number(n);
  if (isNaN(num)) return String(n);
  const tens = num % 100;
  if (tens >= 11 && tens <= 13) return `${num}th`;
  const unit = num % 10;
  return `${num}${unit === 1 ? "st" : unit === 2 ? "nd" : unit === 3 ? "rd" : "th"}`;
}

/* ===================== MAIN SCREEN ======================= */
export default function PropertyDetailScreen() {
  const { id, source } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();

  const [property, setProperty] = useState<any>(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ------------------ Fetch property ------------------ */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const params = source ? { params: { source } } : undefined;
        const res = await api.properties.getById(Number(id), params);

        if (!mounted) return;

        const data = res?.data ?? res;
        const normalized = normalizePropertyDetail(data);

        setProperty(normalized);
        setIsFavourite(Boolean(data.is_favourite));

        analytics.trackPropertyView({
          propertyId: Number(id),
          source: (typeof source === "string" ? source : undefined) || "direct",
        });
      } catch (err) {
        if (mounted) setError("Failed to load property details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id, source]);

  /* ------------------ Loading / Error ------------------ */
  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F509A"
 />
      </View>
    );

  if (error)
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );

  if (!property) return null;

  /* ------------------ Destructure ------------------ */
  const {
    images,
    title,
    description,
    price,
    location,
    forSale,
    propertyType,
    yearBuilt,
    parkingSpaces,
    lotSize,
    energyRating,
    constructionMaterial,
    floorLevel,
    totalFloors,
    availableFrom,
    amenities,
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

  const handleImageScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentImageIndex(index);
  };

  /* ==========================================================
     RENDER
  ========================================================== */
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {!isPublished && (
          <View style={styles.unpublishedBanner}>
            <Text style={styles.unpublishedText}>
              This property is not published. Only you can see it.
            </Text>
          </View>
        )}

        {/* ------------------ IMAGE GALLERY ------------------ */}
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
              images.map((img: string, index: number) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{ uri: img }}
                    style={StyleSheet.absoluteFillObject}
                    blurRadius={25}
                  />
                  <Image
                    source={{ uri: img }}
                    style={styles.reelImage}
                    resizeMode="contain"
                  />
                  {imgCount > 1 && (
                    <View style={styles.photoCounter}>
                      <Text style={styles.photoCounterText}>
                        {index + 1}/{imgCount}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.imageWrapper}>
                <View style={styles.noImagePlaceholder}>
                  <Text style={styles.noImageText}>
                    No images available
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ---------------- HEADER BUTTONS ---------------- */}
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
                    const resp =
                      await api.properties.toggleFavorite(property.id);
                    const fav = resp?.data?.is_favourite ?? false;
                    setIsFavourite(fav);
                  } catch {
                    Alert.alert(
                      "Error",
                      "Failed to update favorite."
                    );
                  }
                }}
              >
                <Heart
                  size={24}
                  color="#fff"
                  fill={isFavourite ? "#FF6B6B" : "transparent"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() =>
                  Alert.alert("Share", "Share coming soon.")
                }
              >
                <Share size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ------------------ MAIN CONTENT ------------------ */}
        <View style={styles.contentContainer}>
          {/* STATUS + TYPE */}
          <View style={styles.statusRow}>
            <Text
              style={[
                styles.statusBadge,
                forSale ? styles.forSaleBadge : styles.forRentBadge,
              ]}
            >
              {forSale ? "For Sale" : "For Rent"}
            </Text>

            {propertyType ? (
              <Text style={styles.propertyTypeText}>
                {propertyType}
              </Text>
            ) : null}
          </View>

          {/* PRICE */}
          <Text style={styles.priceText}>
            €{price.toLocaleString()}
            {!forSale && (
              <Text style={styles.periodText}>/mo</Text>
            )}
          </Text>

          {/* TITLE */}
          <Text style={styles.title}>{title}</Text>

          {/* LOCATION */}
          <View style={styles.locationRow}>
            <MapPin size={16} color="#666" />
            <Text style={styles.locationText}>{location}</Text>
          </View>

          {/* ------------------ DETAILS GRID ------------------ */}
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Property Details</Text>

          <View style={styles.detailsGrid}>
            {yearBuilt ? (
              <DetailCard
                icon={<Calendar size={20} color="#1F509A" />}
                label="Year Built"
                value={yearBuilt}
              />
            ) : null}

            {floorLevel ? (
              <DetailCard
                icon={<Layers size={20} color="#1F509A" />}
                label="Floor Level"
                value={formatOrdinal(floorLevel)}
              />
            ) : null}

            {totalFloors ? (
              <DetailCard
                icon={<Layers size={20} color="#1F509A" />}
                label="Total Floors"
                value={totalFloors}
              />
            ) : null}

            {lotSize ? (
              <DetailCard
                icon={<MapPin size={20} color="#1F509A" />}
                label="Lot Size"
                value={`${lotSize} m²`}
              />
            ) : null}

            {parkingSpaces > 0 ? (
              <DetailCard
                icon={<MapPin size={20} color="#1F509A" />}
                label="Parking"
                value={String(parkingSpaces)}
              />
            ) : null}

            {energyRating ? (
              <DetailCard
                icon={<Calendar size={20} color="#1F509A" />}
                label="Energy Rating"
                value={energyRating}
              />
            ) : null}

            {constructionMaterial ? (
              <DetailCard
                icon={<Layers size={20} color="#1F509A" />}
                label="Construction"
                value={constructionMaterial}
              />
            ) : null}

            {availableFrom ? (
              <DetailCard
                icon={<Calendar size={20} color="#1F509A" />}
                label="Available From"
                value={availableFrom}
              />
            ) : null}
          </View>

          {/* ------------------ DESCRIPTION ------------------ */}
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Description</Text>

          <Text style={styles.description}>{description}</Text>

          {/* ------------------ AMENITIES (WEB STYLE PILLS) ------------------ */}
          {amenities.length > 0 && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>Amenities</Text>

              <View style={styles.amenitiesContainer}>
                {amenities.map((am: string, index: number) => (
                  <View key={index} style={styles.amenityPill}>
                    <Text style={styles.amenityText}>{am}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ------------------ TOUR / VIDEO ------------------ */}
          {(virtualTourUrl || videoUrl) && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>
                Virtual Tour / Video
              </Text>

              {virtualTourUrl ? (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(virtualTourUrl)}
                >
                  <Text style={styles.linkText}>
                    Open Virtual Tour
                  </Text>
                </TouchableOpacity>
              ) : null}

              {videoUrl ? (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(videoUrl)}
                >
                  <Text style={styles.linkText}>Watch Video</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {/* ------------------ DOCUMENTS ------------------ */}
          {documents.length > 0 && (
            <>
              <View style={styles.separator} />
              <PropertyDocuments documents={documents} />
            </>
          )}

          {/* ------------------ MAP ------------------ */}
          {latitude && longitude ? (
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
          ) : null}

          {/* ------------------ CONTACT INFO ------------------ */}
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>
            Contact Information
          </Text>

          {contactPhone ? (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL(`tel:${contactPhone}`)}
            >
              <Phone size={16} color="#1F509A" />
              <Text style={styles.contactText}>
                {contactPhone}
              </Text>
            </TouchableOpacity>
          ) : null}

          {contactEmail ? (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() =>
                Linking.openURL(`mailto:${contactEmail}`)
              }
            >
              <Mail size={16} color="#1F509A" />
              <Text style={styles.contactText}>
                {contactEmail}
              </Text>
            </TouchableOpacity>
          ) : null}

          {!contactPhone && !contactEmail ? (
            <Text style={styles.noContactText}>
              Contact details not provided.
            </Text>
          ) : null}

          {/* ------------------ CHAT BUTTON ------------------ */}
          {owner ? (
            <View style={styles.chatButtonContainer}>
              <ChatButton
                sellerId={owner.id}
                propertyId={property.id}
                title={title}
              />
            </View>
          ) : null}

          {/* ------------------ AGENT ------------------ */}
          {agent ? (
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
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Text key={s} style={styles.star}>
                        ★
                      </Text>
                    ))}
                    <Text style={styles.ratingText}>5.0</Text>
                  </View>
                </View>
              </View>

              <View style={styles.agentButtons}>
                <TouchableOpacity
                  style={[styles.agentButton, styles.messageButton]}
                >
                  <MessageSquare size={20} color="#fff" />
                  <Text style={styles.agentButtonText}>
                    Message
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.agentButton, styles.callButton]}
                  onPress={() =>
                    Linking.openURL(`tel:${agent.phone}`)
                  }
                >
                  <Phone size={20} color="#fff" />
                  <Text style={styles.agentButtonText}>
                    Call Agent
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* ------------------ FOOTER ------------------ */}
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
              ? "View Financing Options"
              : "Available Now"}
          </Text>
        </View>

        {owner ? (
          <ChatButton
            sellerId={owner.id}
            propertyId={property.id}
            title={title}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/* ------------------ DETAIL CARD ------------------ */
const DetailCard = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View style={styles.detailCard}>
    {icon}
    <Text style={styles.detailCardLabel}>{label}</Text>
    <Text style={styles.detailCardValue}>{value}</Text>
  </View>
);

/* =====================================================
   STYLES — FULL MOBILE THEME MATCHING YOUR WEB UI
===================================================== */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 16,
  },
    unpublishedBanner: {
    backgroundColor: '#FFF3CD',
    padding: 14,
    borderRadius: 8,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  unpublishedText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '500',
  },


  /* ------------------ IMAGE GALLERY ------------------ */
  imageGalleryContainer: {
    width: "100%",
    height: width * 0.8,
    backgroundColor: "#1A1A1A",
  },
  imageScroll: { flex: 1 },
  imageWrapper: {
    width,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  reelImage: {
    width: "100%",
    height: "100%",
  },
  noImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E9ECEF",
  },
  noImageText: {
    fontSize: 14,
    color: "#6C757D",
  },

  imageHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 52, 96, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 52, 96, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoCounter: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "rgba(15, 52, 96, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photoCounterText: { color: "#fff", fontSize: 13 },

  /* ------------------ CONTENT ------------------ */
  contentContainer: {
    padding: 20,
  },

  /* STATUS & TYPE */
  statusRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    color: "#fff",
    fontSize: 11,
  },
  forSaleBadge: {
    backgroundColor: "#10B981",
  },
  forRentBadge: {
    backgroundColor: "#3B82F6",
  },

  propertyTypeText: {
    backgroundColor: "#E8EDF2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    color: "#1F509A",
  },

  /* PRICE */
  priceText: {
    fontSize: 32,
    color: "#1F509A",
    marginBottom: 6,
    fontWeight: "700",
  },
  periodText: {
    fontSize: 18,
    color: "#6C757D",
  },

  /* TITLE */
  title: {
    fontSize: 22,
    color: "#1A1A1A",
    marginBottom: 10,
    fontWeight: "600",
  },

  /* LOCATION */
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8EDF2",
    backgroundColor: "#FFF",
    marginBottom: 20,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#495057",
  },

  /* SEPARATOR */
  separator: {
    height: 1,
    backgroundColor: "#E8EDF2",
    marginVertical: 24,
  },

  /* SECTION TITLE */
  sectionTitle: {
    fontSize: 20,
    color: "#1F509A",
    marginBottom: 16,
    fontWeight: "600",
  },

  /* DETAILS GRID */
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  detailCard: {
    width: "47%",
    margin: 6,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EDF2",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  detailCardLabel: {
    fontSize: 11,
    color: "#6C757D",
    marginTop: 10,
    marginBottom: 2,
  },
  detailCardValue: {
    fontSize: 15,
    color: "#1F509A",
    fontWeight: "600",
    textAlign: "center",
  },

  /* DESCRIPTION */
  description: {
    fontSize: 15,
    color: "#495057",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8EDF2",
    lineHeight: 22,
  },

  /* AMENITY PILLS */
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  amenityPill: {
    backgroundColor: "#E8EDF2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  amenityText: {
    color: "#1F509A",
    fontSize: 13,
    fontWeight: "500",
  },

  /* LINKS */
  linkButton: {
    backgroundColor: "#1F509A",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  linkText: {
    color: "#FFF",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
  },

  /* LOCATION ROW AFTER MAP */
  detailRow: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8EDF2",
    backgroundColor: "#FFF",
    marginTop: 12,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#495057",
  },

  /* CONTACT */
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8EDF2",
    backgroundColor: "#FFF",
  },
  contactText: {
    marginLeft: 12,
    fontSize: 15,
    color: "#1F509A",
  },
  noContactText: {
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center",
  },

  /* CHAT BUTTON */
  chatButtonContainer: {
    marginTop: 20,
    marginBottom: 12,
  },

  /* AGENT */
  agentCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8EDF2",
    marginBottom: 16,
  },
  agentImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  agentInfo: { flex: 1 },
  agentName: {
    fontSize: 17,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  agentCompany: {
    fontSize: 13,
    color: "#6C757D",
  },
  agentRating: {
    flexDirection: "row",
    marginTop: 6,
  },
  star: {
    color: "#FFC107",
    fontSize: 14,
  },
  ratingText: {
    fontSize: 13,
    color: "#495057",
    marginLeft: 6,
  },
  agentButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  agentButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  messageButton: {
    backgroundColor: "#1F509A"
,
  },
  callButton: {
    backgroundColor: "#10B981",
  },
  agentButtonText: {
    color: "#FFF",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },

  /* FOOTER */
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EDF2",
  },
  footerPrice: {
    fontSize: 22,
    color: "#1F509A"
,
    fontWeight: "700",
  },
  footerSubtext: {
    fontSize: 12,
    color: "#6C757D",
  },
});
