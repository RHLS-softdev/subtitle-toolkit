import { describe, it, expect } from "vitest";
import {
	createPreset,
	describeConfig,
	loadPresets,
	savePresets,
	PRESETS_STORAGE_KEY,
} from "./presets";
import { defaultBatchConfig } from "../batch/batch";

describe("presets", () => {
	it("creates a preset with the given name and config", () => {
		const config = { ...defaultBatchConfig(), shiftSeconds: 2, fpsSource: 23.976, fpsTarget: 25 };
		const preset = createPreset("episode cleanup", config, 1234);

		expect(preset.name).toBe("episode cleanup");
		expect(preset.createdAt).toBe(1234);
		expect(preset.id).toMatch(/^preset-/);
		expect(preset.config.shiftSeconds).toBe(2);
		expect(preset.config.fpsTarget).toBe(25);
	});

	it("describeConfig summarizes the enabled transforms", () => {
		const base = defaultBatchConfig();
		expect(describeConfig(base)).toBe("No transforms");

		expect(describeConfig({ ...base, shiftSeconds: -1.5 })).toBe("Shift -1.5s");
		expect(describeConfig({ ...base, fpsSource: 23.976, fpsTarget: 25 })).toBe("23.976→25 fps");
		expect(describeConfig({ ...base, censorWords: ["foo", "bar"] })).toBe("2 censored words");
		expect(describeConfig({ ...base, encoding: "shift_jis" })).toBe("Re-decode shift_jis");
	});

	it("round-trips presets through storage", () => {
		const storage = new Map<string, string>();
		const fakeStorage = {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => void storage.set(key, value),
		};

		const a = createPreset("a", { ...defaultBatchConfig(), shiftSeconds: 1 }, 1);
		const b = createPreset("b", { ...defaultBatchConfig(), censorWords: ["x"] }, 2);

		expect(loadPresets(fakeStorage)).toEqual([]);
		savePresets([a, b], fakeStorage);
		expect(storage.has(PRESETS_STORAGE_KEY)).toBe(true);

		const loaded = loadPresets(fakeStorage);
		expect(loaded).toHaveLength(2);
		expect(loaded[0]).toEqual(a);
		expect(loaded[1]).toEqual(b);
	});

	it("drops malformed entries instead of crashing", () => {
		const storage = new Map<string, string>([
			[PRESETS_STORAGE_KEY, JSON.stringify([{ id: "no-config" }, { id: "x", name: "y", createdAt: 1, config: "nope" }])],
		]);
		const fakeStorage = {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: () => void 0,
		};

		expect(loadPresets(fakeStorage)).toEqual([]);
	});

	it("returns an empty list for corrupt JSON", () => {
		const storage = new Map<string, string>([[PRESETS_STORAGE_KEY, "{not json"]]);
		const fakeStorage = { getItem: (key: string) => storage.get(key) ?? null, setItem: () => void 0 };
		expect(loadPresets(fakeStorage)).toEqual([]);
	});
});
