import {
	createContext,
	useContext,
	useState,
	type ReactNode,
} from "react";

interface AppInitContextType {
	isInitComplete: boolean;
	setInitComplete: (value: boolean) => void;
}

const AppInitContext = createContext<AppInitContextType | undefined>(undefined);

export function AppInitProvider({ children }: { children: ReactNode }) {
	const [isInitComplete, setInitComplete] = useState(false);
	return (
		<AppInitContext.Provider value={{ isInitComplete, setInitComplete }}>
			{children}
		</AppInitContext.Provider>
	);
}

export function useAppInit() {
	const ctx = useContext(AppInitContext);
	if (!ctx) throw new Error("useAppInit must be used within AppInitProvider");
	return ctx;
}
