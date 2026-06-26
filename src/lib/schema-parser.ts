import nodeSqlParser from "node-sql-parser";
import type {
	ColumnSchema,
	DatabaseType,
	ForeignKey,
	ParsedSchema,
	SchemaIssue,
	TableSchema,
} from "#/types/schema.ts";

const { Parser } = nodeSqlParser;

const VALID_PG_TYPES = new Set([
	"SMALLINT", "INTEGER", "INT", "BIGINT", "DECIMAL", "NUMERIC", "REAL",
	"FLOAT", "DOUBLE PRECISION", "SMALLSERIAL", "SERIAL", "BIGSERIAL", "MONEY",
	"VARCHAR", "CHARACTER VARYING", "CHAR", "CHARACTER", "TEXT",
	"BYTEA",
	"DATE", "TIME", "TIMESTAMP", "TIMESTAMPTZ", "INTERVAL",
	"TIME WITH TIME ZONE", "TIME WITHOUT TIME ZONE",
	"TIMESTAMP WITH TIME ZONE", "TIMESTAMP WITHOUT TIME ZONE",
	"BOOLEAN", "BOOL",
	"POINT", "LINE", "LSEG", "BOX", "PATH", "POLYGON", "CIRCLE",
	"CIDR", "INET", "MACADDR", "MACADDR8",
	"JSON", "JSONB",
	"BIT", "BIT VARYING",
	"TSVECTOR", "TSQUERY",
	"UUID",
	"XML",
	"INT4RANGE", "INT8RANGE", "NUMRANGE", "TSRANGE", "TSTZRANGE", "DATERANGE",
	"OID", "REGPROC", "REGPROCEDURE", "REGOPER", "REGOPERATOR",
	"REGCLASS", "REGTYPE", "REGCONFIG", "REGDICTIONARY",
	"PG_LSN",
	"ANY", "ANYELEMENT", "ANYARRAY", "ANYNONARRAY", "ANYDIMENSION",
	"CSTRING", "INTERNAL", "LANGUAGE_HANDLER", "RECORD", "TRIGGER", "VOID",
]);

const VALID_CH_TYPES = new Set([
	"INT8", "INT16", "INT32", "INT64", "INT128", "INT256",
	"UINT8", "UINT16", "UINT32", "UINT64", "UINT128", "UINT256",
	"FLOAT32", "FLOAT64",
	"DECIMAL", "DECIMAL32", "DECIMAL64", "DECIMAL128", "DECIMAL256",
	"BOOLEAN",
	"STRING", "FIXEDSTRING",
	"UUID",
	"DATE", "DATE32",
	"DATETIME", "DATETIME64",
	"ENUM8", "ENUM16",
	"ARRAY",
	"MAP",
	"NULLABLE",
	"LOWCARDINALITY",
	"TUPLE",
	"NESTED",
	"IPV4", "IPV6",
	"POINT", "RING", "POLYGON", "MULTIPOLYGON",
	"SIMPLEAGGREGATEFUNCTION",
]);

const VALID_TYPES_BY_DIALECT: Record<DatabaseType, Set<string>> = {
	postgresql: VALID_PG_TYPES,
	clickhouse: VALID_CH_TYPES,
};

const PARSER_DIALECT: Record<DatabaseType, string> = {
	postgresql: "postgresql",
	clickhouse: "postgresql",
};

export const DEFAULT_SCHEMA_NAME: Record<DatabaseType, string> = {
	postgresql: "public",
	clickhouse: "default",
};

