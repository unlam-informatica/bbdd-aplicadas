---
layout: default
title: Práctica — BD en memoria (In-Memory OLTP)
parent: Unidad 2
nav_order: 15
permalink: /unidad-2/practica/bd-en-memoria/
---

# Práctica — BD en memoria (In-Memory OLTP)

> Ver guía de referencia: [BD en memoria](/unidad-2/guias/bd-en-memoria/)

---

## Setup — Crear base de datos con filegroup en memoria

In-Memory OLTP requiere un filegroup de tipo `MEMORY_OPTIMIZED_DATA`. Esta configuración se hace una sola vez por base de datos.

```sql
USE master;
GO

-- Crear BD si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'PracticaInMemory')
    CREATE DATABASE PracticaInMemory;
GO

USE PracticaInMemory;
GO

-- Agregar el filegroup en memoria (necesario una sola vez)
IF NOT EXISTS (
    SELECT 1 FROM sys.filegroups
    WHERE type = 'FX' AND database_id = DB_ID()
)
BEGIN
    ALTER DATABASE PracticaInMemory
        ADD FILEGROUP mem_fg CONTAINS MEMORY_OPTIMIZED_DATA;

    ALTER DATABASE PracticaInMemory
        ADD FILE (
            NAME = 'PracticaInMemory_mem',
            FILENAME = 'C:\SQLData\PracticaInMemory_mem'  -- ajustar según la ruta del servidor
        )
        TO FILEGROUP mem_fg;
END;
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'mem')
    EXEC('CREATE SCHEMA mem');
GO
```

---

## Ejercicio 1 — Crear tabla en memoria con durabilidad total

Crear la tabla `mem.Sesion` con durabilidad `SCHEMA_AND_DATA` (los datos sobreviven reinicios del servicio).

```sql
USE PracticaInMemory;
GO

DROP TABLE IF EXISTS mem.Sesion;
GO

CREATE TABLE mem.Sesion (
    sesion_id  INT           NOT NULL CONSTRAINT pk_sesion PRIMARY KEY NONCLUSTERED,
    usuario    VARCHAR(100)  NOT NULL,
    inicio     DATETIME2     NOT NULL DEFAULT GETDATE(),
    ip_origen  VARCHAR(45)   NULL,
    activa     BIT           NOT NULL DEFAULT 1
)
WITH (
    MEMORY_OPTIMIZED = ON,
    DURABILITY = SCHEMA_AND_DATA
);
GO
```

> Las tablas en memoria **deben** tener al menos un índice (`PRIMARY KEY` es suficiente). No admiten índices `CLUSTERED`; la PK es `NONCLUSTERED` por defecto.

---

## Ejercicio 2 — Crear tabla en memoria sin durabilidad de datos

Crear la tabla `mem.LogTemporal` con durabilidad `SCHEMA_ONLY` (el esquema persiste pero los datos se pierden al reiniciar el servicio). Útil para datos de sesión o cachés temporales.

```sql
USE PracticaInMemory;
GO

DROP TABLE IF EXISTS mem.LogTemporal;
GO

CREATE TABLE mem.LogTemporal (
    log_id     INT           NOT NULL CONSTRAINT pk_log PRIMARY KEY NONCLUSTERED,
    mensaje    NVARCHAR(500) NOT NULL,
    nivel      VARCHAR(10)   NOT NULL DEFAULT 'INFO',
    timestamp  DATETIME2     NOT NULL DEFAULT GETDATE()
)
WITH (
    MEMORY_OPTIMIZED = ON,
    DURABILITY = SCHEMA_ONLY
);
GO
```

---

## Ejercicio 3 — DML sobre tablas en memoria

Insertar, consultar, actualizar y eliminar filas en `mem.Sesion`.

```sql
USE PracticaInMemory;
GO

-- INSERT: mismo T-SQL que tablas en disco
INSERT INTO mem.Sesion (sesion_id, usuario, ip_origen) VALUES
    (1, 'vtorres',   '192.168.1.10'),
    (2, 'rmendez',   '192.168.1.15'),
    (3, 'salvarado', '10.0.0.42'),
    (4, 'cruiz',     '10.0.0.55'),
    (5, 'emorales',  '172.16.0.3');
GO

-- SELECT
SELECT * FROM mem.Sesion WHERE activa = 1;

-- UPDATE
UPDATE mem.Sesion SET activa = 0 WHERE sesion_id = 3;

-- DELETE
DELETE FROM mem.Sesion WHERE sesion_id = 5;

-- Verificar
SELECT sesion_id, usuario, activa FROM mem.Sesion ORDER BY sesion_id;
```

---

## Ejercicio 4 — Comparar rendimiento: tabla en disco vs. tabla en memoria

Insertar 100.000 filas en dos tablas — una convencional y una en memoria — y comparar los tiempos.

