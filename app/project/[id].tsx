// app/project/[id].tsx
// Project detail screen — supports ?source=feed for click tracking (Feed API v2)

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
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, MapPin, Heart, Share, Building2 } from "lucide-react-native";

import { useUser } from "@/app/_userbase/UserContext";
import { api } from "../../config/api";

const { width } = Dimensions.get("window");
const BASE_URL = "https://api.propertpro.com";

/* ------------------ Fetch project with source for click tracking ------------------ */
export default function ProjectDetailScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const router = useRouter();
  const { isAuthenticated } = useUser();

  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // Pass source=feed for click tracking (Feed API v2)
        const config = source ? { params: { source } } : undefined;
        const data = await api.listings.getById(Number(id), "project", config);

        if (!mounted) return;

        setProject(data);
        setIsFavourite(Boolean(data?.is_favourite));
      } catch {
        if (mounted) setError("Failed to load project details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id, source]);

  const handleBack = () => router.back();

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to save projects.");
      router.push("/(tabs)/profile");
      return;
    }
    try {
      const res = await api.listings.toggleFavorite(Number(id), "project");
      setIsFavourite(Boolean(res?.is_favourite));
    } catch {
      Alert.alert("Error", "Failed to update favorite.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F509A" />
      </View>
    );
  }

  if (error || !project) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Project not found"}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = Array.isArray(project.images)
    ? (project.images as Array<string | { image?: string }>)
        .map((img) => (typeof img === "string" ? img : img?.image || ""))
        .filter(Boolean)
    : project.main_image
    ? [project.main_image]
    : [];

  const imageUrl = images[0];
  const fullImageUrl = imageUrl?.startsWith("http") ? imageUrl : `${BASE_URL}${imageUrl}`;

  const hasSale =
    project.sale_price_min != null || project.sale_price_max != null;
  const listingType = hasSale ? "sale" : "rent";
  const priceMin = hasSale ? project.sale_price_min : project.rent_price_min;
  const priceMax = hasSale ? project.sale_price_max : project.rent_price_max;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(p);

  const priceText =
    priceMin != null && priceMax != null && priceMin !== priceMax
      ? `${formatPrice(priceMin)} – ${formatPrice(priceMax)}`
      : priceMin != null
      ? formatPrice(priceMin)
      : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconButton}>
              <Heart
                size={24}
                color="#fff"
                fill={isFavourite ? "#fff" : "transparent"}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Share size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image */}
        {fullImageUrl && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: fullImageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.badge}>
            <Building2 size={14} color="#10b981" />
            <Text style={styles.badgeText}>PROJECT</Text>
          </View>

          <Text style={styles.title}>{project.name || "Untitled Project"}</Text>

          {(project.location || project.country) && (
            <View style={styles.locationRow}>
              <MapPin size={16} color="#10b981" />
              <Text style={styles.locationText}>
                {[project.location, project.country].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}

          {priceText && (
            <Text style={styles.price}>
              {priceText}
              <Text style={styles.priceLabel}>
                {listingType === "sale" ? "" : " / month"}
              </Text>
            </Text>
          )}

          {project.description && (
            <Text style={styles.description}>{project.description}</Text>
          )}

          {(project.total_units != null || project.available_units != null) && (
            <View style={styles.statsRow}>
              {project.total_units != null && (
                <Text style={styles.statText}>
                  {project.total_units} total units
                </Text>
              )}
              {project.available_units != null && (
                <Text style={styles.statText}>
                  {project.available_units} available
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#10b981",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
  },
  imageContainer: {
    width,
    height: width * 0.75,
    backgroundColor: "#eee",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  content: {
    padding: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F3460",
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: "#666",
    flex: 1,
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F3460",
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: "400",
    color: "#666",
  },
  description: {
    fontSize: 16,
    color: "#444",
    lineHeight: 24,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  statText: {
    fontSize: 14,
    color: "#666",
  },
});
