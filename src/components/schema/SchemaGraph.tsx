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
import { useCallback, useEffect, useState } from "react";
import "@xyflow/react/dist/style.css";
import type { Edge, Node } from "@xyflow/react";
import { Maximize2, RefreshCw, Shuffle } from "lucide-react";
import { Button } from "#/components/ui/button.tsx";
import {
	buildGraph,
	type LayoutDirection,
	type TableNodeType,
} from "#/lib/graph-builder.ts";
import type { ParsedSchema, TableSchema } from "#/types/schema.ts";
import RelationshipEdge from "./RelationshipEdge.tsx";
import TableInfoPanel from "./TableInfoPanel.tsx";
import TableNode from "./TableNode.tsx";

const nodeTypes = { table: TableNode };
const edgeTypes = { relationship: RelationshipEdge };

const defaultEdgeOptions = {
	animated: false,
	style: { strokeWidth: 1.5 },
	type: "relationship",
};

interface SchemaGraphProps {
	schema: ParsedSchema | null;
}

export default function SchemaGraph({ schema }: SchemaGraphProps) {
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [layoutDir, setLayoutDir] = useState<LayoutDirection>("TB");
	const [selectedTable, setSelectedTable] = useState<TableSchema | null>(null);
	const { fitView } = useReactFlow();

	useEffect(() => {
		if (!schema || schema.tables.length === 0) {
			setNodes([]);
			setEdges([]);
			return;
		}

		const { nodes: newNodes, edges: newEdges } = buildGraph(schema, layoutDir);
		setNodes(newNodes);
		setEdges(newEdges);
	}, [schema, layoutDir, setNodes, setEdges]);

	const highlightEdges = useCallback(
		(nodeId: string | null) => {
			setEdges((prev) =>
				prev.map((e) => {
					if (!nodeId) {
						const { highlighted, ...rest } = e.data ?? {};
						return {
							...e,
							data: Object.keys(rest).length > 0 ? rest : undefined,
						};
					}
					const match = e.source === nodeId || e.target === nodeId;
					return {
						...e,
						data: { ...(e.data ?? {}), highlighted: match },
					};
				}),
			);
		},
		[setEdges],
	);

	const onConnect = useCallback(() => {
		/* no-op */
	}, []);

	const onNodeClick = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			const tableNode = node as TableNodeType;
			if (tableNode.data?.table) {
				setSelectedTable(tableNode.data.table);
				highlightEdges(node.id);
			}
		},
		[highlightEdges],
	);

	const onPaneClick = useCallback(() => {
		setSelectedTable(null);
		highlightEdges(null);
	}, [highlightEdges]);

	const handleRelayout = useCallback(() => {
		if (!schema) return;
		const { nodes: newNodes, edges: newEdges } = buildGraph(schema, layoutDir);
		setNodes(newNodes);
		setEdges(newEdges);
	}, [schema, layoutDir, setNodes, setEdges]);

	const handleToggleDirection = useCallback(() => {
		setLayoutDir((prev) => (prev === "TB" ? "LR" : "TB"));
	}, []);

	const handleFitView = useCallback(() => {
		fitView({ padding: 0.3, duration: 300 });
	}, [fitView]);

	if (!schema || schema.tables.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-sm text-muted-foreground">
				<div className="text-center space-y-2">
					<p className="font-medium">No schema loaded</p>
					<p className="text-xs opacity-60">
						Write DDL in the editor and click Render
					</p>
				</div>
			</div>
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
						onClose={() => setSelectedTable(null)}
					/>
				</Panel>
			)}
		</ReactFlow>
	);
}
