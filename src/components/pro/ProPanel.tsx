import { useEffect, useState } from "react";
import { ClerkProvider, SignInButton, SignOutButton, UserButton, UNSAFE_PortalProvider, useAuth } from "@clerk/react";
import { ConvexReactClient, useConvex } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { api } from "../../../convex/_generated/api";
import { usePro } from "../../app/ProProvider";
import { PRO_PRICE_LABEL } from "../../lib/pricing";
import { ShieldLockIcon, CircleCheckIcon, XIcon, LoaderIcon, SubtitlesIcon, AlertTriangleIcon } from "../icons/TablerIcons";

/*
 * The Pro purchase/account panel — the ONLY place in the app that imports
 * Clerk or Convex. Lazy-loaded (see App.tsx), so the free tool's bundle
 * and startup never touch the commercial stack: the hard rule from the
 * architecture plan is "free tool works anonymously; Clerk only appears
 * when someone wants Pro".
 *
 * The convex/_generated files here are the locally-generated equivalents
 * of what `npx convex deploy` regenerates on the backend project (the
 * deployment doesn't exist yet on this machine, so they were written by
 * hand from the same template — see SETUP.md).
 *
 * Graceful degradation: if the Convex deployment isn't reachable (env
 * keys missing, deployment not deployed yet), the panel explains that
 * checkout isn't connected yet and the app keeps working as the free
 * tool — Pro features stay locked, never half-broken.
 */

function getConvexClient(): ConvexReactClient {
	// VITE_CONVEX_URL is checked before this is ever called.
	const url = import.meta.env.VITE_CONVEX_URL as string;
	return new ConvexReactClient(url);
}

interface EntitlementResult {
	isPro: boolean;
	purchases: unknown[];
}

function ProContent() {
	const { isLoaded, isSignedIn } = useAuth();
	const convex = useConvex();
	const { reportStatus } = usePro();

	const [entitlement, setEntitlement] = useState<EntitlementResult | null>(null);
	const [backendError, setBackendError] = useState<string | null>(null);
	const [buying, setBuying] = useState(false);
	const [buyError, setBuyError] = useState<string | null>(null);

	// Sync reportStatus with the auth state — a callback into the root
	// provider, not this component's own state, so it's safe to call
	// from an effect.
	useEffect(() => {
		if (isLoaded && !isSignedIn) reportStatus("free");
	}, [isLoaded, isSignedIn, reportStatus]);

	// Async entitlement check — only runs when signed in; every setState
	// here happens in a promise callback, never synchronously.
	useEffect(() => {
		if (!isLoaded || !isSignedIn) return;

		let cancelled = false;
		convex
			.mutation(api.users.ensureUser, {})
			.then(() => convex.query(api.purchases.getMyEntitlements, {}))
			.then((result: EntitlementResult) => {
				if (cancelled) return;
				setEntitlement(result);
				reportStatus(result.isPro ? "pro" : "free");
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				console.error("[pro] backend unavailable:", err);
				setBackendError(
					"The Pro store isn't connected on this build yet — checkout will be available once the deployment is wired up (see SETUP.md). Your free tools are unaffected.",
				);
				reportStatus("unconfigured");
			});

		return () => {
			cancelled = true;
		};
	}, [isLoaded, isSignedIn, convex, reportStatus]);

	async function handleBuy() {
		setBuying(true);
		setBuyError(null);
		try {
			const { url } = await convex.mutation(api.purchases.createCheckoutSession, {});
			window.location.assign(url);
		} catch (err) {
			console.error("[pro] checkout failed:", err);
			setBuying(false);
			setBuyError("Couldn't start checkout — the payment connection isn't ready yet.");
		}
	}

	if (!isLoaded) {
		return (
			<p className="help-text">
				<LoaderIcon size={14} /> Loading your account…
			</p>
		);
	}

	if (!isSignedIn) {
		return (
			<div className="pro-content">
				<p className="pro-price-line">
					<strong>{PRO_PRICE_LABEL}</strong> — one-time, yours forever. One account keeps your Pro purchase on
					any device.
				</p>
				<div className="pro-actions">
					<SignInButton mode="modal">
						<button className="btn">Sign in to buy Pro — {PRO_PRICE_LABEL}</button>
					</SignInButton>
				</div>
			</div>
		);
	}

	if (backendError) {
		return (
			<p className="pro-warning">
				<AlertTriangleIcon size={16} />
				{backendError}
			</p>
		);
	}

	if (entitlement === null) {
		return (
			<p className="help-text">
				<LoaderIcon size={14} /> Checking your account…
			</p>
		);
	}

	if (entitlement.isPro) {
		return (
			<div className="pro-content">
				<p className="pro-active">
					<CircleCheckIcon size={18} />
					<strong>Pro is active on this account.</strong> Batch processing, batch video extraction, and saved
					presets are unlocked.
				</p>
				<div className="pro-actions">
					<UserButton />
					<SignOutButton>
						<button className="btn-secondary btn">Sign out</button>
					</SignOutButton>
				</div>
			</div>
		);
	}

	return (
		<div className="pro-content">
			<p className="pro-price-line">
				<strong>{PRO_PRICE_LABEL}</strong> — one-time purchase. Unlocks batch processing, batch video extraction
				with ZIP output, and saved presets. Free single-file tools stay free forever.
			</p>
			{buyError && (
				<p className="pro-warning">
					<AlertTriangleIcon size={16} />
					{buyError}
				</p>
			)}
			<div className="pro-actions">
				<button className="btn" onClick={handleBuy} disabled={buying}>
					{buying ? "Opening checkout…" : `Get Pro — ${PRO_PRICE_LABEL}`}
				</button>
				<UserButton />
			</div>
		</div>
	);
}

