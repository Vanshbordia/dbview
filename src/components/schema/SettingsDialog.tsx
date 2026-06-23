import {
	Paintbrush,
	Settings,
	type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { EdgeStyle } from "#/lib/graph-builder.ts";
import type { useTheme } from "../theme-provider.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../ui/dialog.tsx";
import { Separator } from "../ui/separator.tsx";

type Theme = ReturnType<typeof useTheme>["theme"];
type SetTheme = ReturnType<typeof useTheme>["setTheme"];

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	edgeStyle: EdgeStyle;
	onEdgeStyleChange: (style: EdgeStyle) => void;
	theme: Theme;
	setTheme: SetTheme;
}

const NAV_ITEMS: { id: string; label: string; icon: LucideIcon }[] = [
	{ id: "appearance", label: "View & Theme", icon: Paintbrush },
	{ id: "graph", label: "Graph", icon: Settings },
];

export default function SettingsDialog({
	open,
	onOpenChange,
	edgeStyle,
	onEdgeStyleChange,
	theme,
	setTheme,
}: SettingsDialogProps) {
	const [activeNav, setActiveNav] = useState("appearance");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
				<DialogTitle className="sr-only">Settings</DialogTitle>
				<DialogDescription className="sr-only">
					Customize your settings here.
				</DialogDescription>
				<div className="flex h-[480px]">
					<nav className="hidden md:flex w-48 shrink-0 border-r p-2 flex-col gap-1">
						{NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => setActiveNav(item.id)}
									data-active={activeNav === item.id ? "" : undefined}
									className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground data-[active]:bg-accent data-[active]:text-accent-foreground"
								>
									<Icon className="size-4 shrink-0" />
									{item.label}
								</button>
							);
						})}
					</nav>
					<div className="flex-1 flex flex-col overflow-hidden">
						<header className="flex h-12 shrink-0 items-center px-4 border-b">
							<span className="text-sm font-semibold">
								{NAV_ITEMS.find((i) => i.id === activeNav)?.label}
							</span>
						</header>
						<div className="flex-1 overflow-y-auto p-4 space-y-6">
							{activeNav === "appearance" && (
								<AppearanceSection
									theme={theme}
									setTheme={setTheme}
								/>
							)}
							{activeNav === "graph" && (
								<GraphSection
									edgeStyle={edgeStyle}
									onEdgeStyleChange={onEdgeStyleChange}
								/>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function AppearanceSection({
	theme,
	setTheme,
}: {
	theme: Theme;
	setTheme: SetTheme;
}) {
	const options: { value: Theme; label: string }[] = [
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
		{ value: "system", label: "System" },
	];

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-sm font-medium mb-1">Theme</h3>
				<p className="text-xs text-muted-foreground mb-3">
					Select the color theme for the application.
				</p>
				<div className="flex gap-2">
					{options.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => setTheme(opt.value)}
							data-active={theme === opt.value ? "" : undefined}
							className="flex-1 rounded-lg border-2 border-transparent px-4 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground data-[active]:border-primary data-[active]:bg-accent"
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			<Separator />

			<div>
				<h3 className="text-sm font-medium mb-1">Interface</h3>
				<p className="text-xs text-muted-foreground mb-3">
					Additional display preferences.
				</p>
				<p className="text-xs text-muted-foreground">
					More options coming soon.
				</p>
			</div>
		</div>
	);
}

function GraphSection({
	edgeStyle,
	onEdgeStyleChange,
}: {
	edgeStyle: EdgeStyle;
	onEdgeStyleChange: (style: EdgeStyle) => void;
}) {
	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-sm font-medium mb-1">Edge Style</h3>
				<p className="text-xs text-muted-foreground mb-3">
					Choose how relationship edges are drawn between tables.
				</p>
				<div className="flex gap-2">
					{(
						[
							{ value: "bezier" as EdgeStyle, label: "Curved", desc: "Smooth bezier curves" },
							{ value: "smoothstep" as EdgeStyle, label: "Angled", desc: "Straight lines with right-angle turns" },
						]
					).map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => onEdgeStyleChange(opt.value)}
							data-active={edgeStyle === opt.value ? "" : undefined}
							className="flex-1 rounded-lg border-2 border-transparent px-4 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground data-[active]:border-primary data-[active]:bg-accent"
						>
							<span className="text-sm font-medium block">{opt.label}</span>
							<span className="text-xs text-muted-foreground mt-0.5 block">
								{opt.desc}
							</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
