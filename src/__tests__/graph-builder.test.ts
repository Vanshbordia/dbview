import { describe, it, expect } from "vitest";
import { buildGraph } from "#/lib/graph-builder.ts";
import type { ParsedSchema, TableSchema } from "#/types/schema.ts";

function makeTable(overrides: Partial<TableSchema> & { name: string }): TableSchema {
  return {
    schema: "public",
    columns: [],
    foreignKeys: [],
    primaryKey: [],
    ...overrides,
  };
}

describe("buildGraph", () => {
  it("returns empty nodes and edges for empty schema", () => {
    const schema: ParsedSchema = { tables: [], issues: [] };
    const { nodes, edges } = buildGraph(schema);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it("creates a node for each table", () => {
    const schema: ParsedSchema = {
      tables: [
        makeTable({ name: "users", columns: [{ name: "id", type: "SERIAL", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null }] }),
        makeTable({ name: "posts", columns: [{ name: "id", type: "SERIAL", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null }] }),
      ],
      issues: [],
    };
    const { nodes, edges } = buildGraph(schema);
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.id)).toContain("users");
    expect(nodes.map((n) => n.id)).toContain("posts");
    expect(edges).toHaveLength(0);
  });

  it("creates edges for foreign key relationships", () => {
    const schema: ParsedSchema = {
      tables: [
        makeTable({
          name: "users",
          columns: [
            { name: "id", type: "SERIAL", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null },
          ],
          primaryKey: ["id"],
        }),
        makeTable({
          name: "posts",
          columns: [
            { name: "id", type: "SERIAL", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null },
            { name: "author_id", type: "INTEGER", isPrimaryKey: false, isForeignKey: true, isUnique: false, notNull: true, defaultValue: null, references: { table: "users", column: "id" } },
          ],
          foreignKeys: [
            { name: "posts_author_id_fkey", column: "author_id", referencedTable: "users", referencedColumn: "id", isUnique: false },
          ],
          primaryKey: ["id"],
        }),
      ],
      issues: [],
    };
    const { nodes, edges } = buildGraph(schema);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("users");
    expect(edges[0].target).toBe("posts");
  });

  it("detects one-to-one relationships for unique FK columns", () => {
    const schema: ParsedSchema = {
      tables: [
        makeTable({
          name: "users",
          columns: [
            { name: "id", type: "SERIAL", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null },
          ],
          primaryKey: ["id"],
        }),
        makeTable({
          name: "profiles",
          columns: [
            { name: "id", type: "INTEGER", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null },
            { name: "user_id", type: "INTEGER", isPrimaryKey: false, isForeignKey: true, isUnique: true, notNull: true, defaultValue: null, references: { table: "users", column: "id" } },
          ],
          foreignKeys: [
            { name: "profiles_user_id_fkey", column: "user_id", referencedTable: "users", referencedColumn: "id", isUnique: true },
          ],
          primaryKey: ["id"],
        }),
      ],
      issues: [],
    };
    const { edges } = buildGraph(schema);
    expect(edges).toHaveLength(1);
    expect(edges[0].data?.type).toBe("one-to-one");
  });

  it("detects many-to-many relationships via junction tables", () => {
    const schema: ParsedSchema = {
      tables: [
        makeTable({
          name: "posts",
          columns: [
            { name: "id", type: "SERIAL", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null },
          ],
          primaryKey: ["id"],
        }),
        makeTable({
          name: "tags",
          columns: [
            { name: "id", type: "SERIAL", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null },
          ],
          primaryKey: ["id"],
        }),
        makeTable({
          name: "posts_tags",
          columns: [
            { name: "post_id", type: "INTEGER", isPrimaryKey: true, isForeignKey: true, isUnique: false, notNull: true, defaultValue: null, references: { table: "posts", column: "id" } },
            { name: "tag_id", type: "INTEGER", isPrimaryKey: true, isForeignKey: true, isUnique: false, notNull: true, defaultValue: null, references: { table: "tags", column: "id" } },
          ],
          foreignKeys: [
            { name: "posts_tags_post_id_fkey", column: "post_id", referencedTable: "posts", referencedColumn: "id", isUnique: false },
            { name: "posts_tags_tag_id_fkey", column: "tag_id", referencedTable: "tags", referencedColumn: "id", isUnique: false },
          ],
          primaryKey: ["post_id", "tag_id"],
        }),
      ],
      issues: [],
    };
    const { edges } = buildGraph(schema);
    // Each FK from junction table creates an edge
    expect(edges).toHaveLength(2);
    // Both should be many-to-many since junction table
    expect(edges.every((e) => e.data?.type === "many-to-many")).toBe(true);
  });

  it("supports LR layout direction", () => {
    const schema: ParsedSchema = {
      tables: [
        makeTable({
          name: "a",
          columns: [{ name: "id", type: "INTEGER", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null }],
          primaryKey: ["id"],
        }),
        makeTable({
          name: "b",
          columns: [
            { name: "id", type: "INTEGER", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null },
            { name: "a_id", type: "INTEGER", isPrimaryKey: false, isForeignKey: true, isUnique: false, notNull: true, defaultValue: null, references: { table: "a", column: "id" } },
          ],
          foreignKeys: [{ name: "b_a_id_fkey", column: "a_id", referencedTable: "a", referencedColumn: "id", isUnique: false }],
          primaryKey: ["id"],
        }),
      ],
      issues: [],
    };
    const { nodes, edges } = buildGraph(schema, "LR");
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    // Nodes should have different x positions (LR layout)
    expect(nodes[0].position.x).not.toBe(nodes[1].position.x);
  });

  it("marks errored tables when erroredTables set is provided", () => {
    const schema: ParsedSchema = {
      tables: [
        makeTable({
          name: "good",
          columns: [{ name: "id", type: "INTEGER", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null }],
        }),
        makeTable({
          name: "bad",
          columns: [{ name: "id", type: "INTEGER", isPrimaryKey: true, isForeignKey: false, isUnique: false, notNull: true, defaultValue: null, references: null }],
        }),
      ],
      issues: [],
    };
    const { nodes } = buildGraph(schema, "TB", "bezier", new Set(["bad"]));
    const goodNode = nodes.find((n) => n.id === "good")!;
    const badNode = nodes.find((n) => n.id === "bad")!;
    expect(goodNode.data.hasError).toBe(false);
    expect(badNode.data.hasError).toBe(true);
  });
});