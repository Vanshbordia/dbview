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
	const g = new dagre.graphlib.Graph();
	g.setDefaultEdgeLabel(() => ({}));
	g.setGraph({
		rankdir: direction,
		nodesep: 60,
		ranksep: 120,
		marginx: 60,
		marginy: 60,
	});

	for (const node of nodes) {
		g.setNode(node.id, {
			width: node.width ?? NODE_WIDTH,
			height: node.height ?? 200,
		});
	}

	for (const edge of edges) {
		g.setEdge(edge.source, edge.target);
	}

	dagre.layout(g);

	for (const node of nodes) {
		const pos = g.node(node.id);
		if (pos) {
			node.position = {
				x: pos.x - (node.width ?? NODE_WIDTH) / 2,
				y: pos.y - (node.height ?? 200) / 2,
			};
		}
	}
}
