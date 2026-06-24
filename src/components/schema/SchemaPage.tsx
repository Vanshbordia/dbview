import { ReactFlowProvider } from "@xyflow/react";
import { FilePlus, FolderOpen, Moon, RefreshCw, Settings, Sun, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	MenubarGroup
} from "#/components/ui/menubar.tsx";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/components/ui/resizable.tsx";
import { usePersistedState } from "#/hooks/use-persisted-state.ts";
import { parseSchema } from "#/lib/schema-parser.ts";
import type { EdgeStyle } from "#/lib/graph-builder.ts";
import type { ParsedSchema, SchemaIssue } from "#/types/schema.ts";
import { useTheme } from "../theme-provider.tsx";
import IssuesPanel from "./IssuesPanel.tsx";
import ProjectDialog from "./ProjectDialog.tsx";
import SchemaGraph from "./SchemaGraph.tsx";
import SchemaInput from "./SchemaInput.tsx";
import type { SchemaInputHandle } from "./SchemaInput.tsx";
import SettingsDialog from "./SettingsDialog.tsx";
import {
	createProject,
	deleteProject,
	getActiveProjectId,
	getProject,
	getProjectList,
	renameProject,
	setActiveProjectId,
	updateProject,
	type Project,
} from "#/lib/project-store.ts";

const DEFAULT_DDL = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  bio TEXT,
  metadata JSONB DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profiles (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  avatar_url VARCHAR(500),
  website VARCHAR(255),
  birthday DATE,
  phone VARCHAR(20)
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(300) UNIQUE NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT,
  published BOOLEAN DEFAULT FALSE,
  rating NUMERIC(2,1) DEFAULT 0.0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  parent_id INTEGER REFERENCES comments(id),
  body TEXT NOT NULL,
  depth INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1'
);

