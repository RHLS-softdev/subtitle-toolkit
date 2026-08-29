// This suite runs under Node (see the environment pragma below), not
// jsdom — jsdom's File/Blob don't implement .stream(), which the real
// browser build (and this module) relies on. Node's native File does,
// so this is the closest thing to an end-to-end check available without
// an actual browser: it hand-builds a minimal real Matroska (.mkv) byte
// stream using the same EBML encoder library matroska-subtitles itself
// is built on, then runs it through this app's actual extraction code.
// @vitest-environment node

import { describe, it, expect } from "vitest";
import {
	EbmlMasterTag,
	EbmlDataTag,
	EbmlElementType,
	EbmlTagId,
	Block,
} from "ebml-stream";
import { listSubtitleTracks, extractSubtitleTrack, streamFile } from "./extract";

function dataTag(id: number, type: EbmlElementType, data: unknown): EbmlDataTag {
	const tag = new EbmlDataTag(id, type);
	tag.data = data;
	return tag;
}

function masterTag(id: number, children: EbmlDataTag[] | (EbmlDataTag | EbmlMasterTag)[]): EbmlMasterTag {
	const tag = new EbmlMasterTag(id);
	tag.Children = children;
	return tag;
}

/**
 * Builds a minimal but real .mkv byte stream: an EBML header, one
 * subtitle track (S_TEXT/UTF8, "eng"), and a single Cluster containing
 * one subtitle cue in a BlockGroup — the same shape matroska-subtitles'
 * own parser expects (see its source: it reacts to TimecodeScale,
 * Tracks, Timecode, and BlockGroup elements specifically).
 */
function buildTestMkv({
	trackNumber = 1,
	language = "eng",
	cueText = "Hello, world!",
	cueTimeMs = 1500,
	cueDurationMs = 2000,
}: {
	trackNumber?: number;
	language?: string;
	cueText?: string;
	cueTimeMs?: number;
	cueDurationMs?: number;
} = {}): Buffer {
	const ebmlHeader = masterTag(EbmlTagId.EBML, [
		dataTag(EbmlTagId.EBMLVersion, EbmlElementType.UnsignedInt, 1),
		dataTag(EbmlTagId.DocType, EbmlElementType.String, "matroska"),
	]);

	const trackEntry = masterTag(EbmlTagId.TrackEntry, [
		dataTag(EbmlTagId.TrackNumber, EbmlElementType.UnsignedInt, trackNumber),
		dataTag(EbmlTagId.TrackType, EbmlElementType.UnsignedInt, 0x11),
		dataTag(EbmlTagId.CodecID, EbmlElementType.String, "S_TEXT/UTF8"),
		dataTag(EbmlTagId.Language, EbmlElementType.String, language),
	]);

	const block = new Block(EbmlTagId.Block);
	block.track = trackNumber;
	block.value = cueTimeMs; // relative to the (zero) cluster timecode below; timecodeScale is 1 (1e6/1e6)
	block.payload = Buffer.from(cueText, "utf8");

	const blockGroup = masterTag(EbmlTagId.BlockGroup, [
		block,
		dataTag(EbmlTagId.BlockDuration, EbmlElementType.UnsignedInt, cueDurationMs),
	]);

	const segment = masterTag(EbmlTagId.Segment, [
		masterTag(EbmlTagId.Info, [dataTag(EbmlTagId.TimecodeScale, EbmlElementType.UnsignedInt, 1_000_000)]),
		masterTag(EbmlTagId.Tracks, [trackEntry]),
		masterTag(EbmlTagId.Cluster, [dataTag(EbmlTagId.Timecode, EbmlElementType.UnsignedInt, 0), blockGroup]),
	]);

	return Buffer.concat([ebmlHeader.encode(), segment.encode()]);
}

describe("streamFile", () => {
	it("reads a File in full, reporting cumulative progress", async () => {
		const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
		const file = new File([bytes], "test.bin");
		const loadedValues: number[] = [];

		const result = await streamFile(file, (_chunk, loaded) => loadedValues.push(loaded));

		expect(result.aborted).toBe(false);
		expect(loadedValues.at(-1)).toBe(bytes.length);
	});

	it("stops early when shouldStop returns true, without reading the rest", async () => {
		const bytes = new Uint8Array(200_000).fill(1); // several stream chunks' worth
		const file = new File([bytes], "test.bin");
		let chunkCount = 0;

		const result = await streamFile(file, () => {
			chunkCount += 1;
		}, { shouldStop: () => chunkCount >= 1 });

		expect(result.aborted).toBe(false);
		expect(chunkCount).toBe(1);
	});

	it("reports aborted when the signal is already aborted", async () => {
		const file = new File([new Uint8Array([1, 2, 3])], "test.bin");
		const controller = new AbortController();
		controller.abort();

		const result = await streamFile(file, () => {}, { signal: controller.signal });

		expect(result.aborted).toBe(true);
	});
});

describe("listSubtitleTracks + extractSubtitleTrack (real MKV bytes)", () => {
	it("lists the embedded subtitle track", async () => {
		const file = new File([new Uint8Array(buildTestMkv())], "sample.mkv");

		const tracks = await listSubtitleTracks(file);

		expect(tracks).toEqual([
			{ trackNumber: 1, codec: "utf8", language: "eng", name: undefined, extractable: true },
		]);
	});

	it("extracts the cue text, time, and duration correctly", async () => {
		const file = new File([new Uint8Array(buildTestMkv({ cueText: "Hello, world!", cueTimeMs: 1500, cueDurationMs: 2000 }))], "sample.mkv");
		const track = (await listSubtitleTracks(file))[0];

		const document = await extractSubtitleTrack(file, track);

		expect(document.cues).toEqual([{ index: 1, startMs: 1500, endMs: 3500, text: "Hello, world!" }]);
	});

	it("reports read progress while extracting", async () => {
		const bytes = new Uint8Array(buildTestMkv());
		const file = new File([bytes], "sample.mkv");
		const track = (await listSubtitleTracks(file))[0];
		const progressUpdates: number[] = [];

		await extractSubtitleTrack(file, track, (p) => progressUpdates.push(p.loaded));

		expect(progressUpdates.at(-1)).toBe(bytes.length);
	});

	it("can be canceled mid-extraction via AbortSignal", async () => {
		const file = new File([new Uint8Array(buildTestMkv())], "sample.mkv");
		const track = (await listSubtitleTracks(file))[0];
		const controller = new AbortController();
		controller.abort();

		await expect(extractSubtitleTrack(file, track, undefined, controller.signal)).rejects.toThrow();
	});
});
