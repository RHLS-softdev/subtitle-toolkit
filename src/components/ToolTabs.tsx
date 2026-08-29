import type { ReactNode } from "react";

export interface ToolTabDef<T extends string> {
	id: T;
	label: string;
	icon: ReactNode;
}

interface ToolTabsProps<T extends string> {
	tabs: ToolTabDef<T>[];
	active: T;
	onChange: (id: T) => void;
}

export function ToolTabs<T extends string>({ tabs, active, onChange }: ToolTabsProps<T>) {
	return (
		<div className="tool-tabs" role="tablist">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					role="tab"
					aria-selected={tab.id === active}
					className={`tool-tab${tab.id === active ? " is-active" : ""}`}
					onClick={() => onChange(tab.id)}
				>
					{tab.icon}
					{tab.label}
				</button>
			))}
		</div>
	);
}
