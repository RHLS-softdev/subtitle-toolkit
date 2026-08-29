/** Triggers a browser download of the given bytes/text as a file. Never touches a server. */
export function downloadBlob(content: Uint8Array | string, filename: string, mimeType: string): void {
	// TypeScript's lib.dom types are stricter here than the actual Blob
	// constructor (which happily accepts any ArrayBufferView) — this cast
	// is safe and kept local to this one call.
	const blob = new Blob([content as BlobPart], { type: mimeType });
	const url = URL.createObjectURL(blob);

	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;

	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();

	URL.revokeObjectURL(url);
}
