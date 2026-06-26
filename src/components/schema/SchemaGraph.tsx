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
import { Maximize2, RefreshCw, Shuffle } from "lucide-react";
import { Button } from "#/components/ui/button.tsx";
import {
	buildGraph,
	type EdgeStyle,
	type LayoutDirection,
	type TableNodeType,
} from "#/lib/graph-builder.ts";
import type { ParsedSchema, TableSchema } from "#/types/schema.ts";
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
}: SchemaGraphProps) {
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [layoutDir, setLayoutDir] = useState<LayoutDirection>("TB");
	const [selectedTable, setSelectedTable] = useState<TableSchema | null>(null);
	const [subSelectedId, setSubSelectedId] = useState<string | null>(null);
	const { fitView, fitBounds, getNodesBounds } = useReactFlow();
	const edgeStyleRef = useRef(edgeStyle);
	edgeStyleRef.current = edgeStyle;

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

	useEffect(() => {
		if (!schema || schema.tables.length === 0) {
			setNodes([]);
			setEdges([]);
			return;
		}

		const { nodes: newNodes, edges: newEdges } = buildGraph(
			schema,
			layoutDir,
			edgeStyle,
			erroredTables,
		);
		setNodes(newNodes);
		setEdges(newEdges);
	}, [schema, layoutDir, edgeStyle, erroredTables, setNodes, setEdges]);

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

	const focusTimerRef = useRef<ReturnType<typeof setTimeout>>();
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

	if (!schema || schema.tables.length === 0) {
		return (
			<WelcomeScreen
				projectList={projectList}
				onNewProject={onNewProject}
				onOpenProject={onOpenProject}
			/>
		);
	}

	return (
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
	);
}
