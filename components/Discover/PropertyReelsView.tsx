import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
	Bath,
	Bed,
	Heart,
	MapPin,
	MessageCircle,
	Share,
	Square,
	UserCircle,
} from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Animated,
	Dimensions,
	FlatList,
	Image,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import type { ImageStyle, StyleProp, ViewStyle } from "react-native";
import { useUser } from "@/app/_userbase/UserContext";
import { useChat } from "@/app/features/chat/context/ChatContext";
import type { FeedItem, FeedProperty } from "@/app/features/types";
import { api } from "@/config/api";
import { getCachedFeedData } from "@/data/feedCache";
import { analytics } from "@/services/analytics";
import ProjectReelCard from "./ProjectReelCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BASE_URL = "https://propertprodjango.onrender.com";

// 9:16 vertical frame – clamped so it doesn't exceed the screen
const REEL_ASPECT_RATIO = 16 / 9;
const REEL_HEIGHT = Math.min(
	SCREEN_WIDTH * REEL_ASPECT_RATIO,
	SCREEN_HEIGHT * 0.9,
);

// ---------- OptimizedImage (unchanged logic, used for blur BG) ----------
const OptimizedImage = memo(
	({
		uri,
		style,
		blurRadius = 0,
		onError,
		containerStyle,
  }: {
		uri: string;
		style: StyleProp<ImageStyle>;
		blurRadius?: number;
		onError?: () => void;
		containerStyle?: StyleProp<ViewStyle>;
	}) => {
		const [imageError, setImageError] = useState(false);
		const [imageLoading, setImageLoading] = useState(true);

		const handleError = useCallback(() => {
			setImageError(true);
			setImageLoading(false);
			onError?.();
		}, [onError]);

		const handleLoad = useCallback(() => {
			setImageLoading(false);
		}, []);

		const imageUri = imageError
			? "https://via.placeholder.com/800x600?text=No+Image"
			: uri;

		return (
			<View style={containerStyle || style}>
				{imageLoading && !imageError && (
					<View
						style={[StyleSheet.absoluteFillObject, styles.imageLoadingOverlay]}
					>
						<ActivityIndicator size="large" color="#6b7280" />
					</View>
				)}

				{imageError && (
					<View
						style={[StyleSheet.absoluteFillObject, styles.imageErrorOverlay]}
					>
						<Text style={styles.imageErrorText}>Image unavailable</Text>
					</View>
				)}

				<Image
					source={{
						uri: imageUri,
						cache: "force-cache",
					}}
					style={[StyleSheet.absoluteFillObject, style]}
					resizeMode="cover"
					onError={handleError}
					onLoad={handleLoad}
					blurRadius={blurRadius}
					fadeDuration={0}
				/>
			</View>
		);
	},
);
OptimizedImage.displayName = "OptimizedImage";

