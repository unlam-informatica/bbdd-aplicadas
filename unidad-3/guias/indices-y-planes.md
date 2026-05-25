---
layout: default
title: Índices, planes de ejecución y estadísticas
parent: Unidad 3
nav_order: 4
permalink: /unidad-3/guias/indices-y-planes/
---

[← Unidad 3](../)

# Índices, planes de ejecución y estadísticas

---

## Planes de ejecución

Para ver el plan en SSMS: `Ctrl+M` (plan real) o `Ctrl+L` (plan estimado). También se puede activar _Statistics Live Query_ desde el menú Query.

### TABLE SCAN (Heap)

Ocurre cuando la tabla no tiene índice clustered (es un heap). SQL Server debe leer **todas** las páginas.

```sql
USE pruebasDB;
GO

SELECT * FROM ddbba.venta2;
-- Verás TABLE SCAN en el plan de ejecución.
-- Puede ser aceptable si la tabla es muy pequeña (pocas centenas de filas)
-- o si hay un ETL que la borra enseguida. En cualquier otro caso, es una señal de alerta.
```

### CLUSTERED INDEX SEEK

Acceso directo a una fila mediante la clave del índice clustered. Es el operador más eficiente para búsquedas por clave.

```sql
USE StackOverflow2013;
GO

SELECT * FROM dbo.Users WHERE Id = 50;
-- CLUSTERED INDEX SEEK en PK_Users_Id

-- Crear índice clustered si no existe:
CREATE CLUSTERED INDEX pk_users ON dbo.Users(Id);
GO
```

### NONCLUSTERED INDEX SEEK + KEY LOOKUP

Un índice nonclustered contiene solo las columnas indexadas. Si la consulta necesita columnas adicionales, SQL Server hace un **KEY LOOKUP** para buscarlas en el índice clustered — una lectura extra por cada fila encontrada.

```sql
-- Sin índice en DisplayName: TABLE SCAN
SELECT * FROM dbo.Users WHERE DisplayName LIKE 'John';

-- Crear índice nonclustered:
CREATE NONCLUSTERED INDEX ix_displayname ON dbo.Users(DisplayName);
GO

-- Con el índice: NONCLUSTERED INDEX SEEK + KEY LOOKUP (si se piden columnas extra)
SELECT Id FROM dbo.Users WHERE DisplayName LIKE 'John';

-- El KEY LOOKUP aparece porque el índice solo tiene DisplayName + Id (clave clustered).
-- Para columnas adicionales SQL Server vuelve al clustered.
SELECT COUNT(1) FROM dbo.Users WHERE DisplayName LIKE 'John';
GO
```

### Índice de cobertura (INCLUDE)

Agrega columnas adicionales al índice para evitar el KEY LOOKUP. Las columnas en `INCLUDE` no forman parte de la clave de búsqueda pero viajan junto con ella.

```sql
CREATE NONCLUSTERED INDEX ix_displayname_location
    ON dbo.Users(DisplayName)
    INCLUDE (Location);
GO

-- Ahora solo NONCLUSTERED INDEX SEEK, sin KEY LOOKUP:
SELECT Location FROM dbo.Users WHERE DisplayName LIKE 'John';
GO
```

### Plan cache

SQL Server reutiliza planes compilados para evitar el costo de recompilación. Se puede inspeccionar el cache:

```sql
SELECT cplan.usecounts,
       cplan.objtype,
       qtext.text,
       qplan.query_plan
FROM   sys.dm_exec_cached_plans        AS cplan
CROSS APPLY sys.dm_exec_sql_text(plan_handle)   AS qtext
CROSS APPLY sys.dm_exec_query_plan(plan_handle) AS qplan
ORDER BY cplan.usecounts DESC;
GO
```

`usecounts` indica cuántas veces se reutilizó el plan. Una consulta ad hoc con diferencias mínimas (mayúsculas/minúsculas, espacios) puede generar entradas duplicadas en versiones anteriores a SQL Server 2017.

```sql
-- Limpiar el cache de planes (solo en desarrollo/testing):
DBCC FREEPROCCACHE;
GO
```

---

## Estadísticas

Las estadísticas describen la distribución de valores en una columna o índice. El optimizador las usa para estimar la cantidad de filas que devolverá una operación y así elegir el mejor plan.

### Componentes del objeto de estadísticas

