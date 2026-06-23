import { ReactFlowProvider } from "@xyflow/react";
import { Moon, RefreshCw, Sun, Upload } from "lucide-react";
import { type ChangeEvent, useCallback, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { toast } from "sonner";
import {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
} from "#/components/ui/menubar.tsx";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/components/ui/resizable.tsx";
import { parseSchema } from "#/lib/schema-parser.ts";
import type { ParsedSchema } from "#/types/schema.ts";
import { useTheme } from "../theme-provider.tsx";
import SchemaGraph from "./SchemaGraph.tsx";
import SchemaInput from "./SchemaInput.tsx";

export default function SchemaPage() {
	const [schema, setSchema] = useState<ParsedSchema | null>(null);
	const [editorOpen, setEditorOpen] = useState(true);
	const [syncEnabled, setSyncEnabled] = useState(false);
	const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const { theme, setTheme } = useTheme();
	const panelRef = useRef<PanelImperativeHandle>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const editorRef = useRef<{ setValue: (v: string) => void }>(null);

	const tryRender = useCallback((ddl: string) => {
		try {
			const parsed = parseSchema(ddl);
			if (parsed.tables.length > 0) {
				setSchema(parsed);
			}
		} catch {
			/* ignore parse errors in sync mode */
		}
	}, []);

	const handleRender = useCallback((ddl: string) => {
		clearTimeout(syncTimer.current);
		try {
			const parsed = parseSchema(ddl);
			if (parsed.tables.length === 0) {
				toast.error("No tables found in the DDL. Check your SQL syntax.");
				return;
			}
			setSchema(parsed);
			toast.success(`Rendered ${parsed.tables.length} table(s)`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to parse schema");
		}
	}, []);

	const handleChange = useCallback(
		(ddl: string) => {
			if (!syncEnabled) return;
			clearTimeout(syncTimer.current);
			syncTimer.current = setTimeout(() => tryRender(ddl), 500);
		},
		[syncEnabled, tryRender],
	);

	const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			editorRef.current?.setValue(reader.result as string);
			toast.success(`Loaded ${file.name}`);
		};
		reader.onerror = () => toast.error("Failed to read file");
		reader.readAsText(file);
		e.target.value = "";
	}, []);

	const toggleEditor = useCallback(() => {
		const panel = panelRef.current;
		if (!panel) return;
		if (panel.isCollapsed()) {
			panel.expand();
			setEditorOpen(true);
		} else {
			panel.collapse();
			setEditorOpen(false);
		}
	}, []);

	const handleLayoutChange = useCallback((layout: Record<string, number>) => {
		const values = Object.values(layout);
		if (values.length > 0) {
			setEditorOpen(values[0] > 0);
		}
	}, []);

	return (
		<div className="h-dvh w-dvw overflow-hidden flex flex-col bg-background">
			<Menubar className="shrink-0 rounded-none border-x-0 border-t-0 h-8 px-2 gap-1 bg-muted/10">
				<MenubarMenu>
					<MenubarTrigger className="text-xs h-6 px-2">File</MenubarTrigger>
					<MenubarContent>
						<MenubarItem onSelect={() => fileInputRef.current?.click()}>
							<Upload className="size-3.5 mr-2" />
							Open SQL File...
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger className="text-xs h-6 px-2">View</MenubarTrigger>
					<MenubarContent>
						<MenubarItem onSelect={toggleEditor}>
							{editorOpen ? "Hide Editor" : "Show Editor"}
						</MenubarItem>
						<MenubarCheckboxItem
							checked={syncEnabled}
							onSelect={(e) => {
								e.preventDefault();
								setSyncEnabled((v) => !v);
							}}
						>
							<RefreshCw className="size-3.5 mr-2" />
							Auto-sync
						</MenubarCheckboxItem>
						<MenubarSeparator />
						<MenubarSub>
							<MenubarSubTrigger>
								{theme === "dark" ? (
									<Moon className="size-3.5 mr-2" />
								) : (
									<Sun className="size-3.5 mr-2" />
								)}
								Theme
							</MenubarSubTrigger>
							<MenubarSubContent>
								<MenubarRadioGroup value={theme}>
									<MenubarRadioItem
										value="light"
										onSelect={() => setTheme("light")}
									>
										Light
									</MenubarRadioItem>
									<MenubarRadioItem
										value="dark"
										onSelect={() => setTheme("dark")}
									>
										Dark
									</MenubarRadioItem>
									<MenubarRadioItem
										value="system"
										onSelect={() => setTheme("system")}
									>
										System
									</MenubarRadioItem>
								</MenubarRadioGroup>
							</MenubarSubContent>
						</MenubarSub>
					</MenubarContent>
				</MenubarMenu>

				<div className="ml-auto flex items-center gap-1">
					<span className="text-2xs font-semibold opacity-30 tracking-widest uppercase select-none text-muted-foreground">
						Schema View
					</span>
				</div>
			</Menubar>

			<input
				ref={fileInputRef}
				type="file"
				accept=".sql,.txt"
				className="hidden"
				onChange={handleFileChange}
			/>

			<ResizablePanelGroup
				orientation="horizontal"
				className="flex-1 min-h-0"
				onLayoutChange={handleLayoutChange}
			>
				<ResizablePanel
					panelRef={panelRef}
					defaultSize="30%"
					minSize={0}
					maxSize="50%"
					collapsible
					collapsedSize={0}
				>
					<div className="h-full border-r border-border bg-muted/10">
						<SchemaInput
							ref={editorRef}
							onRender={handleRender}
							onChange={handleChange}
						/>
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				<ResizablePanel defaultSize="70%" minSize="30%" maxSize="100%">
					<ReactFlowProvider>
						<SchemaGraph schema={schema} />
					</ReactFlowProvider>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
