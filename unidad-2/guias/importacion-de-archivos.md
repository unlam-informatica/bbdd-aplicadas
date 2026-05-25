---
layout: default
title: Importación de archivos
parent: Teoría
grand_parent: Unidad 2
nav_order: 9
permalink: /unidad-2/guias/importacion-de-archivos/
---

[← Unidad 2](../)

---

## Importar CSV — BULK INSERT

`BULK INSERT` importa un archivo de datos directamente a una tabla o vista. Es la forma más eficiente de cargar grandes volúmenes de filas desde un archivo plano.

### Sintaxis general

```sql
BULK INSERT [database_name.[schema_name].]tabla_o_vista
FROM 'ruta_completa_del_archivo'
WITH
(
    FIELDTERMINATOR = ',',    -- delimitador de columna
    ROWTERMINATOR   = '\n',   -- delimitador de fila
    CODEPAGE        = 'ACP',  -- página de códigos del archivo
    FIRSTROW        = 2       -- primera fila de datos (2 = saltar encabezado)
);
```

### Ejemplo completo

Dado el archivo `C:\Importar\multas.csv` con el contenido:

```
1,ABC123,105
2,XYZ456,110
3,DEF789,115
```

```sql
USE TestingDB
GO

DROP TABLE IF EXISTS multas
GO

CREATE TABLE multas (
    ID_Multa  INT          PRIMARY KEY,
    Patente   NVARCHAR(50) NOT NULL,
    Velocidad INT          NOT NULL
);
GO

BULK INSERT TestingDB..multas
FROM 'C:\Importar\multas.csv'
WITH
(
    FIELDTERMINATOR = ',',
    ROWTERMINATOR   = '\n',
    CODEPAGE        = 'ACP'
);
GO

SELECT * FROM multas;
```

### Opciones de BULK INSERT

| Opción | Descripción | Valor por defecto |
|--------|-------------|-------------------|
| `FIELDTERMINATOR` | Carácter que separa columnas | `\t` (tabulación) |
| `ROWTERMINATOR` | Carácter que separa filas | `\r\n` (nueva línea Windows) |
| `CODEPAGE` | Codificación de caracteres del archivo | `ACP` |
| `FIRSTROW` | Número de fila donde empiezan los datos | `1` |
| `LASTROW` | Número de la última fila a importar | última del archivo |
| `MAXERRORS` | Cantidad máxima de errores antes de cancelar | `10` |
| `TABLOCK` | Bloqueo de tabla completa durante la carga (más rápido) | no activo |

#### Valores de CODEPAGE

| Valor | Significado |
|-------|-------------|
| `'ACP'` | Windows ANSI Code Page (cp1252 en español) — el más común para archivos generados en Windows |
| `'OEM'` | Código de página OEM del sistema (consola de Windows) |
| `'RAW'` | Sin conversión; los bytes se pasan tal cual |
| `'65001'` | UTF-8 |
| `'1252'` | Windows Latin 1 (equivalente a ACP en sistemas en español) |

> Para archivos descargados de portales de datos abiertos (datos.gob.ar, datos.gob.es) generalmente usar `'65001'` (UTF-8) o `'ACP'`.

### Consideraciones sobre la tabla destino

- La **estructura de la tabla debe coincidir** con la del archivo: mismo orden, mismo tipo de dato por columna.
- Si la tabla tiene **PK o restricciones de unicidad**, los datos del archivo deben respetarlas.
- `DROP TABLE IF EXISTS` antes de la carga evita errores al re-ejecutar el script.
- Si el archivo tiene **encabezado en la primera fila**, usar `FIRSTROW = 2`.

---

## Importar JSON — OPENROWSET + OPENJSON

Para importar un archivo JSON se combina `OPENROWSET` (que lee el archivo como una cadena de texto) con `OPENJSON` (que parsea esa cadena y la convierte en filas relacionales).

### Sintaxis general

```sql
INSERT INTO mi_tabla (col1, col2, col3)
SELECT col1, col2, col3
FROM OPENROWSET (BULK 'C:\Importar\archivo.json', SINGLE_CLOB) AS j
CROSS APPLY OPENJSON(BulkColumn)
WITH (
    col1  TIPO_DATO  '$.propiedad1',
    col2  TIPO_DATO  '$.propiedad2',
    col3  TIPO_DATO  '$.propiedad3'
);
```

### Ejemplo completo

Dado el archivo `C:\Importar\infomultas.json`:

```json
[
    { "ID_Multa": 1, "Patente": "ABC123", "Velocidad": 105 },
    { "ID_Multa": 2, "Patente": "XYZ456", "Velocidad": 110 },
    { "ID_Multa": 3, "Patente": "DEF789", "Velocidad": 115 }
]
```

```sql
USE TestingDB
GO

DROP TABLE IF EXISTS multas
GO

CREATE TABLE multas (
    ID_Multa  INT          PRIMARY KEY,
    Patente   NVARCHAR(50) NOT NULL,
    Velocidad INT          NOT NULL
);
GO

INSERT INTO multas (ID_Multa, Patente, Velocidad)
SELECT ID_Multa, Patente, Velocidad
FROM OPENROWSET (BULK 'C:\Importar\infomultas.json', SINGLE_CLOB) AS j
CROSS APPLY OPENJSON(BulkColumn)
WITH (
    ID_Multa  INT          '$.ID_Multa',
    Patente   NVARCHAR(50) '$.Patente',
    Velocidad INT          '$.Velocidad'
);
GO

SELECT * FROM multas;
```

### Piezas clave del patrón

| Componente | Rol |
|-----------|-----|
| `OPENROWSET(BULK 'ruta', SINGLE_CLOB)` | Lee el archivo completo del disco y lo expone como una columna de texto (`BulkColumn`). `SINGLE_CLOB` indica que el contenido se trata como una única cadena grande de caracteres. |
| `CROSS APPLY` | Aplica una función que devuelve tabla (`OPENJSON`) a cada fila del resultado anterior. Aquí solo hay una fila (el archivo completo), por lo que efectivamente "abre" el JSON. |
| `OPENJSON(BulkColumn)` | Parsea el texto JSON y lo convierte en filas relacionales. |
| `WITH (col TIPO '$.ruta')` | Define el esquema de salida: qué columnas extraer, con qué tipo, y en qué ruta JSON encontrarlas. `$` representa la raíz del objeto. |

#### Rutas JSON en WITH

| Expresión | Significado |
|-----------|-------------|
| `'$.nombre'` | Propiedad `nombre` en la raíz del objeto |
| `'$.direccion.ciudad'` | Propiedad `ciudad` dentro del objeto `direccion` |
| `'$.tags[0]'` | Primer elemento del array `tags` |

---

## Importar XML — OPENROWSET + XQuery

El patrón es similar al de JSON: leer el archivo con `OPENROWSET` y luego procesarlo con los métodos XML de SQL Server.

```sql
DECLARE @xml XML;

SELECT @xml = BulkColumn
FROM OPENROWSET(BULK 'C:\Importar\datos.xml', SINGLE_BLOB) AS x;

INSERT INTO mi_tabla (col1, col2)
SELECT
    nodo.value('propiedad1[1]', 'TIPO_DATO'),
    nodo.value('propiedad2[1]', 'TIPO_DATO')
FROM @xml.nodes('/raiz/elemento') AS t(nodo);
```

> `SINGLE_BLOB` (a diferencia de `SINGLE_CLOB`) lee el archivo como bytes sin conversión de codificación — necesario para XML que puede tener su propia declaración de encoding.
