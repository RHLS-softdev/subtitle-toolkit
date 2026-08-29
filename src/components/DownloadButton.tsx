import type { SubtitleDocument } from "../features/subtitle/model";
import { serializeSrt } from "../features/subtitle/serializer";
import { encodeSubtitleText } from "../features/subtitle/encoding";
import { downloadBlob } from "../lib/download";
import { buildOutputFilename } from "../lib/file";
import { DownloadIcon } from "./icons/TablerIcons";

interface DownloadButtonProps {
	document: SubtitleDocument;
	addBom: boolean;
	label?: string;
}

export function DownloadButton({ document, addBom, label = "Download .srt" }: DownloadButtonProps) {
	function handleDownload() {
		const text = serializeSrt(document);
		const bytes = encodeSubtitleText(text, addBom);
		downloadBlob(bytes, buildOutputFilename(document.sourceFileName), "application/x-subrip;charset=utf-8");
	}

	return (
		<button className="btn" onClick={handleDownload}>
			<DownloadIcon size={18} />
			{label}
		</button>
	);
}
