import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { SchemaIssue } from "#/types/schema.ts";

interface IssuesPanelProps {
	issues: SchemaIssue[];
	onJumpToIssue?: (issue: SchemaIssue) => void;
}

const severityOrder = { error: 0, warning: 1 };

export default function IssuesPanel({ issues, onJumpToIssue }: IssuesPanelProps) {
	const [open, setOpen] = useState(true);

	if (issues.length === 0) return null;

	const sorted = [...issues].sort(
		(a, b) => severityOrder[a.type] - severityOrder[b.type],
	);

	return (
		<div className="border-t border-border bg-muted/20 shrink-0 flex flex-col max-h-[200px] min-h-0">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/30 shrink-0"
			>
				{open ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
				Issues
				<span className="ml-auto text-xs font-normal normal-case">
					{sorted.filter((i) => i.type === "error").length > 0 && (
						<span className="text-destructive font-medium">{sorted.filter((i) => i.type === "error").length} error{sorted.filter((i) => i.type === "error").length !== 1 ? "s" : ""}</span>
					)}
					{sorted.filter((i) => i.type === "error").length > 0 && sorted.filter((i) => i.type === "warning").length > 0 && <span className="mx-1">·</span>}
					{sorted.filter((i) => i.type === "warning").length > 0 && (
						<span className="text-chart-4 font-medium">{sorted.filter((i) => i.type === "warning").length} warning{sorted.filter((i) => i.type === "warning").length !== 1 ? "s" : ""}</span>
					)}
				</span>
			</button>

			{open && (
				<div className="flex-1 min-h-0 overflow-y-auto">
					{sorted.map((issue, i) => {
						const source = issue.table
							? issue.column
								? `${issue.table}.${issue.column}`
								: issue.table
							: null;
						return (
							<button
								key={i}
								type="button"
								disabled={!onJumpToIssue}
								onClick={() => onJumpToIssue?.(issue)}
								className="flex items-start gap-2 w-full text-left px-3 py-1.5 text-xs hover:bg-muted/30 disabled:hover:bg-transparent disabled:cursor-default border-b border-border/40 last:border-b-0"
							>
								{issue.type === "error" ? (
									<AlertCircle className="size-3.5 mt-0.5 shrink-0 text-destructive" />
								) : (
									<AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-chart-4" />
								)}
								<div className="min-w-0">
									<p className="text-foreground/90 leading-snug">{issue.message}</p>
									{source && (
										<p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
											{source}
										</p>
									)}
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
