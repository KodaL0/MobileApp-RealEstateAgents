import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import PropertyReelsView from "../../../components/Discover/PropertyReelsView";

export default function FeedIndexScreen() {
	return (
		<GestureHandlerRootView style={styles.container}>
			<StatusBar style="light" backgroundColor="#000" translucent />
			<PropertyReelsView />
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
});
