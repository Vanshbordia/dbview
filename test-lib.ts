import { Parser } from "node-sql-parser";

const p = new Parser();

const ddl = `CREATE TABLE users (
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

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  tag_id INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE comments ADD CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id);`;

try {
  const r = p.astify(ddl, { database: "postgresql" });
  const arr = Array.isArray(r) ? r : [r];
  console.log("Statements:", arr.length);
  for (const stmt of arr) {
    if (stmt.type === "create" && stmt.keyword === "table") {
      const name = stmt.table[0].table;
      const cols = stmt.create_definitions.filter((d: any) => d.resource === "column").length;
      const fks = stmt.create_definitions.filter((d: any) => d.resource === "constraint" && d.constraint_type === "FOREIGN KEY").length;
      const inlineRefs = stmt.create_definitions.filter((d: any) => d.resource === "column" && d.reference_definition).length;
      console.log("  TABLE", name, "- cols:", cols, "inline FKs:", inlineRefs, "constraint FKs:", fks);
    }
    if (stmt.type === "alter") {
      console.log("  ALTER TABLE", stmt.table[0].table, "- add FK");
    }
  }
} catch (e: any) {
  console.log("PARSE ERROR:", e.message.substring(0, 300));
}

// Test with bad DDL
console.log("\n--- Bad DDL test ---");
const badDdl = "CREATE TABLE users (id VASRCHAR(100) UNIQUE NOT NULLg)";
try {
  p.astify(badDdl, { database: "postgresql" });
  console.log("No error (unexpected)");
} catch (e: any) {
  console.log("Library error:", e.message.substring(0, 200));
}
