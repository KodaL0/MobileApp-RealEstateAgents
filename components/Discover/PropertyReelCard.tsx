import { useRouter } from "expo-router";
import { Bath, Bed, MapPin, Square } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Dimensions,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useUser } from "@/app/_userbase/UserContext";
import { useChat } from "@/app/features/chat/context/ChatContext";
import type { FeedProperty } from "@/app/features/types";
import { api } from "@/config/api";
import { analytics } from "@/services/analytics";
import { BaseReelCard } from "./BaseReelCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BASE_URL = "https://propertprodjango.onrender.com";

// ---------- Property Reel Card ----------
function PropertyReelCard({
	property,
	onViewProperty,
	source,
	onFavoriteMetaUpdate,
	onHorizontalScrollBegin,
	onHorizontalScrollEnd,
	containerHeight,
	onNotInterested,
}: {
	property: FeedProperty;
	onViewProperty?: () => void;
	source?: string;
	onFavoriteMetaUpdate?: (
		propertyId: number | string,
		meta: { favorites_count?: number | null; is_favourite?: boolean | null },
	) => void;
	onHorizontalScrollBegin?: () => void;
	onHorizontalScrollEnd?: () => void;
	containerHeight?: number;
	onNotInterested?: () => void;
}) {
	const router = useRouter();
	const getFavoriteCountValue = useCallback((value: unknown): number | null => {
		if (typeof value === "number" && Number.isFinite(value)) return value;
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
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const [isChatLoading, setIsChatLoading] = useState(false);
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

	// Only fetch favourite metadata if not already provided by the feed
	useEffect(() => {
		if (!property?.id) return;
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
				if (fetchedCount !== null) setFavoriteCount(fetchedCount);
				if (typeof details?.is_favourite === "boolean")
					setIsLiked(details.is_favourite);
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

	// ── Owner / agent helpers ────────────────────────────────────────────
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

	// ── Image helpers ────────────────────────────────────────────────────
	const getValidUrl = useCallback((uri?: string) => {
		if (!uri) return "https://via.placeholder.com/800x600?text=No+Image";
		return uri.startsWith("http") ? uri : `${BASE_URL}${uri}`;
	}, []);

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

	const handleImageChange = useCallback((index: number) => {
		setCurrentImageIndex(index);
	}, []);

	// ── Formatting ───────────────────────────────────────────────────────
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

	// ── Actions ──────────────────────────────────────────────────────────
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

	// Optimised favourite – trust toggle response, no follow-up getById
	const handleFavorite = useCallback(async () => {
		if (!property?.id) {
			console.warn("PropertyReelCard: handleFavorite called without a property id");
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
				if (responseCount !== null) return responseCount;
				const safePrev = typeof prev === "number" ? prev : 0;
				return nextLiked ? safePrev + 1 : Math.max(0, safePrev - 1);
			});

			// Propagate to parent for list-level state
			onFavoriteMetaUpdate?.(propertyId, {
				favorites_count:
					getFavoriteCountValue(response?.favorites_count) ?? null,
				is_favourite: nextLiked,
			});
		} catch (e: unknown) {
			console.error("Failed to toggle favorite:", e);
			Alert.alert("Error", "Failed to update favorite. Please try again.");
		}
	}, [property?.id, isLiked, onFavoriteMetaUpdate, getFavoriteCountValue]);

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

	// ── Early return ─────────────────────────────────────────────────────
	if (!property) return null;

	// ── Tag line (single compact pill) ───────────────────────────────────
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

	const topBarContent = (
		<View style={styles.tagContainer}>
			<Text style={styles.tagLine} numberOfLines={1}>
				{tagLine}
			</Text>
			{images.length > 1 && (
				<Text style={styles.photoCounterText}>
					{currentImageIndex + 1}/{images.length}
				</Text>
			)}
		</View>
	);

	// ── Bottom content ───────────────────────────────────────────────────
	const bottomContent = (
		<>
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

			<View style={styles.priceRow}>
				<Text style={styles.price}>{formatPrice(property.price)}</Text>
				<Text style={styles.priceLabel}>
					{property.property_status === "for_sale"
						? "Purchase Price"
						: "/month"}
				</Text>
			</View>

			<View style={styles.locationRow}>
				<MapPin size={16} color="#10b981" />
				<Text style={styles.locationText} numberOfLines={1}>
					{property.location || "Unknown Location"}
				</Text>
			</View>

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
		</>
	);

	// ── Render ───────────────────────────────────────────────────────────
	return (
		<View style={styles.safeContainer}>
			<BaseReelCard
				images={images}
				topBarContent={topBarContent}
				bottomContent={bottomContent}
				onFavorite={handleFavorite}
				onChat={handleChat}
				onShare={handleShare}
				onAgentPress={handleAgentProfilePress}
				onView={handleViewPress}
				onNotInterested={onNotInterested}
				isLiked={isLiked}
				favoriteCount={favoriteCount}
				isChatLoading={isChatLoading}
				onImageChange={handleImageChange}
				baseUrl={BASE_URL}
				containerHeight={containerHeight}
				onHorizontalScrollBegin={onHorizontalScrollBegin}
				onHorizontalScrollEnd={onHorizontalScrollEnd}
			/>
		</View>
	);
}

// ── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	safeContainer: {
		flex: 1,
		backgroundColor: "#000",
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

export default memo(PropertyReelCard);
