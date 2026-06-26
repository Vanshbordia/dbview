# DBView - Interactive Schema Visualizer

Turn SQL DDL into interactive entity-relationship diagrams instantly. Free, private, and runs entirely in your browser.

## Why DBView?

Schema visualization shouldn't require a SaaS subscription. Existing tools either limit how many tables you can visualize, demand signups, or send your schema to a remote server. DBView is the opposite:

- **Zero setup** - open the page and paste your DDL, that's it
- **No signups, no accounts, no emails**
- **Everything stays in your browser** - all data is persisted locally in `localStorage`
- **No tracking, no telemetry, nothing leaves your device**
- **No table limits** - visualize schemas of any size
- **Self-hostable** - build and deploy on your own infrastructure with one command
- **Free forever**

Built because the need was simple: view database schemas easily, fast, and privately.

## Features

- **Dual-dialect parsing** - PostgreSQL and ClickHouse DDL with type validation per dialect
- **Dual parsing strategy** - AST-based via `node-sql-parser`, with automatic regex fallback for complex ClickHouse syntax (`Nullable(Enum8(...))`, `LowCardinality`, engine clauses, etc.)
- **Dialect auto-detection** - ClickHouse DDL is recognized automatically; no manual switching needed
- **Real-time SQL linting** - inline diagnostics via CodeMirror lint gutter as you type
- **Interactive ER diagram** - pan, zoom, minimap, auto-layout with connected-component packing
- **Relationship inference** - one-to-one, one-to-many, many-to-many detected automatically from foreign keys and junction tables
- **Table detail panel** - click any table to inspect columns, types, constraints, and all FK references
- **Project management** - create, rename, delete, and switch between projects persisted in `localStorage`
- **Dark / light / system theme** - SSR-safe theme switching with flash prevention
- **SQL file import** - drag or upload `.sql` / `.txt` files
- **CodeMirror 6** editor with SQL syntax highlighting, line wrapping, and one-dark theme

## Coming Soon

- MySQL support
- SQLite support
- Additional database dialects

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TanStack Start |
| Graph | React Flow via @xyflow/react |
| Layout | dagre with connected-component packing |
| SQL Parsing | node-sql-parser + custom regex fallback |
| Editor | CodeMirror 6 with SQL & lint extensions |
| UI | Radix UI via shadcn/ui |
| Styling | Tailwind CSS v4, tailwind-merge, clsx |
| State | localStorage persistence, TanStack Query |
| Lint / Format | Biome |
| Build | Vite 8, Nitro |
| Tests | Vitest |

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
2. **Parse** - `parseSchema()` strips comments, auto-detects the dialect, tries the AST parser, then falls back to a regex parser if needed.
3. **Validate** - foreign keys are cross-referenced; missing tables produce error-level issues.
4. **Build graph** - `buildGraph()` converts tables to React Flow nodes with auto-layout via dagre. Disconnected schema fragments are independently laid out and packed into a compact grid.
5. **Explore** - pan, zoom, click tables for details, follow FK references, toggle layout direction.

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
│   ├── type-colors.ts    # Type to color mapping + type simplification
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

DDL with `ENGINE = ...`, `ORDER BY`, `PARTITION BY`, `SAMPLE BY`, `Nullable()`, `LowCardinality()`, `Enum8/16()`, `Array()`, `Map()`, `Tuple()`, `Nested()`, `IPv4`, `IPv6`, `FixedString`, `DateTime64`, `Date32`, `UInt8`-`UInt256`, `Int8`-`Int256`, `Float32`/`Float64`. Column clauses `CODEC`, `TTL`, `ALIAS`, `MATERIALIZED`, `EPHEMERAL`, `INDEX`, `PROJECTION` are ignored during parsing.

## Privacy

DBView stores everything in your browser's `localStorage`. There are no servers, no databases, no analytics, no tracking. Your schema data never leaves your device. If you want total control, build and self-host the production build on your own infrastructure.

## License

MIT

---

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/vanshbordia/dbview)