export const DEFAULT_DDL: Record<DatabaseType, string> = {
	postgresql: `CREATE TABLE users (
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
);`,
	clickhouse: `CREATE TABLE users (
  id UInt64,
  email String,
  username String,
  display_name Nullable(String),
  bio Nullable(String),
  metadata String DEFAULT '{}',
  rating Float64 DEFAULT 0.00,
  is_active UInt8 DEFAULT 1,
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE profiles (
  id UInt64,
  user_id UInt64,
  avatar_url Nullable(String),
  website Nullable(String),
  birthday Nullable(Date),
  phone Nullable(String)
)
ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE posts (
  id UInt64,
  author_id UInt64,
  title String,
  slug String,
  body String,
  excerpt Nullable(String),
  published UInt8 DEFAULT 0,
  rating Float64 DEFAULT 0.0,
  views UInt64 DEFAULT 0,
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE comments (
  id UInt64,
  post_id UInt64,
  author_id UInt64,
  parent_id Nullable(UInt64),
  body String,
  depth UInt64 DEFAULT 0,
  upvotes UInt64 DEFAULT 0,
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE tags (
  id UInt64,
  name String,
  color String DEFAULT '#6366f1'
)
ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE events (
  id UUID,
  event_name String,
  event_date Date,
  payload String,
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE page_views (
  user_id UInt64,
  page_url String,
  duration Float64,
  timestamp DateTime
)
ENGINE = MergeTree()
ORDER BY (timestamp, user_id);

CREATE TABLE orders (
  id UInt64,
  customer_id UInt64,
  status String DEFAULT 'pending',
  total Float64,
  ordered_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY id;`,
};