function UnconfiguredNotice({ missing }: { missing: string[] }) {
	return (
		<p className="pro-warning">
			<AlertTriangleIcon size={16} />
			This build isn't connected to the Pro store yet (missing {missing.join(" and ")}). The free tools all work;
			checkout will appear here once it's configured.
		</p>
	);
}

export function ProPanel() {
	const { closePanel } = usePro();
	const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
	const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

	const missing: string[] = [];
	if (!clerkKey) missing.push("VITE_CLERK_PUBLISHABLE_KEY");
	if (!convexUrl) missing.push("VITE_CONVEX_URL");

	return (
		<div className="card pro-panel" role="dialog" aria-label="Subtitle Toolkit Pro">
			<div className="pro-panel-header">
				<h2>
					<ShieldLockIcon size={20} /> Subtitle Toolkit Pro
				</h2>
				<button className="btn-secondary btn pro-close" onClick={closePanel} aria-label="Close">
					<XIcon size={16} />
				</button>
			</div>

			<ul className="pro-features">
				<li>
					<SubtitlesIcon size={16} /> Batch processing — a whole folder of .srt files at once, download as ZIP
				</li>
				<li>
					<SubtitlesIcon size={16} /> Batch video extraction — every subtitle track from many MKV/WebM files
				</li>
				<li>
					<SubtitlesIcon size={16} /> Saved presets — name a transform config and re-apply it in one click
				</li>
			</ul>

			{missing.length > 0 ? (
				<UnconfiguredNotice missing={missing} />
			) : (
				<ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
					{/* Clerk's modal sign-in renders into a portal; with no
					    host it's dropped silently, so point it at document.body. */}
					<UNSAFE_PortalProvider getContainer={() => document.body}>
						<ConvexProviderWithClerk client={getConvexClient()} useAuth={useAuth}>
							<ProContent />
						</ConvexProviderWithClerk>
					</UNSAFE_PortalProvider>
				</ClerkProvider>
			)}

			<p className="help-text" style={{ marginTop: "12px" }}>
				All subtitle and video processing stays in your browser — Clerk and Convex only handle your account and
				purchase. Files never leave your device.
			</p>
		</div>
	);
}
