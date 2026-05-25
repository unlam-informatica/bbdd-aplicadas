---
layout: default
title: Unidad 2
nav_order: 3
has_children: true
---

## BD Transaccionales: aspectos básicos · 1er parcial

Bases de datos transaccionales (OLTP), propiedades ACID, commit/rollback, OLTP vs OLAP. BD vs Data Warehouse vs Data Lake. Arquitectura distribuida y clústeres. Motor SQL Server: instalación, SSMS, Configuration Manager, conexión remota, autenticación. Collation / intercalación. BD en memoria (In-Memory OLTP). ODBC y JDBC. Formatos de intercambio: EDI, CSV, XML, JSON, YAML. APIs REST.

## Teoría

| Archivo | Tema |
|---------|------|
| [bd-transaccionales](./teoria/bd-transaccionales/) | OLTP, ACID, concurrencia, niveles de aislamiento, OLAP, DWH, SQL Server motor |
| [formatos-conectividad](./teoria/formatos-conectividad/) | ODBC/JDBC, formatos EDI/CSV/XML/JSON/YAML, APIs REST |

## Guías

| Archivo | Tema |
|---------|------|
| [collation](./guias/collation/) | Collation en SQL Server: sensibilidades, niveles, consultas y cláusula COLLATE |
| [bd-en-memoria](./guias/bd-en-memoria/) | Tablas en memoria (In-Memory OLTP): configuración, índices, comparativa |
| [formatos-de-intercambio](./guias/formatos-de-intercambio/) | EDI, CSV, XML, JSON, YAML: ejemplos y operaciones T-SQL |
| [importacion-de-archivos](./guias/importacion-de-archivos/) | BULK INSERT (CSV) y OPENROWSET + OPENJSON (JSON): sintaxis y opciones |
| [json-en-sql](./guias/json-en-sql/) | OPENJSON, FOR JSON, JSON_VALUE/QUERY/MODIFY: parseo y generación de JSON |
| [xml-en-sql](./guias/xml-en-sql/) | Importar XML con OPENROWSET + .nodes(), OPENXML y exportar con FOR XML |
| [apis-desde-sql](./guias/apis-desde-sql/) | Llamadas HTTP desde T-SQL con Ole Automation Procedures: GET y POST |
| [transacciones](./guias/transacciones/) | BEGIN/COMMIT/ROLLBACK, TRY/CATCH, XACT_ABORT, niveles de aislamiento, deadlocks |

## Práctica

| Archivo | Tema |
|---------|------|
| [importacion-archivos](./practica/importacion-archivos/) | 4 ejercicios de importación: 3 CSV (datos abiertos) + 1 JSON |
| [tp2](./practica/tp2/) | TP2: collation, importación de CSVs, percentiles, tablas temporales globales |
| [transacciones](./practica/transacciones/) | BEGIN/COMMIT/ROLLBACK, TRY/CATCH, SAVEPOINT, XACT_ABORT, aislamiento |
| [json](./practica/json/) | OPENJSON, JSON_VALUE/QUERY/MODIFY, FOR JSON PATH/AUTO |
| [xml](./practica/xml/) | FOR XML RAW/AUTO, .nodes()/.value(), OPENXML, subconsultas anidadas |
| [bd-en-memoria](./practica/bd-en-memoria/) | Crear filegroup, tablas MEMORY_OPTIMIZED, comparativa disco vs. memoria |
| [apis](./practica/apis/) | GET/POST con sp_OACreate, parseo de respuestas JSON, persistir resultados |