function normalizeType(raw: string): string {
	return raw
		.replace(/\[.*?\]/g, "")
		.replace(/\(.*\)/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function stripComments(sql: string): string {
	return sql
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split("\n")
		.map((line) => line.replace(/--.*$/, ""))
		.join("\n");
}

/* ---------- node-sql-parser based parsing ---------- */

function makeType(def: any): string {
	let t = (def?.dataType ?? "").toUpperCase();
	if (def?.length !== undefined) t += `(${def.length})`;
	if (def?.parentheses && def.length === undefined) t += "()";
	return t;
}

function extractColumnLib(
	def: any,
	tableName: string,
	tablePks: Set<string>,
): ColumnSchema | null {
	if (def.resource !== "column") return null;
	const colPath = def.column?.column?.expr?.value;
	if (!colPath) return null;
	const name = String(colPath).toLowerCase();

	let references: { table: string; column: string } | null = null;
	const refDef = def.reference_definition;
	if (refDef) {
		const refTable = refDef.table?.[0]?.table ?? "";
		const refCol =
			refDef.definition?.[0]?.column?.expr?.value ?? "";
		references = {
			table: String(refTable).toLowerCase(),
			column: String(refCol).toLowerCase(),
		};
	}

		const raw = def.default_val?.value;
		const defaultValue = raw != null
			? (typeof raw === "object" ? (raw.value != null ? String(raw.value) : null) : String(raw))
			: null;

		return {
			name,
			type: makeType(def.definition),
			isPrimaryKey: !!def.primary_key || tablePks.has(name),
			isForeignKey: !!references,
			isUnique: !!def.unique,
			notNull: def.nullable?.type === "not null",
			defaultValue,
			references,
		};
}

function extractFksLib(
	defs: any[],
	tableName: string,
): ForeignKey[] {
	const fks: ForeignKey[] = [];
	for (const def of defs) {
		if (def.resource === "constraint" && def.constraint_type === "FOREIGN KEY") {
			const col = def.definition?.[0]?.column?.expr?.value;
			if (!col) continue;
			const refTable = def.reference_definition?.table?.[0]?.table ?? "";
			const refCol =
				def.reference_definition?.definition?.[0]?.column?.expr?.value ?? "";
			fks.push({
				name: def.constraint || `${tableName}_${col}_fkey`,
				column: String(col).toLowerCase(),
				referencedTable: String(refTable).toLowerCase(),
				referencedColumn: String(refCol).toLowerCase(),
				isUnique: false,
			});
		}
		// inline REFERENCES in column def
		if (def.resource === "column" && def.reference_definition) {
			const col = def.column?.column?.expr?.value;
			if (!col) continue;
			const refTable = def.reference_definition?.table?.[0]?.table ?? "";
			const refCol =
				def.reference_definition?.definition?.[0]?.column?.expr?.value ?? "";
			const cName = String(col).toLowerCase();
			if (!fks.some((f) => f.column === cName)) {
				fks.push({
					name: `${tableName}_${cName}_fkey`,
					column: cName,
					referencedTable: String(refTable).toLowerCase(),
					referencedColumn: String(refCol).toLowerCase(),
					isUnique: !!def.unique,
				});
			}
		}
	}
	return fks;
}

function parseWithLib(
	cleaned: string,
	issues: SchemaIssue[],
	databaseType: DatabaseType,
): TableSchema[] {
	const p = new Parser();
	const tables: TableSchema[] = [];
	const tableMap = new Map<string, TableSchema>();
	const parserDialect = PARSER_DIALECT[databaseType];
	const defaultSchema = DEFAULT_SCHEMA_NAME[databaseType];

	const stmts = cleaned
		.split(";")
		.map((s) => (s.trim() + ";").trim())
		.filter((s) => s.length > 1);

	for (const stmt of stmts) {
		try {
			const ast = p.astify(stmt, { database: parserDialect });
			const arr = Array.isArray(ast) ? ast : [ast];
			for (const node of arr) {
				if (node.type === "create" && node.keyword === "table") {
					const info = node.table?.[0];
					if (!info?.table) continue;
					const name = String(info.table).toLowerCase();
					const schema = info.db
						? String(info.db).toLowerCase()
						: defaultSchema;
					const defs = node.create_definitions ?? [];

					// Collect PKs from inline + constraint
					const pks = new Set<string>();
					for (const d of defs) {
						if (d.resource === "column" && d.primary_key) {
							const cn = d.column?.column?.expr?.value;
							if (cn) pks.add(String(cn).toLowerCase());
						}
					if (
						d.resource === "constraint" &&
						d.constraint_type?.toUpperCase() === "PRIMARY KEY"
					) {
							for (const ref of d.definition ?? []) {
								const cn = ref.column?.expr?.value;
								if (cn) pks.add(String(cn).toLowerCase());
							}
						}
					}

					const columns: ColumnSchema[] = [];
					for (const d of defs) {
						const col = extractColumnLib(d, name, pks);
						if (col) columns.push(col);
					}

					const foreignKeys = extractFksLib(defs, name);

					// Mark FK columns
					for (const fk of foreignKeys) {
						const col = columns.find((c) => c.name === fk.column);
						if (col) {
							col.isForeignKey = true;
							if (!col.references) {
								col.references = {
									table: fk.referencedTable,
									column: fk.referencedColumn,
								};
							}
							fk.isUnique = col.isUnique;
						}
					}

					const table: TableSchema = {
						name,
						schema,
						columns,
						foreignKeys,
						primaryKey: Array.from(pks),
					};
					tables.push(table);
					tableMap.set(table.name, table);
				}

				// ALTER TABLE ADD FOREIGN KEY
				if (node.type === "alter") {
					const tblInfo = node.table?.[0];
					const tblName = tblInfo?.table
						? String(tblInfo.table).toLowerCase()
						: null;
					if (!tblName) continue;
					const table = tableMap.get(tblName);
					if (!table) {
						issues.push({
							type: "warning",
							message: `ALTER TABLE: table "${tblName}" not found`,
						});
						continue;
					}
					const exprs = node.expr ?? [];
					for (const expr of exprs) {
						if (expr.action === "add") {
							const cd = expr.create_definitions;
							if (cd?.constraint_type === "FOREIGN KEY") {
								const col = cd.definition?.[0]?.column?.expr?.value;
								if (!col) continue;
								const cName = String(col).toLowerCase();
								if (table.foreignKeys.some((f) => f.column === cName))
									continue;
								const refTable =
									cd.reference_definition?.table?.[0]?.table ?? "";
								const refCol =
									cd.reference_definition?.definition?.[0]?.column?.expr
										?.value ?? "";
								const fk: ForeignKey = {
									name: cd.constraint || `${tblName}_${cName}_fkey`,
									column: cName,
									referencedTable: String(refTable).toLowerCase(),
									referencedColumn: String(refCol).toLowerCase(),
									isUnique: false,
								};
								table.foreignKeys.push(fk);
								const colDef = table.columns.find((c) => c.name === cName);
								if (colDef) {
									colDef.isForeignKey = true;
									colDef.references = {
										table: fk.referencedTable,
										column: fk.referencedColumn,
									};
								}
							}
						}
					}
				}
			}
		} catch (e: any) {
			// Library parse error — add as issue, keep going
			const raw = e.message ?? "";
			let friendly = raw;
			if (/expected/i.test(raw) && /\bbut\b/i.test(raw)) {
				const preview = stmt.replace(/\s+/g, " ").slice(0, 60).trim();
				friendly = `Could not parse: "${preview}…"`;
			}
			issues.push({
				type: "warning",
				message: friendly,
			});
		}
	}

	return tables;
}

/* ---------- Fallback custom parser ---------- */

const CREATE_TABLE_RE =
	/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(\w+)\s*\.\s*)?(\w+)\s*\(/gim;

function extractBody(text: string): string | null {
	let depth = 0;
	let start = -1;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "(") {
			if (depth === 0) start = i;
			depth++;
		}
		if (text[i] === ")") {
			depth--;
			if (depth === 0 && start >= 0) return text.slice(start + 1, i);
		}
	}
	return null;
}