// ---------- Main Reel Card Component ----------
const PropertyReelCard = memo(function PropertyReelCard({
	property,
	onViewProperty,
	source,
	onFavoriteMetaUpdate,
}: {
	property: FeedProperty;
	onViewProperty?: () => void;
	source?: string;
	onFavoriteMetaUpdate?: (
		propertyId: number | string,
		meta: { favorites_count?: number | null; is_favourite?: boolean | null },
	) => void;
}) {
	const router = useRouter();
	const getFavoriteCountValue = useCallback((value: unknown): number | null => {
		if (typeof value === "number" && Number.isFinite(value)) {
			return value;
		}
		if (typeof value === "string") {
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : null;
		}
		return null;
	}, []);

	const [isLiked, setIsLiked] = useState(property?.is_favourite || false);
	const [favoriteCount, setFavoriteCount] = useState<number>(
		getFavoriteCountValue(property?.favorites_count) ?? 0,
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isChatLoading, setIsChatLoading] = useState(false);
	const [showHeartAnimation, setShowHeartAnimation] = useState(false);
	const scrollViewRef = useRef<ScrollView>(null);
	const heartScale = useRef(new Animated.Value(0)).current;
	const heartOpacity = useRef(new Animated.Value(0)).current;
	const lastTap = useRef<number>(0);
	const touchStartY = useRef<number>(0);
	const touchStartX = useRef<number>(0);
	const { getOrCreateThread } = useChat();
	const { isAuthenticated } = useUser();
	useEffect(() => {
		setIsLiked(property?.is_favourite || false);
	}, [property?.is_favourite]);

	useEffect(() => {
		const parsedCount = getFavoriteCountValue(property?.favorites_count);
		if (parsedCount !== null) {
			setFavoriteCount(parsedCount);
		}
	}, [property?.favorites_count, getFavoriteCountValue]);

	// Only fetch favorite metadata if not already provided
	useEffect(() => {
		if (!property?.id) return;

		// Skip if we already have the data from feed
		if (
			property.is_favourite !== undefined &&
			property.favorites_count !== undefined
		) {
			return;
		}

		let isMounted = true;

		const fetchFavoriteMeta = async () => {
			try {
				const details = await api.properties.getById(property.id);
				if (!isMounted) return;

				const fetchedCount = getFavoriteCountValue(details?.favorites_count);
				if (fetchedCount !== null) {
					setFavoriteCount(fetchedCount);
				}
				if (typeof details?.is_favourite === "boolean") {
					setIsLiked(details.is_favourite);
				}
				onFavoriteMetaUpdate?.(property.id, {
					favorites_count: fetchedCount ?? details?.favorites_count ?? null,
					is_favourite:
						typeof details?.is_favourite === "boolean"
							? details.is_favourite
							: null,
				});
			} catch (error) {
				console.warn(
					"PropertyReelCard: Failed to refresh favorite metadata",
					error,
				);
			}
		};

		fetchFavoriteMeta();
		return () => {
			isMounted = false;
		};
	}, [
		property?.id,
		property?.is_favourite,
		property?.favorites_count,
		getFavoriteCountValue,
		onFavoriteMetaUpdate,
	]);

	useEffect(() => {
		setShowHeartAnimation(false);
		setIsChatLoading(false);
		setCurrentIndex(0);
		if (scrollViewRef.current) {
			scrollViewRef.current.scrollTo({ x: 0, animated: false });
		}
	}, []);

	const owner = useMemo(() => property?.owner ?? {}, [property?.owner]);
	const ownerIdValue = owner?.id ?? null;
	const ownerId = useMemo(() => {
		if (ownerIdValue === null || ownerIdValue === undefined) return NaN;
		return Number(ownerIdValue);
	}, [ownerIdValue]);

	const agentName: string | null = useMemo(
		() => owner?.name ?? owner?.username ?? null,
		[owner?.name, owner?.username],
	);
	const ownerUsername: string | null = useMemo(
		() => owner?.username ?? null,
		[owner?.username],
	);

	const getValidUrl = useCallback((uri?: string) => {
		if (!uri) return "https://via.placeholder.com/800x600?text=No+Image";
		return uri.startsWith("http") ? uri : `${BASE_URL}${uri}`;
	}, []);

	const handleAgentProfilePress = useCallback(() => {
		if (!ownerUsername) {
			Alert.alert("Unavailable", "Agent profile is currently unavailable.");
			return;
		}

		router.push({
			pathname: "/agent/[username]",
			params: { username: ownerUsername },
		} as never);
	}, [ownerUsername, router]);

	const images = useMemo(() => {
		if (!property) return [getValidUrl()];
		if (property.images && property.images.length > 0) {
			return property.images
				.map((img: { image?: string } | string) =>
					typeof img === "string" ? getValidUrl(img) : getValidUrl(img.image),
				)
				.filter(Boolean);
		}
		return [getValidUrl()];
	}, [property, getValidUrl]);

	const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
		const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
		setCurrentIndex(index);
	}, []);

	const formatPrice = useCallback(
		(price: number) =>
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "EUR",
				minimumFractionDigits: 0,
			}).format(price || 0),
		[],
	);

	const parseNumericValue = useCallback(
		(value: number | string | null | undefined): number | null => {
			if (value === null || value === undefined) return null;
			const numeric = typeof value === "string" ? parseFloat(value) : value;
			return Number.isFinite(numeric) ? numeric : null;
		},
		[],
	);

	const bedroomsValue = useMemo(
		() => (property ? parseNumericValue(property.bedrooms) : null),
		[property, parseNumericValue],
	);
	const bathroomsValue = useMemo(
		() => (property ? parseNumericValue(property.bathrooms) : null),
		[property, parseNumericValue],
	);
	const areaValue = useMemo(
		() => (property ? parseNumericValue(property.area) : null),
		[property, parseNumericValue],
	);

	const formatBathrooms = useCallback((value: number | null) => {
		if (value === null) return null;
		return Number.isInteger(value) ? value.toString() : value.toFixed(1);
	}, []);

	const handleViewPress = useCallback(() => {
		if (onViewProperty) {
			onViewProperty();
		} else if (property?.id) {
			const queryParams = source ? `?source=${source}` : "";
			router.push(`/property/${property.id}${queryParams}`);
		}
	}, [onViewProperty, property?.id, source, router]);

	const handleTitlePress = useCallback(() => {
		handleViewPress();
	}, [handleViewPress]);

	// Heart animation
	const triggerHeartAnimation = useCallback(() => {
		setShowHeartAnimation(true);
		heartScale.setValue(0);
		heartOpacity.setValue(1);

		const useNative = Platform.OS !== "web";

		Animated.parallel([
			Animated.spring(heartScale, {
				toValue: 1.2,
				friction: 3,
				tension: 40,
				useNativeDriver: useNative,
			}),
			Animated.sequence([
				Animated.delay(200),
				Animated.timing(heartOpacity, {
					toValue: 0,
					duration: 300,
					useNativeDriver: useNative,
				}),
			]),
		]).start(() => {
			setShowHeartAnimation(false);
			heartScale.setValue(0);
		});
	}, [heartScale, heartOpacity]);

	const handleFavorite = useCallback(async () => {
		if (!property?.id) {
			console.warn(
				"PropertyReelCard: handleFavorite called without a property id",
			);
			return;
		}

		const propertyId = property.id;

		try {
			const response = await api.properties.toggleFavorite(propertyId);
			const nextLiked =
				typeof response?.is_favourite === "boolean"
					? response.is_favourite
					: !isLiked;

			setIsLiked(nextLiked);

			setFavoriteCount((prev) => {
				const responseCount = getFavoriteCountValue(response?.favorites_count);
				if (responseCount !== null) {
					return responseCount;
				}

				const safePrev = typeof prev === "number" ? prev : 0;
				return nextLiked ? safePrev + 1 : Math.max(0, safePrev - 1);
			});

			try {
				const details = await api.properties.getById(propertyId);
				const refreshedCount = getFavoriteCountValue(details?.favorites_count);
				if (refreshedCount !== null) {
					setFavoriteCount(refreshedCount);
				}
				if (typeof details?.is_favourite === "boolean") {
					setIsLiked(details.is_favourite);
				}
				onFavoriteMetaUpdate?.(propertyId, {
					favorites_count: refreshedCount ?? details?.favorites_count ?? null,
					is_favourite:
						typeof details?.is_favourite === "boolean"
							? details.is_favourite
							: null,
				});
			} catch (fetchError) {
				console.warn(
					"PropertyReelCard: Failed to refresh favorites_count after toggle",
					fetchError,
				);
			}
		} catch (e: unknown) {
			console.error("Failed to toggle favorite:", e);
			Alert.alert("Error", "Failed to update favorite. Please try again.");
		}
	}, [property?.id, isLiked, onFavoriteMetaUpdate, getFavoriteCountValue]);

	// Tap / double-tap handler
	const handleTouchStart = useCallback((event: { nativeEvent: { touches: Array<{ pageY: number; pageX: number }> } }) => {
		const touch = event.nativeEvent.touches[0];
		if (touch) {
			touchStartY.current = touch.pageY;
			touchStartX.current = touch.pageX;
		}
	}, []);

	const handleTouchEnd = useCallback(
		(event: { nativeEvent: { changedTouches?: Array<{ pageY: number; pageX: number }> } }) => {
			const touch = event.nativeEvent.changedTouches?.[0];
			if (!touch) return;

			const deltaY = Math.abs(touch.pageY - touchStartY.current);
			const deltaX = Math.abs(touch.pageX - touchStartX.current);

			if (deltaY > 15 || deltaX > 15) return;

			const now = Date.now();
			const DOUBLE_TAP_DELAY = 300;

			if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
				if (!isLiked) {
					handleFavorite();
				}
				triggerHeartAnimation();
			} else {
				lastTap.current = now;
			}
		},
		[isLiked, handleFavorite, triggerHeartAnimation],
	);

	const handleChat = useCallback(async () => {
		if (isChatLoading) return;

		if (!isAuthenticated) {
			Alert.alert(
				"Sign In Required",
				"Please sign in to start a chat with the agent.",
			);
			router.push("/(tabs)/profile");
			return;
		}

		const propertyId = property?.id ? Number(property.id) : null;
		if (
			!ownerId ||
			Number.isNaN(ownerId) ||
			!propertyId ||
			Number.isNaN(propertyId)
		) {
			Alert.alert(
				"Unavailable",
				"Could not identify the agent for this property.",
			);
			return;
		}

		try {
			setIsChatLoading(true);
			const threadId = await getOrCreateThread(
				ownerId,
				propertyId,
				property?.title,
			);

			// Track chat conversion using centralized analytics service
			analytics.trackPropertyContact({
				propertyId,
				contactMethod: "chat",
			});

			router.push(`/chat/${threadId}`);
		} catch (e: unknown) {
			console.error("Failed to initiate chat:", e);
			Alert.alert("Error", "Failed to open chat. Please try again.");
		} finally {
			setIsChatLoading(false);
		}
	}, [
		isChatLoading,
		isAuthenticated,
		ownerId,
		property?.id,
		property?.title,
		getOrCreateThread,
		router,
	]);

	const handleShare = useCallback(async () => {
		try {
			Alert.alert(
				"Success",
				"Share tracked! Full sharing functionality coming soon.",
				[{ text: "OK" }],
			);
		} catch (e: unknown) {
			console.error("Failed to track share:", e);
			Alert.alert("Error", "Failed to track share. Please try again.");
		}
	}, []);

	if (!property) return null;

	// Tag line (top-left)
	const propertyType = (() => {
		if (!property?.property_type) return "PROPERTY";
		if (property.property_type.toLowerCase() === "residential_building") {
			return "RESIDENTIAL";
		}
		return property.property_type.toUpperCase();
	})();
	const country = property.country || "Unknown";
	const statusLabel =
		property.property_status === "for_sale" ? "For Sale" : "For Rent";
	const tagLine = `${propertyType} · ${country} · ${statusLabel}`;

	return (
		<View style={styles.safeContainer}>
			<View
				style={styles.container}
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
				onStartShouldSetResponder={() => false}
				onMoveShouldSetResponder={() => false}
			>
				{/* IMAGE CAROUSEL – fixed 9:16-ish frame, blur + contain */}
				<ScrollView
					ref={scrollViewRef}
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					onScroll={handleScroll}
					scrollEventThrottle={16}
					style={styles.imageScroll}
					decelerationRate="fast"
					snapToInterval={SCREEN_WIDTH}
					snapToAlignment="center"
					directionalLockEnabled={true}
					alwaysBounceVertical={false}
					nestedScrollEnabled={true}
				>
					{images.map((uri: string, index: number) => (
						<View key={uri || `image-${index}`} style={styles.imageWrapper}>
							{/* Blurred BG */}
							<OptimizedImage
								uri={uri}
								style={StyleSheet.absoluteFillObject}
								containerStyle={StyleSheet.absoluteFillObject}
								blurRadius={25}
							/>

							{/* Dark overlay to boost contrast */}
							<View style={styles.imageOverlay} />

							{/* Foreground 9:16 frame – full image visible (contain) */}
							<View style={styles.imageFrame}>
								<Image
									source={{
										uri,
										cache: "force-cache",
									}}
									style={styles.image}
									resizeMode="contain"
									fadeDuration={0}
								/>
							</View>
						</View>
					))}
				</ScrollView>

				{/* Gradient from bottom for text legibility */}
				<LinearGradient
					colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
					style={styles.bottomGradient}
				/>

				{/* Top bar: compact tags + photo counter */}
				<View style={styles.topBar}>
					<View style={styles.tagContainer}>
						<Text style={styles.tagLine} numberOfLines={1}>
							{tagLine}
						</Text>
						{images.length > 1 && (
							<Text style={styles.photoCounterText}>
								{currentIndex + 1}/{images.length}
							</Text>
						)}
					</View>
				</View>

				{/* Heart animation overlay */}
				{showHeartAnimation && (
					<Animated.View
						style={[
							styles.heartAnimation,
							{
								opacity: heartOpacity,
								transform: [{ scale: heartScale }],
							},
						]}
						pointerEvents="none"
					>
						<Heart size={80} color="#FF385C" fill="#FF385C" />
					</Animated.View>
				)}

				{/* RIGHT-SIDE ACTION COLUMN: Heart → Chat → Share → Agent → View */}
				<View style={styles.sideActions}>
					{/* Heart + count */}
					<TouchableOpacity
						style={styles.iconCircle}
						onPress={handleFavorite}
						activeOpacity={0.8}
					>
						<Heart
							size={28}
							color="#fff"
							fill={isLiked ? "#FF385C" : "transparent"}
							strokeWidth={2}
						/>
					</TouchableOpacity>
					<Text style={styles.likeCount}>{favoriteCount}</Text>

					{/* Chat */}
					<TouchableOpacity
						style={styles.iconCircle}
						onPress={handleChat}
						disabled={isChatLoading}
						activeOpacity={0.8}
					>
						{isChatLoading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<MessageCircle size={28} color="#fff" strokeWidth={2.2} />
						)}
					</TouchableOpacity>

					{/* Share */}
					<TouchableOpacity
						style={styles.iconCircle}
						onPress={handleShare}
						activeOpacity={0.8}
					>
						<Share size={28} color="#fff" strokeWidth={2} />
					</TouchableOpacity>

					{/* Agent */}
					<TouchableOpacity
						style={styles.iconCircle}
						onPress={handleAgentProfilePress}
						activeOpacity={0.8}
					>
						<UserCircle size={28} color="#fff" strokeWidth={2} />
					</TouchableOpacity>

					{/* View */}
					<TouchableOpacity
						style={styles.viewCircle}
						onPress={handleViewPress}
						activeOpacity={0.9}
					>
						<Text style={styles.viewText}>View</Text>
					</TouchableOpacity>
				</View>

				{/* BOTTOM CAPTION INFO */}
				<View style={styles.bottomInfo}>
					{agentName && (
						<TouchableOpacity
							onPress={handleAgentProfilePress}
							activeOpacity={0.7}
						>
							<Text style={styles.agentName}>{agentName}</Text>
						</TouchableOpacity>
					)}

					<TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
						<Text style={styles.title} numberOfLines={2}>
							{property.title || "Untitled Property"}
						</Text>
					</TouchableOpacity>

					{/* Price row */}
					<View style={styles.priceRow}>
						<Text style={styles.price}>{formatPrice(property.price)}</Text>
						<Text style={styles.priceLabel}>
							{property.property_status === "for_sale"
								? "Purchase Price"
								: "/month"}
						</Text>
					</View>

					{/* Location */}
					<View style={styles.locationRow}>
						<MapPin size={16} color="#10b981" />
						<Text style={styles.locationText} numberOfLines={1}>
							{property.location || "Unknown Location"}
						</Text>
					</View>

					{/* Stats row */}
					<View style={styles.statsRow}>
						{bedroomsValue !== null && (
							<View style={styles.statPill}>
								<Bed size={14} color="#fff" />
								<Text style={styles.statText}>{bedroomsValue.toString()}</Text>
							</View>
						)}
						{formatBathrooms(bathroomsValue) && (
							<View style={styles.statPill}>
								<Bath size={14} color="#fff" />
								<Text style={styles.statText}>
									{formatBathrooms(bathroomsValue)}
								</Text>
							</View>
						)}
						{areaValue !== null && (
							<View style={styles.statPill}>
								<Square size={14} color="#fff" />
								<Text style={styles.statText}>
									{areaValue.toLocaleString()} m²
								</Text>
							</View>
						)}
					</View>
				</View>
			</View>
		</View>
	);
});

