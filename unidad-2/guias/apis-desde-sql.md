---
layout: default
title: APIs desde SQL Server
parent: Unidad 2
nav_order: 10
permalink: /unidad-2/guias/apis-desde-sql/
---

[← Unidad 2](../)

- [Habilitación de Ole Automation Procedures](#habilitación-de-ole-automation-procedures)
- [Patrón base de llamada HTTP](#patrón-base-de-llamada-http)
- [Ejemplo 1 — GET simple](#ejemplo-1--get-simple)
- [Ejemplo 2 — GET con parseo de respuesta JSON](#ejemplo-2--get-con-parseo-de-respuesta-json)
- [Ejemplo 3 — GET con parámetros en la URL](#ejemplo-3--get-con-parámetros-en-la-url)
- [Ejemplo 4 — POST con body JSON](#ejemplo-4--post-con-body-json)

---

> **Nota de contexto**: No se recomienda usar SQL Server para acceder a APIs web en producción. Existen alternativas mucho más adecuadas en otros lenguajes. Esta guía tiene como objetivo dar un primer contacto práctico con las APIs usando T-SQL, el lenguaje que se trabaja en la materia.

---

## Habilitación de Ole Automation Procedures

Para realizar llamadas HTTP desde T-SQL es necesario habilitar la opción `Ole Automation Procedures`, que permite a SQL Server interactuar con objetos COM (en particular `MSXML2.XMLHTTP`).

```sql
-- Habilitar la edición de opciones avanzadas
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
GO

-- Habilitar Ole Automation Procedures
EXEC sp_configure 'Ole Automation Procedures', 1;
RECONFIGURE;
GO
```

> Esta configuración es a nivel de instancia y persiste hasta que se deshabilite explícitamente.

---

## Patrón base de llamada HTTP

Todas las llamadas HTTP desde T-SQL siguen la misma estructura de procedimientos almacenados del sistema:

```sql
DECLARE @Object   INT;
DECLARE @respuesta NVARCHAR(MAX);
DECLARE @json     TABLE (DATA NVARCHAR(MAX));

-- 1. Crear una instancia del objeto HTTP
EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;

-- 2. Configurar el método y URL
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'GET', @url, 'FALSE';

-- 3. Enviar la solicitud
EXEC sp_OAMethod @Object, 'SEND';

-- 4. Guardar la respuesta en la tabla variable
INSERT INTO @json
    EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';

-- 5. Usar los datos
DECLARE @datos NVARCHAR(MAX) = (SELECT DATA FROM @json);
SELECT @datos;
```

| Procedimiento | Rol |
|---------------|-----|
| `sp_OACreate` | Crea una instancia del objeto COM especificado |
| `sp_OAMethod` | Llama a un método del objeto (`OPEN`, `SEND`, `setRequestHeader`) |
| `sp_OAGetProperty` | Obtiene el valor de una propiedad del objeto (`RESPONSETEXT`) |

---

## Ejemplo 1 — GET simple

Llamada a la API pública de tiempo de WorldTimeAPI. No requiere token.

```sql
USE pruebasDB
GO

DECLARE @ruta       NVARCHAR(64)  = 'https://www.worldtimeapi.org/api/timezone';
DECLARE @continente NVARCHAR(64)  = 'America';
DECLARE @pais       NVARCHAR(64)  = 'Argentina';
DECLARE @provincia  NVARCHAR(64)  = 'Buenos_Aires';
DECLARE @url        NVARCHAR(256) = CONCAT(@ruta, '/', @continente, '/', @pais, '/', @provincia);

DECLARE @Object    INT;
DECLARE @json      TABLE (respuesta NVARCHAR(MAX));

EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'GET', @url, 'FALSE';
EXEC sp_OAMethod @Object, 'SEND';

INSERT INTO @json
    EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';

SELECT respuesta FROM @json;
GO
```

---

## Ejemplo 2 — GET con parseo de respuesta JSON

Mismo endpoint, pero la respuesta se parsea con `OPENJSON` para extraer campos específicos.

```sql
USE pruebasDB
GO

DECLARE @ruta       NVARCHAR(64)  = 'https://www.worldtimeapi.org/api/timezone';
DECLARE @continente NVARCHAR(64)  = 'America';
DECLARE @pais       NVARCHAR(64)  = 'Argentina';
DECLARE @provincia  NVARCHAR(64)  = 'Buenos_Aires';
DECLARE @url        NVARCHAR(256) = CONCAT(@ruta, '/', @continente, '/', @pais, '/', @provincia);

DECLARE @Object    INT;
DECLARE @json      TABLE (DATA NVARCHAR(MAX));
DECLARE @respuesta NVARCHAR(MAX);

EXEC sp_OACreate  'MSXML2.XMLHTTP', @Object OUT;
EXEC sp_OAMethod  @Object, 'OPEN', NULL, 'GET', @url, 'FALSE';
EXEC sp_OAMethod  @Object, 'SEND';
EXEC sp_OAMethod  @Object, 'RESPONSETEXT', @respuesta OUTPUT;

INSERT INTO @json
    EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';

DECLARE @datos NVARCHAR(MAX) = (SELECT DATA FROM @json);

SELECT *
FROM OPENJSON(@datos)
WITH (
    FechaHora      DATETIME2    '$.datetime',
    FechaHoraISO   NVARCHAR(40) '$.datetime',
    DiaDelAnio     INT          '$.day_of_year',
    DiaDeLaSemana  INT          '$.day_of_week',
    UTCOffset      NVARCHAR(30) '$.utc_offset'
);
GO
```

> Se usa `DATETIME2` en lugar de `DATETIME` porque el rango de años de `DATETIME2` es mayor y el formato ISO 8601 que devuelve la API es compatible.

---

## Ejemplo 3 — GET con parámetros en la URL

API de traducción gratuita MyMemory. Los parámetros van como query string en la URL.

```sql
USE pruebasDB
GO

DECLARE @ruta            NVARCHAR(64)  = 'https://api.mymemory.translated.net/get?';
DECLARE @fraseOriginal   NVARCHAR(256) = 'Hello, how are you?';
DECLARE @idiomaOriginal  NVARCHAR(8)   = 'en';
DECLARE @idiomaDestino   NVARCHAR(8)   = 'es-es';
DECLARE @url             NVARCHAR(400) = CONCAT(
    @ruta,
    'q=', @fraseOriginal,
    '&langpair=', @idiomaOriginal, '|', @idiomaDestino
);

PRINT @url;
-- Sugerencia: pruebe esa misma URL en Postman antes de ejecutar el resto

DECLARE @Object    INT;
DECLARE @json      TABLE (DATA NVARCHAR(MAX));
DECLARE @respuesta NVARCHAR(MAX);

EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'GET', @url, 'FALSE';
EXEC sp_OAMethod @Object, 'SEND';
EXEC sp_OAMethod @Object, 'RESPONSETEXT', @respuesta OUTPUT;

INSERT INTO @json
    EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';

DECLARE @datos NVARCHAR(MAX) = (SELECT DATA FROM @json);

SELECT *
FROM OPENJSON(@datos)
WITH (
    TraduccionObtenida NVARCHAR(256) '$.responseData.translatedText',
    Fidelidad          REAL          '$.responseData.match'
);
GO
```

---

## Ejemplo 4 — POST con body JSON

API de prueba JSONPlaceholder. Demuestra cómo enviar datos en el cuerpo de la solicitud (método POST) con `Content-Type: application/json`.

```sql
USE pruebasDB
GO

DECLARE @url   NVARCHAR(64)  = 'https://jsonplaceholder.typicode.com/posts';
DECLARE @body  NVARCHAR(MAX) = N'{
    "title":  "Titulo de prueba",
    "body":   "Esto es una prueba.",
    "userId": 1
}';

DECLARE @Object    INT;
DECLARE @json      TABLE (DATA NVARCHAR(MAX));
DECLARE @respuesta NVARCHAR(MAX);

EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;

-- POST en lugar de GET
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'POST', @url, 'FALSE';

-- Header que indica que el body es JSON
EXEC sp_OAMethod @Object, 'setRequestHeader', NULL, 'Content-Type', 'application/json';

-- Enviar con el body
EXEC sp_OAMethod @Object, 'SEND', NULL, @body;

INSERT INTO @json
    EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';

DECLARE @datos NVARCHAR(MAX) = (SELECT DATA FROM @json);

SELECT *
FROM OPENJSON(@datos)
WITH (
    Id     INT          '$.id',
    Titulo NVARCHAR(256) '$.title',
    Cuerpo NVARCHAR(256) '$.body',
    UserId INT           '$.userId'
);
GO
```

### Diferencias GET vs POST

| | GET | POST |
|--|-----|------|
| Parámetros | En la URL (`?param=valor`) | En el body de la solicitud |
| Método en `OPEN` | `'GET'` | `'POST'` |
| Header adicional | No | `Content-Type: application/json` |
| `SEND` | Sin argumentos | Con el body como argumento |