```sql
USE PracticaInMemory;
GO

-- Tabla convencional (en disco)
DROP TABLE IF EXISTS mem.SesionDisco;
CREATE TABLE mem.SesionDisco (
    sesion_id INT          NOT NULL PRIMARY KEY,
    usuario   VARCHAR(100) NOT NULL,
    inicio    DATETIME2    NOT NULL DEFAULT GETDATE()
);

-- Tabla en memoria
DROP TABLE IF EXISTS mem.SesionMem;
GO
CREATE TABLE mem.SesionMem (
    sesion_id INT          NOT NULL CONSTRAINT pk_sesion_mem PRIMARY KEY NONCLUSTERED,
    usuario   VARCHAR(100) NOT NULL,
    inicio    DATETIME2    NOT NULL DEFAULT GETDATE()
)
WITH (MEMORY_OPTIMIZED = ON, DURABILITY = SCHEMA_ONLY);
GO

-- Insertar 100.000 filas en la tabla en DISCO
DECLARE @inicio DATETIME2 = GETDATE();
DECLARE @i INT = 1;

WHILE @i <= 100000
BEGIN
    INSERT INTO mem.SesionDisco (sesion_id, usuario) VALUES (@i, 'usuario_' + CAST(@i AS VARCHAR));
    SET @i = @i + 1;
END

PRINT 'Disco: ' + CAST(DATEDIFF(MILLISECOND, @inicio, GETDATE()) AS VARCHAR) + ' ms';
GO

-- Insertar 100.000 filas en la tabla en MEMORIA
DECLARE @inicio DATETIME2 = GETDATE();
DECLARE @i INT = 1;

WHILE @i <= 100000
BEGIN
    INSERT INTO mem.SesionMem (sesion_id, usuario) VALUES (@i, 'usuario_' + CAST(@i AS VARCHAR));
    SET @i = @i + 1;
END

PRINT 'Memoria: ' + CAST(DATEDIFF(MILLISECOND, @inicio, GETDATE()) AS VARCHAR) + ' ms';
GO
```

> La diferencia se nota más en inserciones concurrentes desde múltiples sesiones. En una sesión única el overhead del loop T-SQL puede dominar el tiempo.

---

## Ejercicio 5 — Consultar metadatos de tablas en memoria

Identificar qué tablas de la base de datos están en memoria usando vistas de sistema.

```sql
USE PracticaInMemory;
GO

-- Listar todas las tablas en memoria de la BD actual
SELECT
    SCHEMA_NAME(t.schema_id) AS esquema,
    t.name                   AS tabla,
    t.durability_desc        AS durabilidad,
    t.is_memory_optimized    AS en_memoria
FROM sys.tables t
WHERE t.is_memory_optimized = 1;

-- Ver el filegroup en memoria
SELECT
    fg.name     AS filegroup,
    fg.type_desc,
    f.name      AS archivo,
    f.physical_name
FROM sys.filegroups fg
JOIN sys.database_files f ON f.data_space_id = fg.data_space_id
WHERE fg.type = 'FX';
```

---

## Ejercicio 6 — Restricciones de tablas en memoria

Intentar operaciones no soportadas y observar los errores. Las tablas en memoria tienen un subconjunto de las funcionalidades de tablas normales.

```sql
USE PracticaInMemory;
GO

-- 1. ALTER TABLE no está soportado (error esperado)
-- ALTER TABLE mem.Sesion ADD columna_nueva VARCHAR(50);

-- 2. FOREIGN KEY hacia tabla en disco no está soportado (error esperado)
-- CREATE TABLE mem.Detalle (
--     id INT PRIMARY KEY NONCLUSTERED,
--     sesion_id INT REFERENCES mem.SesionDisco(sesion_id)  -- FK a tabla en disco: ERROR
-- ) WITH (MEMORY_OPTIMIZED = ON, DURABILITY = SCHEMA_ONLY);

-- 3. IDENTITY funciona normalmente:
DROP TABLE IF EXISTS mem.Contador;
GO
CREATE TABLE mem.Contador (
    id        INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_cnt PRIMARY KEY NONCLUSTERED,
    descripcion VARCHAR(100)    NOT NULL
)
WITH (MEMORY_OPTIMIZED = ON, DURABILITY = SCHEMA_ONLY);
GO

INSERT INTO mem.Contador (descripcion) VALUES ('A'), ('B'), ('C');
SELECT * FROM mem.Contador;
```

**Preguntas**:
- ¿Por qué `ALTER TABLE` no está soportado en tablas en memoria? (Pista: requiere recrear la tabla completa en memoria.)
- ¿En qué escenarios de producción conviene usar `SCHEMA_ONLY` en vez de `SCHEMA_AND_DATA`?
