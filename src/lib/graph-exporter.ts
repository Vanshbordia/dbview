import type { Node } from "@xyflow/react";
import { toSvg } from "html-to-image";

export interface ExportOptions {
	format: "png" | "svg";
	scale: number;
	excludeBg: boolean;
	selectedOnly: boolean;
	theme: "light" | "dark" | "system";
}

// Global override injected directly into the generated SVG. html-to-image does
// not reliably inline `backdrop-filter`/`box-shadow`/`filter`, and a node's
// `backdrop-filter` blurs whatever is painted behind it. In the export the
// edges/arrows sit behind the tables, so the blur bleeds onto them — and it
// only becomes visible once the SVG is rasterized to PNG (the canvas applies
// backdrop-filter against the underlying content). Injecting the override
// inside the final SVG guarantees it is honored during both SVG display and
// PNG rasterization.
const CLEANUP_STYLE = `<style>
  * {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    filter: none !important;
    box-shadow: none !important;
  }
</style>`;

function decodeSvgDataUrl(dataUrl: string): string {
	if (dataUrl.startsWith("data:image/svg+xml;base64,")) {
		return atob(dataUrl.slice("data:image/svg+xml;base64,".length));
	}
	const prefix = "data:image/svg+xml;charset=utf-8,";
	if (dataUrl.startsWith(prefix)) {
		return decodeURIComponent(dataUrl.slice(prefix.length));
	}
	return decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml.*?,/, ""));
}

function injectStyle(svg: string, style: string): string {
	const idx = svg.indexOf(">");
	if (idx === -1) return svg + style;
	return `${svg.slice(0, idx + 1)}${style}${svg.slice(idx + 1)}`;
}

function svgToPng(
	dataUrl: string,
	width: number,
	height: number,
	backgroundColor?: string,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Canvas 2D context is not available."));
				return;
			}
			if (backgroundColor) {
				ctx.fillStyle = backgroundColor;
				ctx.fillRect(0, 0, width, height);
			}
			ctx.drawImage(img, 0, 0, width, height);
			resolve(canvas.toDataURL("image/png"));
		};
		img.onerror = () =>
			reject(new Error("Failed to rasterize the SVG to PNG."));
		img.src = dataUrl;
	});
}

export async function exportGraph(
	reactFlowEl: HTMLElement,
	options: ExportOptions,
	reactFlowInstance: {
		getNodes: () => Node[];
		getNodesBounds: (nodes: Node[]) => {
			x: number;
			y: number;
			width: number;
			height: number;
		};
	},
) {
	const { format, scale, excludeBg, selectedOnly, theme } = options;
	const { getNodes, getNodesBounds } = reactFlowInstance;

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

	// Calculate bounds using the instance's node lookup so that sub flows
	// (parent/child measured dimensions) resolve to correct values.
	const bounds = getNodesBounds(targetNodes);

	// Pad the bounds so tables are not flush against the canvas edge.
	const pad = 50;
	const padded = {
		x: bounds.x - pad,
		y: bounds.y - pad,
		width: bounds.width + pad * 2,
		height: bounds.height + pad * 2,
	};

	const targetWidth = Math.ceil(padded.width * scale);
	const targetHeight = Math.ceil(padded.height * scale);

	// Compute the transform manually so the (padded) bounds map exactly onto
	// the canvas origin with a uniform margin on every side. We intentionally
	// do NOT mutate the live React Flow viewport; the transform is applied only
	// via html-to-image's `style` option on the cloned node. Mutating the live
	// viewport on top of this causes a double transform, which shifts the
	// content and leaves large empty margins (the white bounds seen in the SVG
	// export). Using getViewportForBounds here left asymmetric top/left margin
	// because it centers the padded bounds; this deterministic mapping avoids
	// that.
	const transform = {
		x: -padded.x * scale,
		y: -padded.y * scale,
		zoom: scale,
	};

	// Determine background color
	let backgroundColor: string | undefined;
	if (!excludeBg) {
		const isDark =
			theme === "dark" ||
			(theme === "system" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches);
		backgroundColor = isDark ? "#202020" : "#ffffff";
	}

	// Build the SVG from the DOM. Skip embedding the app's web fonts
	// (Manrope/Fraunces): embedding bloats the SVG massively and frequently
	// fails on CORS, while the diagram renders fine with the viewer's default
	// font.
	const svgDataUrl = await toSvg(reactFlowEl, {
		width: targetWidth,
		height: targetHeight,
		pixelRatio: 1,
		fontEmbedCSS: "",
		backgroundColor,
		style: {
			width: `${targetWidth}px`,
			height: `${targetHeight}px`,
			transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
			transformOrigin: "top left",
		},
	});

	// Neutralize blur-causing styles directly inside the SVG artifact.
	const cleanedSvg = injectStyle(decodeSvgDataUrl(svgDataUrl), CLEANUP_STYLE);
	const cleanedDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanedSvg)}`;

	let downloadUrl: string;
	let downloadExt: string;
	if (format === "png") {
		downloadUrl = await svgToPng(
			cleanedDataUrl,
			targetWidth,
			targetHeight,
			backgroundColor,
		);
		downloadExt = "png";
	} else {
		downloadUrl = cleanedDataUrl;
		downloadExt = "svg";
	}

	// Trigger download
	const link = document.createElement("a");
	link.download = `schema-export-${Date.now()}.${downloadExt}`;
	link.href = downloadUrl;
	link.click();
}
