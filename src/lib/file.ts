/** Reads a File's full contents as raw bytes, for decoding with a chosen encoding. */
export async function readFileBytes(file: File): Promise<ArrayBuffer> {
	return file.arrayBuffer();
}

/** Builds an output filename like "movie.srt" -> "movie-fixed.srt". */
export function buildOutputFilename(sourceFileName: string | undefined, suffix = "fixed"): string {
	const base = sourceFileName?.replace(/\.srt$/i, "") || "subtitle";
	return `${base}-${suffix}.srt`;
}
