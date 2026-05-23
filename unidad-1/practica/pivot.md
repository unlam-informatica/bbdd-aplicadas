---
layout: default
title: Práctica - Pivot
parent: Unidad 1
nav_order: 9
permalink: /unidad-1/practica/pivot/
---

# Práctica — PIVOT

> Ejercicios sobre `PIVOT`, `UNPIVOT` y PIVOT dinámico en SQL Server. Base de datos `PracticaPivot`, esquema `pv`.

---

## Setup — Crear base de datos, esquema y tablas

```sql
USE master
GO

IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = 'PracticaPivot')
BEGIN
    CREATE DATABASE PracticaPivot
    COLLATE Latin1_General_CI_AI
END
GO

USE PracticaPivot
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'pv')
BEGIN
    EXEC('CREATE SCHEMA pv')
END
GO

-- Tabla de ventas (una fila por venta individual)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pv' AND TABLE_NAME = 'Venta')
BEGIN
    CREATE TABLE pv.Venta (
        venta_id INT          IDENTITY(1,1) PRIMARY KEY,
        vendedor VARCHAR(50)  NOT NULL,
        mes      VARCHAR(10)  NOT NULL,
        producto VARCHAR(50)  NOT NULL,
        monto    DECIMAL(10,2) NOT NULL
    )
END
GO

INSERT INTO pv.Venta (vendedor, mes, producto, monto)
VALUES
    -- Ana (presente los 6 meses, con dos ventas en Enero)
    ('Ana',    'Enero',   'Laptop',   1500.00),
    ('Ana',    'Enero',   'Teclado',   300.00),
    ('Ana',    'Febrero', 'Monitor',  2000.00),
    ('Ana',    'Marzo',   'Laptop',   1800.00),
    ('Ana',    'Abril',   'Impresora',2200.00),
    ('Ana',    'Mayo',    'Laptop',   1600.00),
    ('Ana',    'Junio',   'Monitor',  2500.00),

    -- Luis (sin ventas en Abril)
    ('Luis',   'Enero',   'Teclado',   900.00),
    ('Luis',   'Febrero', 'Mouse',    1100.00),
    ('Luis',   'Marzo',   'Teclado',   800.00),
    ('Luis',   'Mayo',    'Mouse',    1200.00),
    ('Luis',   'Junio',   'Teclado',  1400.00),

    -- Marta (presente los 6 meses)
    ('Marta',  'Enero',   'Monitor',  2100.00),
    ('Marta',  'Febrero', 'Laptop',   1700.00),
    ('Marta',  'Marzo',   'Monitor',  2300.00),
    ('Marta',  'Abril',   'Laptop',   1900.00),
    ('Marta',  'Mayo',    'Monitor',  2100.00),
    ('Marta',  'Junio',   'Laptop',   2800.00),

    -- Carlos (se incorporó en Marzo)
    ('Carlos', 'Marzo',   'Mouse',     500.00),
    ('Carlos', 'Abril',   'Mouse',     700.00),
    ('Carlos', 'Mayo',    'Teclado',   600.00)
GO

-- Tabla de notas finales de alumnos
-- No todos los alumnos tienen nota en todas las materias
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pv' AND TABLE_NAME = 'NotaFinal')
BEGIN
    CREATE TABLE pv.NotaFinal (
        alumno  VARCHAR(50)   NOT NULL,
        materia VARCHAR(50)   NOT NULL,
        nota    DECIMAL(4, 1) NOT NULL,
        PRIMARY KEY (alumno, materia)
    )
END
GO

INSERT INTO pv.NotaFinal (alumno, materia, nota)
VALUES
    ('Juan',   'Matemáticas', 7.0),
    ('Juan',   'Historia',    9.0),
    ('Juan',   'Inglés',      8.0),
    -- Juan no tiene nota en Física

    ('María',  'Matemáticas', 6.0),
    ('María',  'Física',      8.0),
    -- María no tiene Historia ni Inglés

    ('Pedro',  'Historia',   10.0),
    ('Pedro',  'Inglés',      7.0),
    ('Pedro',  'Física',      9.0),
    -- Pedro no tiene Matemáticas

    ('Laura',  'Matemáticas', 8.0),
    ('Laura',  'Historia',    8.0),
    ('Laura',  'Inglés',      9.0),
    ('Laura',  'Física',      7.0)
GO

-- Tabla ya pivoteada por trimestre — se usa para UNPIVOT
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pv' AND TABLE_NAME = 'ResumenTrimestral')
BEGIN
    CREATE TABLE pv.ResumenTrimestral (
        departamento VARCHAR(50)   NOT NULL PRIMARY KEY,
        Q1           DECIMAL(10,2) NULL,
        Q2           DECIMAL(10,2) NULL,
        Q3           DECIMAL(10,2) NULL,
        Q4           DECIMAL(10,2) NULL
    )
END
GO

INSERT INTO pv.ResumenTrimestral (departamento, Q1, Q2, Q3, Q4)
VALUES
    ('IT',     120.00, 150.00, 130.00, 200.00),
    ('Ventas', 300.00, 280.00, 320.00, 410.00),
    ('RRHH',    80.00,  95.00,   NULL, 110.00)
GO
```