| Componente | Descripción |
|------------|-------------|
| **Encabezado** | Información general: nombre, tabla, fecha de última actualización, cantidad de filas muestreadas |
| **Grafo de densidad** | Selectividad (unicidad) de los datos por columna o combinación de columnas |
| **Histograma** | Distribución de frecuencia en hasta **200 puntos** elegidos por el optimizador para representar toda la tabla |

Columnas del histograma:

| Columna | Significado |
|---------|-------------|
| `RANGE_HI_KEY` | Valor más alto del rango (incluye todos los valores desde el `RANGE_HI_KEY` anterior + 1) |
| `RANGE_ROWS` | Filas en el rango (excluyendo las del valor exacto `RANGE_HI_KEY`) |
| `EQ_ROWS` | Filas con valor idéntico al `RANGE_HI_KEY` |
| `DISTINCT_RANGE_ROWS` | Valores únicos en el rango |
| `AVG_RANGE_ROWS` | Promedio de filas por valor distinto (`RANGE_ROWS / DISTINCT_RANGE_ROWS`) |

### Ver estadísticas de un índice

```sql
USE pruebasDB;
GO

-- Crear el índice primero si no existe:
CREATE NONCLUSTERED INDEX ix_ciudad ON ddbba.venta(Ciudad);
GO

-- Ver el histograma:
DBCC SHOW_STATISTICS ('ddbba.venta', ix_ciudad) WITH HISTOGRAM;

-- Ver estadísticas del índice de clave primaria de cliente:
DBCC SHOW_STATISTICS ('ddbba.cliente', ClientesPK) WITH HISTOGRAM;
GO
```

### Estadísticas automáticas

SQL Server crea estadísticas automáticamente sobre columnas usadas en condiciones `WHERE` cuando `AUTO_CREATE_STATISTICS` está habilitado:

```sql
USE StackOverflow2013;
GO

-- Si no hice consultas previas, no existirá la estadística:
DBCC SHOW_STATISTICS ('dbo.Users', Reputation); -- puede fallar

-- Al ejecutar la consulta, SQL Server crea la estadística automáticamente:
SELECT COUNT(1) FROM dbo.Users WHERE Reputation = 5;

-- Ahora sí existe y podemos verla:
DBCC SHOW_STATISTICS ('dbo.Users', Reputation);
-- Observar: EQ_ROWS para Reputation = 5
-- Observar la memoria reservada en el plan

-- Para valores intermedios, el optimizador usa AVG_RANGE_ROWS:
SELECT COUNT(1) FROM dbo.Users WHERE Reputation = 9900;
DBCC SHOW_STATISTICS ('dbo.Users', Reputation);
-- Observar AVG_RANGE_ROWS
GO
```

> Un error grande en la estimación de filas (estimadas vs reales en el plan) indica estadísticas desactualizadas. El optimizador puede elegir un plan subóptimo y reservar más o menos memoria de la necesaria.

### Actualizar estadísticas

```sql
-- Actualizar todas las tablas de todas las DBs (modo masivo):
EXEC sp_MSforeachdb 'USE [?]; EXEC sp_updatestats';

-- Solo DBs de usuario (excluye las del sistema):
DECLARE @tsql NVARCHAR(2000);
SET @tsql = '
IF DB_ID(''?'') > 4
    USE [?]; EXEC sp_updatestats
';
EXEC sp_MSforeachdb @tsql;
GO

USE pruebasDB;
GO

-- Actualizar un índice específico con muestreo del 50 %:
UPDATE STATISTICS ddbba.venta (ix_ciudad)
    WITH SAMPLE 50 PERCENT;

-- Actualizar todos los estadísticos de una tabla con muestreo del 50 %:
UPDATE STATISTICS ddbba.venta
    WITH SAMPLE 50 PERCENT;

-- Muestreo completo de la tabla (más preciso, más costoso):
UPDATE STATISTICS dbo.Users WITH FULLSCAN;
DBCC SHOW_STATISTICS ('dbo.Users', Reputation);
GO
```

### Consultar los estadísticos de una tabla

