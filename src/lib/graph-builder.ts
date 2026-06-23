import { MarkerType, type Edge, type Node } from "@xyflow/react";
import dagre from "dagre";
import type {
	ForeignKey,
	ParsedSchema,
	RelationshipType,
	TableSchema,
} from "#/types/schema.ts";

export type LayoutDirection = "TB" | "LR";
export type EdgeStyle = "bezier" | "smoothstep";

const NODE_WIDTH = 300;
const NODE_ROW_HEIGHT = 34;
const NODE_HEADER_HEIGHT = 44;
const NODE_PADDING = 4;

export interface TableNodeData extends Record<string, unknown> {
	table: TableSchema;
	label: string;
	layoutDir: LayoutDirection;
	referencedColumns: string[];
	columnRelationships: Record<string, string>;
	hasError: boolean;
}

export interface RelationshipEdgeData extends Record<string, unknown> {
	type: RelationshipType;
	label: string;
	sourceColumn: string;
	targetColumn: string;
	sourceTable: string;
	targetTable: string;
	edgeStyle: EdgeStyle;
}

export type TableNodeType = Node<TableNodeData, "table">;
export type RelationshipEdgeType = Edge<RelationshipEdgeData, "relationship">;

function getTableHeight(table: TableSchema): number {
	return (
		NODE_HEADER_HEIGHT +
		table.columns.length * NODE_ROW_HEIGHT +
		NODE_PADDING * 2
	);
}

function detectRelationshipType(
	fk: ForeignKey,
	table: TableSchema,
	allTables: TableSchema[],
): RelationshipType {
	if (fk.isUnique) return "one-to-one";

	const refTable = allTables.find(
		(t) =>
			t.name === fk.referencedTable ||
			`${t.schema}.${t.name}` === fk.referencedTable,
	);
	if (!refTable) return "one-to-many";

	const isM2M = isJunctionTable(table);
	if (isM2M) return "many-to-many";

	return "one-to-many";
}

function isJunctionTable(table: TableSchema): boolean {
	const fkCols = table.foreignKeys.map((f) => f.column);
	if (fkCols.length < 2) return false;
	const pkCols = table.primaryKey;
	if (pkCols.length !== fkCols.length) return false;
	return fkCols.every((c) => pkCols.includes(c));
}

export function buildGraph(
	schema: ParsedSchema,
	direction: LayoutDirection = "TB",
	edgeStyle: EdgeStyle = "bezier",
	erroredTables?: Set<string>,
): {
	nodes: TableNodeType[];
	edges: RelationshipEdgeType[];
} {
	const tables = schema.tables;
	const nodes: TableNodeType[] = [];
	const edges: RelationshipEdgeType[] = [];

	function resolveRefCol(fk: ForeignKey): string {
		const refTable = tables.find(
			(t) =>
				t.name === fk.referencedTable ||
				`${t.schema}.${t.name}` === fk.referencedTable,
		);
		return fk.referencedColumn || (refTable?.primaryKey[0] ?? "");
	}

	const referencedColMap = new Map<string, Set<string>>();
	for (const table of tables) {
		for (const fk of table.foreignKeys) {
			const refTable = tables.find(
				(t) =>
					t.name === fk.referencedTable ||
					`${t.schema}.${t.name}` === fk.referencedTable,
			);
			if (!refTable) continue;
			if (!referencedColMap.has(refTable.name)) {
				referencedColMap.set(refTable.name, new Set());
			}
			referencedColMap.get(refTable.name)!.add(resolveRefCol(fk));
		}
	}

	for (const table of tables) {
		const height = getTableHeight(table);
		const referencedColumns = Array.from(
			referencedColMap.get(table.name) ?? [],
		).filter(Boolean);
		const columnRelationships: Record<string, string> = {};
		for (const fk of table.foreignKeys) {
			columnRelationships[fk.column] = detectRelationshipType(
				fk,
				table,
				tables,
			);
		}
		nodes.push({
			id: table.name,
			type: "table",
			position: { x: 0, y: 0 },
			data: {
				table,
				label: table.name,
				layoutDir: direction,
				referencedColumns,
				columnRelationships,
				hasError: erroredTables ? erroredTables.has(table.name) : false,
			},
			width: NODE_WIDTH,
			height,
		});
	}

	for (const table of tables) {
		for (const fk of table.foreignKeys) {
			const relType = detectRelationshipType(fk, table, tables);
			const refTableName = fk.referencedTable.includes(".")
				? fk.referencedTable.split(".")[1]
				: fk.referencedTable;

			const refTable = tables.find(
				(t) => t.name === refTableName || t.name === fk.referencedTable,
			);
			if (!refTable) continue;

			const resolvedCol = resolveRefCol(fk);
			if (!resolvedCol) continue;

			const edgeId = `${refTableName}-${table.name}-${fk.column}`;

			const label =
				relType === "one-to-one"
					? "1──1"
					: relType === "many-to-many"
						? "*──*"
						: "1──*";

			edges.push({
				id: edgeId,
				source: refTableName,
				target: table.name,
				sourceHandle: `col-${resolvedCol}-source-${table.name}`,
				targetHandle: `col-${fk.column}-target-${refTableName}`,
				type: "relationship",
				markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
				data: {
					type: relType,
					label,
					sourceColumn: resolvedCol,
					targetColumn: fk.column,
					sourceTable: refTableName,
					targetTable: table.name,
					edgeStyle,
				},
				style: {
					strokeWidth: relType === "many-to-many" ? 3 : 2,
				},
			});
		}
	}

	layoutNodes(nodes, edges, direction);

	return { nodes, edges };
}

