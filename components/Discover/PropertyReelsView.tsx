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
	PanResponder,
	Platform,
	RefreshControl,
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
import ProjectReelCard from "./ProjectReelCard";
import PropertyReelCard from "./PropertyReelCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BASE_URL = "https://propertprodjango.onrender.com";
const PAGE_SIZE = 10;
// Web: keep only 2 pages in memory to prevent mobile browser crashes
const MAX_PAGES_WEB = 2;
const MAX_ITEMS_WEB = PAGE_SIZE * MAX_PAGES_WEB;

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
	const [showPullHint, setShowPullHint] = useState(true);

	// Pagination retry tracking – prevents infinite retry storms when the API
	// is down or a new feed hasn't been generated yet.
	const MAX_PAGINATION_RETRIES = 3;
	const consecutiveFailsRef = useRef(0);
	// Debounce onEndReached – prevents repeated fires (RN bug) that cause layout thrash/shuffle
	const lastOnEndReachedRef = useRef(0);
	const ON_END_REACHED_DEBOUNCE_MS = 1500;
	// True when the user has consumed every item and server has no more
	const [feedExhausted, setFeedExhausted] = useState(false);
	// Web: track scroll offset for trim adjustment; store scroll adjustment when we trim from top
	const lastScrollOffsetRef = useRef(0);
	const pendingScrollAdjustmentRef = useRef<number | null>(null);
	const [trimTrigger, setTrimTrigger] = useState(0);
	const isRefreshingRef = useRef(false);

	// Unmount guard – prevents state updates after the component is torn down
	useEffect(() => () => { isMountedRef.current = false; }, []);

	useEffect(() => {
		isRefreshingRef.current = isRefreshing;
	}, [isRefreshing]);

	// Use measured container height for scroll stability. Static SCREEN_HEIGHT can mismatch
	// the actual visible area (tab bar, safe area), causing wrong items to display.
	const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT);
	const containerHeightRef = useRef(containerHeight);
	useEffect(() => {
		containerHeightRef.current = containerHeight;
	}, [containerHeight]);

	const handleLayout = useCallback((e: LayoutChangeEvent) => {
		const { height } = e.nativeEvent.layout;
		if (height > 0) {
			setContainerHeight(height);
		}
	}, []);

	// FeedImpression is created server-side when the feed API serves items.
	// Click-through is recorded via source=feed on detail navigation. No client-side feed events.

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
						let updated = [...prev, ...newItems];

						// Web: keep only 2 pages to prevent mobile browser crashes
						if (Platform.OS === "web" && updated.length > MAX_ITEMS_WEB) {
							const removeCount = updated.length - MAX_ITEMS_WEB;
							const itemHeight = containerHeightRef.current || SCREEN_HEIGHT;
							pendingScrollAdjustmentRef.current = removeCount * itemHeight;
							updated = updated.slice(-MAX_ITEMS_WEB);
							setTrimTrigger((t) => t + 1); // Trigger scroll adjustment effect
							console.log(
								`📦 Trimmed to ${MAX_ITEMS_WEB} items (removed ${removeCount} from top)`,
							);
						}

						console.log(
							`✅ Page ${pageNum} loaded: ${newItems.length} new items (total: ${updated.length})`,
						);

						// Update cache – on web, cache only the trimmed window
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

	// Apply scroll adjustment after trim (web only) – keeps viewport stable when we remove items from top
	// biome-ignore lint/correctness/useExhaustiveDependencies: trimTrigger intentionally used as run trigger only
	useEffect(() => {
		if (Platform.OS !== "web" || !flatListRef.current) return;
		const adjustment = pendingScrollAdjustmentRef.current;
		if (adjustment === null) return;
		pendingScrollAdjustmentRef.current = null;
		const newOffset = Math.max(
			0,
			lastScrollOffsetRef.current - adjustment,
		);
		requestAnimationFrame(() => {
			flatListRef.current?.scrollToOffset({
				offset: newOffset,
				animated: false,
			});
		});
	}, [trimTrigger]);

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
				const isInitialPageOnly = cachedData.items.length <= PAGE_SIZE;
				// Revalidate when cache is stale (>30s) - fixes same feed on app reopen
				const shouldRevalidate =
					isInitialPageOnly && cacheAge > 30 * 1000;
				// Web: trim cache to 2 pages on load to prevent memory bloat
				let items = cachedData.items;
				if (Platform.OS === "web" && items.length > MAX_ITEMS_WEB) {
					items = items.slice(-MAX_ITEMS_WEB);
					console.log(
						`📦 Cache trimmed to ${MAX_ITEMS_WEB} items on load`,
					);
				}
				console.log(
					`📦 Loading feed from cache: ${items.length} items (age: ${Math.round(cacheAge / 1000)}s${shouldRevalidate ? ", revalidating" : ""})`,
				);
				setProperties(items);
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

	const handleRefresh = useCallback(() => {
		setIsRefreshing(true);
		setPage(1);
		setHasNextPage(true);
		setFeedExhausted(false);
		consecutiveFailsRef.current = 0;
		fetchFeed(1, false, false);
	}, [fetchFeed]);

	// Web: pull-to-refresh when on first property (RefreshControl doesn't work on mobile web)
	const PULL_THRESHOLD = 80;
	const webPullResponder = useMemo(() => {
		if (Platform.OS !== "web") return { panHandlers: {} };
		return PanResponder.create({
			onMoveShouldSetPanResponder: (
				_evt: { nativeEvent: unknown },
				gestureState: { dy: number },
			) => {
				// Only capture when at top (first property) and user pulls down
				const atTop = lastScrollOffsetRef.current <= 20;
				const pullingDown = gestureState.dy > 0;
				return atTop && pullingDown && !isRefreshingRef.current;
			},
			onPanResponderRelease: (
				_evt: { nativeEvent: unknown },
				gestureState: { dy: number },
			) => {
				if (gestureState.dy >= PULL_THRESHOLD && !isRefreshingRef.current) {
					handleRefresh();
				}
			},
		});
	}, [handleRefresh]);

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

	// Wrapped onEndReached: debounce to prevent RN's repeated firing (causes shuffle on web)
	const handleEndReached = useCallback(() => {
		const now = Date.now();
		if (now - lastOnEndReachedRef.current < ON_END_REACHED_DEBOUNCE_MS) return;
		lastOnEndReachedRef.current = now;
		loadMore();
	}, [loadMore]);

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
			const offsetY = e.nativeEvent.contentOffset.y;
			lastScrollOffsetRef.current = offsetY;

			// Show pull hint when at top (first property) – both native and web
			const atTop = offsetY <= 40;
			setShowPullHint((prev) => (atTop ? true : offsetY > 60 ? false : prev));

			if (Platform.OS !== "web" || containerHeight <= 0) return;

			const index = Math.max(0, Math.round(offsetY / containerHeight));

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
			{...webPullResponder.panHandlers}
		>
			{showPullHint && !isRefreshing && (
				<View
					style={styles.pullHintOverlay}
					pointerEvents="none"
					accessibilityLabel="Pull down to refresh feed"
				>
					<Text style={styles.pullHintText}>Pull down to refresh</Text>
				</View>
			)}
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
				onEndReached={handleEndReached}
				onEndReachedThreshold={0.5}
				onScroll={handleScroll}
				onViewableItemsChanged={
					Platform.OS === "web"
						? undefined
						: handleViewableItemsChanged
				}
				viewabilityConfig={
					Platform.OS === "web" ? undefined : viewabilityConfig
				}
				{...(Platform.OS === "web"
					? {
							CellRendererComponent: WebCellRenderer as never,
							disableVirtualization: true, // RNW cell recycling can show wrong items (shuffle)
						}
					: {})}
				scrollEventThrottle={16}
				overScrollMode="never"
				bounces={true}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor="#10b981"
						colors={["#10b981"]}
					/>
				}
				ListFooterComponent={
					loadingMore ? (
						<View style={[styles.footerLoader, styles.footerMinHeight]}>
							<ActivityIndicator size="small" color="#10b981" />
						</View>
					) : feedExhausted ? (
						<View style={[styles.feedEndContainer, styles.footerMinHeight]}>
							<Text style={styles.feedEndText}>
								You're all caught up!
							</Text>
							<Text style={styles.feedEndSubtext}>
								Pull down to refresh for new listings
							</Text>
						</View>
					) : (
						/* Minimal footer – prevents onEndReached loop when switching to loading/exhausted */
						<View style={styles.footerPlaceholder} />
					)
				}
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
						// Prevent browser's default pull-to-refresh so our custom one works
						overscrollBehaviorY: "contain",
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
	pullHintOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		paddingVertical: 10,
		paddingHorizontal: 16,
		alignItems: "center",
		zIndex: 10,
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	pullHintText: {
		color: "rgba(255,255,255,0.9)",
		fontSize: 13,
		fontWeight: "500",
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
	/* Fixed min height prevents onEndReached from firing in a loop when footer content changes */
	footerMinHeight: {
		minHeight: 80,
	},
	footerPlaceholder: {
		height: 1,
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
