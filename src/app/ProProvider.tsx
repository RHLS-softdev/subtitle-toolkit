import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { entitlementsFor, type Entitlements, type ProStatus } from "../lib/entitlements";

/*
 * Root-level Pro state holder. Deliberately imports NOTHING from
 * Clerk/Convex — the actual commercial tree is lazy-loaded in
 * src/components/pro/ProPanel.tsx (so the free tool never loads that
 * stack), and it reports its findings back through reportStatus().
 *
 * The entitlement boundary stays in one place: components read
 * entitlements (a plain boolean flags object) off usePro().
 */
interface ProContextValue {
	status: ProStatus;
	entitlements: Entitlements;
	isPro: boolean;
	panelOpen: boolean;
	openPanel: () => void;
	closePanel: () => void;
	reportStatus: (status: ProStatus) => void;
}

const ProContext = createContext<ProContextValue | null>(null);

export function ProProvider({ children }: { children: ReactNode }) {
	const [status, setStatus] = useState<ProStatus>("unknown");
	const [panelOpen, setPanelOpen] = useState(false);

	const reportStatus = useCallback((next: ProStatus) => {
		setStatus(next);
	}, []);
	const openPanel = useCallback(() => setPanelOpen(true), []);
	const closePanel = useCallback(() => setPanelOpen(false), []);

	const value = useMemo<ProContextValue>(
		() => ({
			status,
			entitlements: entitlementsFor(status === "pro"),
			isPro: status === "pro",
			panelOpen,
			openPanel,
			closePanel,
			reportStatus,
		}),
		[status, panelOpen, openPanel, closePanel, reportStatus],
	);

	return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context files must export both the provider and its hook from one module
export function usePro(): ProContextValue {
	const ctx = useContext(ProContext);
	if (!ctx) throw new Error("usePro must be used inside ProProvider");
	return ctx;
}
