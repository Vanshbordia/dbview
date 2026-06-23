export interface ColumnSchema {
	name: string;
	type: string;
	isPrimaryKey: boolean;
	isForeignKey: boolean;
	isUnique: boolean;
	notNull: boolean;
	defaultValue: string | null;
	references: { table: string; column: string } | null;
}

export interface ForeignKey {
	name: string;
	column: string;
	referencedTable: string;
	referencedColumn: string;
	isUnique: boolean;
}

export interface TableSchema {
	name: string;
	schema: string;
	columns: ColumnSchema[];
	foreignKeys: ForeignKey[];
	primaryKey: string[];
}

export interface SchemaIssue {
	type: "error" | "warning";
	message: string;
	table?: string;
	column?: string;
}

export interface ParsedSchema {
	tables: TableSchema[];
	issues: SchemaIssue[];
}

export type RelationshipType = "one-to-one" | "one-to-many" | "many-to-many";
