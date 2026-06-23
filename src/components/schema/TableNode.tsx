import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Braces, Key, Link2, Unlink } from "lucide-react";
import { memo } from "react";
import type { TableNodeType } from "#/lib/graph-builder.ts";

const TYPE_COLORS: Record<string, string> = {
	SERIAL:
		"bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
	INTEGER: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	BIGINT: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	SMALLINT: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	UUID: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
	BOOLEAN: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
	VARCHAR:
		"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	TEXT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	CHAR: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	TIMESTAMP:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
	DATE: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
	TIME: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
	NUMERIC:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	DECIMAL:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	FLOAT:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	DOUBLE:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	REAL: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	JSON: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
	JSONB: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
	BYTEA: "bg-stone-100 text-stone-800 dark:bg-stone-900/40 dark:text-stone-300",
	OID: "bg-stone-100 text-stone-800 dark:bg-stone-900/40 dark:text-stone-300",
};

function getTypeColor(type: string): string {
	const base = type
		.replace(/\(.*\)/, "")
		.trim()
		.toUpperCase();
	return (
		TYPE_COLORS[base] ??
		"bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
	);
}

const HANDLE_SVG = {
	source: (
		<svg width="10" height="12" viewBox="0 0 10 12" fill="none">
			<line x1="0" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	),
	"one-to-one": (
		<svg width="10" height="12" viewBox="0 0 10 12" fill="none">
			<line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="2" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	),
	"one-to-many": (
		<svg width="10" height="12" viewBox="0 0 10 12" fill="none">
			<line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="2" y1="2" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="2" y1="10" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	),
	"many-to-many": (
		<svg width="10" height="12" viewBox="0 0 10 12" fill="none">
			<line x1="2" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="2" y1="2" x2="5" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="2" y1="10" x2="5" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="8" y1="2" x2="5" y2="6" stroke="currentColor" strokeWidth="1.5" />
			<line x1="8" y1="10" x2="5" y2="6" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	),
};

function TableNode({ data, selected }: NodeProps<TableNodeType>) {
	const { table, referencedColumns, columnRelationships } = data;

	return (
		<div
			className={`rounded-xl border-2 shadow-lg backdrop-blur-sm transition-all duration-150 ${
				selected
					? "border-zinc-400 dark:border-zinc-500 shadow-zinc-400/30 dark:shadow-zinc-500/30"
					: "border-zinc-200 dark:border-zinc-700/60 shadow-zinc-900/10"
			}`}
			style={{
				background: "var(--card)",
				backdropFilter: "blur(6px)",
				width: 300,
			}}
		>
			<div
				className="flex items-center gap-2 px-4 py-3 text-sm font-semibold tracking-tight border-b cursor-pointer"
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
				{table.columns.map((col) => (
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
								<Unlink className="size-3 opacity-50" />
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
							{col.type}
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

						{referencedColumns.includes(col.name) && (
							<Handle
								type="source"
								position={Position.Right}
								id={`col-${col.name}-source`}
								className="!flex !items-center !justify-center !rounded-none !border-none !bg-transparent !p-0 !size-auto !min-w-0 !min-h-0"
								style={{
									right: -2,
									color: "var(--primary)",
								}}
							>
								{HANDLE_SVG.source}
							</Handle>
						)}

						{col.isForeignKey && (
							<Handle
								type="target"
								position={Position.Left}
								id={`col-${col.name}-target`}
								className="!flex !items-center !justify-center !rounded-none !border-none !bg-transparent !p-0 !size-auto !min-w-0 !min-h-0"
								style={{
									left: -2,
									color: "var(--muted-foreground)",
								}}
							>
								{HANDLE_SVG[columnRelationships[col.name] as keyof typeof HANDLE_SVG] ?? HANDLE_SVG["one-to-many"]}
							</Handle>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

export default memo(TableNode);
