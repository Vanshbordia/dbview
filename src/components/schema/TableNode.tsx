import { Handle, type NodeProps, Position, useNodes, useEdges, useUpdateNodeInternals } from "@xyflow/react";
import { Braces, Gem, Key, Link2 } from "lucide-react";
import { memo, useLayoutEffect, useMemo } from "react";
import type { TableNodeType } from "#/lib/graph-builder.ts";
import { getTypeColor, simplifyType } from "#/lib/type-colors.ts";

function SourceSVG({ side }: { side: Position }) {
	return (
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: side === Position.Left ? "scaleX(-1)" : undefined }}>
			<line x1="1" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="9" y1="2" x2="9" y2="10" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	);
}

function TargetSVG({ type, side }: { type: string | undefined; side: Position }) {
	const flip = side === Position.Right;
	const s = { transform: flip ? "scaleX(-1)" : undefined } as const;
	if (type === "one-to-one") {
		return (
			<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={s}>
				<line x1="3" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" />
				<line x1="3" y1="2" x2="3" y2="10" stroke="currentColor" strokeWidth="1.5" />
			</svg>
		);
	}
	if (type === "many-to-many") {
		return (
			<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={s}>
				<line x1="3" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.5" />
				<line x1="3" y1="2" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5" />
				<line x1="3" y1="10" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5" />
				<line x1="9" y1="2" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5" />
				<line x1="9" y1="10" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5" />
			</svg>
		);
	}
	return (
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={s}>
			<line x1="3" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="3" y1="2" x2="7" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="3" y1="10" x2="7" y2="6" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	);
}



function computeSide(
	myCx: number,
	otherNode: { position: { x: number }; width?: number } | undefined,
	defaultSide = Position.Right,
): Position {
	if (!otherNode) return defaultSide;
	const ox = otherNode.position.x + (otherNode.width ?? 300) / 2;
	return ox > myCx ? Position.Right : Position.Left;
}

