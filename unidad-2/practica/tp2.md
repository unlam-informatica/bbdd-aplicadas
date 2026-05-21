---
layout: default
title: TP2 — Conceptos básicos de SQL
parent: Unidad 2
nav_order: 11
permalink: /unidad-2/practica/tp2/
---

[← Unidad 2](../)

**Trabajo Práctico 2 — Conceptos básicos de SQL**  
Asignatura: 3641 – Bases de Datos Aplicadas · Unidad 2

- [Ejercicio 1 — Collation de la BD del TP1](#ejercicio-1--collation-de-la-bd-del-tp1)
- [Ejercicio 2 — Crear BDs con distintas intercalaciones](#ejercicio-2--crear-bds-con-distintas-intercalaciones)
- [Ejercicio 3 — Crear esquema ddbba](#ejercicio-3--crear-esquema-ddbba)
- [Ejercicio 4 — Tabla y SP de registro](#ejercicio-4--tabla-y-sp-de-registro)
- [Ejercicio 5 — Descargar CSVs](#ejercicio-5--descargar-csvs)
- [Ejercicio 6 — Crear tabla de nombres](#ejercicio-6--crear-tabla-de-nombres)
- [Ejercicio 7 — Importar CSVs](#ejercicio-7--importar-csvs)
- [Ejercicio 8 — Corregir caracteres acentuados](#ejercicio-8--corregir-caracteres-acentuados)
- [Ejercicio 9 — Primer y último percentil](#ejercicio-9--primer-y-último-percentil)
- [Ejercicio 10 — Coincidencias entre BDs](#ejercicio-10--coincidencias-entre-bds)
- [Ejercicio 11 — Comparar cadenas de distinta intercalación](#ejercicio-11--comparar-cadenas-de-distinta-intercalación)
- [Ejercicio 12 — SP con tabla temporal global](#ejercicio-12--sp-con-tabla-temporal-global)
- [Ejercicio 13 — Top 100 nombres por BD](#ejercicio-13--top-100-nombres-por-bd)
- [Ejercicio 14 — Comparar tabla temporal global con top 100](#ejercicio-14--comparar-tabla-temporal-global-con-top-100)
- [Ejercicio 15 — Intercalación de tablas temporales globales](#ejercicio-15--intercalación-de-tablas-temporales-globales)
- [Ejercicio 16 — COLLATE en comparaciones](#ejercicio-16--collate-en-comparaciones)

---

> **Pauta general**: todos los ejercicios deben resolverse con DML/DDL. Se puede usar la GUI de SSMS para no recordar sintaxis, pero se recomienda enfáticamente practicar y aprender la sintaxis de SQL.  
> Los ejercicios están pensados para SQL Server (versión Developer o Express, 2019 o 2022). También se pueden resolver en PostgreSQL o MySQL.

---

## Ejercicio 1 — Collation de la BD del TP1

Consulte y anote la intercalación (collation) de la base de datos creada en el TP1.

```sql
-- Opción 1: consultar la collation de la BD actual
SELECT DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS collation_bd;

-- Opción 2: consultar sys.databases
SELECT name, collation_name
FROM sys.databases
WHERE name = 'nombre_bd_tp1';
```

---

## Ejercicio 2 — Crear BDs con distintas intercalaciones

La intercalación tiene dos ejes de sensibilidad relevantes:

| Eje | CI | CS |
|-----|----|----|
| Mayúsculas/minúsculas | Case-Insensitive (no distingue) | Case-Sensitive (distingue) |

| Eje | AI | AS |
|-----|----|----|
| Acentos | Accent-Insensitive (no distingue) | Accent-Sensitive (distingue) |

Genere tres bases de datos adicionales de forma que, junto con la BD del TP1, cubra las cuatro combinaciones posibles: CI_AI, CI_AS, CS_AI, CS_AS.

```sql
CREATE DATABASE nombres_ci_ai COLLATE Modern_Spanish_CI_AI;
GO
CREATE DATABASE nombres_ci_as COLLATE Modern_Spanish_CI_AS;
GO
CREATE DATABASE nombres_cs_ai COLLATE Modern_Spanish_CS_AI;
GO
CREATE DATABASE nombres_cs_as COLLATE Modern_Spanish_CS_AS;
GO
```

---

## Ejercicio 3 — Crear esquema ddbba

Cree el esquema `ddbba` en cada una de las cuatro bases de datos. Todos los objetos creados a partir de este ejercicio deben pertenecer a `ddbba` (u otro esquema según corresponda). No usar el esquema por defecto `dbo`.

```sql
USE nombres_ci_ai; GO  CREATE SCHEMA ddbba; GO
USE nombres_ci_as; GO  CREATE SCHEMA ddbba; GO
USE nombres_cs_ai; GO  CREATE SCHEMA ddbba; GO
USE nombres_cs_as; GO  CREATE SCHEMA ddbba; GO
```

---

## Ejercicio 4 — Tabla y SP de registro

Utilice la tabla y el procedimiento almacenado `registro` creados en el TP1 para registrar las operaciones. Son útiles para debugging durante la importación y corrección de datos.

---

## Ejercicio 5 — Descargar CSVs

Descargue todos los archivos CSV disponibles del dataset **"Otros nombres - personas físicas"** del portal de datos abiertos del gobierno argentino.

Cada archivo corresponde a un período distinto y contiene nombres de personas físicas con su frecuencia de uso.

---

## Ejercicio 6 — Crear tabla de nombres

Genere la estructura de tabla para almacenar los datos descargados. Créela en las cuatro bases de datos.

```sql
-- Ejecutar en cada una de las 4 BDs (ajustar USE)
USE nombres_ci_ai;
GO

CREATE TABLE ddbba.nombres (
    nombre   VARCHAR(100) NOT NULL,
    cantidad INT          NOT NULL,
    anio     INT          NOT NULL
);
GO
```

> El esquema de columnas exacto puede variar según el formato del CSV descargado. Verificar con la primera fila del archivo antes de crear la tabla.

---

## Ejercicio 7 — Importar CSVs

Importe los archivos CSV descargados distribuyéndolos entre las cuatro bases de datos. No es necesario que la distribución sea en cantidades exactamente iguales.

```sql
-- Ejemplo para una BD (repetir ajustando la ruta y la BD destino)
USE nombres_ci_ai;
GO

BULK INSERT ddbba.nombres
FROM 'C:\datos\nombres_2010.csv'
WITH (
    FIELDTERMINATOR = ',',
    ROWTERMINATOR   = '\n',
    FIRSTROW        = 2,       -- omitir encabezado
    CODEPAGE        = '65001'  -- UTF-8; ajustar si el archivo usa otra codificación
);
GO
```

> Consulte la guía [importacion-de-archivos](../guias/importacion-de-archivos/) para referencia completa de las opciones de `BULK INSERT`.

---

## Ejercicio 8 — Corregir caracteres acentuados

Es probable que algunos caracteres con tilde o ñ se hayan importado incorrectamente. Verifique el contenido y corrija lo necesario. Es importante mantener las letras acentuadas.

```sql
-- Verificar filas con posibles problemas
SELECT nombre, COUNT(*) AS ocurrencias
FROM ddbba.nombres
WHERE nombre LIKE '%?%'     -- carácter de sustitución
   OR nombre LIKE '%Ã%'     -- secuencia UTF-8 mal interpretada como Latin-1
GROUP BY nombre
ORDER BY 2 DESC;

-- Ejemplo de corrección (ajustar según el patrón real encontrado)
UPDATE ddbba.nombres
SET nombre = REPLACE(nombre, 'Ã³', 'ó')
WHERE nombre LIKE '%Ã³%';
```

> Preste atención al comportamiento de la cláusula `WHERE` en cada BD: la collation de la BD afecta cómo se evalúan las comparaciones de cadenas. La misma `WHERE` puede dar resultados distintos en BDs con distinta intercalación.

---

## Ejercicio 9 — Primer y último percentil

Determine el 1% de nombres más empleados (primer percentil) y el 1% menos empleados (último percentil) para cada base de datos. Genere una vista en cada BD.

```sql
-- Ejecutar en cada una de las 4 BDs
USE nombres_ci_ai;
GO

CREATE VIEW ddbba.v_percentiles AS
WITH totales AS (
    SELECT nombre, SUM(cantidad) AS total
    FROM ddbba.nombres
    GROUP BY nombre
),
percentiles AS (
    SELECT
        nombre,
        total,
        PERCENT_RANK() OVER (ORDER BY total DESC) AS pct_rank
    FROM totales
)
SELECT nombre, total, pct_rank,
    CASE
        WHEN pct_rank <= 0.01 THEN 'primer_percentil'
        WHEN pct_rank >= 0.99 THEN 'ultimo_percentil'
    END AS percentil
FROM percentiles
WHERE pct_rank <= 0.01 OR pct_rank >= 0.99;
GO
```

---

## Ejercicio 10 — Coincidencias entre BDs

Obtenga la lista de nombres que aparecen en el primer percentil en todas las cuatro bases de datos simultáneamente. Genere una vista para la consulta.

```sql
USE nombres_ci_ai;
GO

CREATE VIEW ddbba.v_coincidencias_percentil AS
SELECT nombre FROM nombres_ci_ai.ddbba.v_percentiles WHERE percentil = 'primer_percentil'
INTERSECT
SELECT nombre FROM nombres_ci_as.ddbba.v_percentiles WHERE percentil = 'primer_percentil'
INTERSECT
SELECT nombre FROM nombres_cs_ai.ddbba.v_percentiles WHERE percentil = 'primer_percentil'
INTERSECT
SELECT nombre FROM nombres_cs_as.ddbba.v_percentiles WHERE percentil = 'primer_percentil';
GO
```

---

## Ejercicio 11 — Comparar cadenas de distinta intercalación

¿Qué ocurre cuando se comparan cadenas de texto provenientes de columnas con distinta intercalación (por ejemplo, al hacer un `JOIN` o un `WHERE` cruzando dos BDs)? ¿Cómo se resuelve esa situación?

```sql
-- Genera error: "Cannot resolve the collation conflict..."
SELECT a.nombre
FROM nombres_ci_ai.ddbba.nombres a
JOIN nombres_cs_as.ddbba.nombres b ON a.nombre = b.nombre;

-- Solución: forzar una collation común con COLLATE
SELECT a.nombre
FROM nombres_ci_ai.ddbba.nombres a
JOIN nombres_cs_as.ddbba.nombres b
    ON a.nombre COLLATE Modern_Spanish_CI_AI = b.nombre COLLATE Modern_Spanish_CI_AI;
```

---

## Ejercicio 12 — SP con tabla temporal global

Genere un procedimiento almacenado que:
1. Cree una tabla temporal **global** (`##`) si no existe
2. Inserte en ella los dos percentiles obtenidos en el ejercicio 9

Repita el SP en cada una de las cuatro BDs, usando la misma tabla temporal global.

```sql
USE nombres_ci_ai;
GO

CREATE PROCEDURE ddbba.usp_cargar_percentiles_global AS
BEGIN
    IF OBJECT_ID('tempdb..##percentiles_global') IS NULL
    BEGIN
        CREATE TABLE ##percentiles_global (
            nombre    VARCHAR(100) NOT NULL,
            total     INT          NOT NULL,
            percentil VARCHAR(20)  NOT NULL,
            origen    VARCHAR(50)  NOT NULL
        );
    END

    INSERT INTO ##percentiles_global (nombre, total, percentil, origen)
    SELECT nombre, total, percentil, DB_NAME()
    FROM ddbba.v_percentiles
    WHERE percentil IS NOT NULL;
END;
GO

-- Ejecutar en cada BD para cargar los datos
EXEC ddbba.usp_cargar_percentiles_global;

-- Verificar (desde cualquier sesión/BD)
SELECT * FROM ##percentiles_global;
```

---

## Ejercicio 13 — Top 100 nombres por BD

Usando una CTE, obtenga los 100 nombres más utilizados en cada base de datos. Genere una vista en cada BD.

```sql
USE nombres_ci_ai;
GO

CREATE VIEW ddbba.v_top100 AS
WITH ranking AS (
    SELECT
        nombre,
        SUM(cantidad)                             AS total,
        RANK() OVER (ORDER BY SUM(cantidad) DESC) AS posicion
    FROM ddbba.nombres
    GROUP BY nombre
)
SELECT nombre, total, posicion
FROM ranking
WHERE posicion <= 100;
GO
```

---

## Ejercicio 14 — Comparar tabla temporal global con top 100

Compare el contenido de la tabla temporal global `##percentiles_global` (ejercicio 12) con los 100 nombres más utilizados de cada BD (ejercicio 13). Genere una vista para la consulta.

```sql
USE nombres_ci_ai;
GO

CREATE VIEW ddbba.v_comparacion_global_top100 AS
SELECT
    g.nombre    AS nombre_en_global,
    t.nombre    AS nombre_en_top100,
    g.percentil,
    g.origen
FROM ##percentiles_global g
LEFT JOIN ddbba.v_top100 t
    ON g.nombre COLLATE database_default = t.nombre COLLATE database_default;
GO
```

---

## Ejercicio 15 — Intercalación de tablas temporales globales

Reflexione y responda:

**¿Qué intercalación le asignó el sistema a la tabla temporal global?**

Las tablas temporales (locales y globales) se crean en TempDB, que hereda la collation de la **instancia** de SQL Server. Esa collation puede diferir de la collation de las BDs de la aplicación.

```sql
-- Verificar collation de TempDB vs. las BDs del ejercicio
SELECT name, collation_name
FROM sys.databases
WHERE name IN ('tempdb', 'nombres_ci_ai', 'nombres_ci_as', 'nombres_cs_ai', 'nombres_cs_as');
```

**¿Qué ocurre al comparar cadenas en cada caso?**  
Al cruzar datos entre `##percentiles_global` y cada BD, la collation de la columna de la tabla temporal es la de TempDB. Si difiere de la BD, la comparación genera un conflicto de collation.

**¿Qué puede ocurrir si implementa un sistema con una BD para la que no controla la intercalación global?**  
Si la collation de la instancia (que hereda TempDB) difiere de la BD de la aplicación, los JOINs y comparaciones contra tablas temporales globales pueden fallar o producir resultados incorrectos silenciosamente. La solución es usar `COLLATE` explícito en las comparaciones o preferir tablas temporales locales (`#`).

---

## Ejercicio 16 — COLLATE en comparaciones

Verifique el resultado de cada consulta y explique el comportamiento:

```sql
-- 1. Usa la collation de la BD actual
SELECT 1 Acierto WHERE 'Cadena' = 'Cadena';

-- 2. CI_AI: no distingue mayúsculas ni acentos → devuelve fila
SELECT 1 Acierto WHERE 'CADENA' = 'Cádena' COLLATE Modern_Spanish_CI_AI;

-- 3. CS_AI: distingue mayúsculas, no acentos → no devuelve fila ('CADENA' ≠ 'Cadena')
SELECT 1 Acierto WHERE 'CADENA' = 'Cadena' COLLATE Modern_Spanish_CS_AI;

-- 4. CI_AS: no distingue mayúsculas, sí acentos → no devuelve fila ('Cádena' ≠ 'Cadena')
SELECT 1 Acierto WHERE 'CADENA' = 'Cádena' COLLATE Modern_Spanish_CI_AS;
```

| Consulta | Collation aplicada | ¿Devuelve fila? | Motivo |
|----------|--------------------|-----------------|--------|
| 1 | Collation de la BD | Sí | 'Cadena' = 'Cadena' siempre es igual |
| 2 | `CI_AI` | Sí | CI ignora mayúsculas; AI ignora el acento en 'á' |
| 3 | `CS_AI` | No | CS distingue mayúsculas: 'CADENA' ≠ 'Cadena' |
| 4 | `CI_AS` | No | AS distingue acentos: 'Cádena' ≠ 'Cadena' |

**Usos prácticos de `COLLATE` en búsquedas**:
- Buscar sin distinguir acentos en una BD que sí los distingue: `WHERE nombre COLLATE Modern_Spanish_CI_AI LIKE 'jose%'` también encuentra "José"
- Normalizar comparaciones entre columnas de distintas BDs o tablas temporales
- Aplicar búsqueda case-sensitive puntual en una BD CI

---

> Recuerde guardar periódicamente el script. Al finalizar, genere un backup de cada base de datos.