function parseCreateTable(
	block: string,
	issues: SchemaIssue[],
	databaseType: DatabaseType = "postgresql",
): TableSchema | null {
	CREATE_TABLE_RE.lastIndex = 0;
	const match = CREATE_TABLE_RE.exec(block);
	if (!match) return null;

	const defaultSchema = DEFAULT_SCHEMA_NAME[databaseType];
	const schema = match[1]?.toLowerCase() ?? defaultSchema;
	const name = match[2].toLowerCase();
	const body = extractBody(block);
	if (!body) return null;

	const tables: Record<string, TableSchema> = {};
	tables[name] = {
		name,
		schema,
		columns: [],
		foreignKeys: [],
		primaryKey: [],
	};

	const lines = splitTopLevel(body);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed === ",") continue;

		const pkMatch = /^\s*primary\s+key\s*\(([^)]+)\)\s*/i.exec(trimmed);
		if (pkMatch) {
			tables[name].primaryKey = pkMatch[1]
				.split(",")
				.map((c) => c.trim().toLowerCase());
			continue;
		}

		const fkMatch =
			/^\s*foreign\s+key\s*\((\w+)\)\s*references\s+(?:(\w+)\.)?(\w+)\s*\((\w+)\)\s*/i.exec(
				trimmed,
			);
		if (fkMatch) {
			tables[name].foreignKeys.push({
				name: `${name}_${fkMatch[1]}_fkey`,
				column: fkMatch[1].toLowerCase(),
				referencedTable:
					(fkMatch[2] ?? "").toLowerCase() || fkMatch[3].toLowerCase(),
				referencedColumn: fkMatch[4].toLowerCase(),
				isUnique: false,
			});
			continue;
		}

		const uniqueMatch = /^\s*unique\s*\(([^)]+)\)\s*/i.exec(trimmed);
		if (uniqueMatch) {
			const cols = uniqueMatch[1]
				.split(",")
				.map((c) => c.trim().toLowerCase());
			for (const col of cols) {
				const found = tables[name].columns.find((c) => c.name === col);
				if (found) found.isUnique = true;
			}
			continue;
		}

		const constraintMatch =
			/^\s*constraint\s+\w+\s+(primary\s+key|foreign\s+key|unique)\s*/i.exec(
				trimmed,
			);
		if (constraintMatch) {
			const constraintBody = trimmed.replace(
				/^\s*constraint\s+\w+\s+/i,
				"",
			);
			const pkC =
				/^\s*primary\s+key\s*\(([^)]+)\)\s*/i.exec(constraintBody);
			if (pkC) {
				tables[name].primaryKey = pkC[1]
					.split(",")
					.map((c) => c.trim().toLowerCase());
				continue;
			}
			const fkC =
				/^\s*foreign\s+key\s*\((\w+)\)\s*references\s+(?:(\w+)\.)?(\w+)\s*\((\w+)\)\s*/i.exec(
					constraintBody,
				);
			if (fkC) {
				tables[name].foreignKeys.push({
					name: `${name}_${fkC[1]}_fkey`,
					column: fkC[1].toLowerCase(),
					referencedTable:
						(fkC[2] ?? "").toLowerCase() || fkC[3].toLowerCase(),
					referencedColumn: fkC[4].toLowerCase(),
					isUnique: false,
				});
				continue;
			}
			const uC =
				/^\s*unique\s*\(([^)]+)\)\s*/i.exec(constraintBody);
			if (uC) {
				const cols = uC[1]
					.split(",")
					.map((c) => c.trim().toLowerCase());
				for (const col of cols) {
					const found = tables[name].columns.find((c) => c.name === col);
					if (found) found.isUnique = true;
				}
				continue;
			}
			continue;
		}

		const column = parseColumn(trimmed, issues, name, databaseType);
		if (column) {
			tables[name].columns.push(column);
		} else if (!/^\s*$/.test(trimmed)) {
			issues.push({
				type: "warning",
				message: `Unrecognized table-level construct: "${trimmed}"`,
				table: name,
			});
		}
	}

	for (const col of tables[name].columns) {
		if (col.isPrimaryKey && !tables[name].primaryKey.includes(col.name)) {
			tables[name].primaryKey.push(col.name);
		}
	}

	for (const fk of tables[name].foreignKeys) {
		const col = tables[name].columns.find((c) => c.name === fk.column);
		if (col) {
			col.isForeignKey = true;
			col.references = {
				table: fk.referencedTable,
				column: fk.referencedColumn,
			};
			fk.isUnique = col.isUnique;
		}
	}

	for (const col of tables[name].columns) {
		if (
			col.references &&
			!tables[name].foreignKeys.some((f) => f.column === col.name)
		) {
			tables[name].foreignKeys.push({
				name: `${name}_${col.name}_fkey`,
				column: col.name,
				referencedTable: col.references.table,
				referencedColumn: col.references.column,
				isUnique: col.isUnique,
			});
		}
	}

	return tables[name];
}

