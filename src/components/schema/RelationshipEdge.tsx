import { BaseEdge, type EdgeProps, getBezierPath, getSmoothStepPath } from "@xyflow/react";
import type { RelationshipEdgeType } from "#/lib/graph-builder.ts";

const REL_COLORS: Record<string, string> = {
	"one-to-one": "var(--muted-foreground)",
	"one-to-many": "var(--muted-foreground)",
	"many-to-many": "var(--foreground)",
};

function RelationshipEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
	markerEnd,
}: EdgeProps<RelationshipEdgeType>) {
	const useSmoothStep = data?.edgeStyle === "smoothstep";
	const pathFn = useSmoothStep ? getSmoothStepPath : getBezierPath;
	const [edgePath, labelX, labelY] = pathFn({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	const highlighted = data?.highlighted === true;
	const subHighlighted = data?.subHighlighted === true;
	const hasSubSelection = data?.hasSubSelection === true;
	const hasSelection = data?.highlighted !== undefined;

	const defaultColor = data?.type ? REL_COLORS[data.type] : "var(--border)";
	const color = subHighlighted ? "var(--edge-ref)" : highlighted ? "var(--primary)" : defaultColor;
	const opacity = subHighlighted ? 1 : highlighted ? (hasSubSelection ? 0.35 : 0.8) : hasSelection ? 0.12 : 0.7;

	const isM2M = data?.type === "many-to-many";

	const columnLabel = data?.sourceColumn && data?.targetColumn
		? `${data.sourceTable}.${data.sourceColumn} → ${data.targetTable}.${data.targetColumn}`
		: null;

	return (
		<>
			<BaseEdge
				id={id}
				path={edgePath}
				className={subHighlighted ? "edge-sub-highlighted" : highlighted ? "edge-highlighted" : undefined}
				style={{
					stroke: color,
					strokeWidth: subHighlighted ? 3 : highlighted ? 2.5 : isM2M ? 3 : 1.5,
					strokeDasharray: subHighlighted
						? "5 3"
						: highlighted
							? "5 3"
							: data?.type === "one-to-one"
								? "6 3"
								: undefined,
					opacity,
				}}
				markerEnd={subHighlighted || highlighted ? undefined : markerEnd}
			/>
			{columnLabel && (
				<div
					className="absolute px-1.5 py-0.5 text-2xs font-bold rounded pointer-events-none whitespace-nowrap"
					style={{
						color: subHighlighted ? "var(--edge-ref-foreground)" : highlighted ? "var(--primary-foreground)" : "#fff",
						background: color,
						transform: "translate(-50%, -50%)",
						left: labelX,
						top: labelY,
						opacity: subHighlighted || highlighted ? 1 : 0.8,
						fontSize: 9,
						lineHeight: 1,
					}}
				>
					{columnLabel}
				</div>
			)}
		</>
	);
}

export default RelationshipEdge;
