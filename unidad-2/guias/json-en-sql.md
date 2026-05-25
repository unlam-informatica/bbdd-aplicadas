---
layout: default
title: JSON en SQL Server
parent: Teoría
grand_parent: Unidad 2
nav_order: 7
permalink: /unidad-2/guias/json-en-sql/
---

[← Unidad 2](../)

---

> La función `OPENJSON` requiere nivel de compatibilidad ≥ 130 (SQL Server 2016+).  
> Verificar: `SELECT compatibility_level FROM sys.databases WHERE name = DB_NAME()`

---

## OPENJSON sin esquema

Cuando se llama sin cláusula `WITH`, `OPENJSON` devuelve una tabla de tres columnas genérica: `key`, `value` y `type`.

```sql
DECLARE @json NVARCHAR(MAX) = N'{
    "Equipo":    "Boca",
    "Categoria": "Primera",
    "Goles":     99999,
    "DT":        null
}';

SELECT * FROM OPENJSON(@json);
```

| key | value | type |
|-----|-------|------|
| Equipo | Boca | 1 |
| Categoria | Primera | 1 |
| Goles | 99999 | 2 |
| DT | null | 0 |

### Tabla de tipos

| Valor de `type` | Tipo JSON |
|-----------------|-----------|
| 0 | null |
| 1 | string |
| 2 | number |
| 3 | boolean (true/false) |
| 4 | array |
| 5 | object |

---

## OPENJSON con esquema explícito (WITH)

La cláusula `WITH` define el esquema de salida: nombre de columna, tipo T-SQL y ruta JSON.

```sql
DECLARE @json NVARCHAR(MAX) = N'{
    "Equipo":    "Boca",
    "Categoria": "Primera",
    "Goles":     99999,
    "Colores":   "Azul y amarillo",
    "DT":        null
}';

SELECT *
FROM OPENJSON(@json)
WITH (
    Nombre    VARCHAR(100)  '$.Equipo',
    Categoria VARCHAR(50)   '$.Categoria',
    Contador  INT           '$.Goles',
    Casaca    VARCHAR(100)  '$.Colores',
    Tecnico   NVARCHAR(200) '$.DT'
);
```

> `$` representa la raíz del objeto JSON. Para propiedades anidadas: `'$.objeto.propiedad'`.

---

## Campos AS JSON — objetos y arrays anidados

Cuando una propiedad contiene un objeto o array, el valor de `type` es 5 u 4. Para extraerlo sin perder su estructura, se usa `AS JSON` (el tipo debe ser `NVARCHAR(MAX)`).

```sql
DECLARE @json NVARCHAR(MAX) = N'{
    "Equipo":   "Boca",
    "Goles":    99999,
    "Colores":  ["azul", "amarillo", "violeta"],
    "DT":       null
}';

SELECT *
FROM OPENJSON(@json)
WITH (
    Nombre   VARCHAR(100)   '$.Equipo',
    Contador INT            '$.Goles',
    Casaca   NVARCHAR(MAX)  '$.Colores' AS JSON,  -- extrae el array como string JSON
    Tecnico  NVARCHAR(200)  '$.DT'
);
```

`Casaca` devolverá `["azul","amarillo","violeta"]` como cadena.

---

## CROSS APPLY para desplegar arrays anidados

Para convertir los elementos de un array anidado en filas individuales se encadena un segundo `OPENJSON` con `CROSS APPLY`.

```sql
DECLARE @json NVARCHAR(MAX) = N'{
    "Equipo":  "Boca",
    "Colores": ["azul", "amarillo", "violeta"]
}';

SELECT Club, Torneo, Color
FROM OPENJSON(@json)
WITH (
    Club    VARCHAR(20)   '$.Equipo',
    Torneo  VARCHAR(20)   '$.Categoria',
    Casaca  NVARCHAR(MAX) '$.Colores' AS JSON
)
CROSS APPLY OPENJSON(Casaca)
WITH (Color VARCHAR(20) '$');
```

Resultado: una fila por cada color, repetiendo `Club` y `Torneo`.

### Arrays de objetos

Para arrays de objetos (el caso más común en APIs):

