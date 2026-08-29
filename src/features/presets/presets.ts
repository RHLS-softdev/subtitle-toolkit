import type { BatchTransformConfig } from "../batch/batch";
import { defaultBatchConfig } from "../batch/batch";

/*
 * Saved presets — the Pro feature. A preset is a named
 * BatchTransformConfig (same type the batch tool uses), stored in
 * localStorage so it survives reloads and can be re-applied to any
 * document or batch in one click.
 *
 * Storage note: this is the ONLY browser storage the app uses, and it is
 * deliberately limited to user-chosen *settings* (shift amount, FPS
 * pair, word lists, encoding) — never file contents. The header's
 * privacy promise ("Your files never leave your device") stays true:
 * presets contain configuration the user typed, not their subtitles or
 * videos.
 */

export interface SubtitlePreset {
	id: string;
	name: string;
	createdAt: number;
	config: BatchTransformConfig;
}

export const PRESETS_STORAGE_KEY = "subtitle-toolkit:presets:v1";

/** Returns a short human summary of a config, e.g. "Shift +2s · 23.976→25 · 3 words". */
export function describeConfig(config: BatchTransformConfig): string {
	const parts: string[] = [];

	if (config.shiftSeconds !== 0) {
		const sign = config.shiftSeconds > 0 ? "+" : "";
		parts.push(`Shift ${sign}${config.shiftSeconds}s`);
	}
	if (config.fpsSource > 0 && config.fpsTarget > 0 && config.fpsSource !== config.fpsTarget) {
		parts.push(`${config.fpsSource}→${config.fpsTarget} fps`);
	}
	const wordCount = config.censorWords.map((w) => w.trim()).filter(Boolean).length;
	if (wordCount > 0) {
		parts.push(`${wordCount} censored word${wordCount === 1 ? "" : "s"}`);
	}
	if (config.encoding !== "utf-8") {
		parts.push(`Re-decode ${config.encoding}`);
	}

	return parts.length > 0 ? parts.join(" · ") : "No transforms";
}

function isValidConfig(value: unknown): value is BatchTransformConfig {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.shiftSeconds === "number" &&
		typeof v.fpsSource === "number" &&
		typeof v.fpsTarget === "number" &&
		Array.isArray(v.censorWords) &&
		v.censorWords.every((w) => typeof w === "string") &&
		(v.censorMode === "partial" || v.censorMode === "full") &&
		typeof v.encoding === "string"
	);
}

/** Reads and validates presets from storage; malformed entries are dropped. */
export function loadPresets(storage: Pick<Storage, "getItem"> = localStorage): SubtitlePreset[] {
	try {
		const raw = storage.getItem(PRESETS_STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		return parsed.filter((item): item is SubtitlePreset => {
			if (typeof item !== "object" || item === null) return false;
			const p = item as Record<string, unknown>;
			return (
				typeof p.id === "string" &&
				typeof p.name === "string" &&
				typeof p.createdAt === "number" &&
				isValidConfig(p.config)
			);
		});
	} catch {
		return [];
	}
}

/** Writes presets to storage, merging the given list over any existing ones. */
export function savePresets(presets: SubtitlePreset[], storage: Pick<Storage, "setItem"> = localStorage): void {
	try {
		storage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
	} catch {
		// Quota/private-mode failures are non-fatal: presets are a
		// convenience, never a data-loss vector (nothing irreplaceable
		// is stored).
	}
}

export function createPreset(name: string, config: BatchTransformConfig, now = Date.now()): SubtitlePreset {
	return {
		id: `preset-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		name,
		createdAt: now,
		config: { ...defaultBatchConfig(), ...config },
	};
}
