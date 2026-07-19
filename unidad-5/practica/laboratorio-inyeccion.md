---
layout: default
title: Laboratorio — Inyección SQL
parent: Práctica
grand_parent: Unidad 5
nav_order: 3
permalink: /unidad-5/practica/laboratorio-inyeccion/
---

[← Unidad 5](../../)

# Laboratorio defensivo — Inyección SQL

El objetivo es observar en una base aislada cómo la concatenación modifica la consulta y cómo la parametrización conserva la entrada como dato.

{: .warning }
No probar payloads contra sistemas ajenos o productivos. El laboratorio no requiere permisos de DDL para la cuenta simulada ni ejecuta borrados.

## Preparación

```sql
USE LaboratorioU5;
GO
CREATE SCHEMA seguridad AUTHORIZATION dbo;
GO

CREATE TABLE seguridad.UsuarioDemo
(
    UsuarioId int IDENTITY PRIMARY KEY,
    Nombre nvarchar(100) NOT NULL UNIQUE,
    Rol varchar(20) NOT NULL
);

INSERT seguridad.UsuarioDemo(Nombre, Rol)
VALUES (N'leia', 'usuario'),
       (N'luke', 'usuario'),
       (N'palpatine', 'admin');
GO
```

No se incluye una contraseña recuperable: autenticación real requiere hashing adecuado en la capa de identidad.

## Parte 1 — Concatenación vulnerable

```sql
CREATE OR ALTER PROCEDURE seguridad.BuscarVulnerable
    @Nombre nvarchar(100)
AS
BEGIN
    DECLARE @sql nvarchar(max) =
        N'SELECT UsuarioId, Nombre, Rol
          FROM seguridad.UsuarioDemo
          WHERE Nombre = ''' + @Nombre + N''';';

    SELECT @sql AS SQLGenerado; -- observar antes de ejecutar
    EXEC (@sql);
END;
GO
```

Prueba normal:

```sql
EXEC seguridad.BuscarVulnerable @Nombre = N'leia';
```

Prueba defensiva controlada para alterar solo el filtro:

```sql
EXEC seguridad.BuscarVulnerable @Nombre = N''' OR 1=1--';
```

Analizar el `SQLGenerado`: identificar el cierre de comilla, la condición siempre verdadera y el comentario.

## Parte 2 — `sp_executesql` seguro

```sql
CREATE OR ALTER PROCEDURE seguridad.BuscarSeguro
    @Nombre nvarchar(100)
AS
BEGIN
    DECLARE @sql nvarchar(max) =
        N'SELECT UsuarioId, Nombre, Rol
          FROM seguridad.UsuarioDemo
          WHERE Nombre = @p_nombre;';

    EXEC sys.sp_executesql
        @stmt = @sql,
        @params = N'@p_nombre nvarchar(100)',
        @p_nombre = @Nombre;
END;
GO
```

Ejecutar las mismas dos entradas. La segunda no devuelve todas las filas porque se busca literalmente un nombre que contiene comillas y operadores.

## Parte 3 — Consulta estática

```sql
CREATE OR ALTER PROCEDURE seguridad.BuscarEstatico
    @Nombre nvarchar(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UsuarioId, Nombre, Rol
    FROM seguridad.UsuarioDemo
    WHERE Nombre = @Nombre;
END;
GO
```

Si no hay estructura dinámica, esta variante es la más simple.

## Parte 4 — Ordenamiento dinámico

Los nombres de columna no aceptan parámetros. Implementar allowlist:

```sql
CREATE OR ALTER PROCEDURE seguridad.ListarSeguro
    @Orden sysname
AS
BEGIN
    IF @Orden NOT IN (N'Nombre', N'Rol')
        THROW 50010, 'Orden no permitido.', 1;

    DECLARE @sql nvarchar(max) =
        N'SELECT UsuarioId, Nombre, Rol
          FROM seguridad.UsuarioDemo
          ORDER BY ' + QUOTENAME(@Orden) + N';';

    EXEC sys.sp_executesql @sql;
END;
GO
```

Probar `Nombre`, `Rol` y un valor no permitido. Explicar la función independiente de allowlist y `QUOTENAME`.

## Parte 5 — Mínimo privilegio

```sql
CREATE ROLE rol_consulta_usuario AUTHORIZATION dbo;
GRANT EXECUTE ON OBJECT::seguridad.BuscarSeguro TO rol_consulta_usuario;
GRANT EXECUTE ON OBJECT::seguridad.BuscarEstatico TO rol_consulta_usuario;
DENY SELECT ON OBJECT::seguridad.UsuarioDemo TO rol_consulta_usuario;
```

Crear un user sin login para probar:

```sql
CREATE USER app_demo WITHOUT LOGIN;
ALTER ROLE rol_consulta_usuario ADD MEMBER app_demo;

EXECUTE AS USER = 'app_demo';
EXEC seguridad.BuscarSeguro @Nombre = N'leia';
SELECT * FROM seguridad.UsuarioDemo; -- debería fallar
REVERT;
```

Esto demuestra que parametrización y POLP son capas complementarias.

## Parte 6 — Segundo orden

Explicar sin ejecutar SQL peligroso:

1. una aplicación guarda un alias recibido externamente;
2. el insert está parametrizado y es seguro;
3. un job posterior lee el alias y lo concatena en una consulta;
4. el punto vulnerable es el job, porque transformó el dato almacenado en código.

Corregir parametrizando en el momento de ejecución.

## Cuestionario

1. ¿Por qué duplicar comillas manualmente es una defensa frágil?
2. ¿Un procedimiento almacenado impide inyección automáticamente?
3. ¿Qué parte puede parametrizarse y cuál necesita allowlist?
4. ¿Por qué una cuenta `db_owner` aumenta el impacto?
5. ¿Qué cambia si el dato vulnerable proviene de cookie o de otra tabla?
6. ¿Qué eventos registrarías sin almacenar el payload completo ni secretos?