```sql
DECLARE @json NVARCHAR(MAX) = N'{
    "provincias": [
        {"id": "54", "nombre": "Misiones",      "categoria": "Provincia"},
        {"id": "74", "nombre": "San Luis",       "categoria": "Provincia"},
        {"id": "02", "nombre": "Ciudad de Bs As","categoria": "Ciudad Autónoma"}
    ]
}';

SELECT Nombre, Id, Categoria
FROM OPENJSON(@json)
WITH (provincias NVARCHAR(MAX) '$.provincias' AS JSON)
CROSS APPLY OPENJSON(provincias)
WITH (
    Nombre    VARCHAR(50) '$.nombre',
    Id        INT         '$.id',
    Categoria VARCHAR(30) '$.categoria'
);
```

---

## Ruta directa como segundo argumento

Una forma más concisa de acceder a un array anidado es pasar la ruta como segundo argumento de `OPENJSON`, evitando el primer `WITH` + `CROSS APPLY`:

```sql
DECLARE @json NVARCHAR(MAX) = N'{
    "provincias": [
        {"id": "54", "nombre": "Misiones",  "fuente": "IGN"},
        {"id": "74", "nombre": "San Luis",  "fuente": "IGN"}
    ]
}';

-- Equivalente al ejemplo anterior pero más conciso
SELECT Nombre, Id, Fuente
FROM OPENJSON(@json, '$.provincias')   -- apunta directamente al array
WITH (
    Nombre VARCHAR(30) '$.nombre',
    Fuente VARCHAR(30) '$.fuente',
    Id     INT         '$.id'
);
```

---

## Modo LAX vs STRICT

Por defecto OPENJSON usa el modo **LAX**: si una propiedad no existe en el JSON, devuelve `NULL` sin error.

El modo **STRICT** falla con error si la propiedad no existe. Se activa poniendo `strict` delante de la ruta:

```sql
DECLARE @json NVARCHAR(MAX) = N'{"nombre": "Misiones", "id": "54"}';
-- La propiedad "fuente" no está en este objeto

-- LAX (default): devuelve NULL para "fuente"
SELECT Nombre, Fuente, Id
FROM OPENJSON(@json)
WITH (
    Nombre VARCHAR(30) '$.nombre',
    Fuente VARCHAR(30) '$.fuente',          -- NULL, sin error
    Id     INT         '$.id'
);

-- STRICT: lanza error si falta la propiedad
SELECT Nombre, Fuente, Id
FROM OPENJSON(@json)
WITH (
    Nombre VARCHAR(30) '$.nombre',
    Fuente VARCHAR(30) 'strict $.fuente',   -- ERROR: propiedad no encontrada
    Id     INT         '$.id'
);
```

---

## Leer JSON desde archivo

```sql
-- OPENROWSET lee el archivo completo como una cadena de texto
SELECT *
FROM OPENROWSET(BULK 'C:\datos\archivo.json', SINGLE_CLOB) AS j;

-- Patrón completo: leer + parsear + insertar
INSERT INTO mi_tabla (col1, col2)
SELECT col1, col2
FROM OPENROWSET(BULK 'C:\datos\archivo.json', SINGLE_CLOB) AS j
CROSS APPLY OPENJSON(BulkColumn)
WITH (
    col1 VARCHAR(50) '$.campo1',
    col2 INT         '$.campo2'
);
```

---

## Generar JSON desde una consulta

```sql
-- FOR JSON AUTO: estructura derivada de la consulta
SELECT id, nombre, apellido
FROM clientes
FOR JSON AUTO;
-- → [{"id":1,"nombre":"Juan","apellido":"García"},...]

-- FOR JSON PATH: control total sobre la estructura
SELECT
    id       AS 'cliente.id',
    nombre   AS 'cliente.nombre',
    apellido AS 'cliente.apellido'
FROM clientes
FOR JSON PATH, ROOT('clientes');
-- → {"clientes":[{"cliente":{"id":1,"nombre":"Juan","apellido":"García"}},...]}

-- Funciones de manipulación
SELECT JSON_VALUE('{"nombre":"Juan"}',  '$.nombre');   -- → Juan
SELECT JSON_QUERY('{"a":{"b":1}}',      '$.a');        -- → {"b":1}
SELECT JSON_MODIFY('{"nombre":"Juan"}', '$.nombre', 'Pedro'); -- → {"nombre":"Pedro"}
SELECT ISJSON('{"a":1}');                               -- → 1 (válido)
```
