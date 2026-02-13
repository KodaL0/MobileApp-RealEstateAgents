import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
	Animated,
	Dimensions,
	Image,
	Platform,
	StyleSheet,
	View,
} from "react-native";

interface SplashScreenProps {
	onFinish: () => void;
	initializationTask?: () => Promise<void>;
	minimumDuration?: number; // Minimum time to show splash (ms)
}

const { width } = Dimensions.get("window");

export default function SplashScreen({
	onFinish,
	initializationTask,
	minimumDuration = 2000, // Default 2 seconds minimum
}: SplashScreenProps) {
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.3)).current;
	const logoRotateAnim = useRef(new Animated.Value(0)).current;
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const shimmerAnim = useRef(new Animated.Value(-width)).current;

	const [initializationComplete, setInitializationComplete] = useState(false);
	const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
	const initStartedRef = useRef(false);

	// Run initialization task (only once - guard prevents re-run when task reference changes)
	useEffect(() => {
		if (!initializationTask || initStartedRef.current) {
			if (!initializationTask) setInitializationComplete(true);
			return;
		}
		initStartedRef.current = true;

		const runInitialization = async () => {
			try {
				await initializationTask();
				console.log("✅ Initialization complete");
			} catch (error) {
				console.warn("⚠️ Initialization failed:", error);
			} finally {
				setInitializationComplete(true);
			}
		};

		runInitialization();
	}, [initializationTask]);

	// Track minimum time
	useEffect(() => {
		const timer = setTimeout(() => {
			setMinimumTimeElapsed(true);
		}, minimumDuration);

		return () => clearTimeout(timer);
	}, [minimumDuration]);

	useEffect(() => {
		// Native driver only works on iOS/Android, not on web
		const useNative = Platform.OS !== "web";

		// Start animations sequence
		const animationSequence = Animated.sequence([
			// Initial fade in and scale
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 800,
					useNativeDriver: useNative,
				}),
				Animated.spring(scaleAnim, {
					toValue: 1,
					tension: 50,
					friction: 7,
					useNativeDriver: useNative,
				}),
			]),

			// Logo subtle rotation
			Animated.timing(logoRotateAnim, {
				toValue: 1,
				duration: 1000,
				useNativeDriver: useNative,
			}),
		]);

		// Pulse animation (continuous)
		const pulseAnimation = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.1,
					duration: 1000,
					useNativeDriver: useNative,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: useNative,
				}),
			]),
		);

		// Shimmer effect
		const shimmerAnimation = Animated.loop(
			Animated.timing(shimmerAnim, {
				toValue: width,
				duration: 2000,
				useNativeDriver: useNative,
			}),
		);

		// Start all animations
		animationSequence.start();
		pulseAnimation.start();
		shimmerAnimation.start();

		return () => {
			pulseAnimation.stop();
			shimmerAnimation.stop();
		};
	}, [fadeAnim, scaleAnim, logoRotateAnim, pulseAnim, shimmerAnim]);

	// Finish when both initialization and minimum time are complete
	useEffect(() => {
		if (initializationComplete && minimumTimeElapsed) {
			const useNative = Platform.OS !== "web";

			// Small delay before fading out
			const timer = setTimeout(() => {
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 500,
					useNativeDriver: useNative,
				}).start(() => {
					onFinish();
				});
			}, 200);

			return () => clearTimeout(timer);
		}
	}, [initializationComplete, minimumTimeElapsed, fadeAnim, onFinish]);

	const logoRotate = logoRotateAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "360deg"],
	});

	return (
		<Animated.View style={[styles.container, { opacity: fadeAnim }]}>
			<LinearGradient
				colors={["#0F3460", "#1a4a7a", "#2563eb"]}
				style={styles.gradient}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			/>

			{/* Animated background circles */}
			<View style={styles.backgroundElements}>
				<Animated.View
					style={[
						styles.circle,
						styles.circle1,
						{
							transform: [{ scale: pulseAnim }, { rotate: logoRotate }],
						},
					]}
				/>
				<Animated.View
					style={[
						styles.circle,
						styles.circle2,
						{
							transform: [{ scale: pulseAnim }, { rotate: logoRotate }],
						},
					]}
				/>
				<Animated.View
					style={[
						styles.circle,
						styles.circle3,
						{
							transform: [{ scale: pulseAnim }],
						},
					]}
				/>
			</View>

			{/* Main logo container */}
			<Animated.View
				style={[
					styles.logoContainer,
					{
						transform: [{ scale: scaleAnim }, { rotate: logoRotate }],
					},
				]}
			>
				<View style={styles.logoWrapper}>
					<Image
						source={require("../assets/images/propertprologo.png")}
						style={styles.logo}
						resizeMode="contain"
					/>

					{/* Shimmer overlay */}
					<Animated.View
						style={[
							styles.shimmerOverlay,
							{
								transform: [{ translateX: shimmerAnim }],
							},
						]}
					/>
				</View>

				{/* Glow effect */}
				<View style={styles.glowEffect} />
			</Animated.View>

			{/* Floating particles */}
			<View style={styles.particles}>
				{(["a", "b", "c", "d", "e", "f"] as const).map((id, index) => (
					<Animated.View
						key={id}
						style={[
							styles.particle,
							{
								left: `${15 + index * 12}%`,
								top: `${20 + (index % 3) * 20}%`,
								transform: [
									{
										translateY: Animated.multiply(
											pulseAnim,
											index % 2 === 0 ? -10 : 10,
										),
									},
								],
							},
						]}
					/>
				))}
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
	},
	gradient: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
	},
	backgroundElements: {
		position: "absolute",
		width: "100%",
		height: "100%",
	},
	circle: {
		position: "absolute",
		borderRadius: 1000,
		opacity: 0.08,
	},
	circle1: {
		width: 300,
		height: 300,
		backgroundColor: "#ffffff",
		top: "10%",
		left: "60%",
	},
	circle2: {
		width: 200,
		height: 200,
		backgroundColor: "#ffffff",
		bottom: "20%",
		left: "10%",
	},
	circle3: {
		width: 150,
		height: 150,
		backgroundColor: "#ffffff",
		top: "60%",
		right: "15%",
	},
	logoContainer: {
		position: "relative",
		alignItems: "center",
		justifyContent: "center",
	},
	logoWrapper: {
		width: 160,
		height: 160,
		backgroundColor: "rgba(255, 255, 255, 0.12)",
		borderRadius: 80,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 20 },
		shadowOpacity: 0.25,
		shadowRadius: 30,
		elevation: 20,
		borderWidth: 2,
		borderColor: "rgba(255, 255, 255, 0.2)",
		overflow: "hidden",
	},
	logo: {
		width: 100,
		height: 100,
		zIndex: 2,
	},
	shimmerOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(255, 255, 255, 0.2)",
		width: 40,
		transform: [{ skewX: "-20deg" }],
	},
	glowEffect: {
		position: "absolute",
		width: 200,
		height: 200,
		borderRadius: 100,
		backgroundColor: "rgba(255, 255, 255, 0.05)",
		shadowColor: "#ffffff",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.6,
		shadowRadius: 40,
		elevation: 30,
	},
	particles: {
		position: "absolute",
		width: "100%",
		height: "100%",
	},
	particle: {
		position: "absolute",
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "rgba(255, 255, 255, 0.4)",
		shadowColor: "#ffffff",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.6,
		shadowRadius: 10,
		elevation: 5,
	},
});
