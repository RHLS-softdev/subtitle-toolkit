import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { UploadIcon } from "./icons/TablerIcons";

interface FileDropProps {
	onFile: (file: File) => void;
	accept?: string;
	title?: string;
	subtitle?: string;
}

export function FileDrop({
	onFile,
	accept = ".srt,text/plain",
	title = "Drop an .srt file here, or click to browse",
	subtitle = "Your file is processed on this device and never uploaded anywhere.",
}: FileDropProps) {
	const [isActive, setIsActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	function handleDrop(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setIsActive(false);
		const file = event.dataTransfer.files[0];
		if (file) onFile(file);
	}

	return (
		<div
			className={`drop-zone${isActive ? " is-active" : ""}`}
			onDragOver={(event) => {
				event.preventDefault();
				setIsActive(true);
			}}
			onDragLeave={() => setIsActive(false)}
			onDrop={handleDrop}
			onClick={() => inputRef.current?.click()}
			role="button"
			tabIndex={0}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
			}}
		>
			<UploadIcon size={28} className="drop-icon" />
			<p>
				<strong>{title}</strong>
			</p>
			<p>{subtitle}</p>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				style={{ display: "none" }}
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) onFile(file);
					event.target.value = "";
				}}
			/>
		</div>
	);
}
