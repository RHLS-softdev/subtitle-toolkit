import JSZip from "jszip";
import { downloadBlob } from "./download";

/**
 * Builds a ZIP of the given in-memory files and triggers a browser
 * download. Used by the Pro batch tools — everything stays local, the
 * ZIP is assembled and saved on-device, never uploaded.
 */
export async function downloadZip(
	files: { name: string; content: string }[],
	zipName: string,
): Promise<void> {
	const zip = new JSZip();
	for (const file of files) {
		zip.file(file.name, file.content);
	}
	const bytes = await zip.generateAsync({ type: "uint8array" });
	downloadBlob(bytes, zipName, "application/zip");
}