---

## Ejercicio 1 — PIVOT estático: monto total por vendedor y mes

Obtener el monto total vendido por cada vendedor para cada mes del primer semestre. Las columnas deben ser los meses en orden cronológico. Si un vendedor no tuvo ventas en un mes, mostrar `NULL`.

```sql
SELECT vendedor, [Enero], [Febrero], [Marzo], [Abril], [Mayo], [Junio]
FROM (
    SELECT vendedor, mes, monto
    FROM pv.Venta
) AS origen
PIVOT (
    SUM(monto)
    FOR mes IN ([Enero], [Febrero], [Marzo], [Abril], [Mayo], [Junio])
) AS pv
ORDER BY vendedor
GO
```

| vendedor | Enero  | Febrero | Marzo  | Abril  | Mayo   | Junio  |
|----------|-------:|--------:|-------:|-------:|-------:|-------:|
| Ana      | 1800.00| 2000.00 | 1800.00| 2200.00| 1600.00| 2500.00|
| Carlos   | NULL   | NULL    | 500.00 | 700.00 | 600.00 | NULL   |
| Luis     | 900.00 | 1100.00 | 800.00 | NULL   | 1200.00| 1400.00|
| Marta    | 2100.00| 1700.00 | 2300.00| 1900.00| 2100.00| 2800.00|

> Nota: Ana tenía dos ventas en Enero (1500 + 300) → `SUM` las acumula automáticamente.

---

## Ejercicio 2 — ISNULL: reemplazar celdas vacías por cero

Repetir el ejercicio anterior pero reemplazando los `NULL` con `0` para facilitar la lectura del reporte.

```sql
SELECT
    vendedor,
    ISNULL([Enero],   0) AS Enero,
    ISNULL([Febrero], 0) AS Febrero,
    ISNULL([Marzo],   0) AS Marzo,
    ISNULL([Abril],   0) AS Abril,
    ISNULL([Mayo],    0) AS Mayo,
    ISNULL([Junio],   0) AS Junio
FROM (
    SELECT vendedor, mes, monto
    FROM pv.Venta
) AS origen
PIVOT (
    SUM(monto)
    FOR mes IN ([Enero], [Febrero], [Marzo], [Abril], [Mayo], [Junio])
) AS pv
ORDER BY vendedor
GO
```

---

## Ejercicio 3 — PIVOT con COUNT: cantidad de ventas por vendedor y mes

En vez de acumular montos, contar cuántas ventas individuales realizó cada vendedor por mes.

```sql
SELECT vendedor, [Enero], [Febrero], [Marzo], [Abril], [Mayo], [Junio]
FROM (
    SELECT vendedor, mes, venta_id
    FROM pv.Venta
) AS origen
PIVOT (
    COUNT(venta_id)
    FOR mes IN ([Enero], [Febrero], [Marzo], [Abril], [Mayo], [Junio])
) AS pv
ORDER BY vendedor
GO
```

> Con `COUNT`, las celdas sin datos muestran `0` en vez de `NULL`.

---

## Ejercicio 4 — PIVOT estático: notas por alumno y materia

Mostrar una tabla donde cada fila es un alumno y cada columna es una materia. Reemplazar los `NULL` (materias sin nota) con el valor `0`.

