/*
 * The single Pro boundary — the "first version of Pro" rule from the
 * architecture plan: entitlements are one type, computed in one place,
 * and components read boolean fields off it. Nothing anywhere else says
 * "if (user.plan === 'pro')".
 *
 * The truth comes from Convex (purchases table, written only by the
 * Stripe webhook) via src/components/pro/ProPanel.tsx; this module only
 * maps "is Pro" to the concrete feature flags.
 */
export interface Entitlements {
	/** Batch processing of many .srt files at once, with ZIP output. */
	batchProcessing: boolean;
	/** Batch video extraction (many MKV/WebM files -> SRT ZIP). */
	videoExtraction: boolean;
	/** Saved presets (named transform configs, re-appliable in one click). */
	savedPresets: boolean;
}

export const FREE_ENTITLEMENTS: Entitlements = Object.freeze({
	batchProcessing: false,
	videoExtraction: false,
	savedPresets: false,
});

export const PRO_ENTITLEMENTS: Entitlements = Object.freeze({
	batchProcessing: true,
	videoExtraction: true,
	savedPresets: true,
});

export function entitlementsFor(isPro: boolean): Entitlements {
	return isPro ? PRO_ENTITLEMENTS : FREE_ENTITLEMENTS;
}

/**
 * Commercial-layer state, surfaced by src/app/ProProvider.tsx:
 * - "unknown": the commercial tree hasn't reported yet (panel never opened).
 * - "free": signed in (or not) with no Pro purchase.
 * - "pro": a completed purchase was found.
 * - "unconfigured": the backend couldn't be reached (missing env keys /
 *   deployment not deployed yet) — the app keeps working free.
 */
export type ProStatus = "unknown" | "free" | "pro" | "unconfigured";