PropertyReelCard.displayName = "PropertyReelCard";

// Type guard to check if item is a property
function isProperty(item: FeedItem): item is FeedProperty {
	// Check _type discriminator first (most reliable)
	const withType = item as { _type?: string };
	if (withType._type === "property") return true;
	if (withType._type === "project") return false;
	// Fallback: check for property_type field (properties have it, projects don't)
	const withTypes = item as { property_types?: unknown[] };
	return (
		"property_type" in item &&
		!("property_types" in item && Array.isArray(withTypes.property_types))
	);
}

/** Build URL slug for a feed item: property-{id} or project-{id} */
function getItemSlug(item: FeedItem): string {
	const id = item?.id?.toString() ?? "";
	return isProperty(item) ? `property-${id}` : `project-${id}`;
}

// ---------- Feed Container Component ----------
export default function PropertyReelsView({ initialSlug }: { initialSlug?: string } = {}) {
	const [properties, setProperties] = useState<FeedItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [_currentIndex, setCurrentIndex] = useState(0);
	const { isAuthenticated } = useUser();
	const flatListRef = useRef<FlatList>(null);
	const lastUrlSlugRef = useRef<string | null>(null);
	const hasMountedRef = useRef(false);
	const isLoadingNextPageRef = useRef(false);
	const lastViewableCheckRef = useRef(0);
	const isAppendingRef = useRef(false);

	const handleFavoriteMetaUpdate = useCallback(
		(
			itemId: number | string,
			meta: { favorites_count?: number | null; is_favourite?: boolean | null },
		) => {
			setProperties((prev) =>
				prev.map((item) => {
					if (!item || item.id !== itemId) return item;

					if (isProperty(item)) {
						const updates: Partial<FeedProperty> = {};
						if (
							meta.favorites_count !== undefined &&
							meta.favorites_count !== null
						) {
							updates.favorites_count = meta.favorites_count;
						}
						if (typeof meta.is_favourite === "boolean") {
							updates.is_favourite = meta.is_favourite;
						}
						if (Object.keys(updates).length === 0) {
							return item;
						}
						return { ...item, ...updates };
					} else {
						// Project updates
						if (Object.keys(meta).length === 0) {
							return item;
						}
						return {
							...item,
							...(meta.favorites_count !== undefined &&
							meta.favorites_count !== null
								? { favorites_count: meta.favorites_count }
								: {}),
							...(typeof meta.is_favourite === "boolean"
								? { is_favourite: meta.is_favourite }
								: {}),
						};
					}
				}),
			);
		},
		[],
	);

	const fetchFeed = useCallback(
		async (
			pageNum: number,
			append: boolean = false,
			silent: boolean = false,
		): Promise<void> => {
			if (!isAuthenticated) {
				setError("Please sign in to view your personalized feed.");
				setLoading(false);
				return;
			}

			try {
				if (append) {
					setLoadingMore(true);
				} else if (!silent) {
					setLoading(true);
				}
				setError(null);

				const response = await api.feed.list({ page: pageNum, page_size: 10 });

				if (append) {
					setProperties((prev) => {
						// Avoid duplicates when appending
						const existingIds = new Set(prev.map((item) => item.id));
						const newItems = response.results.filter(
							(item) => !existingIds.has(item.id),
						);
						const updated = [...prev, ...newItems];

						console.log(
							`✅ Page ${pageNum} loaded: ${newItems.length} new items (total: ${updated.length})`,
						);

						return updated;
					});

					// Brief lock to let render complete, then clear
					setTimeout(() => {
						isAppendingRef.current = false;
					}, 100);
				} else {
					setProperties(response.results);
					console.log(`✅ Feed loaded: ${response.results.length} items`);
				}

				setHasNextPage(response.next !== null);
			} catch (err: unknown) {
				console.error("Failed to fetch feed:", err);
				if (!silent) {
					setError(
						(err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
							"Failed to load feed. Please try again.",
					);
				}
			} finally {
				setLoading(false);
				setLoadingMore(false);
				setIsRefreshing(false);
			}
		},
		[isAuthenticated],
	);

	// [DEBUG] Log feed URL state on web mount
	useEffect(() => {
		if (__DEV__ && Platform.OS === "web") {
			console.log("[feed:url] mount", initialSlug ? { initialSlug } : { initialSlug: "(none)" });
		}
	}, [initialSlug]);

	// Initialize feed - try cache first, then fetch if needed
	useEffect(() => {
		if (hasMountedRef.current) return;
		hasMountedRef.current = true;

		if (isAuthenticated) {
			// Try to load from cache first (instant display)
			getCachedFeedData().then((cachedData) => {
				if (cachedData?.items && cachedData.items.length > 0) {
					console.log(
						`📦 Loading feed from cache: ${cachedData.items.length} items`,
					);
					setProperties(cachedData.items);
					setHasNextPage(!!cachedData.next);
					setLoading(false);

					// Refresh in background (silent update)
					fetchFeed(1, false, true);
				} else {
					// No cache, fetch normally
					console.log("📡 No cache found, fetching feed...");
					fetchFeed(1, false, false);
				}
			});
		}
	}, [isAuthenticated, fetchFeed]);

	// Scroll to item when landing on /feed/slug (e.g. refresh or shared link)
	useEffect(() => {
		if (!initialSlug || properties.length === 0 || !flatListRef.current) return;
		// Parse slug: property-123 or project-456
		const match = initialSlug.match(/^(property|project)-(.+)$/);
		if (!match) return;
		const [, type, idStr] = match;
		const index = properties.findIndex((item) => {
			const itemType = isProperty(item) ? "property" : "project";
			const itemId = item.id?.toString();
			return itemType === type && itemId === idStr;
		});
		if (index >= 0) {
			lastUrlSlugRef.current = initialSlug;
			flatListRef.current.scrollToOffset({ offset: index * SCREEN_HEIGHT, animated: false });
			if (__DEV__ && Platform.OS === "web") {
				console.log("[feed:url] deep link →", { initialSlug, index, totalItems: properties.length });
			}
		}
	}, [initialSlug, properties]);

	const loadMore = useCallback(() => {
		// Prevent multiple simultaneous loads
		if (
			!loadingMore &&
			hasNextPage &&
			!isLoadingNextPageRef.current &&
			!isAppendingRef.current
		) {
			isLoadingNextPageRef.current = true;
			isAppendingRef.current = true;
			const nextPage = page + 1;

			console.log(`📄 Loading page ${nextPage}...`);

			setPage(nextPage);
			fetchFeed(nextPage, true).finally(() => {
				// Shorter cooldown to prevent UI freeze
				setTimeout(() => {
					isLoadingNextPageRef.current = false;
				}, 200);
			});
		}
	}, [page, loadingMore, hasNextPage, fetchFeed]);

	// Smart prefetch: Load next page when user is 5 items away from the end
	// Throttled to prevent excessive calls during scrolling
	const checkAndPrefetchNextPage = useCallback(
		(index: number) => {
			const now = Date.now();

			// Throttle: Only check once per second
			if (now - lastViewableCheckRef.current < 1000) {
				return;
			}
			lastViewableCheckRef.current = now;

			// Don't update index if we're appending items (prevents scroll jumps)
			if (!isAppendingRef.current) {
				setCurrentIndex(index);
			}

			const itemsRemaining = properties.length - index;
			const shouldPrefetch = itemsRemaining <= 5; // Start loading when 5 items left

			if (
				shouldPrefetch &&
				hasNextPage &&
				!loadingMore &&
				!isLoadingNextPageRef.current &&
				!isAppendingRef.current
			) {
				console.log(
					`⚡ Prefetching at item ${index + 1}/${properties.length} (${itemsRemaining} remaining)`,
				);
				loadMore();
			}
		},
		[properties.length, hasNextPage, loadingMore, loadMore],
	);

	// Aggressive image preloading for smoother transitions
	useEffect(() => {
		if (properties.length === 0) return;

		const preloadImages = async () => {
			// Preload first 5 items for instant scrolling
			const itemsToPreload = properties.slice(0, 5);
			const preloadPromises = itemsToPreload.map(async (item) => {
				if (isProperty(item) && item.images && item.images.length > 0) {
					// Preload all images for first few items
					const imagesToLoad = item.images.slice(0, 3); // First 3 images per property
					return Promise.all(
						imagesToLoad.map((img: { image?: string } | string) => {
							const imageUrl = typeof img === "string" ? img : img?.image;
							if (typeof imageUrl === "string" && imageUrl) {
								const fullUrl = imageUrl.startsWith("http")
									? imageUrl
									: `${BASE_URL}${imageUrl}`;
								return Image.prefetch(fullUrl).catch(() => null);
							}
							return Promise.resolve();
						}),
					);
				}
				return Promise.resolve();
			});

			await Promise.all(preloadPromises);
		};

		preloadImages();
	}, [properties]);

	const renderItem = useCallback(
		({ item }: { item: FeedItem; index: number }) => {
			// Memoize the item to prevent unnecessary re-renders
			return (
				<View style={styles.reelItem}>
					{isProperty(item) ? (
						<PropertyReelCard
							property={item}
							source="feed"
							onFavoriteMetaUpdate={handleFavoriteMetaUpdate}
						/>
					) : (
						<ProjectReelCard
							project={item}
							source="feed"
							onFavoriteMetaUpdate={handleFavoriteMetaUpdate}
						/>
					)}
				</View>
			);
		},
		[handleFavoriteMetaUpdate],
	);

	const keyExtractor = useCallback((item: FeedItem) => {
		const type = isProperty(item) ? "property" : "project";
		return `${type}-${item.id?.toString() || Math.random()}`;
	}, []);

	// Store the prefetch function in a ref for stable callback
	const checkAndPrefetchNextPageRef = useRef(checkAndPrefetchNextPage);
	useEffect(() => {
		checkAndPrefetchNextPageRef.current = checkAndPrefetchNextPage;
	}, [checkAndPrefetchNextPage]);

	// Define stable viewability callback (doesn't change between renders)
	const handleViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: Array<{ item: FeedItem; index: number }> }) => {
			// Only process if not currently appending items
			if (
				isAppendingRef.current ||
				!viewableItems ||
				viewableItems.length === 0
			) {
				return;
			}

			const currentViewable = viewableItems[0];
			if (
				currentViewable?.index !== undefined &&
				typeof currentViewable.index === "number"
			) {
				checkAndPrefetchNextPageRef.current(currentViewable.index);
			}

			// Update URL with feed/slug on web when scrolling to a new item
			// Use history.replaceState to avoid remounting (router.replace would navigate)
			if (Platform.OS === "web" && typeof window !== "undefined" && currentViewable?.item) {
				const slug = getItemSlug(currentViewable.item);
				if (slug && slug !== lastUrlSlugRef.current) {
					lastUrlSlugRef.current = slug;
					const pathname = window.location.pathname;
					const base = pathname.split("/feed")[0] || "";
					const newPath = `${base}/feed/${slug}`;
					window.history.replaceState(null, "", newPath);
					if (__DEV__) {
						console.log("[feed:url] scroll →", { slug, index: currentViewable.index, path: newPath });
					}
				}
			}
		},
		[],
	);

	const viewabilityConfig = useRef({
		itemVisiblePercentThreshold: 50,
		minimumViewTime: 300,
		waitForInteraction: false,
	}).current;

	const getItemLayout = useCallback(
		(_: unknown, index: number) => ({
			length: SCREEN_HEIGHT,
			offset: SCREEN_HEIGHT * index,
			index,
		}),
		[],
	);

	// Only show error/empty states if we have no content to display
	if (properties.length === 0) {
		if (loading) {
			// Show minimal loading indicator only if actively loading with no cache
			return (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#10b981" />
				</View>
			);
		}

		if (error) {
			return (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={() => fetchFeed(1, false)}
					>
						<Text style={styles.retryButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			);
		}

		// Empty state (no content and no error)
		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyText}>No properties found</Text>
				<Text style={styles.emptySubtext}>
					Check back later for new listings
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.feedContainer}>
			<FlatList
				ref={flatListRef}
				data={properties}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				getItemLayout={getItemLayout}
				pagingEnabled
				snapToInterval={SCREEN_HEIGHT}
				snapToAlignment="start"
				decelerationRate="fast"
				showsVerticalScrollIndicator={false}
				onEndReached={loadMore}
				onEndReachedThreshold={0.5}
				onViewableItemsChanged={handleViewableItemsChanged}
				viewabilityConfig={viewabilityConfig}
				scrollEventThrottle={16}
				overScrollMode="never"
				bounces={false}
				ListFooterComponent={
					loadingMore ? (
						<View style={styles.footerLoader}>
							<ActivityIndicator size="small" color="#10b981" />
						</View>
					) : null
				}
				refreshing={isRefreshing}
				onRefresh={() => {
					setIsRefreshing(true);
					setPage(1);
					fetchFeed(1, false, false);
				}}
				removeClippedSubviews={Platform.OS === "android"}
				maxToRenderPerBatch={2}
				windowSize={5}
				initialNumToRender={2}
				updateCellsBatchingPeriod={100}
				disableIntervalMomentum={true}
				nestedScrollEnabled={false}
			/>
		</View>
	);
}