function parseColumn(
	line: string,
	issues?: SchemaIssue[],
	tableName?: string,
	databaseType: DatabaseType = "postgresql",
): ColumnSchema | null {
	const trimmed = line.replace(/,$/, "").trim();
	if (!trimmed) return null;

	const parts = trimmed.split(/\s+/);
	if (parts.length < 2) return null;

	const name = parts[0].toLowerCase();
	let type = parts[1].toUpperCase();

	let idx = 2;
	while (
		idx < parts.length &&
		!/^(PRIMARY|REFERENCES|UNIQUE|NOT|DEFAULT|CONSTRAINT|CODEC|TTL|ALIAS|MATERIALIZED|EPHEMERAL|INDEX|PROJECTION|ORDER|SIGNED|UNSIGNED)$/i.test(
			parts[idx].replace(/\(.*/i, ""),
		)
	) {
		type += ` ${parts[idx].toUpperCase()}`;
		idx++;
	}

	const rest = parts.slice(idx).join(" ").toUpperCase();

	const pk = /\bPRIMARY\s+KEY\b/i.test(rest);
	const unique = /\bUNIQUE\b/i.test(rest);
	const notNull = /\bNOT\s+NULL\b/i.test(rest);
	const defaultMatch = /\bDEFAULT\s+(\S+)/i.exec(rest);
	const defaultValue = defaultMatch ? defaultMatch[1] : null;

	let references: { table: string; column: string } | null = null;
	const refMatch =
		/\bREFERENCES\s+(?:(\w+)\.)?(\w+)\s*\((\w+)\)/i.exec(rest);
	if (refMatch) {
		references = {
			table: (refMatch[1] ?? "").toLowerCase() || refMatch[2].toLowerCase(),
			column: refMatch[3].toLowerCase(),
		};
	}

	if (issues && tableName) {
		let remaining = rest;
		remaining = remaining.replace(/\bPRIMARY\s+KEY\b/gi, "");
		remaining = remaining.replace(/\bUNIQUE\b/gi, "");
		remaining = remaining.replace(/\bNOT\s+NULL\b/gi, "");
		remaining = remaining.replace(/\bDEFAULT\s+\S+/gi, "");
		remaining = remaining.replace(
			/\bREFERENCES\s+(?:\w+\.)?\w+\s*\(\w+\)/gi,
			"",
		);
		remaining = remaining.replace(
			/\bON\s+(DELETE|UPDATE)\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)\b/gi,
			"",
		);
		remaining = remaining.replace(/\bCODEC\s*\([^)]*\)/gi, "");
		remaining = remaining.replace(/\bTTL\s+\S+(?:\s+TO\s+\S+)?/gi, "");
		remaining = remaining.replace(/\b(?:ALIAS|MATERIALIZED|EPHEMERAL|SIGNED|UNSIGNED|INDEX|PROJECTION)\b/gi, "");
		remaining = remaining.replace(/\s+/g, " ").trim();
		if (remaining) {
			issues.push({
				type: "warning",
				message: `Unrecognized in column "${name}": "${remaining}"`,
				table: tableName,
				column: name,
			});
		}
		const normalized = normalizeType(type);
		const validTypes = VALID_TYPES_BY_DIALECT[databaseType];
		if (!validTypes.has(normalized)) {
			issues.push({
				type: "warning",
				message: `Unrecognized type "${type}" for column "${name}"`,
				table: tableName,
				column: name,
			});
		}
	}

	return {
		name,
		type,
		isPrimaryKey: pk,
		isForeignKey: !!references,
		isUnique: unique,
		notNull,
		defaultValue,
		references,
	};
}

