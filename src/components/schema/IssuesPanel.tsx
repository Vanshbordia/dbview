import {
	AlertCircle,
	AlertTriangle,
	ChevronDown,
	ChevronUp,
	Copy,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { SchemaIssue } from "#/types/schema.ts";

interface IssuesPanelProps {
	issues: SchemaIssue[];
	onJumpToIssue?: (issue: SchemaIssue) => void;
}

const severityOrder = { error: 0, warning: 1 };

export default function IssuesPanel({
	issues,
	onJumpToIssue,
}: IssuesPanelProps) {
	const [open, setOpen] = useState(true);
	const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

	const handleCopy = useCallback(async (issue: SchemaIssue, idx: number) => {
		const source = issue.table
			? issue.column
				? `${issue.table}.${issue.column}`
				: issue.table
			: null;
		const text = source ? `[${source}] ${issue.message}` : issue.message;
		try {
			await navigator.clipboard.writeText(text);
			setCopiedIdx(idx);
			setTimeout(() => setCopiedIdx(null), 1500);
		} catch {
			/* ignore */
		}
	}, []);

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
				{open ? (
					<ChevronDown className="size-3" />
				) : (
					<ChevronUp className="size-3" />
				)}
				Issues
				<span className="ml-auto text-xs font-normal normal-case">
					{sorted.filter((i) => i.type === "error").length > 0 && (
						<span className="text-destructive font-medium">
							{sorted.filter((i) => i.type === "error").length} error
							{sorted.filter((i) => i.type === "error").length !== 1 ? "s" : ""}
						</span>
					)}
					{sorted.filter((i) => i.type === "error").length > 0 &&
						sorted.filter((i) => i.type === "warning").length > 0 && (
							<span className="mx-1">·</span>
						)}
					{sorted.filter((i) => i.type === "warning").length > 0 && (
						<span className="text-chart-4 font-medium">
							{sorted.filter((i) => i.type === "warning").length} warning
							{sorted.filter((i) => i.type === "warning").length !== 1
								? "s"
								: ""}
						</span>
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
							<div
								key={`${issue.table ?? ""}-${issue.column ?? ""}-${issue.message}`}
								className="group flex items-start gap-2 w-full text-left px-3 py-1.5 text-xs border-b border-border/40 last:border-b-0"
							>
								<button
									type="button"
									disabled={!onJumpToIssue}
									onClick={() => onJumpToIssue?.(issue)}
									className="flex items-start gap-2 flex-1 min-w-0 disabled:cursor-default"
								>
									{issue.type === "error" ? (
										<AlertCircle className="size-3.5 mt-0.5 shrink-0 text-destructive" />
									) : (
										<AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-chart-4" />
									)}
									<div className="min-w-0">
										<p className="text-foreground/90 leading-snug">
											{issue.message}
										</p>
										{source && (
											<p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
												{source}
											</p>
										)}
									</div>
								</button>
								<button
									type="button"
									onClick={() => handleCopy(issue, i)}
									className="shrink-0 mt-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50"
									title="Copy issue"
								>
									{copiedIdx === i ? (
										<span className="text-[10px] text-muted-foreground px-1">
											Copied
										</span>
									) : (
										<Copy className="size-3 text-muted-foreground" />
									)}
								</button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
