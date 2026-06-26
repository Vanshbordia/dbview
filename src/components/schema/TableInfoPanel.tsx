import { Gem, Key, Link2, X } from "lucide-react";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import type { TableSchema } from "#/types/schema.ts";

interface IncomingRef {
	fromTable: string;
	fromColumn: string;
	toColumn: string;
}

interface TableInfoPanelProps {
	table: TableSchema;
	incomingRefs?: IncomingRef[];
	onClose: () => void;
	onRefClick?: (tableName: string) => void;
}

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

export default function TableInfoPanel({
	table,
	incomingRefs = [],
	onClose,
	onRefClick,
}: TableInfoPanelProps) {
	const referencing = table.foreignKeys;
	const colCount = table.columns.length;
	const pkCount = table.primaryKey.length;
	const fkCount = referencing.length;

	return (
		<div className="rounded-xl border shadow-xl w-80 overflow-hidden bg-card border-border">
			<div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
				<div className="min-w-0">
					<h3 className="text-sm font-semibold truncate text-foreground">
						{table.name}
					</h3>
					<p className="text-2xs font-mono truncate text-muted-foreground/60">
						{table.schema || "public"}
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={onClose}
					className="shrink-0"
				>
					<X className="size-3.5" />
				</Button>
			</div>

			<div className="overflow-y-auto max-h-1/2">
				<div className="px-4 py-3">
					<div className="flex gap-3 mb-3">
						<div className="flex-1 text-center py-1.5 rounded-lg text-2xs font-semibold uppercase tracking-wider bg-primary/10 text-primary">
							{colCount} col{colCount !== 1 ? "s" : ""}
						</div>
						<div className="flex-1 text-center py-1.5 rounded-lg text-2xs font-semibold uppercase tracking-wider bg-primary/10 text-primary">
							{pkCount} PK
						</div>
						<div className="flex-1 text-center py-1.5 rounded-lg text-2xs font-semibold uppercase tracking-wider bg-muted text-muted-foreground">
							{fkCount} FK
						</div>
					</div>

					<Separator className="my-2" />

					<h4 className="text-2xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">
						Columns
					</h4>
					<div className="space-y-1">
						{table.columns.map((col) => (
							<div
								key={col.name}
								className="flex items-center gap-2 py-1 px-2 rounded-md text-xs"
								style={{
									background: col.isPrimaryKey
										? "color-mix(in oklab, var(--primary) 6%, transparent)"
										: undefined,
								}}
							>
								<div className="flex items-center gap-1 w-4 shrink-0">
									{col.isPrimaryKey && (
										<Key
											className="size-2.5"
											style={{ color: "var(--primary)" }}
										/>
									)}
									{col.isForeignKey && !col.isPrimaryKey && (
										<Link2
											className="size-2.5"
											style={{ color: "var(--muted-foreground)" }}
										/>
									)}
									{!col.isPrimaryKey && !col.isForeignKey && col.isUnique && (
										<Gem className="size-2.5 opacity-50" />
									)}
								</div>
								<span className="flex-1 font-mono truncate text-foreground">
									{col.name}
								</span>
								<span
									className={`rounded px-1 py-0.5 text-2xs font-medium leading-none ${getTypeColor(col.type)}`}
								>
									{col.type}
								</span>
								{col.notNull && (
									<Badge
										variant="outline"
										className="text-3xs h-3.5 px-1 leading-none"
									>
										NN
									</Badge>
								)}
							</div>
						))}
					</div>

					{referencing.length > 0 && (
						<>
							<Separator className="my-2" />
							<h4 className="text-2xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">
								References
							</h4>
							<div className="space-y-1">
								{referencing.map((fk) => (
									<button
										key={fk.column}
										type="button"
										onClick={() => onRefClick?.(fk.referencedTable.includes(".") ? fk.referencedTable.split(".")[1] : fk.referencedTable)}
										className="flex items-center gap-2 py-1 px-2 rounded-md text-xs bg-muted/30 hover:bg-accent/20 transition-colors w-full text-left cursor-pointer group"
									>
										<Link2 className="size-2.5 shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
										<span className="font-mono">{fk.column}</span>
										<span className="opacity-50 text-2xs text-muted-foreground/60 group-hover:text-accent-foreground/70">
											→ {fk.referencedTable}.{fk.referencedColumn}
										</span>
									</button>
								))}
							</div>
						</>
					)}

					{incomingRefs.length > 0 && (
						<>
							<Separator className="my-2" />
							<h4 className="text-2xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">
								Referenced By
							</h4>
							<div className="space-y-1">
								{incomingRefs.map((ref) => (
									<button
										key={`${ref.fromTable}.${ref.fromColumn}`}
										type="button"
										onClick={() => onRefClick?.(ref.fromTable)}
										className="flex items-center gap-2 py-1 px-2 rounded-md text-xs bg-muted/30 hover:bg-accent/20 transition-colors w-full text-left cursor-pointer group"
									>
										<Link2 className="size-2.5 shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
										<span className="font-mono">{ref.fromTable}.{ref.fromColumn}</span>
										<span className="opacity-50 text-2xs text-muted-foreground/60 group-hover:text-accent-foreground/70">
											→ {ref.toColumn}
										</span>
									</button>
								))}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