function splitTopLevel(body: string): string[] {
	const lines: string[] = [];
	let depth = 0;
	let current = "";
	for (const ch of body) {
		if (ch === "(") depth++;
		if (ch === ")") depth--;
		if (ch === "," && depth === 0) {
			lines.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	if (current.trim()) lines.push(current);
	return lines;
}

const ALTER_FK_RE =
	/alter\s+table\s+(?:only\s+)?(?:(\w+)\.)?(\w+)\s+add\s+(?:constraint\s+(\w+)\s+)?foreign\s+key\s*\((\w+)\)\s*references\s+(?:(\w+)\.)?(\w+)\s*\((\w+)\)\s*/gi;

function parseWithCustom(
	cleaned: string,
	issues: SchemaIssue[],
	databaseType: DatabaseType = "postgresql",
): TableSchema[] {
	const tables: Map<string, TableSchema> = new Map();
	const defaultSchema = DEFAULT_SCHEMA_NAME[databaseType];

	const createBlockRe =
		/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(\w+)\.)?(\w+)\s*\(/gi;
	const blocks: string[] = [];
	let lastIndex = 0;

	for (let match: RegExpExecArray | null = null; ; ) {
		match = createBlockRe.exec(cleaned);
		if (match === null) break;

		if (match.index > lastIndex) {
			const textBetween = cleaned.slice(lastIndex, match.index).trim();
			if (/alter\s+table/i.test(textBetween)) {
				blocks.push(cleaned.slice(lastIndex, match.index));
			}
		}
		const start = match.index;
		let depth = 0;
		let i = start;
		while (i < cleaned.length) {
			if (cleaned[i] === "(") depth++;
			if (cleaned[i] === ")") {
				depth--;
				if (depth === 0) {
					blocks.push(cleaned.slice(start, i + 1));
					lastIndex = i + 1;
					break;
				}
			}
			i++;
		}
	}

	if (lastIndex < cleaned.length) {
		const remaining = cleaned.slice(lastIndex).trim();
		if (/alter\s+table/i.test(remaining)) {
			blocks.push(remaining);
		}
	}

	for (const block of blocks) {
		if (/create\s+table/i.test(block)) {
			const table = parseCreateTable(block, issues, databaseType);
			if (table) {
				tables.set(`${table.schema}.${table.name}`, table);
			}
		}
	}

	for (let alterMatch: RegExpExecArray | null = null; ; ) {
		alterMatch = ALTER_FK_RE.exec(cleaned);
		if (alterMatch === null) break;
		const refSchema = (alterMatch[1] ?? "").toLowerCase();
		const tableName = alterMatch[2].toLowerCase();
		const constraintName =
			alterMatch[3] ?? `${tableName}_${alterMatch[4]}_fkey`;
		const fkCol = alterMatch[4].toLowerCase();
		const refTableSchema = (alterMatch[5] ?? "").toLowerCase();
		const refTable = alterMatch[6].toLowerCase();
		const refCol = alterMatch[7].toLowerCase();
		const fullName = `${refSchema || defaultSchema}.${tableName}`;
		const table = tables.get(fullName) || tables.get(tableName);
		if (table) {
			const existingFk = table.foreignKeys.find((f) => f.column === fkCol);
			if (!existingFk) {
				const col = table.columns.find((c) => c.name === fkCol);
				table.foreignKeys.push({
					name: constraintName,
					column: fkCol,
					referencedTable: refTableSchema || refTable,
					referencedColumn: refCol,
					isUnique: col?.isUnique ?? false,
				});
				if (col) {
					col.isForeignKey = true;
					col.references = {
						table: refTableSchema || refTable,
						column: refCol,
					};
				}
			}
		} else {
			issues.push({
				type: "warning",
				message: `ALTER TABLE: table "${fullName}" not found for foreign key "${fkCol}"`,
			});
		}
	}

	return Array.from(tables.values());
}

/* ---------- Linting for library-parsed tables ---------- */

function lintTables(tables: TableSchema[], ddl: string, issues: SchemaIssue[], databaseType: DatabaseType = "postgresql"): void {
	for (const table of tables) {
		const safe = table.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const nameRe = new RegExp(
			`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:\\w+\\.)?${safe}\\s*\\(`,
			"i",
		);
		const m = nameRe.exec(ddl);
		if (!m) continue;
		const body = extractBody(ddl.slice(m.index));
		if (!body) continue;
		const lines = splitTopLevel(body);
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed === ",") continue;
			if (
				/^\s*(primary\s+key|foreign\s+key|unique\s*\(|constraint|check|engine|order\s+by|partition\s+by|sample\s+by)\b/i.test(trimmed)
			) continue;
			parseColumn(trimmed, issues, table.name, databaseType);
		}
	}
}

/* ---------- Public API ---------- */

const CLICKHOUSE_PATTERN =
	/\b(?:ENGINE\s*=|ORDER\s+BY|PARTITION\s+BY|SAMPLE\s+BY|LOWCARDINALITY|NULLABLE\s*\(|U?INT(?:8|16|32|64|128|256)\b|FLOAT(?:32|64)\b|DATETIME64|DATE32|ENUM[816]|ARRAY\s*\(|MAP\s*\(|TUPLE\s*\(|NESTED\s*\(|IPV[46]\b|(?:\w+)?(?:MergeTree|ReplicatedMergeTree|SummingMergeTree|AggregatingMergeTree|ReplacingMergeTree|CollapsingMergeTree|VersionedCollapsingMergeTree|GraphiteMergeTree|Distributed|Buffer|Memory|File|Merge|View|MaterializedView|Set|Join)\s*\()/i;

function detectDatabaseType(ddl: string): DatabaseType {
	return CLICKHOUSE_PATTERN.test(ddl) ? "clickhouse" : "postgresql";
}

export function parseSchema(ddl: string, databaseType?: DatabaseType): ParsedSchema {
	const cleaned = stripComments(ddl);
	const dbType = databaseType ?? detectDatabaseType(cleaned);
	const issues: SchemaIssue[] = [];

	// Try the library parser first — gives accurate AST + catches real SQL errors
	const libIssueStart = issues.length;
	const libTables = parseWithLib(cleaned, issues, dbType);

	if (libTables.length > 0) {
		// Run column-level linting on library-parsed tables
		lintTables(libTables, cleaned, issues, dbType);
		return { tables: libTables, issues };
	}

	// Library parser produced no tables — discard its issues and use fallback
	issues.splice(libIssueStart);
	const fallbackTables = parseWithCustom(cleaned, issues, dbType);
	return { tables: fallbackTables, issues };
}

/* ---------- Fast linter for editor typing (no node-sql-parser) ---------- */

export function lintQuick(ddl: string, databaseType?: DatabaseType): SchemaIssue[] {
	const cleaned = stripComments(ddl);
	const dbType = databaseType ?? detectDatabaseType(cleaned);
	const issues: SchemaIssue[] = [];
	const tableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(\w+)\.)?(\w+)\s*\(/gi;
	let m: RegExpExecArray | null;
	while ((m = tableRegex.exec(cleaned)) !== null) {
		const name = m[2];
		const body = extractBody(cleaned.slice(m.index));
		if (!body) continue;
		const lines = splitTopLevel(body);
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed === ",") continue;
			if (/^\s*(primary\s+key|foreign\s+key|unique\s*\(|constraint|check|engine|order\s+by|partition\s+by|sample\s+by)\b/i.test(trimmed)) continue;
			parseColumn(trimmed, issues, name, databaseType);
		}
	}
	return issues;
}

export { parseCreateTable };
