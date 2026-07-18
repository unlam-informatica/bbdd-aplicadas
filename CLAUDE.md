# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Study notes, guides, and SQL exercises for the "Bases de Datos Aplicadas" course at UNLaM. Published as a GitHub Pages site using the `jekyll-theme-midnight` theme (`_config.yml`). GitHub Pages builds and deploys automatically on push — no local build step needed.

## Repository structure

Each unit follows the same internal layout:

```
unidad-N/
├── teoria/      # Full unit summary plus focused reference guides on specific topics
├── practica/    # .sql exercise files
└── images/      # Images referenced from the Markdown files
```

Units 2–6 are planned but not yet created. When adding content, follow the same structure as `unidad-1/`.

## Content conventions

- **Language**: All content is written in Spanish.
- **SQL dialect**: SQL Server / T-SQL (the course uses SQL Server).
- **Markdown**: GitHub-flavored Markdown. Tables, fenced code blocks with language tags (` ```sql `), and heading-based `#` anchors are used throughout. All pages must have Jekyll front matter with at minimum `layout: default` and `title`. Non-index pages (e.g. `teoria/unidad-X.md`) also need an explicit `permalink` so that relative back-links resolve correctly.
- **Teoria files** (`teoria/`) live together in the same folder and come in two flavors: the main unit summary (comprehensive, covers all syllabus topics for that unit) and focused reference guides on a single specific topic with examples (e.g., window functions) — not summaries of the main file. Both are listed together under "Teoría" on the unit's `index.md`, with no separate "Guías" section.
- SQL files in `practica/` contain commented exercises, not runnable scripts with setup DDL.

## Units and syllabus

| Unidad | Topic | Exam |
|--------|-------|------|
| 1 | Conceptos básicos. SQL: DDL, DML, constraints, window functions, CTE, pivot | 1er parcial |
| 2 | BD transaccionales: arquitectura, ODBC/JDBC, collation | 1er parcial |
| 3 | Transacciones, concurrencia, índices, optimización | 1er parcial |
| 4 | NoSQL, MongoDB, Data Lakes, KDD | 2do parcial |
| 5 | Seguridad, DCL, roles, backups, réplicas | 2do parcial |
| 6 | Calidad de datos, GDPR, ISO/IEC 25012 | 2do parcial |