```sql
SELECT s.stats_id     AS stats_id,
       s.name         AS stats_name,
       sc.stats_column_id AS stats_col_id,
       c.name         AS column_name
FROM   sys.stats            s
JOIN   sys.stats_columns    sc ON s.object_id = sc.object_id AND s.stats_id = sc.stats_id
JOIN   sys.columns          c  ON sc.object_id = c.object_id AND sc.column_id = c.column_id
WHERE  OBJECT_NAME(s.object_id) = 'Users'
ORDER BY s.stats_id, sc.column_id;
GO
```

### Consultar todos los estadísticos (con columna asociada)

```sql
SELECT OBJECT_NAME(s.object_id) AS objeto,
       COL_NAME(sc.object_id, sc.column_id) AS columna,
       s.name AS estadistico
FROM   sys.stats             s
JOIN   sys.stats_columns     sc ON s.stats_id = sc.stats_id AND s.object_id = sc.object_id
ORDER BY s.name;
GO
```

### Actualización sincrónica vs asincrónica

| Modo | Comportamiento |
|------|----------------|
| **Sincrónica** (default) | La consulta espera a que las estadísticas se actualicen antes de ejecutarse. Garantiza que el plan usa datos frescos. |
| **Asincrónica** (`AUTO_UPDATE_STATISTICS_ASYNC ON`) | La consulta se ejecuta con las estadísticas existentes. La actualización ocurre en background para la próxima ejecución. Menor latencia, posible plan desactualizado en la ejecución actual. |

---

## Tipos de índices

### Clustered vs Nonclustered

| Característica | Clustered | Nonclustered |
|----------------|-----------|--------------|
| Orden físico | Define el orden físico de las filas | Copia separada con punteros al clustered |
| Cantidad por tabla | Solo **1** | Hasta **999** |
| Clave por defecto | Se crea con `PRIMARY KEY` | Explícito |
| Lectura de columnas extra | No requiere KEY LOOKUP (los datos están en la hoja) | Requiere KEY LOOKUP si las columnas no están cubiertas |

### Fill factor y page splits

El **fill factor** controla qué porcentaje de cada página de índice se llena al crearlo o reconstruirlo. Un fill factor de 80 deja un 20 % de espacio libre para inserciones futuras, reduciendo los **page splits** (división de páginas cuando se insertan filas en una página llena).

| Fill factor | Uso recomendado |
|-------------|-----------------|
| 100 % | Tablas de solo lectura o inserciones ordenadas |
| 70–90 % | Tablas con inserciones frecuentes en posiciones arbitrarias |

### Rebuild vs Reorganize

| Operación | Descripción | Cuándo usar |
|-----------|-------------|-------------|
| `ALTER INDEX ... REBUILD` | Reconstruye el índice desde cero, actualiza estadísticas | Fragmentación > 30 % |
| `ALTER INDEX ... REORGANIZE` | Desfragmenta en línea, sin actualizar estadísticas | Fragmentación 10–30 % |

### Rowstore vs Columnstore

| Característica | Rowstore (B-tree) | Columnstore |
|----------------|-------------------|-------------|
| Almacenamiento | Por fila | Por columna (compresión alta) |
| Mejor para | OLTP (INSERT/UPDATE/DELETE frecuentes) | OLAP / data warehousing (agregaciones sobre muchas filas) |
| Tipos | Clustered, Nonclustered | Clustered Columnstore, Nonclustered Columnstore |

---

## Consejos de optimización

- Evitar `SELECT *`: solo traer las columnas necesarias.
- Revisar el plan cuando aparece **TABLE SCAN** en tablas grandes — generalmente indica falta de índice o estadísticas desactualizadas.
- Comparar **filas estimadas vs filas reales** en el plan; una diferencia grande indica estadísticas viejas.
- Las **variables de tabla** (`DECLARE @t TABLE ...`) no tienen estadísticas: el optimizador siempre asume 1 fila. Usar **tablas temporales** (`#tmp`) cuando hay más de unos pocos cientos de filas, ya que sí generan estadísticas.
- Los **cursores** son costosos; preferir operaciones basadas en conjuntos.
- Usar `CHAR`/`VARCHAR` en lugar de `NCHAR`/`NVARCHAR` cuando no se necesitan caracteres Unicode: la mitad del almacenamiento.
- Los **stored procedures parametrizados** se compilan una sola vez y el plan se reutiliza. Las consultas ad hoc con literales incrustados generan un plan por cada variante.
- No usar `NOLOCK` indiscriminadamente; solo cuando se aceptan lecturas sucias con datos aproximados (reportes, dashboards).