CREATE TABLE posts_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  tag_id INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(50) DEFAULT 'pending',
  total NUMERIC(10,2) NOT NULL,
  ordered_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock INTEGER DEFAULT 0
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  UNIQUE (order_id, product_id)
);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  budget NUMERIC(12,2)
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  manager_id INTEGER REFERENCES employees(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  salary NUMERIC(10,2),
  hired_at DATE DEFAULT CURRENT_DATE
);
`;

export default function SchemaPage() {
	const [schema, setSchema] = useState<ParsedSchema | null>(null);
	const [editorOpen, setEditorOpen] = usePersistedState("dbview:editorOpen", true);
	const [syncEnabled, setSyncEnabled] = usePersistedState("dbview:syncEnabled", false);
	const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const { theme, setTheme } = useTheme();
	const panelRef = useRef<PanelImperativeHandle>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const editorRef = useRef<SchemaInputHandle>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [edgeStyle, setEdgeStyle] = usePersistedState<EdgeStyle>("dbview:edgeStyle", "bezier");
	const [activeTableName, setActiveTableName] = useState<string | null>(null);
	const [issues, setIssues] = useState<SchemaIssue[]>([]);
	const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Project state
	const [project, setProject] = useState<Project | null>(null);
	const [projectList, setProjectList] = useState(() => getProjectList());
	const [projectDialogOpen, setProjectDialogOpen] = useState(false);
	const [projectDialogMode, setProjectDialogMode] = useState<"create" | "rename">("create");

	// Focus target state for double-click panning in graph
	const focusKeyRef = useRef(0);
	const [focusTarget, setFocusTarget] = useState<{ id: string; key: number } | null>(null);

	const handleTableDoubleClick = useCallback((tableName: string) => {
		focusKeyRef.current++;
		setFocusTarget({ id: tableName, key: focusKeyRef.current });
	}, []);

	// On mount, load the active project
	useEffect(() => {
		const id = getActiveProjectId();
		if (id) {
			const p = getProject(id);
			if (p) {
				setProject(p);
				// Load project DDL into editor after creation
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

	// Auto-save DDL to project with debounce
	const saveDdl = useCallback((ddl: string) => {
		if (!project) return;
		clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => {
			const updated = updateProject(project.id, { ddl });
			if (updated) {
				setProject(updated);
				refreshProjectList();
			}
		}, 800);
	}, [project, refreshProjectList]);

	const handleNewProjectSubmit = useCallback((name: string) => {
		const p = createProject(name);
		setProject(p);
		setActiveProjectId(p.id);
		setSchema(null);
		setIssues([]);
		editorRef.current?.setValue(p.ddl);
		refreshProjectList();
		toast.success(`Created project "${p.name}"`);
	}, [refreshProjectList]);

	const handleRenameSubmit = useCallback((name: string) => {
		if (!project) return;
		const updated = renameProject(project.id, name);
		if (updated) {
			setProject(updated);
			refreshProjectList();
			toast.success(`Renamed to "${name}"`);
		}
	}, [project, refreshProjectList]);

	const handleOpenProject = useCallback((id: string) => {
		const p = getProject(id);
		if (!p) return;
		setProject(p);
		setActiveProjectId(id);
		setSchema(null);
		setIssues([]);
		editorRef.current?.setValue(p.ddl);
	}, []);

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
						issue.table
							? `[${issue.table}] ${issue.message}`
							: issue.message,
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
		}
	}, []);

	const handleChange = useCallback(
		(ddl: string) => {
			saveDdl(ddl);
			if (!syncEnabled) return;
			clearTimeout(syncTimer.current);
			syncTimer.current = setTimeout(() => tryRender(ddl), 500);
		},
		[syncEnabled, tryRender, saveDdl],
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

	const handleJumpToIssue = useCallback((issue: SchemaIssue) => {
		editorRef.current?.scrollToIssue(issue);
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
			<Menubar className="shrink-0 rounded-none border-x-0 border-t-0 h-8 px-2 gap-1 bg-muted/10">
				<MenubarMenu>
					<MenubarTrigger className="text-xs h-6 px-2">File</MenubarTrigger>
					<MenubarContent>
						<MenubarItem onSelect={() => {
							setProjectDialogMode("create");
							setProjectDialogOpen(true);
						}}>
							<FilePlus className="size-3.5 mr-2" />
							New Project
						</MenubarItem>
						{projectList.length > 0 && (
							<MenubarGroup>
							<MenubarSub>
								<MenubarSubTrigger>
									<FolderOpen className="size-3.5 mr-2" />
									Open Project
								</MenubarSubTrigger>
								<MenubarSubContent>
									{projectList.map((p) => (
										<MenubarItem
											key={p.id}
											onSelect={() => handleOpenProject(p.id)}
										>
											<span className="truncate max-w-40">{p.name}</span>
											{project?.id === p.id && (
												<span className="ml-auto text-2xs text-muted-foreground">(active)</span>
											)}
										</MenubarItem>
									))}
								</MenubarSubContent>
							</MenubarSub>
							</MenubarGroup>
						)}
						<MenubarGroup>
            <MenubarSub>
              <MenubarSubTrigger>
Share</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarGroup>
                  <MenubarItem>Email link</MenubarItem>
                  <MenubarItem>Messages</MenubarItem>
                  <MenubarItem>Notes</MenubarItem>
                </MenubarGroup>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarGroup>
						<MenubarItem onSelect={() => fileInputRef.current?.click()}>
							<Upload className="size-3.5 mr-2" />
							Import SQL File...
						</MenubarItem>
						{project && (
							<>
								<MenubarSeparator />
								<MenubarItem onSelect={() => {
									setProjectDialogMode("rename");
									setProjectDialogOpen(true);
								}}>
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
						<MenubarItem onSelect={() => setSettingsOpen(true)}>
							<Settings className="size-3.5 mr-2" />
							Settings...
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

				<div className="ml-auto flex items-center gap-2">
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
								initialDdl={project?.ddl ?? DEFAULT_DDL}
								onRender={handleRender}
								onChange={handleChange}
								onActiveTableChange={setActiveTableName}
								onTableDoubleClick={handleTableDoubleClick}
							/>
						</div>
						<IssuesPanel
							issues={issues}
							onJumpToIssue={handleJumpToIssue}
						/>
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
						/>
					</ReactFlowProvider>
				</ResizablePanel>
			</ResizablePanelGroup>

			<ProjectDialog
				open={projectDialogOpen}
				onOpenChange={setProjectDialogOpen}
				mode={projectDialogMode}
				initialName={projectDialogMode === "rename" && project ? project.name : ""}
				onSubmit={projectDialogMode === "create" ? handleNewProjectSubmit : handleRenameSubmit}
			/>

			<SettingsDialog
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				edgeStyle={edgeStyle}
				onEdgeStyleChange={setEdgeStyle}
				theme={theme}
				setTheme={setTheme}
			/>
		</div>
	);
}