function TableNode({ id, data, selected }: NodeProps<TableNodeType>) {
	const { table, columnRelationships, hasError, subSelected } = data;
	const allNodes = useNodes();
	const allEdges = useEdges();

	const curNode = allNodes.find((n) => n.id === id);
	const cx = curNode ? curNode.position.x + (curNode.width ?? 300) / 2 : 0;

	const updateNodeInternals = useUpdateNodeInternals();

	// Produce a stable key that changes whenever any connected node moves horizontally
	const handleLayoutKey = useMemo(() => {
		const myKey = Math.round(cx);
		return allEdges
			.filter((e) => e.source === id || e.target === id)
			.map((e) => {
				const otherId = e.source === id ? e.target : e.source;
				const other = allNodes.find((n) => n.id === otherId);
				if (!other) return `${e.id}:?`;
				const ox = Math.round(other.position.x + (other.width ?? 300) / 2);
				return `${e.id}:${ox}`;
			})
			.join("|") + `|@${myKey}`;
	}, [id, allNodes, allEdges, cx]);

	useLayoutEffect(() => {
		updateNodeInternals(id);
	}, [handleLayoutKey, id, updateNodeInternals]);

	// Pre-compute edge lookups per column (hooks must be at top level)
	const sourceEdgesByColumn = useMemo(() => {
		const map: Record<string, typeof allEdges> = {};
		for (const col of table.columns) {
			map[col.name] = allEdges.filter(
				(e) =>
					e.source === id &&
					e.sourceHandle?.startsWith(`col-${col.name}-source-`),
			);
		}
		return map;
	}, [allEdges, id, table.columns]);

	const targetEdgesByColumn = useMemo(() => {
		const map: Record<string, typeof allEdges> = {};
		for (const col of table.columns) {
			map[col.name] = allEdges.filter(
				(e) =>
					e.target === id &&
					e.targetHandle?.startsWith(`col-${col.name}-target-`),
			);
		}
		return map;
	}, [allEdges, id, table.columns]);

	return (
		<div
			className={`rounded-xl border-2 shadow-lg backdrop-blur-sm transition-all duration-150 ${
				selected
					? "border-zinc-400 dark:border-zinc-500 shadow-zinc-400/30 dark:shadow-zinc-500/30"
					: subSelected
						? "shadow-amber-400/20 dark:shadow-amber-500/20"
						: hasError
							? "border-red-400 dark:border-red-500 shadow-red-400/20 dark:shadow-red-500/20"
							: "border-zinc-200 dark:border-zinc-700/60 shadow-zinc-900/10"
			}`}
			style={{
				background: "var(--card)",
				backdropFilter: "blur(6px)",
				width: 300,
				overflow: "visible",
				...(subSelected && !selected ? { borderColor: "var(--edge-ref)" } : {}),
			}}
		>
			<div
				className="flex items-center gap-2 px-4 py-3 text-sm font-semibold tracking-tight border-b cursor-pointer rounded-t-xl"
				style={{
					background: "var(--card)",
					borderColor: "var(--border)",
					color: "var(--foreground)",
				}}
			>
				<Braces className="size-4 opacity-60 shrink-0" />
				<span className="truncate">{table.name}</span>
				{table.primaryKey.length > 0 && (
					<span className="ml-auto text-2xs opacity-40 font-mono text-muted-foreground">
						PK: {table.primaryKey.join(", ")}
					</span>
				)}
			</div>

			<div className="divide-y divide-border">
				{table.columns.map((col) => {
					const sourceEdges = sourceEdgesByColumn[col.name] ?? [];
					const targetEdges = targetEdgesByColumn[col.name] ?? [];

					return (
						<div
							key={col.name}
							className="flex items-center gap-2 px-4 py-2 text-xs"
							style={{
								position: "relative",
								background: col.isPrimaryKey
									? "color-mix(in oklab, var(--primary) 6%, transparent)"
									: undefined,
							}}
						>
							<div className="flex items-center gap-1 w-5 shrink-0">
								{col.isPrimaryKey && (
									<Key className="size-3" style={{ color: "var(--primary)" }} />
								)}
								{col.isForeignKey && !col.isPrimaryKey && (
									<Link2
										className="size-3"
										style={{ color: "var(--muted-foreground)" }}
									/>
								)}
								{!col.isPrimaryKey && !col.isForeignKey && col.isUnique && (
									<Gem className="size-3 opacity-50" />
								)}
							</div>

							<span
								className="flex-1 truncate font-mono"
								style={{
									color: col.isPrimaryKey
										? "var(--foreground)"
										: "var(--muted-foreground)",
								}}
							>
								{col.name}
							</span>

							<span
								className={`rounded px-1.5 py-0.5 text-2xs font-medium leading-none ${getTypeColor(col.type)}`}
							>
								{simplifyType(col.type)}
							</span>

							{col.notNull && (
								<span className="text-2xs font-bold shrink-0 text-muted-foreground/60">
									NN
								</span>
							)}
							{col.defaultValue && (
								<span className="text-2xs font-mono truncate max-w-20 shrink-0 text-muted-foreground/60">
									={col.defaultValue}
								</span>
							)}

							{/* Per-edge source handles */}
							{sourceEdges.map((edge) => {
								const targetNode = allNodes.find((n) => n.id === edge.target);
								const side = computeSide(cx, targetNode, Position.Right);
								return (
									<Handle
										key={edge.sourceHandle}
										type="source"
										position={side}
										id={edge.sourceHandle!}
										className="!flex !items-center !justify-center !rounded-none !border-none !bg-transparent !p-0"
										style={{ color: "var(--primary)" }}
									>
										<SourceSVG side={side} />
									</Handle>
								);
							})}

							{/* Per-edge target handles */}
							{targetEdges.map((edge) => {
								const sourceNode = allNodes.find((n) => n.id === edge.source);
								const side = computeSide(cx, sourceNode, Position.Left);
								const relType = edge.data?.type as string | undefined;
								return (
									<Handle
										key={edge.targetHandle}
										type="target"
										position={side}
										id={edge.targetHandle!}
										className="!flex !items-center !justify-center !rounded-none !border-none !bg-transparent !p-0"
										style={{ color: "var(--muted-foreground)" }}
									>
										<TargetSVG
											type={relType ?? columnRelationships[col.name]}
											side={side}
										/>
									</Handle>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default memo(TableNode);
