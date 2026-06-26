# DBView — Interactive Schema Visualizer

Write SQL DDL, get an instant interactive entity-relationship diagram. Supports **PostgreSQL** and **ClickHouse** dialects with real-time linting, dual-parsing strategy, and full project management — all in the browser.

![Tech Stack](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![TanStack](https://img.shields.io/badge/TanStack-Start-FF4154?logo=react) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss) ![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Dual-dialect parsing** — PostgreSQL and ClickHouse DDL with type validation per dialect
- **Dual parsing strategy** — AST-based via `node-sql-parser`, with automatic regex fallback for complex ClickHouse syntax (`Nullable(Enum8(...))`, `LowCardinality`, engine clauses, etc.)
- **Dialect auto-detection** — ClickHouse DDL is recognized automatically; no manual switching needed
- **Real-time SQL linting** — inline diagnostics via CodeMirror lint gutter as you type
- **Interactive ER diagram** — pan, zoom, minimap, auto-layout with connected-component packing
- **Relationship inference** — one-to-one, one-to-many, many-to-many detected automatically from foreign keys and junction tables
- **Table detail panel** — click any table to inspect columns, types, constraints, and all FK references
- **Project management** — create, rename, delete, and switch between projects persisted in `localStorage`
- **Dark / light / system theme** — SSR-safe theme switching with flash prevention
- **SQL file import** — drag or upload `.sql` / `.txt` files
- **CodeMirror 6** editor with SQL syntax highlighting, line wrapping, and one-dark theme

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev), [TanStack Start](https://tanstack.com/start) |
| Graph | [React Flow](https://reactflow.dev) via `@xyflow/react` |
| Layout | [dagre](https://github.com/dagrejs/dagre) with connected-component packing |
| SQL Parsing | `node-sql-parser` + custom regex fallback |
| Editor | [CodeMirror 6](https://codemirror.net) with SQL & lint extensions |
| UI | [Radix UI](https://radix-ui.com) via [shadcn/ui](https://ui.shadcn.com) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com), `tailwind-merge`, `clsx` |
| State | `localStorage` persistence, TanStack Query |
| Lint / Format | [Biome](https://biomejs.dev) |
| Build | [Vite 8](https://vitejs.dev), [Nitro](https://nitro.build) |
| Tests | [Vitest](https://vitest.dev) |

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

Open the browser, paste in your DDL, and click **Render**.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build via Nitro |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest tests |
| `npm run lint` | Biome lint |
| `npm run format` | Biome format |
| `npm run check` | Biome lint + format check |

## How It Works

1. **Write DDL** in the CodeMirror editor (left panel). Real-time linting marks errors and warnings inline.
2. **Parse** — `parseSchema()` strips comments, auto-detects the dialect, tries the AST parser, then falls back to a regex parser if needed.
3. **Validate** — foreign keys are cross-referenced; missing tables produce error-level issues.
4. **Build graph** — `buildGraph()` converts tables to React Flow nodes with auto-layout via dagre. Disconnected schema fragments are independently laid out and packed into a compact grid.
5. **Explore** — pan, zoom, click tables for details, follow FK references, toggle layout direction.

## Project Structure

```
src/
├── components/
│   ├── schema/          # Main app components
│   │   ├── SchemaPage.tsx         # Top-level orchestrator
│   │   ├── SchemaInput.tsx        # CodeMirror editor
│   │   ├── SchemaGraph.tsx        # React Flow graph container
│   │   ├── TableNode.tsx          # Custom table node renderer
│   │   ├── RelationshipEdge.tsx   # Custom edge renderer
│   │   ├── TableInfoPanel.tsx     # Table detail slide-over
│   │   ├── IssuesPanel.tsx        # Lint issues panel
│   │   ├── WelcomeScreen.tsx      # Empty-state landing
│   │   ├── ProjectDialog.tsx      # Create/rename project
│   │   └── SettingsDialog.tsx     # Theme, graph, project settings
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── schema-parser.ts  # SQL parser & linter (both dialects)
│   ├── type-colors.ts    # Type → color mapping + type simplification
│   ├── graph-builder.ts  # Node/edge graph construction & layout
│   └── project-store.ts  # localStorage persistence
├── types/
│   └── schema.ts         # Core data types
├── hooks/
│   └── use-persisted-state.ts
└── routes/
    ├── __root.tsx        # Root layout
    └── index.tsx         # Single-page app
```

## Supported Dialects

### PostgreSQL

Full `CREATE TABLE` syntax including inline and table-level `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `REFERENCES`, `NOT NULL`, `DEFAULT`, `SERIAL`, `ALTER TABLE ... ADD FOREIGN KEY`. All standard PG types (including `JSONB`, `BYTEA`, `OID`, `UUID`, `NUMERIC`).

### ClickHouse

DDL with `ENGINE = ...`, `ORDER BY`, `PARTITION BY`, `SAMPLE BY`, `Nullable()`, `LowCardinality()`, `Enum8/16()`, `Array()`, `Map()`, `Tuple()`, `Nested()`, `IPv4`, `IPv6`, `FixedString`, `DateTime64`, `Date32`, `UInt8`–`UInt256`, `Int8`–`Int256`, `Float32`/`Float64`. Column clauses `CODEC`, `TTL`, `ALIAS`, `MATERIALIZED`, `EPHEMERAL`, `INDEX`, `PROJECTION` are ignored during parsing.

## License

MIT
