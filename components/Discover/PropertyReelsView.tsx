import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
	LayoutChangeEvent,
	NativeScrollEvent,
	NativeSyntheticEvent,
	StyleProp,
	ViewStyle,
} from "react-native";
import {
	ActivityIndicator,
	Dimensions,
	FlatList,
	Image,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useUser } from "@/app/_userbase/UserContext";
import { useAppInit } from "@/app/context/AppInitContext";
import type { FeedItem, FeedProperty } from "@/app/features/types";
import { api } from "@/config/api";
import { getCachedFeedData, setFeedCache } from "@/data/feedCache";
import { analytics } from "@/services/analytics";
import ProjectReelCard from "./ProjectReelCard";
import PropertyReelCard from "./PropertyReelCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BASE_URL = "https://propertprodjango.onrender.com";

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

// ---------- Feed Container Component ----------
export default function PropertyReelsView({
	initialSlug,
}: {
	initialSlug?: string;
} = {}) {
	const { isInitComplete } = useAppInit();
	const [properties, setProperties] = useState<FeedItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [_currentIndex, setCurrentIndex] = useState(0);
	const { isAuthenticated } = useUser();
	const flatListRef = useRef<FlatList>(null);
	const hasMountedRef = useRef(false);
	const isLoadingNextPageRef = useRef(false);
	const lastViewableCheckRef = useRef(0);
	const isAppendingRef = useRef(false);
	const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);

	// Use measured container height for scroll stability. Static SCREEN_HEIGHT can mismatch
	// the actual visible area (tab bar, safe area), causing wrong items to display.
	const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT);

	const handleLayout = useCallback((e: LayoutChangeEvent) => {
		const { height } = e.nativeEvent.layout;
		if (height > 0) {
			setContainerHeight(height);
		}
	}, []);

	// ── Impression / dwell tracking ──────────────────────────────────────
	const currentVisibleRef = useRef<{
		id: number | string;
		type: "property" | "project";
		startTime: number;
		index: number;
		slotType?: string | null;
		matchScore?: number | null;
	} | null>(null);

	const trackVisibility = useCallback(
		(index: number) => {
			if (index < 0 || index >= properties.length) return;

			const item = properties[index];
			if (!item) return;

			const itemType = isProperty(item) ? "property" : "project";
			const itemId = item.id;

			// Same item – nothing to do
			if (currentVisibleRef.current?.id === itemId) return;

			// Fire dwell for previous item
			if (currentVisibleRef.current) {
				const dwellTimeMs = Date.now() - currentVisibleRef.current.startTime;
				if (dwellTimeMs > 500) {
					analytics.trackFeedDwell({
						itemId: currentVisibleRef.current.id,
						itemType: currentVisibleRef.current.type,
						dwellTimeMs,
						position: currentVisibleRef.current.index,
					});
				}
			}

			// Fire impression for new item
			const feedItem = item as FeedItem & {
				slot_type?: string | null;
				match_score?: number | null;
			};
			analytics.trackFeedImpression({
				itemId,
				itemType,
				position: index,
				slotType: feedItem.slot_type,
				matchScore: feedItem.match_score,
			});

			currentVisibleRef.current = {
				id: itemId,
				type: itemType,
				startTime: Date.now(),
				index,
				slotType: feedItem.slot_type,
				matchScore: feedItem.match_score,
			};
		},
		[properties],
	);

	// Flush dwell on unmount
	useEffect(
		() => () => {
			if (currentVisibleRef.current) {
				const dwellTimeMs = Date.now() - currentVisibleRef.current.startTime;
				if (dwellTimeMs > 500) {
					analytics.trackFeedDwell({
						itemId: currentVisibleRef.current.id,
						itemType: currentVisibleRef.current.type,
						dwellTimeMs,
						position: currentVisibleRef.current.index,
					});
				}
			}
		},
		[],
	);

	// ── Not interested ──────────────────────────────────────────────────
	const handleNotInterested = useCallback(
		(itemId: number | string, itemType: "property" | "project") => {
			// Optimistically remove from feed
			setProperties((prev) => prev.filter((item) => item.id !== itemId));

			// Fire API (non-blocking)
			api.feed.notInterested(itemId, itemType).catch((err) => {
				if (__DEV__) console.warn("Failed to send not-interested signal:", err);
			});

			// Track analytics
			analytics.trackFeedNotInterested({ itemId, itemType });
		},
		[],
	);

	// ── Favourite meta propagation ──────────────────────────────────────
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

	// ── Feed fetch ──────────────────────────────────────────────────────
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

						// Update cache so back-navigation restores full list
						setFeedCache({
							items: updated,
							page: pageNum,
							next: response.next,
						}).catch(() => {});

						return updated;
					});

					// Brief lock to let render complete, then clear
					setTimeout(() => {
						isAppendingRef.current = false;
					}, 100);
				} else {
					const items = response.results;
					setProperties(items);
					console.log(`✅ Feed loaded: ${items.length} items`);

					// Update cache so back-navigation restores state
					setFeedCache({
						items,
						page: pageNum,
						next: response.next,
					}).catch(() => {});
				}

				setHasNextPage(response.next !== null);
			} catch (err: unknown) {
				console.error("Failed to fetch feed:", err);
				if (!silent) {
					setError(
						(err as { response?: { data?: { detail?: string } } })?.response
							?.data?.detail || "Failed to load feed. Please try again.",
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
			console.log(
				"[feed:url] mount",
				initialSlug ? { initialSlug } : { initialSlug: "(none)" },
			);
		}
	}, [initialSlug]);

	// Initialize feed - try cache first, then fetch if needed
	useEffect(() => {
		if (hasMountedRef.current) return;
		hasMountedRef.current = true;

		if (!isAuthenticated) {
			setLoading(false);
			return;
		}

		// Keep loading=true until we have data (avoids "No properties found" flash)
		getCachedFeedData().then((cachedData) => {
			if (cachedData?.items && cachedData.items.length > 0) {
				console.log(
					`📦 Loading feed from cache: ${cachedData.items.length} items`,
				);
				setProperties(cachedData.items);
				setHasNextPage(!!cachedData.next);
				setPage(cachedData.page ?? 1);
				setLoading(false);
			} else {
				console.log("📡 No cache found, fetching feed...");
				fetchFeed(1, false, false);
			}
		});
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
			flatListRef.current.scrollToOffset({
				offset: index * containerHeight,
				animated: false,
			});
			if (__DEV__ && Platform.OS === "web") {
				console.log("[feed:url] deep link →", {
					initialSlug,
					index,
					totalItems: properties.length,
				});
			}
		}
	}, [initialSlug, properties, containerHeight]);

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

			// Track impression/dwell
			trackVisibility(index);

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
		[properties.length, hasNextPage, loadingMore, loadMore, trackVisibility],
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

	const horizontalScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleHorizontalScrollBegin = useCallback(() => {
		// Clear any pending re-enable timeout
		if (horizontalScrollTimeoutRef.current) {
			clearTimeout(horizontalScrollTimeoutRef.current);
			horizontalScrollTimeoutRef.current = null;
		}
		setFeedScrollEnabled(false);
	}, []);

	const handleHorizontalScrollEnd = useCallback(() => {
		// Clear any pending timeout first
		if (horizontalScrollTimeoutRef.current) {
			clearTimeout(horizontalScrollTimeoutRef.current);
		}
		// Re-enable with a tiny delay to let momentum settle
		horizontalScrollTimeoutRef.current = setTimeout(() => {
			setFeedScrollEnabled(true);
			horizontalScrollTimeoutRef.current = null;
		}, 50);
	}, []);

	// Safety: if horizontal scroll lock gets stuck, re-enable after 2 seconds
	useEffect(() => {
		if (!feedScrollEnabled) {
			const safetyTimer = setTimeout(() => {
				setFeedScrollEnabled(true);
			}, 2000);
			return () => clearTimeout(safetyTimer);
		}
	}, [feedScrollEnabled]);

	// CSS scroll-snap-align for web items (RN's ViewStyle doesn't know about it, so cast)
	const webSnapStyle = useMemo(
		() =>
			Platform.OS === "web"
				? ({ scrollSnapAlign: "start" } as ViewStyle)
				: undefined,
		[],
	);

	const renderItem = useCallback(
		({ item }: { item: FeedItem; index: number }) => (
			<View style={[styles.reelItem, { height: containerHeight }, webSnapStyle]}>
				{isProperty(item) ? (
					<PropertyReelCard
						property={item}
						source="feed"
						containerHeight={containerHeight}
						onFavoriteMetaUpdate={handleFavoriteMetaUpdate}
						onHorizontalScrollBegin={handleHorizontalScrollBegin}
						onHorizontalScrollEnd={handleHorizontalScrollEnd}
						onNotInterested={() => handleNotInterested(item.id, "property")}
					/>
				) : (
					<ProjectReelCard
						project={item}
						source="feed"
						containerHeight={containerHeight}
						onFavoriteMetaUpdate={handleFavoriteMetaUpdate}
						onHorizontalScrollBegin={handleHorizontalScrollBegin}
						onHorizontalScrollEnd={handleHorizontalScrollEnd}
						onNotInterested={() => handleNotInterested(item.id, "project")}
					/>
				)}
			</View>
		),
		[
			containerHeight,
			webSnapStyle,
			handleFavoriteMetaUpdate,
			handleHorizontalScrollBegin,
			handleHorizontalScrollEnd,
			handleNotInterested,
		],
	);

	const keyExtractor = useCallback((item: FeedItem, index: number) => {
		const type = isProperty(item) ? "property" : "project";
		// Stable key: type + id. Index only for fallback when id is missing (avoids wrong reels on scroll).
		const id = item.id?.toString();
		return id ? `${type}-${id}` : `${type}-idx-${index}`;
	}, []);

	// Store the prefetch function in a ref for stable callback
	const checkAndPrefetchNextPageRef = useRef(checkAndPrefetchNextPage);
	useEffect(() => {
		checkAndPrefetchNextPageRef.current = checkAndPrefetchNextPage;
	}, [checkAndPrefetchNextPage]);

	// --- Web: use onScroll to track current index (viewability is broken with pagingEnabled on RNW) ---
	// --- Native: use onViewableItemsChanged which works correctly ---
	const webScrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleScroll = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			if (Platform.OS !== "web" || containerHeight <= 0) return;

			const offsetY = e.nativeEvent.contentOffset.y;
			const index = Math.round(offsetY / containerHeight);

			// Debounce: only process after scroll settles
			if (webScrollDebounceRef.current) {
				clearTimeout(webScrollDebounceRef.current);
			}
			webScrollDebounceRef.current = setTimeout(() => {
				webScrollDebounceRef.current = null;
				if (!isAppendingRef.current) {
					checkAndPrefetchNextPageRef.current(index);
				}
			}, 300);
		},
		[containerHeight],
	);

	// Cleanup web scroll debounce on unmount
	useEffect(
		() => () => {
			if (webScrollDebounceRef.current) {
				clearTimeout(webScrollDebounceRef.current);
			}
		},
		[],
	);

	// Debounce viewability to prevent rapid processing during scroll (causes reel cycling on web)
	const viewabilityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingViewableRef = useRef<{ index: number } | null>(null);

	// Define stable viewability callback – native only (broken on web with pagingEnabled)
	const handleViewableItemsChanged = useCallback(
		({
			viewableItems,
		}: {
			viewableItems: Array<{ item: FeedItem; index: number | null }>;
		}) => {
			if (
				isAppendingRef.current ||
				!viewableItems ||
				viewableItems.length === 0
			) {
				return;
			}

			const currentViewable = viewableItems[0];
			const index = currentViewable?.index;
			if (index === undefined || index === null || typeof index !== "number") {
				return;
			}

			// Debounce: only process after scroll settles (~400ms)
			pendingViewableRef.current = { index };
			if (viewabilityDebounceRef.current) {
				clearTimeout(viewabilityDebounceRef.current);
			}
			viewabilityDebounceRef.current = setTimeout(() => {
				viewabilityDebounceRef.current = null;
				const pending = pendingViewableRef.current;
				if (pending !== null) {
					checkAndPrefetchNextPageRef.current(pending.index);
				}
			}, 400);
		},
		[],
	);

	// Cleanup debounce on unmount
	useEffect(
		() => () => {
			if (viewabilityDebounceRef.current) {
				clearTimeout(viewabilityDebounceRef.current);
			}
		},
		[],
	);

	const viewabilityConfig = useRef({
		itemVisiblePercentThreshold: 60,
		minimumViewTime: 500,
		waitForInteraction: false,
	}).current;

	// CellRendererComponent fix for web: correct the y offset that pagingEnabled breaks (RNW issue #1798).
	// eslint-disable-next-line react/no-unstable-nested-components
	const WebCellRenderer = useMemo(() => {
		// eslint-disable-next-line react/display-name
		const Renderer = (props: Record<string, unknown>) => {
			const { onLayout, index: cellIndex, children, style, ...rest } = props as {
				onLayout?: (e: LayoutChangeEvent) => void;
				index: number;
				children: ReactNode;
				style?: StyleProp<ViewStyle>;
				[key: string]: unknown;
			};

			const fixedOnLayout = useCallback(
				(e: LayoutChangeEvent) => {
					if (onLayout) {
						const corrected = {
							...e,
							nativeEvent: {
								...e.nativeEvent,
								layout: {
									...e.nativeEvent.layout,
									y: cellIndex * containerHeight,
								},
							},
						};
						onLayout(corrected as LayoutChangeEvent);
					}
				},
				[onLayout, cellIndex],
			);

			return (
				<View {...rest} style={style} onLayout={fixedOnLayout}>
					{children}
				</View>
			);
		};
		Renderer.displayName = "WebCellRenderer";
		return Renderer;
	}, [containerHeight]);

	const getItemLayout = useCallback(
		(_: unknown, index: number) => ({
			length: containerHeight,
			offset: containerHeight * index,
			index,
		}),
		[containerHeight],
	);

	// Only show loading before init completes (splash handles loading state)
	if (!isInitComplete) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#10b981" />
			</View>
		);
	}

	// Only show error/empty states when we have no content and are done loading (no loading circles after splash)
	if (properties.length === 0 && !loading) {
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
		<View
			style={styles.feedContainer}
			onLayout={handleLayout}
		>
			<FlatList
				ref={flatListRef}
				data={properties}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				getItemLayout={getItemLayout}
				pagingEnabled={Platform.OS !== "web"}
				snapToInterval={containerHeight}
				snapToAlignment="start"
				decelerationRate="fast"
				showsVerticalScrollIndicator={false}
				scrollEnabled={feedScrollEnabled}
				onEndReached={loadMore}
				onEndReachedThreshold={0.5}
				onScroll={Platform.OS === "web" ? handleScroll : undefined}
				onViewableItemsChanged={
					Platform.OS === "web"
						? undefined
						: handleViewableItemsChanged
				}
				viewabilityConfig={
					Platform.OS === "web" ? undefined : viewabilityConfig
				}
				{...(Platform.OS === "web" ? { CellRendererComponent: WebCellRenderer as never } : {})}
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
				maxToRenderPerBatch={3}
				windowSize={Platform.OS === "web" ? 11 : 5}
				initialNumToRender={3}
				updateCellsBatchingPeriod={100}
				disableIntervalMomentum={true}
				nestedScrollEnabled={true}
				{...(Platform.OS === "web" ? {
					style: {
						// CSS scroll-snap replaces pagingEnabled on web (which adds a broken wrapper div)
						scrollSnapType: "y mandatory",
					} as ViewStyle,
				} : {})}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	feedContainer: {
		flex: 1,
		width: SCREEN_WIDTH,
		backgroundColor: "#000",
		overflow: "hidden",
	},
	reelItem: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT, // Overridden inline with containerHeight for scroll stability
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
});
