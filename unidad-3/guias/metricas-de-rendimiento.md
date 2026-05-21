---
layout: default
title: Métricas de rendimiento
parent: Unidad 3
nav_order: 4
permalink: /unidad-3/guias/metricas-de-rendimiento/
---

[← Unidad 3](../)

# Métricas de rendimiento

Guía para obtener métricas de performance de SQL Server de forma manual mediante vistas de sistema. En producción estas consultas se ejecutan mediante jobs o software especializado que guarda el historial en tablas para analizar tendencias (baseline).

> **Concepto de baseline:** conjunto de métricas tomadas durante operación normal del sistema. Solo comparando contra el baseline se puede determinar si un valor actual es anormal.

---

## Cuenta de filas

### COUNT(*) — simple pero costoso

```sql
USE pruebasDB;
GO
SET STATISTICS IO ON;

SELECT COUNT(*) FROM ddbba.venta;
-- Requiere un INDEX SCAN de toda la tabla.
-- Cuanto más grande la tabla, mayor el impacto en el sistema.
```

### dm_db_partition_stats — rápido y aproximado

```sql
-- Conteo de una tabla específica:
SELECT dm_db_partition_stats.row_count AS cuenta_de_filas
FROM   sys.dm_db_partition_stats
JOIN   sys.objects ON objects.object_id = dm_db_partition_stats.object_id
WHERE  objects.is_ms_shipped = 0
AND    objects.type_desc     = 'USER_TABLE'
AND    objects.name          = 'venta'
AND    dm_db_partition_stats.index_id IN (0, 1);
-- index_id = 0 → heap, index_id = 1 → clustered index

-- Conteo de todas las tablas de usuario de una sola vez:
SELECT  schemas.name                                                         AS esquema,
        objects.name                                                         AS tabla,
        CASE WHEN dm_db_partition_stats.index_id = 1 THEN 'Cluster'
             ELSE 'Heap' END                                                 AS tipo_tabla,
        dm_db_partition_stats.row_count                                      AS cuenta_de_filas
FROM    sys.dm_db_partition_stats
JOIN    sys.objects ON objects.object_id = dm_db_partition_stats.object_id
JOIN    sys.schemas ON schemas.schema_id = objects.schema_id
WHERE   objects.is_ms_shipped = 0
AND     dm_db_partition_stats.index_id IN (0, 1);
```

> Este método devuelve un conteo **aproximado** basado en datos en memoria. Sirve para métricas comparativas. Si se necesita un conteo preciso, usar `COUNT(*)`.

Para detectar novedades entre muestreos se puede filtrar por un campo de timestamp (p. ej. `fecha_modificacion > @ultimo_muestreo`) — más liviano que leer toda la tabla y más preciso que las vistas de sistema.

---

## File IO de la base de datos

`sys.dm_io_virtual_file_stats` acumula lecturas y escrituras desde el último reinicio del servicio SQL Server. **Se resetea cuando se reinicia el servicio** — guardar valores a intervalos para poder calcular deltas.

```sql
SELECT  databases.name                                AS db_nombre,
        master_files.name                             AS db_archivo,
        master_files.type_desc                        AS tipo_archivo,
        master_files.physical_name                    AS nombre_fisico,
        dm_io_virtual_file_stats.num_of_reads         AS lecturas,
        dm_io_virtual_file_stats.num_of_bytes_read    AS bytes_leidos,
        dm_io_virtual_file_stats.num_of_writes        AS escrituras,
        dm_io_virtual_file_stats.num_of_bytes_written AS bytes_escritos,
        dm_io_virtual_file_stats.size_on_disk_bytes   AS tamanio_bytes
FROM    sys.master_files
JOIN    sys.dm_io_virtual_file_stats(NULL, NULL)
        ON  master_files.database_id = dm_io_virtual_file_stats.database_id
        AND master_files.file_id     = dm_io_virtual_file_stats.file_id
JOIN    sys.databases
        ON  databases.database_id = master_files.database_id;
```

Pasos para usarlo como métrica:
1. Ejecutar la query y guardar los resultados.
2. Realizar operaciones en la base de datos.
3. Ejecutar nuevamente y comparar los deltas.

---

## Tamaño del backup de log

El tamaño del backup de log indica aproximadamente el volumen de cambios en la base de datos durante el período. Un backup pequeño indica poca actividad; uno grande indica muchos movimientos.

```sql
SELECT  backupset.database_name                                                  AS database_nombre,
        CAST(8.0 * master_files.size / 1024.0 AS DECIMAL(18, 0))                AS database_archivo_mbs,
        CAST(backupset.backup_size / 1024.0 / 1024.0 AS DECIMAL(18, 2))         AS backup_mbs,
        backupset.backup_start_date                                              AS backup_fecha_inicio,
        backupset.backup_finish_date                                             AS backup_fecha_fin,
        CAST(backupset.backup_finish_date - backupset.backup_start_date AS TIME) AS backup_duracion,
        backupmediafamily.physical_device_name                                   AS ubicacion_fisica_backup
FROM    msdb.dbo.backupset
JOIN    msdb.dbo.backupmediafamily ON backupset.media_set_id = backupmediafamily.media_set_id
JOIN    sys.databases              ON databases.name         = backupset.database_name
JOIN    sys.master_files           ON master_files.database_id = databases.database_id
                                   AND master_files.type_desc  = 'ROWS'
WHERE   backupset.type = 'L'; -- L = Log backup
```

