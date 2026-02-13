import { useRouter } from "expo-router";
import { Bath, Bed, Building2, MapPin, Square } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useUser } from "@/app/_userbase/UserContext";
import { useChat } from "@/app/features/chat/context/ChatContext";
import type { FeedProject, Owner } from "@/app/features/types";
import { api } from "@/config/api";
import { analytics } from "@/services/analytics";
import { BaseReelCard } from "./BaseReelCard";

const BASE_URL = "https://propertprodjango.onrender.com";

// ---------- Main Project Reel Card Component ----------
function ProjectReelCard({
	project,
	onViewProject,
	source,
	onFavoriteMetaUpdate,
	onHorizontalScrollBegin,
	onHorizontalScrollEnd,
	horizontalScrollRef,
}: {
	project: FeedProject;
	onViewProject?: () => void;
	source?: string;
	onFavoriteMetaUpdate?: (
		projectId: number | string,
		meta: { favorites_count?: number | null; is_favourite?: boolean | null },
	) => void;
	onHorizontalScrollBegin?: () => void;
	onHorizontalScrollEnd?: () => void;
	horizontalScrollRef?: React.RefObject<unknown>;
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

	const [isLiked, setIsLiked] = useState(project?.is_favourite || false);
	const [favoriteCount, setFavoriteCount] = useState<number>(
		getFavoriteCountValue(project?.favorites_count) ?? 0,
	);
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const [isChatLoading, setIsChatLoading] = useState(false);
	const { getOrCreateThread } = useChat();
	const { isAuthenticated } = useUser();

	useEffect(() => {
		setIsLiked(project?.is_favourite || false);
	}, [project?.is_favourite]);

	useEffect(() => {
		const parsedCount = getFavoriteCountValue(project?.favorites_count);
		if (parsedCount !== null) {
			setFavoriteCount(parsedCount);
		}
	}, [project?.favorites_count, getFavoriteCountValue]);

	useEffect(() => {
		if (!project?.id) return;

		let isMounted = true;

		const fetchFavoriteMeta = async () => {
			try {
				// Use unified listings endpoint with _type discriminator
				const details = await api.listings.getById(project.id, "project");
				if (!isMounted) return;

				const fetchedCount = getFavoriteCountValue(details?.favorites_count);
				if (fetchedCount !== null) {
					setFavoriteCount(fetchedCount);
				}
				if (typeof details?.is_favourite === "boolean") {
					setIsLiked(details.is_favourite);
				}
				onFavoriteMetaUpdate?.(project.id, {
					favorites_count: fetchedCount ?? details?.favorites_count ?? null,
					is_favourite:
						typeof details?.is_favourite === "boolean"
							? details.is_favourite
							: null,
				});
			} catch (error) {
				console.warn(
					"ProjectReelCard: Failed to refresh favorite metadata",
					error,
				);
			}
		};

		fetchFavoriteMeta();
		return () => {
			isMounted = false;
		};
	}, [project?.id, getFavoriteCountValue, onFavoriteMetaUpdate]);

	useEffect(() => {
		setIsChatLoading(false);
		setCurrentImageIndex(0);
	}, []);

	const owner = useMemo(
		() => (project?.owner ?? {}) as Partial<Owner>,
		[project?.owner],
	);
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
			Alert.alert("Unavailable", "Developer profile is currently unavailable.");
			return;
		}

		router.push({
			pathname: "/agent/[username]",
			params: { username: ownerUsername },
		} as never);
	}, [ownerUsername, router]);

	const images = useMemo(() => {
		if (!project) return [getValidUrl()];
		if (project.images && project.images.length > 0) {
			return project.images
				.map((img: { image?: string } | string) =>
					typeof img === "string" ? getValidUrl(img) : getValidUrl(img.image),
				)
				.filter(Boolean);
		}
		// Fallback to main_image if no images array
		if (project.main_image) {
			return [getValidUrl(project.main_image)];
		}
		return [getValidUrl()];
	}, [project, getValidUrl]);

	const handleImageChange = useCallback((index: number) => {
		setCurrentImageIndex(index);
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

	const formatPriceRange = useCallback(
		(min?: number, max?: number, isRent: boolean = false) => {
			if (min === undefined && max === undefined) return null;

			// Round values first to avoid showing identical prices as a range
			const roundedMin = min !== undefined ? Math.round(min) : undefined;
			const roundedMax = max !== undefined ? Math.round(max) : undefined;

			if (roundedMin === roundedMax && roundedMin !== undefined) {
				return `${formatPrice(roundedMin)}${isRent ? "/mo" : ""}`;
			}
			if (roundedMin && roundedMax) {
				return `${formatPrice(roundedMin)} - ${formatPrice(roundedMax)}${isRent ? "/mo" : ""}`;
			}
			if (roundedMin) {
				return `From ${formatPrice(roundedMin)}${isRent ? "/mo" : ""}`;
			}
			if (roundedMax) {
				return `Up to ${formatPrice(roundedMax)}${isRent ? "/mo" : ""}`;
			}
			return null;
		},
		[formatPrice],
	);

	const formatRange = useCallback(
		(
			min?: number,
			max?: number,
			unit: string = "",
			showDecimals: boolean = false,
		) => {
			if (min === undefined && max === undefined) return null;
			const formatValue = (val: number) => {
				if (showDecimals) {
					const rounded = Math.round(val * 10) / 10;
					return rounded % 1 === 0
						? rounded.toLocaleString()
						: rounded.toLocaleString(undefined, {
								minimumFractionDigits: 1,
								maximumFractionDigits: 1,
							});
				} else {
					return Math.round(val).toLocaleString();
				}
			};
			if (min !== undefined && max !== undefined && min === max) {
				return `${formatValue(min)}${unit}`;
			}
			if (min !== undefined && max !== undefined) {
				return `${formatValue(min)}${unit} - ${formatValue(max)}${unit}`;
			}
			if (min !== undefined) {
				return `From ${formatValue(min)}${unit}`;
			}
			if (max !== undefined) {
				return `Up to ${formatValue(max)}${unit}`;
			}
			return null;
		},
		[],
	);

	// Determine listing type (sale or rent) based on available ranges
	const listingType = useMemo(() => {
		if (
			project.sale_price_min !== undefined ||
			project.sale_price_max !== undefined
		) {
			return "sale";
		}
		if (
			project.rent_price_min !== undefined ||
			project.rent_price_max !== undefined
		) {
			return "rent";
		}
		return "sale"; // Default to sale
	}, [project]);

	// Get ranges based on listing type
	const bedroomsMin =
		listingType === "sale"
			? project.sale_bedrooms_min
			: project.rent_bedrooms_min;
	const bedroomsMax =
		listingType === "sale"
			? project.sale_bedrooms_max
			: project.rent_bedrooms_max;
	const bathroomsMin =
		listingType === "sale"
			? project.sale_bathrooms_min
			: project.rent_bathrooms_min;
	const bathroomsMax =
		listingType === "sale"
			? project.sale_bathrooms_max
			: project.rent_bathrooms_max;
	const areaMin =
		listingType === "sale" ? project.sale_area_min : project.rent_area_min;
	const areaMax =
		listingType === "sale" ? project.sale_area_max : project.rent_area_max;
	const priceMin =
		listingType === "sale" ? project.sale_price_min : project.rent_price_min;
	const priceMax =
		listingType === "sale" ? project.sale_price_max : project.rent_price_max;

	const bedroomsRange = formatRange(bedroomsMin, bedroomsMax, "", false);
	const bathroomsRange = formatRange(bathroomsMin, bathroomsMax, "", true);
	const areaRange = formatRange(areaMin, areaMax, " m²", false);
	const priceRange = formatPriceRange(
		priceMin,
		priceMax,
		listingType === "rent",
	);

	const handleViewPress = useCallback(() => {
		if (onViewProject) {
			onViewProject();
		} else if (project?.id) {
			// Use URL from API if available, otherwise use ID-based route
			const projectUrl = project.url || `/project/${project.id}`;
			const queryParams = source ? `?source=${source}` : "";
			router.push(`${projectUrl}${queryParams}` as never);
		}
	}, [onViewProject, project?.id, project?.url, source, router]);

	const handleTitlePress = useCallback(() => {
		handleViewPress();
	}, [handleViewPress]);

	const handleFavorite = useCallback(async () => {
		if (!project?.id) {
			console.warn(
				"ProjectReelCard: handleFavorite called without a project id",
			);
			return;
		}

		const projectId = project.id;

		try {
			// Use unified listings endpoint with _type discriminator
			const response = await api.listings.toggleFavorite(projectId, "project");
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
				const details = await api.listings.getById(projectId, "project");
				const refreshedCount = getFavoriteCountValue(details?.favorites_count);
				if (refreshedCount !== null) {
					setFavoriteCount(refreshedCount);
				}
				if (typeof details?.is_favourite === "boolean") {
					setIsLiked(details.is_favourite);
				}
				onFavoriteMetaUpdate?.(projectId, {
					favorites_count: refreshedCount ?? details?.favorites_count ?? null,
					is_favourite:
						typeof details?.is_favourite === "boolean"
							? details.is_favourite
							: null,
				});
			} catch (fetchError) {
				console.warn(
					"ProjectReelCard: Failed to refresh favorites_count after toggle",
					fetchError,
				);
			}
		} catch (e: unknown) {
			console.error("Failed to toggle favorite:", e);
			Alert.alert("Error", "Failed to update favorite. Please try again.");
		}
	}, [project?.id, isLiked, getFavoriteCountValue, onFavoriteMetaUpdate]);

	const handleChat = useCallback(async () => {
		if (isChatLoading) return;

		if (!isAuthenticated) {
			Alert.alert(
				"Sign In Required",
				"Please sign in to start a chat with the developer.",
			);
			router.push("/(tabs)/profile");
			return;
		}

		const projectId = project?.id ? Number(project.id) : null;
		if (
			!ownerId ||
			Number.isNaN(ownerId) ||
			!projectId ||
			Number.isNaN(projectId)
		) {
			Alert.alert(
				"Unavailable",
				"Could not identify the developer for this project.",
			);
			return;
		}

		try {
			setIsChatLoading(true);
			const threadId = await getOrCreateThread(
				ownerId,
				projectId,
				project?.name,
			);

			// Track chat conversion
			analytics.trackPropertyContact({
				propertyId: projectId,
				contactMethod: "chat",
			});

			router.push(`/chat/${threadId}` as never);
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
		project?.id,
		project?.name,
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

	if (!project) return null;

	// Tag line (top-left)
	const projectType = "PROJECT";
	const country = project.country || "Unknown";
	const listingStatusLabel = listingType === "sale" ? "For Sale" : "For Rent";
	const tagLine = `${projectType} · ${country} · ${listingStatusLabel}`;

	// Top bar content
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

	// Bottom content
	const bottomContent = (
		<>
			{agentName && (
				<TouchableOpacity onPress={handleAgentProfilePress} activeOpacity={0.7}>
					<Text style={styles.agentName}>{agentName}</Text>
				</TouchableOpacity>
			)}

			<TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
				<Text style={styles.title} numberOfLines={2}>
					{project.name || "Untitled Project"}
				</Text>
			</TouchableOpacity>

			{/* Price range row */}
			{priceRange && (
				<View style={styles.priceRow}>
					<Text style={styles.price}>{priceRange}</Text>
					<Text style={styles.priceLabel}>
						{listingType === "sale" ? "Price Range" : "Rent Range"}
					</Text>
				</View>
			)}

			{/* Location */}
			<View style={styles.locationRow}>
				<MapPin size={16} color="#10b981" />
				<Text style={styles.locationText} numberOfLines={1}>
					{project.location || "Unknown Location"}
				</Text>
			</View>

			{/* Stats row - ranges */}
			<View style={styles.statsRow}>
				{bedroomsRange && (
					<View style={styles.statPill}>
						<Bed size={14} color="#fff" />
						<Text style={styles.statText}>{bedroomsRange}</Text>
					</View>
				)}
				{bathroomsRange && (
					<View style={styles.statPill}>
						<Bath size={14} color="#fff" />
						<Text style={styles.statText}>{bathroomsRange}</Text>
					</View>
				)}
				{areaRange && (
					<View style={styles.statPill}>
						<Square size={14} color="#fff" />
						<Text style={styles.statText}>{areaRange}</Text>
					</View>
				)}
				{/* Units available */}
				{project.total_units > 0 && (
					<View style={styles.statPill}>
						<Building2 size={14} color="#fff" />
						<Text style={styles.statText}>
							{project.available_units}/{project.total_units}
						</Text>
					</View>
				)}
			</View>
		</>
	);

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
				isLiked={isLiked}
				favoriteCount={favoriteCount}
				isChatLoading={isChatLoading}
				onImageChange={handleImageChange}
				baseUrl={BASE_URL}
				onHorizontalScrollBegin={onHorizontalScrollBegin}
				onHorizontalScrollEnd={onHorizontalScrollEnd}
				horizontalScrollRef={horizontalScrollRef}
			/>
		</View>
	);
}

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

export default ProjectReelCard;
