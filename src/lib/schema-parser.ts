import type {
	ColumnSchema,
	ForeignKey,
	ParsedSchema,
	TableSchema,
} from "#/types/schema.ts";

function stripComments(sql: string): string {
	return sql
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split("\n")
		.map((line) => line.replace(/--.*$/, ""))
		.join("\n");
}

const CREATE_TABLE_RE =
	/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(\w+)\s*\.\s*)?(\w+)\s*\(([\s\S]*?)\)\s*;?\s*$/gim;

function parseCreateTable(block: string): TableSchema | null {
	CREATE_TABLE_RE.lastIndex = 0;
	const match = CREATE_TABLE_RE.exec(block);
	if (!match) return null;

	const schema = match[1]?.toLowerCase() ?? "public";
	const name = match[2].toLowerCase();
	const body = match[3];

	const tables: Record<string, TableSchema> = {};
	tables[name] = { name, schema, columns: [], foreignKeys: [], primaryKey: [] };

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
			const fk: ForeignKey = {
				name: `${name}_${fkMatch[1]}_fkey`,
				column: fkMatch[1].toLowerCase(),
				referencedTable:
					(fkMatch[2] ?? "").toLowerCase() || fkMatch[3].toLowerCase(),
				referencedColumn: fkMatch[4].toLowerCase(),
				isUnique: false,
			};
			tables[name].foreignKeys.push(fk);
			continue;
		}

		const uniqueMatch = /^\s*unique\s*\(([^)]+)\)\s*/i.exec(trimmed);
		if (uniqueMatch) {
			const cols = uniqueMatch[1].split(",").map((c) => c.trim().toLowerCase());
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
			const constraintBody = trimmed.replace(/^\s*constraint\s+\w+\s+/i, "");
			const pkC = /^\s*primary\s+key\s*\(([^)]+)\)\s*/i.exec(constraintBody);
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
				const fk: ForeignKey = {
					name: `${name}_${fkC[1]}_fkey`,
					column: fkC[1].toLowerCase(),
					referencedTable: (fkC[2] ?? "").toLowerCase() || fkC[3].toLowerCase(),
					referencedColumn: fkC[4].toLowerCase(),
					isUnique: false,
				};
				tables[name].foreignKeys.push(fk);
				continue;
			}
			const uC = /^\s*unique\s*\(([^)]+)\)\s*/i.exec(constraintBody);
			if (uC) {
				const cols = uC[1].split(",").map((c) => c.trim().toLowerCase());
				for (const col of cols) {
					const found = tables[name].columns.find((c) => c.name === col);
					if (found) found.isUnique = true;
				}
				continue;
			}
			continue;
		}

		const column = parseColumn(trimmed);
		if (column) {
			tables[name].columns.push(column);
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

function parseColumn(line: string): ColumnSchema | null {
	const trimmed = line.replace(/,$/, "").trim();
	if (!trimmed) return null;

	const parts = trimmed.split(/\s+/);
	if (parts.length < 2) return null;

	const name = parts[0].toLowerCase();
	let type = parts[1].toUpperCase();

	let idx = 2;
	while (
		idx < parts.length &&
		!/^(PRIMARY|REFERENCES|UNIQUE|NOT|DEFAULT|CONSTRAINT)$/i.test(parts[idx])
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
	const refMatch = /\bREFERENCES\s+(?:(\w+)\.)?(\w+)\s*\((\w+)\)/i.exec(rest);
	if (refMatch) {
		references = {
			table: (refMatch[1] ?? "").toLowerCase() || refMatch[2].toLowerCase(),
			column: refMatch[3].toLowerCase(),
		};
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

export function parseSchema(ddl: string): ParsedSchema {
	const cleaned = stripComments(ddl);
	const tables: Map<string, TableSchema> = new Map();

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
			const table = parseCreateTable(block);
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
		const fullName = `${refSchema || "public"}.${tableName}`;
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
		}
	}

	return { tables: Array.from(tables.values()) };
}

export { parseCreateTable };
