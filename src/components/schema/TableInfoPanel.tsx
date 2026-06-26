import { Gem, Key, Link2, X } from "lucide-react";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { getTypeColor } from "#/lib/type-colors.ts";
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
									className={`max-w-[180px] truncate shrink-0 rounded px-1 py-0.5 text-2xs font-medium leading-none ${getTypeColor(col.type)}`}
									title={col.type}
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
								{col.defaultValue && (
									<Badge
										variant="secondary"
										className="max-w-[100px] truncate shrink-0 text-3xs h-3.5 px-1 leading-none font-mono"
										title={`default ${col.defaultValue}`}
									>
										{col.defaultValue}
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
