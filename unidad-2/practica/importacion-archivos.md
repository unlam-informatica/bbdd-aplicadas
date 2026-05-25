---
layout: default
title: Práctica — Importación de archivos
parent: Unidad 2
nav_order: 12
permalink: /unidad-2/practica/importacion-archivos/
---

# Práctica — Importación de archivos

> Ver guía de referencia: [Importación de archivos](../guias/importacion-de-archivos/)

---

## Ejercicio 1 — Reclamos de distribuidoras de gas (CSV)

> **Archivo:** descargar el dataset **"Reclamos de Distribuidoras resueltos en 2022"** desde [www.datos.gob.ar](https://www.datos.gob.ar/) y guardarlo como `C:\Importar\reclamos.csv`.

**Resultado esperado**: tabla con columnas `reclamo_ano`, `reclamo_mes_nro`, `reclamo_mes_nombre`, `reclamo_prestadora`, `reclamo_provincia`, `reclamo_grupo`, `reclamo_via_ingreso`, `reclamo_resolucion`, `reclamo_cantidad`.

```sql
USE TestingDB
GO

DROP TABLE IF EXISTS reclamos
GO

CREATE TABLE reclamos (
    reclamo_ano        SMALLINT      NOT NULL,
    reclamo_mes_nro    TINYINT       NOT NULL,
    reclamo_mes_nombre NVARCHAR(20)  NOT NULL,
    reclamo_prestadora NVARCHAR(200) NOT NULL,
    reclamo_provincia  NVARCHAR(100) NOT NULL,
    reclamo_grupo      NVARCHAR(200) NOT NULL,
    reclamo_via_ingreso NVARCHAR(50) NOT NULL,
    reclamo_resolucion NVARCHAR(50)  NOT NULL,
    reclamo_cantidad   INT           NOT NULL
);
GO

BULK INSERT reclamos
FROM 'C:\Importar\reclamos.csv'
WITH
(
    FIELDTERMINATOR = ',',
    ROWTERMINATOR   = '\n',
    CODEPAGE        = '65001',  -- UTF-8
    FIRSTROW        = 2         -- saltar encabezado
);
GO

SELECT * FROM reclamos;
```

---

## Ejercicio 2 — Volumen de viajeros por franja horaria (CSV)

> **Archivo:** `archivos/viajerosgalicia.csv` — copiar a `C:\Importar\viajerosgalicia.csv`

**Resultado esperado**: tabla con columnas `ID`, `CODIGO_ESTACION`, `NOMBRE_ESTACION`, `NUCLEO_CERCANIAS`, `TRAMO_HORARIO`, `VIAJEROS_SUBIDOS`, `VIAJEROS_BAJADOS`.

```sql
USE TestingDB
GO

DROP TABLE IF EXISTS viajeros
GO

CREATE TABLE viajeros (
    ID               INT           NOT NULL,
    CODIGO_ESTACION  NVARCHAR(20)  NOT NULL,
    NOMBRE_ESTACION  NVARCHAR(100) NOT NULL,
    NUCLEO_CERCANIAS NVARCHAR(100) NOT NULL,
    TRAMO_HORARIO    NVARCHAR(20)  NOT NULL,
    VIAJEROS_SUBIDOS INT           NOT NULL,
    VIAJEROS_BAJADOS INT           NOT NULL
);
GO

BULK INSERT viajeros
FROM 'C:\Importar\viajerosgalicia.csv'
WITH
(
    FIELDTERMINATOR = ',',
    ROWTERMINATOR   = '\n',
    CODEPAGE        = '65001',
    FIRSTROW        = 2
);
GO

SELECT * FROM viajeros;
```

---

## Ejercicio 3 — Salario mensual medio — empleo joven (CSV)

> **Archivo:** `archivos/SalarioMensualMedio.csv` — copiar a `C:\Importar\SalarioMensualMedio.csv`

**Resultado esperado**: tabla con columnas `fecha`, `clae`, `w_median`.

```sql
USE TestingDB
GO

DROP TABLE IF EXISTS salarios_empleo_joven
GO

CREATE TABLE salarios_empleo_joven (
    fecha    DATE    NOT NULL,
    clae     INT     NOT NULL,
    w_median INT     NOT NULL
);
GO

BULK INSERT salarios_empleo_joven
FROM 'C:\Importar\SalarioMensualMedio.csv'
WITH
(
    FIELDTERMINATOR = ',',
    ROWTERMINATOR   = '\n',
    CODEPAGE        = '65001',
    FIRSTROW        = 2
);
GO

SELECT * FROM salarios_empleo_joven;
```

---

## Ejercicio 4 — Personajes de Star Wars (JSON)

> **Archivo:** `archivos/starwars.json` — copiar a `C:\Importar\starwars.json`

**Resultado esperado**: tabla con columnas `id`, `personaje`, `actor`, `pelicula`, `anio_pelicula`.

```sql
USE TestingDB
GO

DROP TABLE IF EXISTS starwars
GO

CREATE TABLE starwars (
    id           INT           NOT NULL PRIMARY KEY,
    personaje    NVARCHAR(100) NOT NULL,
    actor        NVARCHAR(200) NOT NULL,
    pelicula     NVARCHAR(200) NOT NULL,
    anio_pelicula INT          NOT NULL
);
GO

INSERT INTO starwars (id, personaje, actor, pelicula, anio_pelicula)
SELECT id, personaje, actor, pelicula, anio_pelicula
FROM OPENROWSET (BULK 'C:\Importar\starwars.json', SINGLE_CLOB) AS j
CROSS APPLY OPENJSON(BulkColumn)
WITH (
    id            INT           '$.id',
    personaje     NVARCHAR(100) '$.personaje',
    actor         NVARCHAR(200) '$.actor',
    pelicula      NVARCHAR(200) '$.pelicula',
    anio_pelicula INT           '$.anio_pelicula'
);
GO

SELECT * FROM starwars;
```
