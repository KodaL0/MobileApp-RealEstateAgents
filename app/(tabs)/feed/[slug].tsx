import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import PropertyReelsView from "../../../components/Discover/PropertyReelsView";

export default function FeedSlugScreen() {
	const { slug } = useLocalSearchParams<{ slug: string }>();

	return (
		<View style={styles.container}>
			<StatusBar style="light" backgroundColor="#000" translucent />
			<PropertyReelsView initialSlug={slug ?? undefined} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
});
