---
layout: default
title: Unidad 3
nav_order: 4
has_children: true
---

## BD Transaccionales: aspectos avanzados · 1er parcial

Transacciones, ACID, concurrencia, bloqueos, índices, planes de ejecución, estadísticas, optimización de consultas y métricas de rendimiento.

## Teoría

| Archivo | Tema |
|---------|------|
| [transacciones-concurrencia](./teoria/transacciones-concurrencia/) | Transacciones ACID, modos, TRY/CATCH, fenómenos de concurrencia, niveles de aislamiento, bloqueos, deadlocks, transacciones distribuidas |
| [indices-optimizacion](./teoria/indices-optimizacion/) | Índices clustered/nonclustered, cobertura, fill factor, planes de ejecución, estadísticas, métricas de rendimiento |

## Guías

| Archivo | Tema |
|---------|------|
| [transacciones-y-concurrencia](./guias/transacciones-y-concurrencia/) | XACT_ABORT, laboratorio TCL completo, detección de deadlocks con DMVs, wait stats |
| [indices-y-planes](./guias/indices-y-planes/) | Planes de ejecución, plan cache, estadísticas: histograma, actualización, consultas de sys.stats |
| [metricas-de-rendimiento](./guias/metricas-de-rendimiento/) | dm_db_partition_stats, dm_io_virtual_file_stats, backupset, esperas activas |
| [laboratorio-tcl](./guias/laboratorio-tcl/) | Laboratorio completo: tarjeta de crédito con transacciones anidadas y manejo de errores |
