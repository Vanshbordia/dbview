import {
	Background,
	BackgroundVariant,
	Controls,
	MiniMap,
	Panel,
	ReactFlow,
	useEdgesState,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@xyflow/react/dist/style.css";
import type { Edge, Node } from "@xyflow/react";
import { Download, Loader2, Maximize2, RefreshCw, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import {
	buildGraph,
	type EdgeStyle,
	type LayoutDirection,
	type TableNodeType,
} from "#/lib/graph-builder.ts";
import { exportGraph } from "#/lib/graph-exporter.ts";
import type { ParsedSchema, TableSchema } from "#/types/schema.ts";
import { useTheme } from "../theme-provider.tsx";
import RelationshipEdge from "./RelationshipEdge.tsx";
import TableInfoPanel from "./TableInfoPanel.tsx";
import TableNode from "./TableNode.tsx";
import WelcomeScreen from "./WelcomeScreen.tsx";

const nodeTypes = { table: TableNode };
const edgeTypes = { relationship: RelationshipEdge };

const defaultEdgeOptions = {
	animated: false,
	style: { strokeWidth: 1.5 },
	type: "relationship",
};

interface FocusTarget {
	id: string;
	/** incrementing key ensures the same id can be re-focused */
	key: number;
}

interface SchemaGraphProps {
	schema: ParsedSchema | null;
	edgeStyle: EdgeStyle;
	activeTableName?: string | null;
	onActiveTableChange?: (name: string | null) => void;
	erroredTables?: Set<string>;
	projectList: { id: string; name: string }[];
	onNewProject: () => void;
	onOpenProject: (id: string) => void;
	focusTarget?: FocusTarget | null;
	exportDialogOpen: boolean;
	onExportDialogOpenChange: (open: boolean) => void;
	isExporting: boolean;
	onExportingChange: (exporting: boolean) => void;
	isRendering: boolean;
	onRenderingChange: (rendering: boolean) => void;
}

export default function SchemaGraph({
	schema,
	edgeStyle,
	activeTableName,
	onActiveTableChange,
	erroredTables,
	projectList,
	onNewProject,
	onOpenProject,
	focusTarget,
	exportDialogOpen,
	onExportDialogOpenChange,
	isExporting,
	onExportingChange,
	isRendering,
	onRenderingChange,
}: SchemaGraphProps) {
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [layoutDir, setLayoutDir] = useState<LayoutDirection>("TB");
	const [selectedTable, setSelectedTable] = useState<TableSchema | null>(null);
	const [subSelectedId, setSubSelectedId] = useState<string | null>(null);
	const { fitView, fitBounds, getNodesBounds } = useReactFlow();
	const reactFlowInstance = useReactFlow();
	const edgeStyleRef = useRef(edgeStyle);
	edgeStyleRef.current = edgeStyle;

	const { theme } = useTheme();
	const reactFlowWrapperRef = useRef<HTMLDivElement>(null);

	// Export configuration states
	const [exportFormat, setExportFormat] = useState<"png" | "svg">("png");
	const [exportScale, setExportScale] = useState<number>(2);
	const [exportExcludeBg, setExportExcludeBg] = useState(false);
	const [exportSelectedOnly, setExportSelectedOnly] = useState(false);

	const highlightEdges = useCallback(
		(nodeId: string | null) => {
			setEdges((prev) =>
				prev.map((e) => {
					if (!nodeId) {
						const { highlighted, subHighlighted, hasSubSelection, ...rest } =
							e.data ?? {};
						return {
							...e,
							data: Object.keys(rest).length > 0 ? rest : undefined,
						};
					}
					const match = e.source === nodeId || e.target === nodeId;
					return {
						...e,
						data: {
							...(e.data ?? {}),
							highlighted: match,
							subHighlighted: false,
							hasSubSelection: false,
						},
					};
				}),
			);
		},
		[setEdges],
	);

	const subHighlightEdge = useCallback(
		(selectedId: string, otherId: string) => {
			setEdges((prev) =>
				prev.map((e) => {
					const isConnected =
						(e.source === selectedId && e.target === otherId) ||
						(e.source === otherId && e.target === selectedId);
					return {
						...e,
						data: {
							...(e.data ?? {}),
							subHighlighted: isConnected,
							hasSubSelection: true,
						},
					};
				}),
			);
		},
		[setEdges],
	);

	const clearSubHighlight = useCallback(() => {
		setEdges((prev) =>
			prev.map((e) => {
				const { subHighlighted, hasSubSelection, ...rest } = e.data ?? {};
				return {
					...e,
					data: Object.keys(rest).length > 0 ? rest : undefined,
				};
			}),
		);
		setSubSelectedId(null);
	}, [setEdges]);

	const incomingRefs = useMemo(() => {
		if (!schema || !selectedTable) return [];
		return schema.tables.flatMap((t) =>
			t.foreignKeys
				.filter((fk) => {
					const refName = fk.referencedTable.includes(".")
						? fk.referencedTable.split(".")[1]
						: fk.referencedTable;
					return refName === selectedTable.name;
				})
				.map((fk) => ({
					fromTable: t.name,
					fromColumn: fk.column,
					toColumn: fk.referencedColumn,
				})),
		);
	}, [schema, selectedTable]);

	const handleRefClick = useCallback(
		(tableName: string) => {
			if (!schema || !selectedTable) return;
			const currentId = selectedTable.name;
			if (tableName === subSelectedId) {
				clearSubHighlight();
				return;
			}
			setSubSelectedId(tableName);
			subHighlightEdge(currentId, tableName);
			const bounds = getNodesBounds([currentId, tableName]);
			fitBounds(bounds, { padding: 0.5, duration: 400 });
		},
		[
			schema,
			selectedTable,
			subSelectedId,
			getNodesBounds,
			fitBounds,
			subHighlightEdge,
			clearSubHighlight,
		],
	);

	// Build the graph only when its inputs change, not on every re-render
	// (selection, active table, etc.).
	const builtGraph = useMemo(
		() =>
			schema && schema.tables.length > 0
				? buildGraph(schema, layoutDir, edgeStyle, erroredTables)
				: null,
		[schema, layoutDir, edgeStyle, erroredTables],
	);

	useEffect(() => {
		if (!builtGraph) {
			setNodes([]);
			setEdges([]);
			onRenderingChange(false);
			return;
		}

		// Ensure the overlay is shown for re-layout / direction toggles too
		// (where `schema` does not change and the Render button isn't involved).
		onRenderingChange(true);
		setNodes(builtGraph.nodes);
		setEdges(builtGraph.edges);
	}, [builtGraph, setNodes, setEdges, onRenderingChange]);

	// Hide the overlay once the rebuilt graph has been committed and painted.
	// Keyed on `builtGraph` (a new object on every rebuild, including TB<->LR
	// toggles) so it re-runs and clears reliably — unlike a transition-based
	// check on node initialization, which stays true for pre-measured nodes.
	useEffect(() => {
		if (!builtGraph) return;
		const t = setTimeout(() => onRenderingChange(false), 300);
		return () => clearTimeout(t);
	}, [builtGraph, onRenderingChange]);

	useEffect(() => {
		setNodes((nds) =>
			nds.map((n) => ({ ...n, selected: n.id === activeTableName })),
		);
		highlightEdges(activeTableName ?? null);
	}, [activeTableName, setNodes, highlightEdges]);

	useEffect(() => {
		setNodes((nds) =>
			nds.map((n) => ({
				...n,
				data: { ...(n.data ?? {}), subSelected: n.id === subSelectedId },
			})),
		);
	}, [subSelectedId, setNodes]);

	const handleRelayout = useCallback(() => {
		if (!schema) return;
		const { nodes: newNodes, edges: newEdges } = buildGraph(
			schema,
			layoutDir,
			edgeStyleRef.current,
			erroredTables,
		);
		setNodes(newNodes);
		setEdges(newEdges);
	}, [schema, layoutDir, erroredTables, setNodes, setEdges]);

	const focusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	useEffect(() => {
		if (schema?.tables.length) {
			if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
			focusTimerRef.current = setTimeout(
				() => fitView({ padding: 0.3, duration: 300 }),
				0,
			);
		}
		return () => {
			if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
		};
	}, [schema, fitView]);

	useEffect(() => {
		if (!focusTarget) return;
		const node = nodes.find((n) => n.id === focusTarget.id);
		if (node) {
			fitView({ nodes: [node], padding: 0.5, duration: 400 });
		}
	}, [focusTarget, nodes, fitView]);

	const onConnect = useCallback(() => {
		/* no-op */
	}, []);

	const onNodeClick = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			const tableNode = node as TableNodeType;
			if (tableNode.data?.table) {
				setSelectedTable(tableNode.data.table);
				setSubSelectedId(null);
				highlightEdges(node.id);
				onActiveTableChange?.(node.id);
			}
		},
		[highlightEdges, onActiveTableChange],
	);

	const onPaneClick = useCallback(() => {
		setSelectedTable(null);
		setSubSelectedId(null);
		highlightEdges(null);
		onActiveTableChange?.(null);
	}, [highlightEdges, onActiveTableChange]);

	const handleToggleDirection = useCallback(() => {
		setLayoutDir((prev) => (prev === "TB" ? "LR" : "TB"));
	}, []);

	const handleFitView = useCallback(() => {
		fitView({ padding: 0.3, duration: 300 });
	}, [fitView]);

	// Export trigger logic
	const handlePerformExport = useCallback(async () => {
		if (!reactFlowWrapperRef.current) return;

		const rfViewport = reactFlowWrapperRef.current.querySelector(
			".react-flow__viewport",
		) as HTMLElement;
		if (!rfViewport) {
			toast.error("React Flow viewport element not found.");
			return;
		}

		onExportingChange(true);
		// Yield to the event loop (with a small delay) so the browser actually
		// paints the disabled / "Exporting…" button before the potentially long,
		// main-thread-blocking export work runs. A single rAF isn't enough
		// because the synchronous export work would block the queued paint.
		await new Promise<void>((resolve) => setTimeout(resolve, 50));
		try {
			await exportGraph(
				rfViewport,
				{
					format: exportFormat,
					scale: exportScale,
					excludeBg: exportExcludeBg,
					selectedOnly: exportSelectedOnly,
					theme,
				},
				reactFlowInstance,
			);
			toast.success("Graph exported successfully!");
			onExportDialogOpenChange(false);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to export graph.",
			);
		} finally {
			onExportingChange(false);
		}
	}, [
		exportFormat,
		exportScale,
		exportExcludeBg,
		exportSelectedOnly,
		theme,
		reactFlowInstance,
		onExportDialogOpenChange,
		onExportingChange,
	]);

	return (
		<div ref={reactFlowWrapperRef} className="w-full h-full relative">
			{schema && schema.tables.length > 0 ? (
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onNodeClick={onNodeClick}
					onPaneClick={onPaneClick}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					defaultEdgeOptions={defaultEdgeOptions}
					fitView
					fitViewOptions={{ padding: 0.3 }}
					minZoom={0.1}
					maxZoom={2}
					panOnScroll
					selectionOnDrag
					panOnDrag={[1, 2]}
					deleteKeyCode="Delete"
					className="bg-transparent"
				>
					<Background
						variant={BackgroundVariant.Dots}
						gap={20}
						size={1}
						color="var(--border)"
					/>
					<Controls className="!bg-card !border-border !shadow-sm" />
					<MiniMap
						pannable
						zoomable
						nodeStrokeWidth={2}
						nodeColor="var(--primary)"
						maskColor="color-mix(in oklab, var(--foreground) 8%, transparent)"
						className="!bg-card !border !border-border !rounded-lg !shadow-sm"
					/>

					<Panel position="top-left">
						<div className="flex gap-1 p-1 rounded-lg shadow-lg border border-border bg-card/90 backdrop-blur-sm">
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={handleRelayout}
								title="Re-layout graph"
							>
								<RefreshCw className="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={handleFitView}
								title="Fit view"
							>
								<Maximize2 className="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={handleToggleDirection}
								title={`Switch to ${layoutDir === "TB" ? "horizontal" : "vertical"} layout`}
							>
								<Shuffle className="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={() => onExportDialogOpenChange(true)}
								title="Export schema as image"
							>
								<Download className="size-3.5" />
							</Button>
							<span className="flex items-center px-1.5 text-2xs font-mono font-semibold opacity-60 select-none text-muted-foreground">
								{layoutDir}
							</span>
						</div>
					</Panel>

					{selectedTable && (
						<Panel position="top-right">
							<TableInfoPanel
								table={selectedTable}
								incomingRefs={incomingRefs}
								onClose={() => {
									setSelectedTable(null);
									setSubSelectedId(null);
									highlightEdges(null);
									onActiveTableChange?.(null);
								}}
								onRefClick={handleRefClick}
							/>
						</Panel>
					)}
				</ReactFlow>
			) : (
				<WelcomeScreen
					projectList={projectList}
					onNewProject={onNewProject}
					onOpenProject={onOpenProject}
				/>
			)}

			{/* Rendering overlay: shown while the schema graph is being built/laid out.
			    Opaque so it fully replaces the underlying area (recent projects,
			    previous graph, etc.) rather than showing through. */}
			{isRendering && (
				<div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background">
					<Loader2 className="size-8 animate-spin text-primary" />
					<span className="text-sm font-medium text-muted-foreground">
						Rendering schema…
					</span>
				</div>
			)}

			{/* Export Image Configuration Dialog */}
			<Dialog open={exportDialogOpen} onOpenChange={onExportDialogOpenChange}>
				<DialogContent className="sm:max-w-md bg-card text-foreground border-border">
					<DialogHeader>
						<DialogTitle className="text-foreground">
							Export Schema Image
						</DialogTitle>
						<DialogDescription className="text-muted-foreground">
							Export your ER diagram to PNG or SVG with customized export
							parameters.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{/* Format Selector */}
						<div className="grid grid-cols-4 items-center gap-4">
							<span className="text-right text-xs font-semibold text-muted-foreground">
								Format
							</span>
							<div className="col-span-3 flex gap-2">
								<Button
									type="button"
									variant={exportFormat === "png" ? "default" : "outline"}
									size="sm"
									onClick={() => setExportFormat("png")}
									className="flex-1"
								>
									PNG
								</Button>
								<Button
									type="button"
									variant={exportFormat === "svg" ? "default" : "outline"}
									size="sm"
									onClick={() => setExportFormat("svg")}
									className="flex-1"
								>
									SVG
								</Button>
							</div>
						</div>

						{/* Scale Multiplier for PNG only */}
						{exportFormat === "png" && (
							<div className="grid grid-cols-4 items-center gap-4">
								<span className="text-right text-xs font-semibold text-muted-foreground">
									Resolution
								</span>
								<div className="col-span-3 flex gap-2">
									{[1, 2, 3].map((scale) => (
										<Button
											key={scale}
											type="button"
											variant={exportScale === scale ? "default" : "outline"}
											size="sm"
											onClick={() => setExportScale(scale)}
											className="flex-1"
										>
											{scale}x
										</Button>
									))}
								</div>
							</div>
						)}

						{/* Background Toggle */}
						<div className="grid grid-cols-4 items-center gap-4">
							<span className="text-right text-xs font-semibold text-muted-foreground">
								Background
							</span>
							<div className="col-span-3 flex items-center">
								<label className="flex items-center gap-2 cursor-pointer text-xs select-none text-foreground font-medium">
									<input
										type="checkbox"
										checked={exportExcludeBg}
										onChange={(e) => setExportExcludeBg(e.target.checked)}
										className="rounded border-border text-primary focus:ring-primary size-4 bg-background"
									/>
									Transparent Background
								</label>
							</div>
						</div>

						{/* Scope Selection */}
						<div className="grid grid-cols-4 items-center gap-4">
							<span className="text-right text-xs font-semibold text-muted-foreground">
								Scope
							</span>
							<div className="col-span-3 flex items-center">
								<label className="flex items-center gap-2 cursor-pointer text-xs select-none text-foreground font-medium">
									<input
										type="checkbox"
										checked={exportSelectedOnly}
										onChange={(e) => setExportSelectedOnly(e.target.checked)}
										className="rounded border-border text-primary focus:ring-primary size-4 bg-background"
									/>
									Selected Tables Only
								</label>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onExportDialogOpenChange(false)}
							disabled={isExporting}
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handlePerformExport}
							disabled={isExporting}
						>
							{isExporting && (
								<Loader2 className="size-3.5 mr-2 animate-spin" />
							)}
							{isExporting ? "Exporting..." : "Export"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
