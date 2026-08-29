import { LOCALE_NAMES, useLocale, type LocaleTag } from "../lib/i18n";

/** Inline language selector for the app header. */
export function LangSwitcher() {
	const { locale, setLocale } = useLocale();
	return (
		<select
			className="lang-switcher"
			aria-label="Language"
			value={locale}
			onChange={(e) => setLocale(e.target.value as LocaleTag)}
		>
			{(Object.keys(LOCALE_NAMES) as LocaleTag[]).map((tag) => (
				<option key={tag} value={tag}>{LOCALE_NAMES[tag]}</option>
			))}
		</select>
	);
}