```sql
SELECT
    alumno,
    ISNULL([Matemáticas], 0) AS Matemáticas,
    ISNULL([Historia],    0) AS Historia,
    ISNULL([Inglés],      0) AS Inglés,
    ISNULL([Física],      0) AS Física
FROM (
    SELECT alumno, materia, nota
    FROM pv.NotaFinal
) AS origen
PIVOT (
    AVG(nota)
    FOR materia IN ([Matemáticas], [Historia], [Inglés], [Física])
) AS pv
ORDER BY alumno
GO
```

| alumno | Matemáticas | Historia | Inglés | Física |
|--------|------------:|---------:|-------:|-------:|
| Juan   | 7.0         | 9.0      | 8.0    | 0      |
| Laura  | 8.0         | 8.0      | 9.0    | 7.0    |
| María  | 6.0         | 0        | 0      | 8.0    |
| Pedro  | 0           | 10.0     | 7.0    | 9.0    |

---

## Ejercicio 5 — PIVOT dinámico: meses descubiertos en tiempo de ejecución

Repetir el ejercicio 1 pero construyendo la lista de meses dinámicamente. Usar `STRING_AGG` para armar la cláusula `IN` desde los datos reales.

```sql
DECLARE @cols  NVARCHAR(MAX)
DECLARE @query NVARCHAR(MAX)

-- 1. Construir la lista de meses en orden cronológico
SELECT @cols = STRING_AGG('[' + mes + ']', ', ')
FROM (
    SELECT DISTINCT mes,
        CASE mes
            WHEN 'Enero'   THEN 1
            WHEN 'Febrero' THEN 2
            WHEN 'Marzo'   THEN 3
            WHEN 'Abril'   THEN 4
            WHEN 'Mayo'    THEN 5
            WHEN 'Junio'   THEN 6
        END AS orden
    FROM pv.Venta
) AS meses
ORDER BY orden
GO

-- 2. Armar y ejecutar el PIVOT
SET @query = '
    SELECT vendedor, ' + @cols + '
    FROM (
        SELECT vendedor, mes, monto
        FROM pv.Venta
    ) AS origen
    PIVOT (
        SUM(monto)
        FOR mes IN (' + @cols + ')
    ) AS pv
    ORDER BY vendedor'

EXEC sp_executesql @query
GO
```

> **Diferencia clave con el estático:** si mañana se agregan ventas de Julio, la consulta dinámica lo incluye automáticamente sin modificar el código.

---

## Ejercicio 6 — UNPIVOT: normalizar la tabla de resumen trimestral

La tabla `ResumenTrimestral` está desnormalizada (un trimestre por columna). Usar `UNPIVOT` para convertirla a formato vertical: una fila por departamento-trimestre.

```sql
SELECT departamento, trimestre, monto
FROM pv.ResumenTrimestral
UNPIVOT (
    monto FOR trimestre IN (Q1, Q2, Q3, Q4)
) AS unpv
ORDER BY departamento, trimestre
GO
```

| departamento | trimestre | monto  |
|--------------|-----------|-------:|
| IT           | Q1        | 120.00 |
| IT           | Q2        | 150.00 |
| IT           | Q3        | 130.00 |
| IT           | Q4        | 200.00 |
| RRHH         | Q1        |  80.00 |
| RRHH         | Q2        |  95.00 |
| RRHH         | Q4        | 110.00 |
| Ventas       | Q1        | 300.00 |
| ...          | ...       |    ... |

> `UNPIVOT` descarta automáticamente las filas con `NULL` — por eso RRHH Q3 no aparece.

---

## Ejercicio 7 — Filtrar el resultado del PIVOT

Usando el PIVOT del ejercicio 1, mostrar solo los vendedores que superaron `$1500` en el mes de Marzo.

```sql
SELECT vendedor, [Enero], [Febrero], [Marzo], [Abril], [Mayo], [Junio]
FROM (
    SELECT vendedor, mes, monto
    FROM pv.Venta
) AS origen
PIVOT (
    SUM(monto)
    FOR mes IN ([Enero], [Febrero], [Marzo], [Abril], [Mayo], [Junio])
) AS pv
WHERE [Marzo] > 1500
ORDER BY [Marzo] DESC
GO
```

> El filtro se aplica sobre la tabla pivoteada, igual que un `WHERE` normal. Se pueden filtrar las columnas generadas por PIVOT como si fueran columnas comunes.
