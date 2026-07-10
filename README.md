<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/logo.svg">
    <img src="public/logo.svg" alt="DBView Logo" width="128" height="128">
  </picture>
  <h1 align="center">DBView</h1>
  <p align="center">
    Interactive SQL schema visualizer - turn DDL into ER diagrams instantly.
    <br />
    Free - Private - Browser-first
  </p>
  <p align="center">
    <a href="#features">Features</a> -
    <a href="#getting-started">Getting Started</a> -
    <a href="#usage">Usage</a> -
    <a href="#development">Development</a> -
    <a href="#license">License</a>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
    <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React 19">
    <img src="https://img.shields.io/badge/Vite-8-646CFF" alt="Vite 8">
  </p>
</p>

---

## Features

- **Dual-dialect parsing** - PostgreSQL and ClickHouse DDL with type validation per dialect.
- **Dual parsing strategy** - AST-based via `node-sql-parser`, with automatic regex fallback for complex ClickHouse syntax.
- **Dialect auto-detection** - ClickHouse DDL recognized automatically; no manual switching.
- **Real-time SQL linting** - inline diagnostics as you type.
- **Interactive ER diagrams** - pan, zoom, minimap, auto-layout with connected-component packing.
- **Relationship inference** - one-to-one, one-to-many, many-to-many detected from foreign keys and junction tables.
- **Project management** - create, rename, delete, and switch between projects.
- **Dark / light / system theme** - SSR-safe with flash prevention.
- **SQL file import** - drag or upload `.sql` / `.txt` files.
- **100% client-side** - all data stays in your browser's `localStorage`. No servers, no tracking.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste your DDL, and click **Render**.

## Usage

1. **Write DDL** in the CodeMirror editor (left panel). Real-time linting marks errors inline.
2. **Parse and validate** - the parser auto-detects the dialect, tries the AST parser, then falls back to regex if needed. Foreign keys are cross-referenced for consistency.
3. **Explore the graph** - pan, zoom, click tables for details, follow FK references, toggle between top-to-bottom and left-to-right layout.

### Supported dialects

**PostgreSQL** - Full `CREATE TABLE` syntax including inline and table-level `PRIMARY KEY`, `FOREIGN KEY`, `REFERENCES`, `ALTER TABLE ... ADD FOREIGN KEY`. All standard PG types.

**ClickHouse** - DDL with `ENGINE = ...`, `ORDER BY`, `PARTITION BY`, `Nullable()`, `LowCardinality()`, `Enum8/16()`, `Array()`, `Map()`, `Tuple()`, and all ClickHouse numeric types.

## Project Structure

```
src/
├── lib/
│   ├── schema-parser.ts   # SQL parser and linter
│   ├── graph-builder.ts   # Node/edge graph construction and layout
│   ├── project-store.ts   # localStorage persistence
│   └── type-colors.ts     # Type to color mapping
├── components/schema/     # React components
├── types/schema.ts        # Core data types
├── hooks/                 # Custom hooks
└── routes/                # TanStack Router routes
```

## Development

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Production build
npm run preview   # Preview production build
npm run test      # Run tests
npm run lint      # Biome lint
npm run format    # Biome format
npm run check     # Biome lint + format check
```

## Privacy

DBView stores everything in your browser's `localStorage`. There are no servers, no databases, no analytics, no tracking. Your schema data never leaves your device. To self-host, build and deploy the production build on your own infrastructure.

## License

MIT (c) 2026 [Vansh Bordia](https://github.com/Vanshbordia)