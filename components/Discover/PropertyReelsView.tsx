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
import {
	getCachedFeedDataAllowStale,
	getCacheAge,
	setFeedCache,
} from "@/data/feedCache";
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
	const isMountedRef = useRef(true);
	const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);

	// Pagination retry tracking – prevents infinite retry storms when the API
	// is down or a new feed hasn't been generated yet.
	const MAX_PAGINATION_RETRIES = 3;
	const consecutiveFailsRef = useRef(0);
	// True when the user has consumed every item and server has no more
	const [feedExhausted, setFeedExhausted] = useState(false);

	// Unmount guard – prevents state updates after the component is torn down
	useEffect(() => () => { isMountedRef.current = false; }, []);

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
	// Use a ref for properties so trackVisibility never recreates on data changes.
	// This breaks the cascade: properties → trackVisibility → checkAndPrefetchNextPage → ref effect.
	const propertiesRef = useRef(properties);
	useEffect(() => {
		propertiesRef.current = properties;
	}, [properties]);

	const currentVisibleRef = useRef<{
		id: number | string;
		type: "property" | "project";
		startTime: number;
		position: number; // positional snapshot (informational only – dedup is by id)
		slotType?: string | null;
		matchScore?: number | null;
	} | null>(null);

	// Stable callback – reads properties from ref, never triggers re-render cascade.
	// All tracking is id-based: even if the positional index is stale after a removal,
	// we verify the item id before firing and never re-fire for the same id.
	const trackVisibility = useCallback((index: number) => {
		try {
			const currentProperties = propertiesRef.current;
			if (index < 0 || index >= currentProperties.length) return;

			const item = currentProperties[index];
			if (!item || item.id == null) return; // guard missing id

			const itemType = isProperty(item) ? "property" : "project";
			const itemId = item.id;

			// Same item – nothing to do (id-based, immune to index shifts)
			if (currentVisibleRef.current?.id === itemId) return;

			// Fire dwell for previous item (uses stored id, not positional index)
			if (currentVisibleRef.current) {
				const dwellTimeMs = Date.now() - currentVisibleRef.current.startTime;
				if (dwellTimeMs > 500) {
					analytics.trackFeedDwell({
						itemId: currentVisibleRef.current.id,
						itemType: currentVisibleRef.current.type,
						dwellTimeMs,
						position: currentVisibleRef.current.position,
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
				position: index,
				slotType: feedItem.slot_type,
				matchScore: feedItem.match_score,
			};
		} catch (e) {
			// Analytics must never crash the feed
			if (__DEV__) console.warn("trackVisibility error:", e);
		}
	}, []); // Stable – reads from propertiesRef

	// Flush dwell on unmount (id-based – immune to stale indices)
	useEffect(
		() => () => {
			try {
				if (currentVisibleRef.current) {
					const dwellTimeMs = Date.now() - currentVisibleRef.current.startTime;
					if (dwellTimeMs > 500) {
						analytics.trackFeedDwell({
							itemId: currentVisibleRef.current.id,
							itemType: currentVisibleRef.current.type,
							dwellTimeMs,
							position: currentVisibleRef.current.position,
						});
					}
				}
			} catch {
				// Swallow – component is unmounting
			}
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
				if (isMountedRef.current) {
					setError("Please sign in to view your personalized feed.");
					setLoading(false);
				}
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

				// Guard: component may have unmounted during the await
				if (!isMountedRef.current) return;

				// Success – reset retry counter
				consecutiveFailsRef.current = 0;

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

					// Advance page only after a successful append
					setPage(pageNum);
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

				const moreAvailable = response.next !== null;
				setHasNextPage(moreAvailable);

				// If no more pages, mark feed as exhausted
				if (!moreAvailable && append) {
					setFeedExhausted(true);
				}
			} catch (err: unknown) {
				console.error("Failed to fetch feed:", err);
				if (!isMountedRef.current) return;

				if (append) {
					// Pagination failure – count consecutive failures.
					// After MAX_PAGINATION_RETRIES, stop trying so we don't loop.
					consecutiveFailsRef.current += 1;
					if (consecutiveFailsRef.current >= MAX_PAGINATION_RETRIES) {
						console.warn(
							`⛔ Pagination failed ${MAX_PAGINATION_RETRIES} times, pausing.`,
						);
						setHasNextPage(false);
						setFeedExhausted(true);
					}
					// Don't set error state for pagination failures – the existing
					// feed items are still valid and should keep displaying.
				} else if (!silent) {
					setError(
						(err as { response?: { data?: { detail?: string } } })?.response
							?.data?.detail || "Failed to load feed. Please try again.",
					);
				}
			} finally {
				if (isMountedRef.current) {
					setLoading(false);
					setLoadingMore(false);
					setIsRefreshing(false);
					// ALWAYS reset append lock – the old code only reset on success,
					// which permanently deadlocked pagination after any error.
					isAppendingRef.current = false;
					isLoadingNextPageRef.current = false;
				}
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

	// Initialize feed - stale-while-revalidate: show cache for instant display,
	// always fetch fresh so each app open gets new feed (fixes same feed on reopen)
	useEffect(() => {
		if (hasMountedRef.current) return;
		hasMountedRef.current = true;

		if (!isAuthenticated) {
			setLoading(false);
			return;
		}

		// Stale-while-revalidate: show cached data immediately if available
		getCachedFeedDataAllowStale().then((cachedData) => {
			if (!isMountedRef.current) return;
			if (cachedData?.items && cachedData.items.length > 0) {
				const cacheAge = getCacheAge(cachedData);
				const isInitialPageOnly = cachedData.items.length <= 10; // Only page 1, safe to replace
				// Revalidate when cache is stale (>30s) - fixes same feed on app reopen
				const shouldRevalidate =
					isInitialPageOnly && cacheAge > 30 * 1000;
				console.log(
					`📦 Loading feed from cache: ${cachedData.items.length} items (age: ${Math.round(cacheAge / 1000)}s${shouldRevalidate ? ", revalidating" : ""})`,
				);
				setProperties(cachedData.items);
				setHasNextPage(!!cachedData.next);
				setPage(cachedData.page ?? 1);
				setLoading(false);
				if (shouldRevalidate) {
					fetchFeed(1, false, true); // silent = no loading overlay
				}
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
			// Page is only advanced inside fetchFeed on success – if the fetch
			// fails, `page` stays at the current value so the next retry hits the
			// same page instead of skipping one.
			const nextPage = page + 1;

			console.log(`📄 Loading page ${nextPage}...`);

			fetchFeed(nextPage, true);
			// Locks are reset in fetchFeed's `finally` block.
		}
	}, [page, loadingMore, hasNextPage, fetchFeed]);

	// Smart prefetch: Load next page well before end so new feed is ready before user reaches it
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
			// Prefetch when 8 items left (was 5) - new feed ready before user reaches end
			const shouldPrefetch = itemsRemaining <= 8;

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
			if (isMountedRef.current) setFeedScrollEnabled(true);
			horizontalScrollTimeoutRef.current = null;
		}, 50);
	}, []);

	// Safety: if horizontal scroll lock gets stuck, re-enable after 2 seconds
	useEffect(() => {
		if (!feedScrollEnabled) {
			const safetyTimer = setTimeout(() => {
				if (isMountedRef.current) setFeedScrollEnabled(true);
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
					/>
				) : (
					<ProjectReelCard
						project={item}
						source="feed"
						containerHeight={containerHeight}
						onFavoriteMetaUpdate={handleFavoriteMetaUpdate}
						onHorizontalScrollBegin={handleHorizontalScrollBegin}
						onHorizontalScrollEnd={handleHorizontalScrollEnd}
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
		],
	);

	const keyExtractor = useCallback((item: FeedItem) => {
		// Stable key: _type:id – survives removals and pagination without index shifts.
		// Read _type discriminator directly to avoid heuristic cost on every key call.
		const type =
			(item as { _type?: string })._type ||
			(isProperty(item) ? "property" : "project");
		// id is required on all feed items; fallback to slug/title if somehow missing.
		const id =
			item.id ??
			(item as { slug?: string }).slug ??
			(item as { title?: string }).title ??
			"";
		return `${type}:${id}`;
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
					) : feedExhausted ? (
						<View style={styles.feedEndContainer}>
							<Text style={styles.feedEndText}>
								You're all caught up!
							</Text>
							<Text style={styles.feedEndSubtext}>
								Pull down to refresh for new listings
							</Text>
						</View>
					) : null
				}
				refreshing={isRefreshing}
				onRefresh={() => {
					setIsRefreshing(true);
					setPage(1);
					setHasNextPage(true);
					setFeedExhausted(false);
					consecutiveFailsRef.current = 0;
					fetchFeed(1, false, false);
				}}
				removeClippedSubviews={Platform.OS === "android"}
				maxToRenderPerBatch={3}
				windowSize={5}
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
	feedEndContainer: {
		paddingVertical: 32,
		alignItems: "center",
	},
	feedEndText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 4,
	},
	feedEndSubtext: {
		color: "#9ca3af",
		fontSize: 13,
	},
});
