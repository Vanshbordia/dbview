import { sql } from "@codemirror/lang-sql";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { Compartment, EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { tags } from "@lezer/highlight";
import { basicSetup, EditorView } from "codemirror";
import { FileCode, Play, Upload } from "lucide-react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { useTheme } from "#/components/theme-provider.tsx";
import { Button } from "#/components/ui/button.tsx";
import { ScrollArea } from "#/components/ui/scroll-area.tsx";
import { parseSchema } from "#/lib/schema-parser.ts";
import type { SchemaIssue } from "#/types/schema.ts";

const appHighlight = syntaxHighlighting(
	HighlightStyle.define([
		{ tag: tags.keyword, color: "var(--primary)", fontWeight: "600" },
		{ tag: tags.string, color: "var(--chart-2)" },
		{
			tag: tags.comment,
			color: "var(--muted-foreground)",
			fontStyle: "italic",
		},
		{ tag: tags.typeName, color: "var(--chart-3)" },
		{ tag: tags.number, color: "var(--chart-4)" },
		{ tag: tags.bool, color: "var(--chart-4)" },
		{
			tag: tags.definitionKeyword,
			color: "var(--primary)",
			fontWeight: "600",
		},
		{ tag: tags.modifier, color: "var(--chart-5)", fontWeight: "500" },
		{ tag: tags.operator, color: "var(--foreground)" },
		{
			tag: tags.paren,
			color: "var(--muted-foreground)",
		},
		{ tag: tags.squareBracket, color: "var(--muted-foreground)" },
		{ tag: tags.brace, color: "var(--muted-foreground)" },
		{ tag: tags.attributeName, color: "var(--foreground)" },
		{ tag: tags.compareOperator, color: "var(--foreground)" },
	]),
);

const appTheme = EditorView.theme({
	"&": {
		backgroundColor: "var(--background)",
		color: "var(--foreground)",
		fontSize: "13px",
	},
	".cm-scroller": { overflow: "hidden" },
	".cm-content": {
		caretColor: "var(--foreground)",
		padding: "12px 0",
		fontSize: "13px",
		lineHeight: "1.6",
	},
	"&.cm-focused .cm-selectionBackground, .cm-content ::selection": {
		backgroundColor:
			"color-mix(in oklab, var(--primary) 25%, transparent) !important",
	},
	".cm-activeLine": {
		backgroundColor: "color-mix(in oklab, var(--primary) 5%, transparent)",
	},
	".cm-gutters": {
		backgroundColor: "var(--muted)",
		color: "var(--muted-foreground)",
		borderRight: "1px solid var(--border)",
		paddingLeft: "4px",
		fontSize: "11px",
	},
	".cm-activeLineGutter": {
		backgroundColor: "color-mix(in oklab, var(--primary) 10%, var(--muted))",
	},
	".cm-cursor": {
		borderLeftColor: "var(--foreground)",
		borderLeftWidth: "2px",
	},
	".cm-foldPlaceholder": {
		backgroundColor: "var(--muted)",
		borderColor: "var(--border)",
		color: "var(--muted-foreground)",
	},
	".cm-matchingBracket": {
		backgroundColor: "color-mix(in oklab, var(--primary) 15%, transparent)",
		outline: "1px solid var(--primary)",
	},
	".cm-selectionMatch": {
		backgroundColor: "color-mix(in oklab, var(--primary) 10%, transparent)",
	},
	".cm-searchMatch": {
		backgroundColor: "color-mix(in oklab, var(--chart-4) 20%, transparent)",
		outline: "1px solid var(--chart-4)",
	},
	".cm-searchMatch-selected": {
		backgroundColor: "color-mix(in oklab, var(--chart-4) 40%, transparent)",
	},
});

function getResolvedDark(theme: string): boolean {
	if (theme === "dark") return true;
	if (theme === "light") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findIssuePos(doc: string, issue: SchemaIssue): { from: number; to: number } | null {
	const table = issue.table;
	const column = issue.column;
	if (!table) return null;

	const tableRe = new RegExp(
		`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:\\w+\\.)?${escapeRegex(table)}\\s*\\(`,
		"i",
	);
	const tableMatch = tableRe.exec(doc);
	if (!tableMatch) return null;

	const blockStart = tableMatch.index;
	let depth = 0;
	let blockEnd = doc.length;
	for (let i = blockStart; i < doc.length; i++) {
		if (doc[i] === "(") depth++;
		if (doc[i] === ")") {
			depth--;
			if (depth === 0) {
				blockEnd = i + 1;
				break;
			}
		}
	}

	const block = doc.slice(blockStart, blockEnd);
	const searchFor = column ?? table;
	const searchRe = new RegExp(`\\b${escapeRegex(searchFor)}\\b`, "i");
	const colMatch = searchRe.exec(block);
	if (!colMatch) return null;

	const from = blockStart + colMatch.index;
	const to = from + colMatch[0].length;
	return { from, to };
}

const sqlLinter = linter(
	(view: EditorView) => {
		const doc = view.state.doc.toString();
		const result = parseSchema(doc);
		const diagnostics: { from: number; to: number; severity: "warning" | "error"; message: string }[] = [];
		for (const issue of result.issues) {
			const pos = findIssuePos(doc, issue);
			if (pos) {
				diagnostics.push({
					from: pos.from,
					to: pos.to,
					severity: "warning",
					message: issue.message,
				});
			}
		}
		return diagnostics;
	},
	{ delay: 300 },
);

const DEFAULT_DDL = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  bio TEXT,
  metadata JSONB DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profiles (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  avatar_url VARCHAR(500),
  website VARCHAR(255),
  birthday DATE,
  phone VARCHAR(20)
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(300) UNIQUE NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT,
  published BOOLEAN DEFAULT FALSE,
  rating NUMERIC(2,1) DEFAULT 0.0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  parent_id INTEGER REFERENCES comments(id),
  body TEXT NOT NULL,
  depth INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1'
);

CREATE TABLE posts_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  tag_id INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(50) DEFAULT 'pending',
  total NUMERIC(10,2) NOT NULL,
  ordered_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock INTEGER DEFAULT 0
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  UNIQUE (order_id, product_id)
);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  budget NUMERIC(12,2)
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  manager_id INTEGER REFERENCES employees(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  salary NUMERIC(10,2),
  hired_at DATE DEFAULT CURRENT_DATE
);
`;

interface SchemaInputProps {
	onRender: (ddl: string) => void;
	onChange?: (ddl: string) => void;
	onActiveTableChange?: (tableName: string | null) => void;
}

export interface SchemaInputHandle {
	setValue: (content: string) => void;
}

const SchemaInput = forwardRef<SchemaInputHandle, SchemaInputProps>(
	function SchemaInput({ onRender, onChange, onActiveTableChange }, ref) {
		const { theme } = useTheme();
		const editorRef = useRef<HTMLDivElement>(null);
		const viewRef = useRef<EditorView | null>(null);
		const fileInputRef = useRef<HTMLInputElement>(null);
		const themeCompartment = useRef(new Compartment());
		const changeCb = useRef(onChange);
		changeCb.current = onChange;
		const activeTableCb = useRef(onActiveTableChange);
		activeTableCb.current = onActiveTableChange;

		const initialDark =
			typeof document !== "undefined" &&
			document.documentElement.classList.contains("dark");

		const [resolvedDark, setResolvedDark] = useState(initialDark);

		useEffect(() => {
			setResolvedDark(getResolvedDark(theme));
			if (theme !== "system") return;
			const media = window.matchMedia("(prefers-color-scheme: dark)");
			const onChange = () => setResolvedDark(media.matches);
			media.addEventListener("change", onChange);
			return () => media.removeEventListener("change", onChange);
		}, [theme]);

		useEffect(() => {
			if (!editorRef.current || viewRef.current) return;
			const dark = initialDark;

			const state = EditorState.create({
				doc: DEFAULT_DDL,
				extensions: [
					basicSetup,
					sql(),
					EditorView.lineWrapping,
					appTheme,
					appHighlight,
					themeCompartment.current.of(dark ? oneDark : []),
					sqlLinter,
					EditorView.updateListener.of((update) => {
						if (update.docChanged && changeCb.current) {
							changeCb.current(update.state.doc.toString());
						}
						if (update.selectionSet) {
							const pos = update.state.selection.main.head;
							const line = update.state.doc.lineAt(pos);
							const text = line.text;
							const m = text.match(
									/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+(?:\.\w+)?)/i,
								)
								?? text.match(/REFERENCES\s+(\w+(?:\.\w+)?)/i);
							const name = m ? (m[1].includes(".") ? m[1].split(".")[1] : m[1]) : null;
							activeTableCb.current?.(name);
						}
					}),
				],
			});

			const view = new EditorView({
				state,
				parent: editorRef.current,
			});

			viewRef.current = view;

			return () => {
				view.destroy();
				viewRef.current = null;
			};
		}, [initialDark]);

		useEffect(() => {
			const view = viewRef.current;
			if (!view) return;
			view.dispatch({
				effects: themeCompartment.current.reconfigure(
					resolvedDark ? oneDark : [],
				),
			});
		}, [resolvedDark]);

		useImperativeHandle(
			ref,
			() => ({
				setValue: (content: string) => {
					const view = viewRef.current;
					if (view) {
						view.dispatch({
							changes: {
								from: 0,
								to: view.state.doc.length,
								insert: content,
							},
						});
					}
				},
			}),
			[],
		);

		const handleUpload = useCallback(() => {
			fileInputRef.current?.click();
		}, []);

		const handleFileChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const file = e.target.files?.[0];
				if (!file) return;
				const reader = new FileReader();
				reader.onload = () => {
					const content = reader.result as string;
					const view = viewRef.current;
					if (view) {
						view.dispatch({
							changes: {
								from: 0,
								to: view.state.doc.length,
								insert: content,
							},
						});
					}
				};
				reader.readAsText(file);
				e.target.value = "";
			},
			[],
		);

		const handleRender = useCallback(() => {
			const view = viewRef.current;
			if (view) {
				onRender(view.state.doc.toString());
			}
		}, [onRender]);

		return (
			<div className="flex flex-col h-full">
				<input
					ref={fileInputRef}
					type="file"
					accept=".sql,.txt"
					className="hidden"
					onChange={handleFileChange}
				/>

				<div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0 bg-muted/30">
					<span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase shrink-0 text-muted-foreground">
						<FileCode className="size-3.5" />
						Schema DDL
					</span>

					<div className="flex items-center gap-1 ml-auto">
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={handleUpload}
							title="Upload .sql file"
						>
							<Upload className="size-3.5" />
						</Button>
						<Button variant="default" size="xs" onClick={handleRender}>
							<Play className="size-3.5" />
							Render
						</Button>
					</div>
				</div>

				<div className="flex-1 min-h-0">
					<ScrollArea className="h-full">
						<div ref={editorRef} />
					</ScrollArea>
				</div>
			</div>
		);
	},
);

export default SchemaInput;
