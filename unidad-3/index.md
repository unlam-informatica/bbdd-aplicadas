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
| [transacciones-y-concurrencia](./teoria/transacciones-y-concurrencia/) | XACT_ABORT, laboratorio TCL completo, detección de deadlocks con DMVs, wait stats |
| [indices-optimizacion](./teoria/indices-optimizacion/) | Índices clustered/nonclustered, cobertura, fill factor, planes de ejecución, estadísticas, métricas de rendimiento |
| [indices-y-planes](./teoria/indices-y-planes/) | Planes de ejecución, plan cache, estadísticas: histograma, actualización, consultas de sys.stats |
| [metricas-de-rendimiento](./teoria/metricas-de-rendimiento/) | dm_db_partition_stats, dm_io_virtual_file_stats, backupset, esperas activas |

## Práctica

| Archivo | Tema |
|---------|------|
| [laboratorio-tcl](./practica/laboratorio-tcl/) | Laboratorio completo: tarjeta de crédito con transacciones anidadas y manejo de errores |
| [laboratorio-aislamiento](./practica/laboratorio-aislamiento/) | Laboratorio de niveles de aislamiento con dos sesiones concurrentes |
