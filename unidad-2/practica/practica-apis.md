---
layout: default
title: Práctica — APIs desde SQL Server
parent: Práctica
grand_parent: Unidad 2
nav_order: 7
permalink: /unidad-2/practica/apis/
---

# Práctica — APIs desde SQL Server

> Ver guía de referencia: [APIs desde SQL Server](/unidad-2/guias/apis-desde-sql/)

> **Nota**: Estas prácticas requieren que `Ole Automation Procedures` esté habilitado y que el servidor SQL tenga acceso a Internet. Verificar con el administrador antes de ejecutar en un entorno de producción o educativo con restricciones de red.

---

## Ejercicio 1 — Habilitar Ole Automation Procedures

Verificar si `Ole Automation Procedures` está habilitado y activarlo si es necesario.

```sql
-- Verificar el estado actual
SELECT name, value, value_in_use
FROM sys.configurations
WHERE name = 'Ole Automation Procedures';
-- value = 0 → deshabilitado; value = 1 → habilitado

-- Habilitar (requiere permisos de sysadmin)
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
GO

EXEC sp_configure 'Ole Automation Procedures', 1;
RECONFIGURE;
GO

-- Verificar que quedó habilitado
SELECT name, value_in_use
FROM sys.configurations
WHERE name = 'Ole Automation Procedures';
```

---

## Ejercicio 2 — GET simple: hora mundial

Consultar la hora actual en Buenos Aires usando la API pública de WorldTimeAPI. No requiere autenticación.

```sql
USE PracticaU2;
GO

DECLARE @url       NVARCHAR(256) = 'https://worldtimeapi.org/api/timezone/America/Argentina/Buenos_Aires';
DECLARE @Object    INT;
DECLARE @json      TABLE (respuesta NVARCHAR(MAX));
DECLARE @datos     NVARCHAR(MAX);

EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'GET', @url, 'FALSE';
EXEC sp_OAMethod @Object, 'SEND';

INSERT INTO @json EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';

SET @datos = (SELECT respuesta FROM @json);

-- Ver el JSON crudo
SELECT @datos AS respuesta_cruda;

-- Parsear campos específicos con OPENJSON
SELECT *
FROM OPENJSON(@datos)
WITH (
    FechaHora    DATETIME2    '$.datetime',
    UTCOffset    VARCHAR(10)  '$.utc_offset',
    DiaDelAnio   INT          '$.day_of_year',
    DiaSemana    INT          '$.day_of_week',
    Abreviatura  VARCHAR(10)  '$.abbreviation'
);
GO
```

---

## Ejercicio 3 — GET con parámetros en la URL: traducción automática

Usar la API gratuita de MyMemory para traducir una frase del español al inglés.

```sql
USE PracticaU2;
GO

DECLARE @frase      NVARCHAR(256) = 'Las bases de datos son fascinantes';
DECLARE @langpair   NVARCHAR(20)  = 'es|en';
DECLARE @url        NVARCHAR(500) = CONCAT(
    'https://api.mymemory.translated.net/get?q=',
    @frase,
    '&langpair=', @langpair
);

DECLARE @Object  INT;
DECLARE @json    TABLE (DATA NVARCHAR(MAX));
DECLARE @datos   NVARCHAR(MAX);

EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'GET', @url, 'FALSE';
EXEC sp_OAMethod @Object, 'SEND';

INSERT INTO @json EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';

SET @datos = (SELECT DATA FROM @json);

SELECT *
FROM OPENJSON(@datos)
WITH (
    Traduccion NVARCHAR(500) '$.responseData.translatedText',
    Fidelidad  REAL          '$.responseData.match',
    Estado     VARCHAR(10)   '$.responseStatus'
);
GO
```

Modificar la variable `@frase` para traducir distintas frases. Probar también con otros pares de idiomas (`es|fr`, `es|pt`, `en|es`).

---

## Ejercicio 4 — GET con múltiples resultados: JSONPlaceholder

Consultar una lista de posts de la API de prueba JSONPlaceholder y guardarlos en una tabla.

```sql
USE PracticaU2;
GO

DECLARE @url     NVARCHAR(256) = 'https://jsonplaceholder.typicode.com/posts';
DECLARE @Object  INT;
DECLARE @json    TABLE (DATA NVARCHAR(MAX));
DECLARE @datos   NVARCHAR(MAX);

EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'GET', @url, 'FALSE';
EXEC sp_OAMethod @Object, 'SEND';

INSERT INTO @json EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';
SET @datos = (SELECT DATA FROM @json);

-- Expandir el array de 100 posts
SELECT TOP 10
    post_id,
    user_id,
    titulo,
    LEFT(cuerpo, 80) + '...' AS cuerpo_resumido
FROM OPENJSON(@datos)
WITH (
    post_id INT          '$.id',
    user_id INT          '$.userId',
    titulo  NVARCHAR(200) '$.title',
    cuerpo  NVARCHAR(MAX) '$.body'
)
ORDER BY post_id;
GO
```

---

## Ejercicio 5 — POST con body JSON: crear un recurso

