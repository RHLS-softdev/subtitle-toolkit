import type { SubtitleDocument } from "../subtitle/model";
import { parseSrt } from "../subtitle/parser";
import { serializeSrt } from "../subtitle/serializer";
import { shift, convertFps } from "../subtitle/transforms";
import { censorDocument, type CensorMode } from "../subtitle/censor";
import { validateSrt, type SubtitleWarning } from "../subtitle/validator";
import { decodeSubtitleBytes, type ImportEncodingLabel } from "../subtitle/encoding";

/*
 * Batch processing — the Pro feature. Framework-independent like the rest
 * of src/features: no React, no Clerk, no Convex. A batch is "apply one
 * transform config to many SRT files, entirely in the browser". The same
 * config type is what saved presets store (src/features/presets), so a
 * preset is literally a named BatchTransformConfig.
 *
 * Privacy contract: these functions only ever read the File bytes the
 * user handed to the app and produce new strings locally. Nothing is
 * uploaded anywhere (Clerk/Convex never see file contents — see
 * convex/schema.ts).
 */

export interface BatchTransformConfig {
	/** Seconds to shift every cue by; 0 = no shift. */
	shiftSeconds: number;
	/** Source FPS when converting; 0 (or equal to fpsTarget) = no conversion. */
	fpsSource: number;
	/** Target FPS when converting. */
	fpsTarget: number;
	/** Whole-word case-insensitive words to censor; empty = no censoring. */
	censorWords: string[];
	/** "partial" keeps the first letter ("f***"), "full" hides length ("[____]"). */
	censorMode: CensorMode;
	/** Encoding to re-decode every input file under before parsing. */
	encoding: ImportEncodingLabel;
}

export interface BatchResult {
	fileName: string;
	/** The processed SRT text (empty when processing failed). */
	output: string;
	cueCount: number;
	warnings: SubtitleWarning[];
	/** Set when the file couldn't be read/parsed; output is then empty. */
	error?: string;
}

export function defaultBatchConfig(): BatchTransformConfig {
	return {
		shiftSeconds: 0,
		fpsSource: 0,
		fpsTarget: 0,
		censorWords: [],
		censorMode: "full",
		encoding: "utf-8",
	};
}

/** Applies every enabled transform in a config to a parsed document. */
export function applyTransforms(document: SubtitleDocument, config: BatchTransformConfig): SubtitleDocument {
	let result = document;

	if (config.shiftSeconds !== 0) {
		result = shift(result, Math.round(config.shiftSeconds * 1000));
	}

	const fpsSource = config.fpsSource > 0 ? config.fpsSource : 0;
	const fpsTarget = config.fpsTarget > 0 ? config.fpsTarget : 0;
	if (fpsSource > 0 && fpsTarget > 0 && fpsSource !== fpsTarget) {
		result = convertFps(result, fpsSource, fpsTarget);
	}

	const words = config.censorWords.map((w) => w.trim()).filter(Boolean);
	if (words.length > 0) {
		result = censorDocument(result, words, config.censorMode);
	}

	return result;
}

/** Pure text variant of processSrtFile — the unit-testable core. */
export function processSrtText(text: string, fileName: string, config: BatchTransformConfig): BatchResult {
	try {
		const transformed = applyTransforms(parseSrt(text), config);
		return {
			fileName,
			output: serializeSrt(transformed),
			cueCount: transformed.cues.length,
			warnings: validateSrt(transformed),
		};
	} catch (err) {
		return {
			fileName,
			output: "",
			cueCount: 0,
			warnings: [],
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

/** Reads a File's bytes, decodes under the config encoding, processes it. */
export async function processSrtFile(file: File, config: BatchTransformConfig): Promise<BatchResult> {
	const bytes = await file.arrayBuffer();
	const text = decodeSubtitleBytes(bytes, config.encoding);
	return processSrtText(text, file.name, config);
}
