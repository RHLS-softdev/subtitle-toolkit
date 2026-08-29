import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app/App";
import { ProProvider } from "./app/ProProvider";

// ProProvider is a plain state holder — Clerk/Convex are NOT loaded here.
// The commercial stack only mounts when the Pro panel opens (lazy, in
// App.tsx), so the free tool's startup never touches the network stack.
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ProProvider>
			<App />
		</ProProvider>
	</StrictMode>,
);
