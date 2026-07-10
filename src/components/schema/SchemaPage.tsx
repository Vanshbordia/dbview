import { ReactFlowProvider } from "@xyflow/react";
import {
	Database,
	FilePlus,
	History,
	Moon,
	RefreshCw,
	Settings,
	Sun,
	Trash2,
	Upload,
	Search,
	Download,
} from "lucide-react";
import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { toast } from "sonner";
import {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarGroup,
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
import { usePersistedState } from "#/hooks/use-persisted-state.ts";
import type { EdgeStyle } from "#/lib/graph-builder.ts";
import {
	createProject,
	deleteProject,
	getActiveProjectId,
	getProject,
	getProjectList,
	type Project,
	renameProject,
	setActiveProjectId,
	updateProject,
} from "#/lib/project-store.ts";
import { DEFAULT_DDL, parseSchema } from "#/lib/schema-parser.ts";
import type {
	DatabaseType,
	ParsedSchema,
	SchemaIssue,
} from "#/types/schema.ts";
import { useTheme } from "../theme-provider.tsx";
import IssuesPanel from "./IssuesPanel.tsx";
import ProjectDialog from "./ProjectDialog.tsx";
import SchemaGraph from "./SchemaGraph.tsx";
import type { SchemaInputHandle } from "./SchemaInput.tsx";
import SchemaInput from "./SchemaInput.tsx";
import SettingsDialog from "./SettingsDialog.tsx";

export default function SchemaPage() {
	const [schema, setSchema] = useState<ParsedSchema | null>(null);
	const [editorOpen, setEditorOpen] = usePersistedState(
		"dbview:editorOpen",
		true,
	);
	const [syncEnabled, setSyncEnabled] = usePersistedState(
		"dbview:syncEnabled",
		false,
	);
	const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const { theme, setTheme } = useTheme();
	const panelRef = useRef<PanelImperativeHandle>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const editorRef = useRef<SchemaInputHandle>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialNav, setSettingsInitialNav] = useState("appearance");
	const [edgeStyle, setEdgeStyle] = usePersistedState<EdgeStyle>(
		"dbview:edgeStyle",
		"bezier",
	);
	const [activeTableName, setActiveTableName] = useState<string | null>(null);
	const [issues, setIssues] = useState<SchemaIssue[]>([]);
	const [databaseType, setDatabaseType] = useState<DatabaseType>("postgresql");
	const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const projectRef = useRef<Project | null>(null);
	const flushRef = useRef<() => void>(() => {});

	// Project state
	const [project, setProject] = useState<Project | null>(null);
	const [projectList, setProjectList] = useState(() => getProjectList());
	const [projectDialogOpen, setProjectDialogOpen] = useState(false);
	const [projectDialogMode, setProjectDialogMode] = useState<
		"create" | "rename"
	>("create");

	// Search and Export states
	const [searchQuery, setSearchQuery] = useState("");
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isRendering, setIsRendering] = useState(false);

	// Focus target state for double-click panning in graph
	const focusKeyRef = useRef(0);
	const [focusTarget, setFocusTarget] = useState<{
		id: string;
		key: number;
	} | null>(null);

	const handleTableDoubleClick = useCallback((tableName: string) => {
		focusKeyRef.current++;
		setFocusTarget({ id: tableName, key: focusKeyRef.current });
	}, []);

	// Search suggestions logic
	const searchResults = useMemo(() => {
		if (!searchQuery.trim() || !schema) return [];
		const query = searchQuery.toLowerCase();
		return schema.tables
			.map((t) => t.name)
			.filter((name) => name.toLowerCase().includes(query));
	}, [searchQuery, schema]);

	const handleSearchSelect = useCallback(
		(tableName: string) => {
			handleTableDoubleClick(tableName);
			setActiveTableName(tableName);
			setSearchQuery("");
		},
		[handleTableDoubleClick],
	);

	const handleSearchKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && searchResults.length > 0) {
				handleSearchSelect(searchResults[0]);
			}
		},
		[searchResults, handleSearchSelect],
	);

	// On mount, load the active project
	useEffect(() => {
		const id = getActiveProjectId();
		if (id) {
			const p = getProject(id);
			if (p) {
				setProject(p);
				setDatabaseType(p.databaseType ?? "postgresql");
				requestAnimationFrame(() => {
					editorRef.current?.setValue(p.ddl);
				});
				return;
			}
		}
		setProject(null);
	}, []);

	// Refresh project list whenever it might change
	const refreshProjectList = useCallback(() => {
		setProjectList(getProjectList());
	}, []);

	// Keep ref in sync with state for use in timeout/event handlers
	projectRef.current = project;

	// Auto-save DDL to project with debounce (uses ref to avoid stale closure)
	const saveDdl = useCallback(
		(ddl: string) => {
			clearTimeout(saveTimer.current);
			saveTimer.current = setTimeout(() => {
				const p = projectRef.current;
				if (!p) return;
				const updated = updateProject(p.id, { ddl });
				if (updated) {
					setProject(updated);
					refreshProjectList();
				}
			}, 400);
		},
		[refreshProjectList],
	);

	// Immediately save any pending DDL changes before switching projects
	const flushCurrentSave = useCallback(() => {
		clearTimeout(saveTimer.current);
		const p = projectRef.current;
		if (!p) return;
		const ddl = editorRef.current?.getValue();
		if (ddl === undefined) return;
		const updated = updateProject(p.id, { ddl });
		if (updated) {
			setProject(updated);
			refreshProjectList();
		}
	}, [refreshProjectList]);

	const handleNewProjectSubmit = useCallback(
		(name: string) => {
			flushCurrentSave();
			const p = createProject(name, "", databaseType);
			setProject(p);
			setActiveProjectId(p.id);
			setSchema(null);
			setIssues([]);
			editorRef.current?.setValue(DEFAULT_DDL[databaseType]);
			refreshProjectList();
			toast.success(`Created project "${p.name}"`);
		},
		[flushCurrentSave, refreshProjectList, databaseType],
	);

	const handleRenameSubmit = useCallback(
		(name: string) => {
			if (!project) return;
			const updated = renameProject(project.id, name);
			if (updated) {
				setProject(updated);
				refreshProjectList();
				toast.success(`Renamed to "${name}"`);
			}
		},
		[project, refreshProjectList],
	);

	const handleOpenProject = useCallback(
		(id: string) => {
			flushCurrentSave();
			const p = getProject(id);
			if (!p) return;
			setProject(p);
			setDatabaseType(p.databaseType ?? "postgresql");
			setActiveProjectId(id);
			setSchema(null);
			setIssues([]);
			editorRef.current?.setValue(p.ddl);
		},
		[flushCurrentSave],
	);

	const handleDeleteProject = useCallback(() => {
		if (!project) return;
		const name = project.name;
		deleteProject(project.id);
		setProject(null);
		setActiveProjectId(null);
		setSchema(null);
		setIssues([]);
		editorRef.current?.setValue("");
		refreshProjectList();
		toast.success(`Deleted project "${name}"`);
	}, [project, refreshProjectList]);

	const tryRender = useCallback(
		(ddl: string) => {
			try {
				const parsed = parseSchema(ddl, databaseType);
				if (parsed.tables.length > 0) {
					setSchema(parsed);
				}
			} catch {
				/* ignore parse errors in sync mode */
			}
		},
		[databaseType],
	);

	const handleRender = useCallback(
		(ddl: string) => {
			clearTimeout(syncTimer.current);
			// Reflect the loading state on the Render button immediately.
			setIsRendering(true);
			// Defer the actual parse + schema update to a later task so the
			// "Rendering…" UI paints BEFORE the (potentially long) graph
			// build/layout runs. Otherwise React batches the loading state and
			// the heavy React Flow reconciliation into one render pass and only
			// paints once the freeze is over.
			setTimeout(() => {
				try {
					const parsed = parseSchema(ddl, databaseType);
					if (parsed.tables.length === 0) {
						toast.error("No tables found in the DDL. Check your SQL syntax.");
						setIsRendering(false);
						return;
					}

					const allIssues: SchemaIssue[] = [...parsed.issues];

					for (const table of parsed.tables) {
						for (const fk of table.foreignKeys) {
							const refTable = parsed.tables.find(
								(t) =>
									t.name === fk.referencedTable ||
									`${t.schema}.${t.name}` === fk.referencedTable,
							);
							if (!refTable) {
								allIssues.push({
									type: "error",
									message: `table "${fk.referencedTable}" not created`,
									table: table.name,
									column: fk.column,
								});
								continue;
							}
							if (fk.referencedColumn) {
								const refCol = refTable.columns.find(
									(c) => c.name === fk.referencedColumn,
								);
								if (!refCol) {
									allIssues.push({
										type: "error",
										message: `column "${fk.referencedColumn}" not found in table "${refTable.name}"`,
										table: table.name,
										column: fk.column,
									});
								}
							}
						}
					}

					setSchema(parsed);
					setIssues(allIssues);

					if (allIssues.length > 0) {
						for (const issue of allIssues.slice(0, 3)) {
							toast.warning(
								issue.table ? `[${issue.table}] ${issue.message}` : issue.message,
							);
						}
						if (allIssues.length > 3) {
							toast.warning(`...and ${allIssues.length - 3} more issue(s)`);
						}
					} else {
						toast.success(`Rendered ${parsed.tables.length} table(s)`);
					}
				} catch (e) {
					toast.error(e instanceof Error ? e.message : "Failed to parse schema");
					setIsRendering(false);
				}
			}, 0);
		},
		[databaseType],
	);

	const handleChange = useCallback(
		(ddl: string) => {
			saveDdl(ddl);
			if (!syncEnabled) return;
			clearTimeout(syncTimer.current);
			syncTimer.current = setTimeout(() => tryRender(ddl), 500);
		},
		[syncEnabled, tryRender, saveDdl],
	);

	const handleFileChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			flushCurrentSave();
			const reader = new FileReader();
			reader.onload = () => {
				editorRef.current?.setValue(reader.result as string);
				toast.success(`Loaded ${file.name}`);
			};
			reader.onerror = () => toast.error("Failed to read file");
			reader.readAsText(file);
			e.target.value = "";
		},
		[flushCurrentSave],
	);

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
	}, [setEditorOpen]);

	const handleLayoutChange = useCallback(
		(layout: Record<string, number>) => {
			const values = Object.values(layout);
			if (values.length > 0) {
				setEditorOpen(values[0] > 0);
			}
		},
		[setEditorOpen],
	);

	const handleJumpToIssue = useCallback((issue: SchemaIssue) => {
		editorRef.current?.scrollToIssue(issue);
	}, []);

	const handleDatabaseTypeChange = useCallback(
		(type: DatabaseType) => {
			setDatabaseType(type);
			if (project) {
				const updated = updateProject(project.id, { databaseType: type });
				if (updated) {
					setProject(updated);
					refreshProjectList();
				}
			}
			editorRef.current?.setValue(DEFAULT_DDL[type]);
			setSchema(null);
			setIssues([]);
		},
		[project, refreshProjectList],
	);

	// Keep flush ref in sync for use in event handlers
	flushRef.current = flushCurrentSave;

	// Save pending changes on page close / refresh
	useEffect(() => {
		const handleBeforeUnload = () => {
			flushRef.current();
		};
		const handleVisibility = () => {
			if (document.visibilityState === "hidden") {
				flushRef.current();
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		document.addEventListener("visibilitychange", handleVisibility);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, []);

	const erroredTables = useMemo(() => {
		const s = new Set<string>();
		for (const issue of issues) {
			if (issue.type === "error" && issue.table) {
				s.add(issue.table);
			}
		}
		return s;
	}, [issues]);

	return (
		<div className="h-dvh w-dvw overflow-hidden flex flex-col bg-background">
			<Menubar className="shrink-0 rounded-none border-x-0 border-t-0 h-10 px-4 gap-1 bg-muted/10">
				<MenubarMenu>
					<MenubarTrigger className="text-xs h-7 px-3">File</MenubarTrigger>
					<MenubarContent>
						<MenubarItem
							onSelect={() => {
								setProjectDialogMode("create");
								setProjectDialogOpen(true);
							}}
						>
							<FilePlus className="size-3.5 mr-2" />
							New Project
						</MenubarItem>
						{projectList.length > 0 && (
							<MenubarGroup>
								<MenubarSub>
									<MenubarSubTrigger>
										<History className="size-3.5 mr-2" />
										Recent Projects
									</MenubarSubTrigger>
									<MenubarSubContent>
										{[...projectList]
											.sort((a, b) => b.updatedAt - a.updatedAt)
											.map((p) => (
												<MenubarItem
													key={p.id}
													onSelect={() => handleOpenProject(p.id)}
												>
													<span className="truncate max-w-40">{p.name}</span>
													{project?.id === p.id && (
														<span className="ml-auto text-2xs text-muted-foreground">
															(active)
														</span>
													)}
												</MenubarItem>
											))}
									</MenubarSubContent>
								</MenubarSub>
							</MenubarGroup>
						)}
						<MenubarItem onSelect={() => fileInputRef.current?.click()}>
							<Upload className="size-3.5 mr-2" />
							Import SQL File...
						</MenubarItem>
						{project && (
							<>
								<MenubarSeparator />
								<MenubarItem
									onSelect={() => setExportDialogOpen(true)}
									disabled={isExporting}
								>
									<Download className="size-3.5 mr-2" />
									Export as Image...
								</MenubarItem>
								<MenubarSeparator />
								<MenubarItem
									onSelect={() => {
										setSettingsInitialNav("project");
										setSettingsOpen(true);
									}}
								>
									<Database className="size-3.5 mr-2" />
									Project Settings
								</MenubarItem>
								<MenubarItem
									onSelect={() => {
										setProjectDialogMode("rename");
										setProjectDialogOpen(true);
									}}
								>
									<FilePlus className="size-3.5 mr-2" />
									Rename Project
								</MenubarItem>
								<MenubarItem onSelect={handleDeleteProject}>
									<Trash2 className="size-3.5 mr-2 text-destructive" />
									<span className="text-destructive">Delete Project</span>
								</MenubarItem>
							</>
						)}
						<MenubarSeparator />
						<MenubarItem
							onSelect={() => {
								setSettingsInitialNav("appearance");
								setSettingsOpen(true);
							}}
						>
							<Settings className="size-3.5 mr-2" />
							Global Settings...
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger className="text-xs h-7 px-3">View</MenubarTrigger>
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

				<div className="ml-auto flex items-center gap-4">
					{schema && schema.tables.length > 0 && (
						<div className="relative">
							<div className="flex items-center gap-1.5 p-1 px-3.5 rounded-full border border-border bg-background/50 focus-within:bg-background/80 transition-colors w-56 h-7">
								<Search className="size-3.5 text-muted-foreground shrink-0" />
								<input
									type="text"
									placeholder="Search tables..."
									className="bg-transparent text-2xs outline-none w-full border-none focus:ring-0 placeholder:text-muted-foreground/60 text-foreground"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onKeyDown={handleSearchKeyDown}
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="text-muted-foreground hover:text-foreground text-xs font-semibold px-0.5"
									>
										✕
									</button>
								)}
							</div>
							{searchQuery && searchResults.length > 0 && (
								<div className="absolute top-8 right-0 w-56 max-h-48 overflow-y-auto rounded-lg shadow-lg border border-border bg-card/95 backdrop-blur-xs p-1 flex flex-col gap-0.5 z-50 animate-in fade-in-50 slide-in-from-top-1 duration-100">
									{searchResults.map((tableName) => (
										<button
											key={tableName}
											type="button"
											className="text-left text-2xs px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground truncate w-full transition-colors font-medium text-foreground"
											onClick={() => handleSearchSelect(tableName)}
										>
											{tableName}
										</button>
									))}
								</div>
							)}
						</div>
					)}
					{project && (
						<span className="text-2xs font-medium tracking-tight text-muted-foreground/60 select-none">
							{project.name}
						</span>
					)}
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
					<div className="h-full border-r border-border bg-muted/10 flex flex-col">
						<div className="flex-1 min-h-0">
							<SchemaInput
								ref={editorRef}
								initialDdl={project?.ddl ?? DEFAULT_DDL[databaseType]}
								onRender={handleRender}
								onChange={handleChange}
								onActiveTableChange={setActiveTableName}
								onTableDoubleClick={handleTableDoubleClick}
								databaseType={databaseType}
								isRendering={isRendering}
							/>
						</div>
						<IssuesPanel issues={issues} onJumpToIssue={handleJumpToIssue} />
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				<ResizablePanel defaultSize="70%" minSize="30%" maxSize="100%">
					<ReactFlowProvider>
						<SchemaGraph
							schema={schema}
							edgeStyle={edgeStyle}
							activeTableName={activeTableName}
							onActiveTableChange={setActiveTableName}
							erroredTables={erroredTables}
							projectList={projectList}
							onNewProject={() => {
								setProjectDialogMode("create");
								setProjectDialogOpen(true);
							}}
							onOpenProject={handleOpenProject}
							focusTarget={focusTarget}
							exportDialogOpen={exportDialogOpen}
							onExportDialogOpenChange={setExportDialogOpen}
							isExporting={isExporting}
							onExportingChange={setIsExporting}
							isRendering={isRendering}
							onRenderingChange={setIsRendering}
						/>
					</ReactFlowProvider>
				</ResizablePanel>
			</ResizablePanelGroup>

			<ProjectDialog
				open={projectDialogOpen}
				onOpenChange={setProjectDialogOpen}
				mode={projectDialogMode}
				initialName={
					projectDialogMode === "rename" && project ? project.name : ""
				}
				onSubmit={
					projectDialogMode === "create"
						? handleNewProjectSubmit
						: handleRenameSubmit
				}
			/>

			<SettingsDialog
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				edgeStyle={edgeStyle}
				onEdgeStyleChange={setEdgeStyle}
				theme={theme}
				setTheme={setTheme}
				databaseType={databaseType}
				onDatabaseTypeChange={handleDatabaseTypeChange}
				initialNav={settingsInitialNav}
			/>
		</div>
	);
}