Enviar un POST a JSONPlaceholder con un nuevo post en el body. Observar el recurso creado en la respuesta.

```sql
USE PracticaU2;
GO

DECLARE @url    NVARCHAR(256) = 'https://jsonplaceholder.typicode.com/posts';
DECLARE @body   NVARCHAR(MAX) = N'{
    "title":  "Práctica APIs desde T-SQL",
    "body":   "Este post fue creado desde SQL Server usando sp_OACreate y MSXML2.XMLHTTP.",
    "userId": 1
}';

DECLARE @Object  INT;
DECLARE @json    TABLE (DATA NVARCHAR(MAX));
DECLARE @datos   NVARCHAR(MAX);

EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'POST', @url, 'FALSE';
EXEC sp_OAMethod @Object, 'setRequestHeader', NULL, 'Content-Type', 'application/json';
EXEC sp_OAMethod @Object, 'SEND', NULL, @body;

INSERT INTO @json EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';
SET @datos = (SELECT DATA FROM @json);

SELECT *
FROM OPENJSON(@datos)
WITH (
    id     INT            '$.id',
    titulo NVARCHAR(200)  '$.title',
    cuerpo NVARCHAR(MAX)  '$.body',
    userId INT            '$.userId'
);
GO
```

> JSONPlaceholder simula la creación del recurso y devuelve un ID ficticio (101). En una API real el recurso quedaría persistido en el servidor.

---

## Ejercicio 6 — Verificar el código de respuesta HTTP

Agregar la lectura del `status` HTTP para detectar errores (404, 500, etc.) antes de procesar el body.

```sql
USE PracticaU2;
GO

DECLARE @url        NVARCHAR(256) = 'https://jsonplaceholder.typicode.com/posts/1';
DECLARE @Object     INT;
DECLARE @status     INT;
DECLARE @json       TABLE (DATA NVARCHAR(MAX));
DECLARE @datos      NVARCHAR(MAX);

EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'GET', @url, 'FALSE';
EXEC sp_OAMethod @Object, 'SEND';

-- Leer el código de estado HTTP
EXEC sp_OAGetProperty @Object, 'Status', @status OUT;
PRINT 'HTTP Status: ' + CAST(@status AS VARCHAR);

IF @status = 200
BEGIN
    INSERT INTO @json EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';
    SET @datos = (SELECT DATA FROM @json);

    SELECT *
    FROM OPENJSON(@datos)
    WITH (
        id     INT           '$.id',
        titulo NVARCHAR(200) '$.title',
        cuerpo NVARCHAR(MAX) '$.body'
    );
END
ELSE
BEGIN
    PRINT 'Error HTTP: ' + CAST(@status AS VARCHAR) + ' — no se procesó la respuesta.';
END;
GO
```

Modificar la URL para apuntar a un recurso inexistente (`/posts/9999`) y observar el comportamiento con status 404.

---

## Ejercicio 7 — Guardar resultados de API en tabla

Obtener todos los usuarios de JSONPlaceholder y persistirlos en una tabla de SQL Server.

```sql
USE PracticaU2;
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'api')
    EXEC('CREATE SCHEMA api');
GO

DROP TABLE IF EXISTS api.Usuario;
CREATE TABLE api.Usuario (
    user_id   INT           NOT NULL PRIMARY KEY,
    nombre    NVARCHAR(100) NOT NULL,
    username  NVARCHAR(100) NOT NULL,
    email     NVARCHAR(200) NOT NULL,
    ciudad    NVARCHAR(100) NULL,
    empresa   NVARCHAR(100) NULL
);
GO

DECLARE @url    NVARCHAR(256) = 'https://jsonplaceholder.typicode.com/users';
DECLARE @Object INT;
DECLARE @json   TABLE (DATA NVARCHAR(MAX));
DECLARE @datos  NVARCHAR(MAX);

EXEC sp_OACreate 'MSXML2.XMLHTTP', @Object OUT;
EXEC sp_OAMethod @Object, 'OPEN', NULL, 'GET', @url, 'FALSE';
EXEC sp_OAMethod @Object, 'SEND';

INSERT INTO @json EXEC sp_OAGetProperty @Object, 'RESPONSETEXT';
SET @datos = (SELECT DATA FROM @json);

INSERT INTO api.Usuario (user_id, nombre, username, email, ciudad, empresa)
SELECT user_id, nombre, username, email, ciudad, empresa
FROM OPENJSON(@datos)
WITH (
    user_id  INT           '$.id',
    nombre   NVARCHAR(100) '$.name',
    username NVARCHAR(100) '$.username',
    email    NVARCHAR(200) '$.email',
    ciudad   NVARCHAR(100) '$.address.city',
    empresa  NVARCHAR(100) '$.company.name'
);

SELECT * FROM api.Usuario;
GO
```

**Preguntas**:
- ¿Cómo se accede a un campo de un objeto anidado en el path de OPENJSON (por ej. `address.city`)?
- ¿Qué limitaciones tiene este enfoque para un sistema de producción que consume APIs frecuentemente?
