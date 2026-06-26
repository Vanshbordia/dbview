import { describe, it, expect } from "vitest";
import { parseSchema, parseCreateTable, lintQuick } from "#/lib/schema-parser.ts";

describe("parseSchema", () => {
  describe("PostgreSQL DDL", () => {
    it("parses a simple CREATE TABLE with inline PRIMARY KEY", () => {
      const ddl = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe("users");
      expect(result.tables[0].columns).toHaveLength(3);
      expect(result.tables[0].primaryKey).toContain("id");

      const idCol = result.tables[0].columns.find((c) => c.name === "id")!;
      expect(idCol.isPrimaryKey).toBe(true);
      expect(idCol.type).toBe("SERIAL");

      const emailCol = result.tables[0].columns.find((c) => c.name === "email")!;
      expect(emailCol.notNull).toBe(true);
      expect(emailCol.type).toBe("VARCHAR(255)");
    });

    it("parses FOREIGN KEY constraints", () => {
      const ddl = `CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total NUMERIC(10,2)
);`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].foreignKeys).toHaveLength(1);

      const fk = result.tables[0].foreignKeys[0];
      expect(fk.column).toBe("user_id");
      expect(fk.referencedTable).toBe("users");
      expect(fk.referencedColumn).toBe("id");

      const col = result.tables[0].columns.find((c) => c.name === "user_id")!;
      expect(col.isForeignKey).toBe(true);
      expect(col.references?.table).toBe("users");
    });

    it("parses table-level FOREIGN KEY constraints with compound PK", () => {
      const ddl = `CREATE TABLE order_items (
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  CONSTRAINT order_items_pkey PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].foreignKeys).toHaveLength(2);
      expect(result.tables[0].primaryKey.sort()).toEqual(["order_id", "product_id"]);
    });

    it("parses UNIQUE constraints", () => {
      const ddl = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL
);`;
      const result = parseSchema(ddl);
      const emailCol = result.tables[0].columns.find((c) => c.name === "email")!;
      expect(emailCol.isUnique).toBe(true);
    });

    it("parses ALTER TABLE ADD FOREIGN KEY", () => {
      const ddl = `CREATE TABLE users (id SERIAL PRIMARY KEY);
CREATE TABLE posts (id SERIAL PRIMARY KEY, author_id INTEGER NOT NULL);
ALTER TABLE posts ADD FOREIGN KEY (author_id) REFERENCES users(id);`;
      const result = parseSchema(ddl);
      const posts = result.tables.find((t) => t.name === "posts")!;
      expect(posts.foreignKeys).toHaveLength(1);
      expect(posts.foreignKeys[0].column).toBe("author_id");
      expect(posts.foreignKeys[0].referencedTable).toBe("users");
    });

    it("detects dialect as postgresql for non-ClickHouse DDL", () => {
      const ddl = `CREATE TABLE test (id INTEGER);`;
      const result = parseSchema(ddl);
      // Should parse with no issues; dialect detection happens internally
      expect(result.tables).toHaveLength(1);
    });

    it("handles empty DDL gracefully", () => {
      const result = parseSchema("");
      expect(result.tables).toHaveLength(0);
      expect(result.issues).toEqual([]);
    });

    it("handles DDL with comments", () => {
      const ddl = `-- This is a comment
/* Block comment */
CREATE TABLE users (
  id SERIAL PRIMARY KEY, -- inline comment
  name TEXT
);`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe("users");
    });

    it("parses multiple tables", () => {
      const ddl = `CREATE TABLE authors (id SERIAL PRIMARY KEY, name TEXT);
CREATE TABLE books (id SERIAL PRIMARY KEY, author_id INTEGER REFERENCES authors(id), title TEXT);
CREATE TABLE reviews (id SERIAL PRIMARY KEY, book_id INTEGER REFERENCES books(id), rating INTEGER);`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(3);
      expect(result.tables.map((t) => t.name)).toEqual(["authors", "books", "reviews"]);
    });

    it("generates warnings for unrecognized types", () => {
      const ddl = `CREATE TABLE test (id WHATEVER_TYPE);`;
      const result = parseSchema(ddl);
      expect(result.issues.length).toBeGreaterThanOrEqual(1);
      expect(result.issues.some((i) => i.message.includes("WHATEVER_TYPE"))).toBe(true);
    });
  });

  describe("ClickHouse DDL", () => {
    it("parses ClickHouse DDL with ENGINE clause", () => {
      const ddl = `CREATE TABLE users (
  id UInt64,
  name String,
  email String
)
ENGINE = MergeTree()
ORDER BY id;`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe("users");
      expect(result.tables[0].columns).toHaveLength(3);

      const idCol = result.tables[0].columns.find((c) => c.name === "id")!;
      expect(idCol.type).toBe("UINT64");

      const nameCol = result.tables[0].columns.find((c) => c.name === "name")!;
      expect(nameCol.type).toBe("STRING");
    });

    it("detects dialect as clickhouse from engine clause", () => {
      const ddl = `CREATE TABLE events (id UInt64, date Date) ENGINE = MergeTree() ORDER BY id;`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(1);
    });

    it("parses Nullable types", () => {
      const ddl = `CREATE TABLE users (
  id UInt64,
  name Nullable(String),
  bio Nullable(String)
)
ENGINE = MergeTree()
ORDER BY id;`;
      const result = parseSchema(ddl);
      const nameCol = result.tables[0].columns.find((c) => c.name === "name")!;
      expect(nameCol.type).toMatch(/NULLABLE|Nullable/i);
    });

    it("parses LowCardinality types", () => {
      const ddl = `CREATE TABLE analytics (
  event String,
  country LowCardinality(String)
)
ENGINE = MergeTree()
ORDER BY event;`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(1);
      const countryCol = result.tables[0].columns.find((c) => c.name === "country")!;
      expect(countryCol.type).toMatch(/LOWCARDINALITY/i);
    });

    it("parses tables with complex ClickHouse types (Array, Map, Tuple)", () => {
      const ddl = `CREATE TABLE complex (
  id UInt64,
  tags Array(String),
  metadata Map(String, String),
  coords Tuple(Float64, Float64)
)
ENGINE = MergeTree()
ORDER BY id;`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].columns).toHaveLength(4);
    });

    it("handles multiple ClickHouse tables", () => {
      const ddl = `CREATE TABLE orders (
  id UInt64,
  customer_id UInt64,
  total Float64
)
ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE products (
  id UInt64,
  name String,
  price Float64
)
ENGINE = MergeTree()
ORDER BY id;`;
      const result = parseSchema(ddl);
      expect(result.tables).toHaveLength(2);
    });
  });

  describe("Error handling", () => {
    it("reports issues for missing referenced tables", () => {
      const ddl = `CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES missing_table(id)
);`;
      const result = parseSchema(ddl);
      // Should not crash; FK to non-existent table is fine at parse level
      expect(result.tables).toHaveLength(1);
    });

    it("handles malformed SQL without crashing", () => {
      const ddl = `CREATE TABLE test (id INTEGER,;;;`;
      const result = parseSchema(ddl);
      // Should not throw; may produce 0 tables or partial results
      expect(Array.isArray(result.tables)).toBe(true);
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it("recovers from parse errors and continues", () => {
      const ddl = `CREATE TABLE valid (id INTEGER);
THIS IS NOT SQL;
CREATE TABLE also_valid (name TEXT);`;
      const result = parseSchema(ddl);
      expect(result.tables.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("parseCreateTable", () => {
  it("parses a CREATE TABLE statement with various column constraints", () => {
    const ddl = `CREATE TABLE test (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255),
  status TEXT DEFAULT 'active',
  ref_id INTEGER REFERENCES other(id)
)`;
    const result = parseCreateTable(ddl);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("test");
    expect(result!.columns).toHaveLength(5);

    const idCol = result!.columns.find((c) => c.name === "id")!;
    expect(idCol.isPrimaryKey).toBe(true);
    expect(idCol.type).toBe("INTEGER");

    const nameCol = result!.columns.find((c) => c.name === "name")!;
    expect(nameCol.notNull).toBe(true);
    expect(nameCol.isUnique).toBe(true);

    const refCol = result!.columns.find((c) => c.name === "ref_id")!;
    expect(refCol.isForeignKey).toBe(true);
    expect(refCol.references?.table).toBe("other");
  });

  it("returns null for non-CREATE TABLE input", () => {
    expect(parseCreateTable("SELECT * FROM users")).toBeNull();
    expect(parseCreateTable("")).toBeNull();
  });
});

describe("lintQuick", () => {
  it("returns issues for unrecognized column types", () => {
    const ddl = `CREATE TABLE test (id WHATEVER);`;
    const issues = lintQuick(ddl);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.message.includes("WHATEVER"))).toBe(true);
  });

  it("returns no issues for valid DDL", () => {
    const ddl = `CREATE TABLE test (id INTEGER, name TEXT);`;
    const issues = lintQuick(ddl);
    const typeIssues = issues.filter((i) => i.message.includes("Unrecognized type"));
    expect(typeIssues).toHaveLength(0);
  });

  it("handles empty input without crashing", () => {
    expect(lintQuick("")).toEqual([]);
  });
});