import { AlertTriangleIcon } from "./icons/TablerIcons";

interface ErrorBannerProps {
	message: string;
	detail?: string;
}

export function ErrorBanner({ message, detail }: ErrorBannerProps) {
	return (
		<div className="error-banner" role="alert">
			<AlertTriangleIcon size={18} />
			<div>
				<div>{message}</div>
				{detail && <code className="detail">{detail}</code>}
			</div>
		</div>
	);
}
