import { toPng, toSvg } from "html-to-image";
import { getNodesBounds, getViewportForBounds } from "@xyflow/react";
import type { Node } from "@xyflow/react";

export interface ExportOptions {
	format: "png" | "svg";
	scale: number;
	excludeBg: boolean;
	selectedOnly: boolean;
	theme: "light" | "dark" | "system";
}

export async function exportGraph(
	reactFlowEl: HTMLElement,
	options: ExportOptions,
	reactFlowInstance: {
		getNodes: () => Node[];
		getViewport: () => { x: number; y: number; zoom: number };
		setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
	},
) {
	const { format, scale, excludeBg, selectedOnly, theme } = options;
	const { getNodes, getViewport, setViewport } = reactFlowInstance;

	// Save original viewport
	const originalViewport = getViewport();

	// Determine nodes to export
	let targetNodes = getNodes();
	if (selectedOnly) {
		targetNodes = targetNodes.filter((n) => n.selected);
		if (targetNodes.length === 0) {
			throw new Error("No tables are currently selected to export.");
		}
	}

	if (targetNodes.length === 0) {
		throw new Error("No tables found to export.");
	}

	// Calculate bounds
	const bounds = getNodesBounds(targetNodes);
	
	// Add some padding to bounds
	const padding = 50;
	const boundsWidth = bounds.width + padding * 2;
	const boundsHeight = bounds.height + padding * 2;

	// Calculate target dimensions
	const targetWidth = boundsWidth * scale;
	const targetHeight = boundsHeight * scale;

	// Calculate the viewport to fit the bounds
	const transform = getViewportForBounds(
		bounds,
		targetWidth,
		targetHeight,
		0.1, // minZoom
		10,  // maxZoom
		0.05 // padding percentage
	);

	// Set viewport temporarily
	setViewport(transform);

	// Wait for React Flow to render
	await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
	await new Promise<void>((resolve) => setTimeout(resolve, 300)); // slightly longer wait for rendering stability

	try {
		// Determine background color
		let backgroundColor: string | undefined = undefined;
		if (!excludeBg) {
			const isDark =
				theme === "dark" ||
				(theme === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			backgroundColor = isDark ? "#202020" : "#ffffff";
		}

		const exportFn = format === "png" ? toPng : toSvg;

		const dataUrl = await exportFn(reactFlowEl, {
			width: targetWidth,
			height: targetHeight,
			style: {
				width: `${targetWidth}px`,
				height: `${targetHeight}px`,
				transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
				transformOrigin: "top left",
			},
			backgroundColor,
		});

		// Trigger download
		const link = document.createElement("a");
		link.download = `schema-export-${Date.now()}.${format}`;
		link.href = dataUrl;
		link.click();
	} finally {
		// Restore viewport
		setViewport(originalViewport);
	}
}