const ICON_CIRCLE_SIZE = 40;

const styles = StyleSheet.create({
	feedContainer: {
		height: SCREEN_HEIGHT,
		width: SCREEN_WIDTH,
		backgroundColor: "#000",
		overflow: "hidden",
	},
	reelItem: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		overflow: "hidden",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		padding: 20,
	},
	errorText: {
		color: "#fff",
		fontSize: 16,
		textAlign: "center",
		marginBottom: 20,
	},
	retryButton: {
		backgroundColor: "#10b981",
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	retryButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		padding: 20,
	},
	emptyText: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 8,
	},
	emptySubtext: {
		color: "#9ca3af",
		fontSize: 14,
	},
	footerLoader: {
		paddingVertical: 20,
		alignItems: "center",
	},
	safeContainer: {
		height: SCREEN_HEIGHT,
		width: SCREEN_WIDTH,
		backgroundColor: "#000",
	},
	container: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		position: "relative",
		backgroundColor: "#000",
		overflow: "hidden",
	},
	imageScroll: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
	},
	imageWrapper: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
		backgroundColor: "#000",
		overflow: "hidden",
	},
	imageOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.35)",
	},
	imageFrame: {
		width: SCREEN_WIDTH,
		height: REEL_HEIGHT,
		justifyContent: "center",
		alignItems: "center",
	},
	image: {
		width: "100%",
		height: "100%",
	},
	bottomGradient: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		height: SCREEN_HEIGHT * 0.45,
	},

	// Loading / error overlay for OptimizedImage
	imageLoadingOverlay: {
		backgroundColor: "#111827",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1,
	},
	imageErrorOverlay: {
		backgroundColor: "#111827",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1,
	},
	imageErrorText: {
		color: "#6b7280",
		fontSize: 12,
	},

	// Top bar
	topBar: {
		position: "absolute",
		top: SCREEN_HEIGHT * 0.05,
		left: 20,
		right: 20,
		zIndex: 10,
	},
	tagContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		backgroundColor: "rgba(0,0,0,0.45)",
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		gap: 12,
	},
	tagLine: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
		flex: 1,
		letterSpacing: 0.3,
		textShadowColor: "rgba(0,0,0,0.9)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
		maxWidth: SCREEN_WIDTH * 0.7,
	},
	photoCounterText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "600",
		textShadowColor: "rgba(0,0,0,0.8)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},

	// Heart animation
	heartAnimation: {
		position: "absolute",
		top: "50%",
		left: "50%",
		marginLeft: -40,
		marginTop: -40,
		zIndex: 1000,
		alignItems: "center",
		justifyContent: "center",
	},

	// Right-side actions
	sideActions: {
		position: "absolute",
		right: 16,
		top: SCREEN_HEIGHT * 0.25,
		alignItems: "center",
		zIndex: 20,
	},
	iconCircle: {
		width: ICON_CIRCLE_SIZE,
		height: ICON_CIRCLE_SIZE,
		borderRadius: ICON_CIRCLE_SIZE / 2,
		backgroundColor: "rgba(0,0,0,0.4)",
		alignItems: "center",
		justifyContent: "center",
		marginVertical: 6,
	},
	likeCount: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "600",
		marginBottom: 6,
	},
	viewCircle: {
		width: ICON_CIRCLE_SIZE,
		height: ICON_CIRCLE_SIZE,
		borderRadius: ICON_CIRCLE_SIZE / 2,
		backgroundColor: "#10b981",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 8,
	},
	viewText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "700",
	},

	// Bottom caption info
	bottomInfo: {
		position: "absolute",
		bottom: 72,
		left: 16,
		right: 92, // leave space for right actions
		zIndex: 15,
	},
	agentName: {
		fontSize: 14,
		fontWeight: "600",
		color: "#d1d5db",
		marginBottom: 4,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: "#fff",
		marginBottom: 8,
	},
	priceRow: {
		flexDirection: "row",
		alignItems: "baseline",
		marginBottom: 6,
		gap: 8,
	},
	price: {
		fontSize: 26,
		fontWeight: "800",
		color: "#fff",
	},
	priceLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: "#d1d5db",
	},
	locationRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	locationText: {
		marginLeft: 6,
		color: "#fff",
		fontSize: 14,
	},
	statsRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 4,
	},
	statPill: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.2)",
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 20,
		gap: 6,
	},
	statText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "700",
	},
});
