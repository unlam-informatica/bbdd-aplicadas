---
layout: default
title: Índices y Optimización
parent: Teoría
grand_parent: Unidad 3
nav_order: 2
permalink: /unidad-3/teoria/indices-optimizacion/
---

- [Índices](#índices)
  - [Índice clustered](#índice-clustered)
  - [Índice nonclustered](#índice-nonclustered)
  - [Índice de cobertura (INCLUDE)](#índice-de-cobertura-include)
  - [Fill factor y page splits](#fill-factor-y-page-splits)
  - [Rebuild vs Reorganize](#rebuild-vs-reorganize)
  - [Rowstore vs Columnstore](#rowstore-vs-columnstore)
- [Planes de ejecución](#planes-de-ejecución)
  - [TABLE SCAN](#table-scan)
  - [INDEX SEEK vs INDEX SCAN](#index-seek-vs-index-scan)
  - [KEY LOOKUP](#key-lookup)
- [Estadísticas](#estadísticas)
- [Métricas de rendimiento](#métricas-de-rendimiento)
  - [Baseline](#baseline)
  - [Modelo de recuperación](#modelo-de-recuperación)

# Índices y Optimización

## Índices

Un índice es una estructura auxiliar que organiza una copia de los datos de una o más columnas para acelerar las búsquedas. La analogía es el índice al final de un libro: en lugar de leer todo el libro para encontrar un tema, se va directo a la página correcta.

Sin índice, SQL Server debe recorrer **todas** las filas de la tabla para cada búsqueda (TABLE SCAN o HEAP SCAN). Con índice, puede ir directamente a las filas que satisfacen la condición (INDEX SEEK).

### Índice clustered

Determina el **orden físico** de las filas en la tabla. Las filas se almacenan en el orden de la clave del índice — es la "tabla misma". Cada tabla puede tener **solo uno**.

- Se crea automáticamente con la `PRIMARY KEY` (salvo indicación contraria).
- Las columnas del clustered son la referencia que usan todos los índices nonclustered para hacer KEY LOOKUP.

```sql
-- Crear índice clustered explícito:
CREATE CLUSTERED INDEX ix_ventas_fecha ON dbo.Ventas(Fecha);

-- Ver índices de una tabla:
SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Ventas');
```

### Índice nonclustered

Estructura separada que contiene las columnas indexadas más un puntero a la fila del clustered. Una tabla puede tener hasta **999** índices nonclustered.

```sql
CREATE NONCLUSTERED INDEX ix_clientes_apellido ON dbo.Clientes(Apellido);
```

Si la consulta necesita columnas que no están en el índice, SQL Server debe hacer un KEY LOOKUP al índice clustered por cada fila encontrada — una lectura extra que puede ser costosa.

### Índice de cobertura (INCLUDE)

Agrega columnas al índice con `INCLUDE` para evitar el KEY LOOKUP. Las columnas incluidas no participan en el orden/búsqueda pero viajan con el índice.

```sql
-- Sin INCLUDE: INDEX SEEK + KEY LOOKUP para obtener Email
CREATE NONCLUSTERED INDEX ix_apellido ON dbo.Clientes(Apellido);

-- Con INCLUDE: solo INDEX SEEK, sin KEY LOOKUP
CREATE NONCLUSTERED INDEX ix_apellido_cov ON dbo.Clientes(Apellido)
    INCLUDE (Email, Telefono);
```

### Fill factor y page splits

El **fill factor** define qué porcentaje de cada página de índice se llena al crearlo o reconstruirlo. Un fill factor de 80 deja un 20 % libre para inserciones futuras.

Cuando una página se llena completamente y llega una nueva fila, SQL Server divide la página en dos (**page split**), lo que genera fragmentación y uso adicional de disco/IO.

| Fill factor | Cuándo usar |
|-------------|-------------|
| 100 % | Tablas de solo lectura o de inserciones estrictamente ordenadas |
| 70–90 % | Tablas con inserciones frecuentes en posiciones arbitrarias |

### Rebuild vs Reorganize

La fragmentación acumulada degrada el rendimiento. Hay dos operaciones para corregirla:

| Operación | Comportamiento | Cuándo aplicar |
|-----------|---------------|----------------|
| `ALTER INDEX ... REBUILD` | Reconstruye el índice desde cero; actualiza estadísticas; puede hacerse online (`WITH (ONLINE = ON)`) | Fragmentación > 30 % |
| `ALTER INDEX ... REORGANIZE` | Desfragmenta en línea sin bloquear; no actualiza estadísticas | Fragmentación 10–30 % |

```sql
-- Ver fragmentación:
SELECT avg_fragmentation_in_percent, index_id
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('dbo.Ventas'), NULL, NULL, 'LIMITED');

-- Reconstruir todos los índices de una tabla:
ALTER INDEX ALL ON dbo.Ventas REBUILD;

-- Reorganizar un índice específico:
ALTER INDEX ix_clientes_apellido ON dbo.Clientes REORGANIZE;
```

### Rowstore vs Columnstore

| Característica | Rowstore (B-tree) | Columnstore |
|----------------|-------------------|-------------|
| Almacenamiento | Por fila | Por columna — compresión muy alta |
| Mejor para | OLTP (lecturas/escrituras individuales frecuentes) | OLAP / analítica (agregaciones sobre millones de filas) |
| Tipos | Clustered, Nonclustered | Clustered Columnstore, Nonclustered Columnstore |

---

## Planes de ejecución

El plan de ejecución muestra **cómo** SQL Server resolvió una consulta: qué índices usó, en qué orden juntó las tablas, qué operadores aplicó y el costo estimado de cada paso.

En SSMS: `Ctrl+M` activa el plan real (se ejecuta la consulta); `Ctrl+L` muestra el plan estimado (sin ejecutar).

### TABLE SCAN

Ocurre cuando la tabla no tiene índice clustered (es un **heap**) o cuando SQL Server decide que leer toda la tabla es más eficiente que usar un índice. En tablas grandes es siempre una señal de alerta — indica falta de índice o estadísticas desactualizadas.

### INDEX SEEK vs INDEX SCAN

- **INDEX SEEK**: SQL Server navega el árbol B del índice y accede directamente a las filas relevantes. Es el operador más eficiente.
- **INDEX SCAN**: recorre todas las hojas del índice. Puede ser correcto si se necesitan muchas filas; es un problema si se esperaban pocas.

La diferencia entre ambos suele ser la selectividad del filtro `WHERE` y la disponibilidad de estadísticas actualizadas.

### KEY LOOKUP

Aparece junto a un NONCLUSTERED INDEX SEEK cuando la consulta necesita columnas que el índice no cubre. SQL Server busca en el índice nonclustered y luego hace una segunda búsqueda en el clustered por cada fila encontrada. Si el KEY LOOKUP afecta muchas filas, puede ser más costoso que un TABLE SCAN.

**Solución**: crear un índice de cobertura con `INCLUDE` para las columnas adicionales.

Ver la [guía de Índices, planes de ejecución y estadísticas](/unidad-3/guias/indices-y-planes/) para las queries de plan cache, ejemplos con StackOverflow2013 y el detalle completo de operadores.

---

## Estadísticas

Las estadísticas son objetos que describen la **distribución de valores** en una columna o índice. El optimizador las usa para estimar cuántas filas devolverá cada operación y así elegir el plan más eficiente.

Cada objeto de estadísticas contiene:

| Componente | Descripción |
|------------|-------------|
| **Encabezado** | Nombre, tabla, fecha de última actualización, filas muestreadas |
| **Grafo de densidad** | Selectividad (unicidad) de los datos por columna |
| **Histograma** | Distribución de frecuencia en hasta 200 puntos muestrales |

Una diferencia grande entre **filas estimadas y filas reales** en el plan de ejecución indica estadísticas desactualizadas. El optimizador puede elegir un plan subóptimo y reservar memoria de forma incorrecta.

```sql
-- Ver estadísticas de un índice:
DBCC SHOW_STATISTICS ('dbo.Clientes', ix_apellido) WITH HISTOGRAM;

-- Actualizar estadísticas de una tabla:
UPDATE STATISTICS dbo.Clientes WITH SAMPLE 50 PERCENT;

-- Actualizar todas las tablas de una BD:
EXEC sp_updatestats;
```

SQL Server actualiza estadísticas automáticamente cuando `AUTO_UPDATE_STATISTICS = ON` (activado por defecto), pero puede no hacerlo con la frecuencia necesaria en tablas muy grandes. En esos casos conviene programar actualizaciones manuales periódicas.

**Variables de tabla vs tablas temporales**: las variables de tabla (`DECLARE @t TABLE ...`) no tienen estadísticas — el optimizador asume siempre 1 fila. Las tablas temporales (`#tmp`) sí las generan, lo que produce mejores planes cuando el volumen es significativo.

Ver la [guía de Índices, planes de ejecución y estadísticas](/unidad-3/guias/indices-y-planes/) para la sintaxis completa de `UPDATE STATISTICS`, `sp_MSforeachdb` y las columnas del histograma.

---

## Métricas de rendimiento

### Baseline

Un **baseline** es un conjunto de métricas tomadas durante la operación normal del sistema. Sin baseline no hay referencia: un valor instantáneo (p. ej. 500 lecturas/s) no dice nada por sí solo. La métrica útil es la **variación** respecto al estado normal.

Las métricas clave para monitorear SQL Server son:

| Métrica | Fuente | Qué indica |
|---------|--------|------------|
| Conteo de filas por tabla | `sys.dm_db_partition_stats` | Crecimiento de datos |
| IO de archivos de BD | `sys.dm_io_virtual_file_stats` | Presión en disco por archivo |
| Tamaño del backup de log | `msdb.dbo.backupset` | Volumen de cambios en el período |
| Esperas activas (wait stats) | `sys.dm_exec_requests` | Bloqueos, contención, cuellos de botella |

Estrategia de obtención:

1. **Scripts manuales**: útiles para diagnóstico puntual, no constituyen un baseline.
2. **SQL Agent jobs**: ejecutar los scripts periódicamente y guardar resultados en tablas de historial.
3. **Software especializado**: Activity Monitor (SSMS), SolarWinds DPA, Redgate SQL Monitor.

### Modelo de recuperación

El modelo de recuperación de la base de datos determina qué se escribe al transaction log y cómo se retiene.

| | Simple | Full |
|--|--------|------|
| **Backup de log** | No disponible | Disponible y necesario |
| **Truncado del log** | Automático en cada checkpoint | Solo tras backup de log |
| **Punto de restauración** | Solo al último full/diferencial | Hasta cualquier momento (point-in-time) |
| **Riesgo de pérdida de datos** | Hasta el último backup | Mínimo (hasta el último log backup) |
| **Tamaño del log** | Se mantiene pequeño | Puede crecer indefinidamente sin backups regulares |
| **Uso típico** | Desarrollo, bases no críticas | Producción, datos críticos |

Ver la [guía de Métricas de rendimiento](/unidad-3/guias/metricas-de-rendimiento/) para las queries completas de `dm_db_partition_stats`, `dm_io_virtual_file_stats`, backupset y esperas activas.