function layoutNodes(
	nodes: Node[],
	edges: Edge[],
	direction: LayoutDirection = "TB",
): void {
	type LayoutEntry = { ids: Set<string>; centers: Map<string, { x: number; y: number }>; bb: { x: number; y: number; w: number; h: number } };

	// 1. Compute degree (connection count) for each node
	const degree = new Map<string, number>();
	for (const n of nodes) degree.set(n.id, 0);
	for (const e of edges) {
		degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
		degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
	}

	// 2. Find connected components (undirected graph)
	const adj = new Map<string, string[]>();
	for (const n of nodes) adj.set(n.id, []);
	for (const e of edges) {
		adj.get(e.source)!.push(e.target);
		adj.get(e.target)!.push(e.source);
	}
	const visited = new Set<string>();
	const rawComps: string[][] = [];
	for (const node of nodes) {
		if (visited.has(node.id)) continue;
		const ids = new Set<string>();
		const queue = [node.id];
		visited.add(node.id);
		while (queue.length) {
			const cur = queue.pop()!;
			ids.add(cur);
			for (const nb of adj.get(cur)!) {
				if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
			}
		}
		rawComps.push([...ids]);
	}

	// 3. Sort nodes within each component by degree (desc) for better ordering
	for (const comp of rawComps) {
		comp.sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0));
	}

	// 4. Lay out each component independently with dagre
	const layouts: LayoutEntry[] = [];
	for (const compIds of rawComps) {
		if (compIds.length === 0) continue;
		const compNodes = nodes.filter((n) => compIds.includes(n.id));
		const compEdges = edges.filter((e) => compIds.includes(e.source) && compIds.includes(e.target));

		const g = new dagre.graphlib.Graph();
		const cnt = compIds.length;
		const tight = cnt <= 4 ? 50 : cnt <= 10 ? 40 : 30;
		g.setDefaultEdgeLabel(() => ({}));
		g.setGraph({
			rankdir: direction,
			nodesep: tight,
			ranksep: tight * 1.4,
			marginx: 16,
			marginy: 16,
		});
		for (const n of compNodes) {
			g.setNode(n.id, { width: n.width ?? NODE_WIDTH, height: n.height ?? 200 });
		}
		for (const e of compEdges) {
			g.setEdge(e.source, e.target, { weight: 2 });
		}
		dagre.layout(g);

		const centers = new Map<string, { x: number; y: number }>();
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const n of compNodes) {
			const p = g.node(n.id);
			if (!p) continue;
			centers.set(n.id, { x: p.x, y: p.y });
			const halfW = (n.width ?? NODE_WIDTH) / 2;
			const halfH = (n.height ?? 200) / 2;
			if (p.x - halfW < minX) minX = p.x - halfW;
			if (p.y - halfH < minY) minY = p.y - halfH;
			if (p.x + halfW > maxX) maxX = p.x + halfW;
			if (p.y + halfH > maxY) maxY = p.y + halfH;
		}
		layouts.push({
			ids: new Set(compIds),
			centers,
			bb: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
		});
	}

	// 5. Pack components into grid rows
	const isTB = direction === "TB";
	const gap = 80;
	const PAD = 40;
	// Sort components by size (largest first) so big ones go first
	layouts.sort((a, b) => (isTB ? b.bb.w - a.bb.w : b.bb.h - a.bb.h));

	const placed: { offset: number; size: number }[] = [];
	const ROW_MAX = isTB ? 1400 : 800; // max row width (TB) or height (LR)

	for (const lay of layouts) {
		const dim = isTB ? lay.bb.w : lay.bb.h;
		// Find a row that fits
		let rowIdx = placed.length;
		for (let i = 0; i <= placed.length; i++) {
			if (i === placed.length) { placed.push({ offset: PAD, size: 0 }); rowIdx = i; break; }
			const row = placed[i];
			if (row.offset + dim + gap <= ROW_MAX) {
				rowIdx = i;
				break;
			}
		}
		const row = placed[rowIdx];
		const dx = isTB ? row.offset : PAD;
		const dy = isTB ? PAD + rowIdx * (gap + 300) : row.offset; // approx row height 300
		// Centers within the component are relative to bb.x/bb.y; shift
		for (const [id, c] of lay.centers) {
			const n = nodes.find((nd) => nd.id === id);
			if (!n) continue;
			const nx = (c.x - lay.bb.x) + dx;
			const ny = (c.y - lay.bb.y) + dy;
			n.position = {
				x: nx - (n.width ?? NODE_WIDTH) / 2,
				y: ny - (n.height ?? 200) / 2,
			};
		}
		row.offset += dim + gap;
		row.size = Math.max(row.size, isTB ? lay.bb.h : lay.bb.w);
	}
}