> Los datos se retienen en `msdb` por un período acotado (típicamente al menos un día). También se pueden obtener desde el filesystem via PowerShell.

**Dato frecuente:** un `UPDATE` que establece el mismo valor que ya tenía la fila **igual genera entrada en el transaction log**. Es un recurso común en programación que suele pasarse por alto.

---

## Modelo de recuperación

El modelo de recuperación de la base de datos determina qué información se escribe al transaction log y durante cuánto tiempo se retiene.

| | Simple | Full |
|--|--------|------|
| **Backup de log** | No disponible | Disponible y necesario |
| **Truncado del log** | Automático en cada checkpoint | Solo tras backup de log |
| **Punto de restauración** | Solo al último full/diferencial | Hasta cualquier momento (point-in-time) |
| **Riesgo de pérdida** | Hasta el último backup full/diferencial | Mínimo (hasta el último backup de log) |
| **Tamaño del log** | Se mantiene pequeño | Puede crecer indefinidamente sin backups regulares |
| **Uso típico** | Desarrollo, bases no críticas | Producción, datos críticos |

---

## Esperas activas

Esta query devuelve todas las esperas actuales de procesos de usuario, con el SQL que las genera.

```sql
SELECT  @@SERVERNAME                    AS servidor,
        GETDATE()                       AS hora_local,
        dm_exec_requests.session_id,
        dm_exec_requests.blocking_session_id,
        databases.name                  AS db,
        dm_exec_requests.wait_time,
        dm_exec_requests.wait_resource,
        dm_exec_requests.wait_type,
        dm_exec_sessions.host_name,
        dm_exec_sessions.program_name,
        dm_exec_sessions.login_name,
        dm_exec_requests.command,
        CASE
            WHEN dm_exec_sql_text.text LIKE '%CREATE PROCEDURE%'
            THEN '/* PROC: */ ' + SUBSTRING(dm_exec_sql_text.text,
                     CHARINDEX('CREATE PROCEDURE ', dm_exec_sql_text.text) + 17, 60) + ' ...'
            ELSE SUBSTRING(dm_exec_sql_text.text, 1, 60) + ' ...'
        END AS begin_sql,
        CASE
            WHEN dm_exec_sql_text.text LIKE '%CREATE PROCEDURE%' THEN '/* PROC - VER CODIGO FUENTE */'
            ELSE RTRIM(dm_exec_sql_text.text)
        END AS script,
        SUBSTRING(dm_exec_sql_text.text,
            (dm_exec_requests.statement_start_offset / 2) + 1,
            ((CASE dm_exec_requests.statement_end_offset
                  WHEN -1 THEN DATALENGTH(dm_exec_sql_text.text)
                  ELSE dm_exec_requests.statement_end_offset
              END - dm_exec_requests.statement_start_offset) / 2) + 1) AS wait_sql,
        CONVERT(VARCHAR(MAX), Query_Hash, 1)                           AS query_hash,
        CASE WHEN dm_exec_sql_text.text IS NULL THEN NULL
             ELSE CHECKSUM(dm_exec_sql_text.text) END                  AS checksum_text_hash
FROM    master.sys.dm_exec_requests
JOIN    master.sys.dm_exec_sessions ON dm_exec_requests.session_id   = dm_exec_sessions.session_id
OUTER APPLY master.sys.dm_exec_sql_text(dm_exec_requests.sql_handle)
JOIN    sys.databases               ON databases.database_id         = dm_exec_requests.database_id
WHERE   dm_exec_sessions.is_user_process = 1; -- Solo procesos de usuario
```

Campos clave para filtrar:

| Campo | Descripción |
|-------|-------------|
| `wait_time` | Duración de la espera en ms. Filtrar por un umbral según el sistema. |
| `blocking_session_id` | Session que bloquea a la actual (NULL si no hay bloqueo). |
| `wait_type` | Tipo de espera (LOCK, IO, etc.). Filtrar los que no interesan. |
| `status` | Filtrar `'background'` para quitar procesos internos. |
| `databases.name` | Filtrar solo la(s) DB de interés. |
| `command` | Filtrar backups u otros procesos que no interesen. |

---

## Estrategia de obtención de métricas

1. **Scripts manuales:** útiles para diagnóstico puntual pero no constituyen un baseline.
2. **SQL Agent jobs:** ejecutar los scripts periódicamente y guardar los resultados en tablas de historial.
3. **Dashboard personalizado:** queries sobre las tablas de historial para visualizar tendencias.
4. **Software especializado:** herramientas como SolarWinds DPA, Redgate SQL Monitor, o el propio Activity Monitor de SSMS para monitoreo en tiempo real.

Sin historial comparativo, los valores instantáneos tienen poco significado. La métrica útil es la **variación** respecto al baseline, no el valor absoluto.
