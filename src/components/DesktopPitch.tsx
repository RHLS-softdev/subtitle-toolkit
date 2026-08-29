import { usePro } from "../app/ProProvider";
import { t } from "../lib/i18n";
import { PRO_PRICE_LABEL } from "../lib/pricing";
import { DeviceDesktopAnalyticsIcon, ShieldLockIcon, CircleCheckIcon } from "./icons/TablerIcons";

/*
 * The Pro pitch card (was a placeholder "desktop app" card before the
 * commercial layer existed). Now it is the main Pro CTA: price, feature
 * list, and a button that opens the lazy-loaded Pro panel (Clerk/Convex
 * checkout). The free tool around it stays anonymous and fully local.
 */
export function DesktopPitch() {
	const { isPro, openPanel } = usePro();

	return (
		<div className="card desktop-pitch">
			<DeviceDesktopAnalyticsIcon size={32} />
			<div>
				<h2>Subtitle Toolkit Pro {isPro && <span className="pro-badge">active</span>}</h2>
				<p className="help-text">
					Everything here, plus batch processing for a whole folder at once, batch video extraction with ZIP
					output, and saved presets. One-time purchase — {PRO_PRICE_LABEL}, yours forever.
				</p>
				<ul className="pro-features">
					<li>Batch process any number of .srt files — one transform config, ZIP download</li>
					<li>Batch extract every text subtitle track from many MKV/WebM files</li>
					<li>Saved presets — name a transform config, re-apply it in one click</li>
				</ul>
				<button className="btn" onClick={openPanel}>
					{isPro ? <CircleCheckIcon size={16} /> : <ShieldLockIcon size={16} />}
					{isPro ? t("app.pro.cta.pro") : t("app.pro.cta.free")}
				</button>
				<p className="help-text" style={{ marginTop: "8px" }}>
					Free single-file processing stays free, anonymous, and fully local — no account needed, and files
					never leave your device.
				</p>
			</div>
		</div>
	);
}
